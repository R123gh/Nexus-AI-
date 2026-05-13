from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from config import UPLOAD_FOLDER, get_groq_key
from services.rag_engine import create_kb, get_kbs, add_file_to_kb, retrieve_chunks
from services.groq_service import chat_completion

rag_bp = Blueprint('rag', __name__)

@rag_bp.route('/list', methods=['GET'])
def list_kbs():
    kbs = get_kbs()
    # Don't send all chunks to frontend, just metadata
    safe_kbs = []
    for kb in kbs:
        safe_kbs.append({
            'id': kb['id'],
            'name': kb['name'],
            'description': kb['description'],
            'files': kb['files'],
            'chunk_count': len(kb.get('chunks', []))
        })
    return jsonify(safe_kbs), 200

@rag_bp.route('/create', methods=['POST'])
def create_new_kb():
    data = request.json or {}
    name = data.get('name', '').strip()
    desc = data.get('description', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    kb = create_kb(name, desc)
    return jsonify({'id': kb['id'], 'name': kb['name']}), 201

@rag_bp.route('/<kb_id>/upload', methods=['POST'])
def upload_file(kb_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    
    try:
        kb = add_file_to_kb(kb_id, file_path, filename)
        return jsonify({'message': f'Added {filename} successfully', 'files': kb['files']}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@rag_bp.route('/<kb_id>/delete', methods=['DELETE'])
def delete_knowledge_base(kb_id):
    from services.rag_engine import delete_kb
    try:
        delete_kb(kb_id)
        return jsonify({'message': 'Knowledge Base deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rag_bp.route('/<kb_id>/file/delete', methods=['POST'])
def delete_kb_file(kb_id):
    from services.rag_engine import delete_file_from_kb
    data = request.json or {}
    filename = data.get('filename')
    if not filename:
        return jsonify({'error': 'Filename is required'}), 400
    try:
        kb = delete_file_from_kb(kb_id, filename)
        return jsonify({'message': f'Deleted {filename} successfully', 'files': kb['files']}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rag_bp.route('/<kb_id>/chunks', methods=['GET'])
def list_chunks(kb_id):
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb:
        return jsonify({'error': 'Knowledge Base not found'}), 404
    return jsonify(kb.get('chunks', [])), 200

@rag_bp.route('/<kb_id>/chat', methods=['POST'])
def chat_kb(kb_id):
    data = request.json or {}
    message = data.get('message', '').strip()
    history = data.get('history', [])
    model = data.get('model', 'llama-3.3-70b-versatile')
    augment_web = data.get('augment_web', False)
    top_k = data.get('top_k', 5)
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
        
    api_key = get_groq_key(request)
    if not api_key:
        return jsonify({'error': 'Groq API key not configured'}), 401
        
    # Retrieve local chunks with scores - lowered threshold for better recall
    chunks = retrieve_chunks(kb_id, message, top_k=10, threshold=0.001)

    print(f"RAG Debug: Query='{message}' | Found {len(chunks)} chunks for KB {kb_id}")
    
    context_sections = []
    for c in chunks:
        context_sections.append(f"--- SOURCE: {c['source']} (Relevance: {c['score']:.2f}) ---\n{c['text']}")
    
    context_text = "\n\n".join(context_sections)
    
    # Optional Web Augmentation
    web_context = ""
    if augment_web:
        from services.orchestrator import web_search
        import json
        search_results = web_search(message, max_results=3)
        try:
            results_list = json.loads(search_results)
            web_context = "\n\n".join([f"--- WEB SOURCE: {r.get('title')} ---\n{r.get('body')}" for r in results_list])
        except:
            web_context = f"[Web Search Error]: Could not retrieve live data"

    sys_prompt = (
        "ROLE: You are the NexusAI Contextual Intelligence Engine. Your primary mission is to answer questions using ONLY the provided LOCAL KNOWLEDGE BASE CONTEXT below.\n\n"
        "STRICT GUIDELINES:\n"
        "1. If the answer is contained in the context, synthesize a detailed response and CITE the source filename immediately after the relevant sentence.\n"
        "2. If the context does not contain enough information, but WEB SEARCH is enabled and provided, use that as a secondary source.\n"
        "3. If NEITHER the context nor the web search provides the answer, state: 'I am sorry, but that information is not available in your knowledge base.' NEVER invent facts.\n"
        "4. If context is provided, DO NOT mention 'Based on the context provided' - just answer directly and cite the source.\n\n"

        f"--- LOCAL KNOWLEDGE BASE CONTEXT ---\n{context_text if context_text else 'NO RELEVANT LOCAL CONTEXT FOUND.'}\n\n"
        f"--- LIVE WEB SEARCH CONTEXT ---\n{web_context if web_context else 'WEB SEARCH DISABLED OR NO RESULTS.'}\n\n"
        "Answer the user query based on the above intelligence."
    )
    
    messages = [
        {'role': 'system', 'content': sys_prompt},
    ]

    for msg in history[-3:]: # Reduced history for more focus
        messages.append({'role': msg['role'], 'content': msg['content']})
    
    # Inject Context again right before the question to force focus
    if context_text:
        messages.append({'role': 'system', 'content': f"REMINDER: Only use this context for the next answer:\n{context_text}"})
        
    messages.append({'role': 'user', 'content': message})

    
    try:
        from services.groq_service import chat_completion
        response_text, usage = chat_completion(messages, api_key, model=model)
        
        # Convert usage to dict if it's an object (Groq usage object is not JSON serializable)
        usage_dict = None
        if usage:
            try:
                usage_dict = usage.model_dump()
            except:
                try:
                    usage_dict = dict(usage)
                except:
                    usage_dict = str(usage)

        return jsonify({
            'response': response_text, 
            'chunks': chunks,
            'web_augmented': augment_web,
            'usage': usage_dict
        }), 200
    except Exception as e:
        print(f"RAG Chat Error: {str(e)}")
        return jsonify({'error': str(e)}), 500
