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
        chunk_count = 0
        try:
            from services.rag_engine import get_kb_collection
            collection = get_kb_collection(kb['id'])
            chunk_count = collection.count()
        except Exception as e:
            print(f"Error getting collection count: {e}")
        safe_kbs.append({
            'id': kb['id'],
            'name': kb['name'],
            'description': kb['description'],
            'files': kb['files'],
            'chunk_count': chunk_count
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
    from services.rag_engine import get_all_chunks
    chunks = get_all_chunks(kb_id)
    return jsonify(chunks), 200

@rag_bp.route('/<kb_id>/chat', methods=['POST'])
def chat_kb(kb_id):
    data = request.json or {}
    session_id = data.get('session_id') or 'default'
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
        
    # ================================================================
    # RAG WORKFLOW (Step-by-Step Implementation)
    # ================================================================

    # STEP 1: User asks a question (Received as 'message' parameter)
    # STEP 2 & 3: Convert question to embeddings and Retrieve relevant documents
    # (ChromaDB handles embedding the query and searching the vector space)
    chunks = retrieve_chunks(kb_id, message, top_k=top_k)

    # STEP 4: Add retrieved context to the prompt (Augmentation)
    context_sections = []
    for c in chunks:
        context_sections.append(f"--- SOURCE: {c['source']} ---\n{c['text']}")
    
    context_text = "\n\n".join(context_sections)

    # Optional Web Augmentation (Hybrid RAG)
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

    # Constructing the Grounded Prompt (Step 4 continued)
    sys_prompt = (
        "ROLE: You are the NexusAI Contextual Intelligence Engine. Your mission is to provide highly accurate, grounded, and comprehensive answers.\n\n"
        "INSTRUCTIONS:\n"
        "1. If the LOCAL KNOWLEDGE BASE CONTEXT below contains relevant information, prioritize it and use it as your primary source of truth. Always CITE the source filename (e.g. [Source: file.txt]).\n"
        "2. If the LOCAL KNOWLEDGE BASE CONTEXT is empty, insufficient, or does not contain the answer to the user's question, leverage your broad, expert general knowledge to fully and professionally answer the user query in detail.\n"
        "3. Be extremely helpful, clear, and include code snippets or lists where relevant. If answering from general knowledge due to empty local context, state this clearly to the user.\n\n"
        f"--- LOCAL KNOWLEDGE BASE CONTEXT (Retrieved Documents) ---\n{context_text if context_text else 'NO RELEVANT LOCAL CONTEXT FOUND.'}\n\n"
        f"--- LIVE WEB SEARCH CONTEXT ---\n{web_context if web_context else 'WEB SEARCH DISABLED.'}\n\n"
        "--- FINAL TASK ---\n"
        "Answer the user query professionally, accurately, and thoroughly."
    )
    
    messages = [
        {'role': 'system', 'content': sys_prompt},
    ]

    # Add limited history for context-aware follow-ups
    for msg in history[-3:]:
        messages.append({'role': msg['role'], 'content': msg['content']})
        
    messages.append({'role': 'user', 'content': message})

    # STEP 5: Generate final answer (Generation)

    
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
