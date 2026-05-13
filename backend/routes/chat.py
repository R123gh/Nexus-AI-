"""
NexusAI — Chat Route
POST /api/chat — Text message processing with intent classification.
"""

import json
import os
import time
import threading
from flask import Blueprint, request, jsonify, Response, stream_with_context
from config import get_groq_key, FAST_MODEL
from services.intent_engine import classify_intent
from services.action_executor import execute_action
from services.memory import memory
from services.brain import brain
from services.planner import planner
from utils.validators import validate_message, sanitize_text, validate_temperature, validate_model

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/chat', methods=['POST'])
def handle_chat():
    """
    Process a text chat message.

    Expects JSON:
    {
        "message": "...",
        "history": [{"role": "user/assistant", "content": "..."}],
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.7,
        "session_id": "optional"
    }

    Returns JSON:
    {
        "intent": "chat|search|action|vision",
        "response": "...",
        "action_type": null | "...",
        "action_result": null | "..."
    }
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400

        # Validate message
        raw_message = data.get('message', '')
        is_valid, result = validate_message(raw_message)
        if not is_valid:
            return jsonify({'error': result}), 400
        message = sanitize_text(result)

        # Get parameters
        history = data.get('history', [])
        model = validate_model(data.get('model', ''))
        temperature = validate_temperature(data.get('temperature', 0.7))
        session_id = data.get('session_id') or 'default'

        user_id = data.get('user_id')

        # Get API key
        api_key = get_groq_key(request)
        if not api_key or api_key.lower() in ['undefined', 'null', 'none']:
            return jsonify({'error': 'Groq API key not configured. Please set it in Settings.'}), 401

        # --- Phase 1: Semantic Memory (Remember) ---
        if user_id:
            import threading
            threading.Thread(target=brain.extract_and_remember, args=(user_id, message, api_key)).start()

        # Store user message in memory
        memory.add_message(session_id, 'user', message, user_id)

        # Force search if requested via flag
        forced_search = data.get('web_search', False)

        # --- Phase 1: Recursive Goal Decomposition (Planner) ---
        # If the request is complex (e.g. contains "research", "plan", "analyze repo", or multiple verbs), use the planner.
        complex_keywords = ['research', 'plan', 'analyze', 'build', 'create a full', 'deep dive']
        is_complex = any(kw in message.lower() for kw in complex_keywords) or forced_search
        
        # OPTIMIZATION: Default to simple_chat for faster responses
        if is_complex and not data.get('simple_chat', True):
            print(f"[*] Complex request detected. Invoking Strategic Planner...")
            response_text = planner.execute_advanced_goal(message, api_key, history, model)
            
            response_data = {
                'intent': 'autonomous_plan',
                'response': response_text,
                'action_type': 'planner',
                'action_result': 'Executed multi-step plan.',
            }
            
            # Store assistant response in memory
            memory.add_message(session_id, 'assistant', response_data['response'], user_id)
            return jsonify(response_data), 200

        # Classify intent (Normal Flow) - SKIP for simple_chat to speed up response
        simple_chat = data.get('simple_chat', True)
        if simple_chat:
            # Skip intent classification for faster response
            intent_result = {'intent': 'chat', 'action_type': None, 'params': None}
            intent_usage = None
        else:
            intent_result, intent_usage = classify_intent(
                user_message=message,
                api_key=api_key,
                history=history,
                model=model,
                temperature=temperature,
            )
        
        if user_id and intent_usage:
            memory.log_event(user_id, 'api_call', {
                'service': 'groq',
                'model': model or FAST_MODEL,
                'tokens': getattr(intent_usage, 'total_tokens', 0)
            })
        
        if forced_search:
            intent_result['intent'] = 'search'
            intent_result['action_type'] = 'search_web'
            intent_result['params'] = {'query': message}

        response_data = {
            'intent': intent_result.get('intent', 'chat'),
            'response': intent_result.get('response', ''),
            'action_type': intent_result.get('action_type'),
            'action_result': None,
        }

        # If it's a chat intent or missing response, generate the actual conversational response
        if response_data['intent'] == 'chat' and not response_data['response']:
            from services.groq_service import chat_completion
            base_sys = 'You are NexusAI, a helpful, friendly, and knowledgeable AI assistant. Provide clear, concise, and accurate responses. Use markdown formatting for better readability.'
            custom_sys = data.get('system_prompt', '')
            
            # OPTIMIZATION: Skip memory recall for faster response unless in agent mode
            past_facts = ""
            if user_id and not simple_chat:
                try:
                    facts = brain.recall_facts(user_id, message)
                    if facts:
                        past_facts = "\n\nRELEVANT FACTS ABOUT USER:\n- " + "\n- ".join(facts)
                except:
                    pass
            
            chat_sys = (custom_sys or base_sys) + past_facts
            chat_messages = [{'role': 'system', 'content': chat_sys}]
            # OPTIMIZATION: Reduce history context for faster response
            if history:
                for msg in history[-5:]:  # Reduced from 10 to 5 messages
                    chat_messages.append({'role': msg.get('role', 'user'), 'content': msg.get('content', '')})
            chat_messages.append({'role': 'user', 'content': message})
            
            response_text, usage = chat_completion(
                messages=chat_messages,
                api_key=api_key,
                model=model,
                temperature=temperature
            )
            response_data['response'] = response_text
            
            if user_id and usage:
                memory.log_event(user_id, 'api_call', {
                    'service': 'groq',
                    'model': model,
                    'tokens': getattr(usage, 'total_tokens', 0)
                })

        # Execute action if detected
        if response_data['intent'] == 'action' and response_data['action_type']:
            action_result = execute_action(
                action_type=intent_result['action_type'],
                params=intent_result.get('params'),
            )
            response_data['action_result'] = action_result.get('message', '')

            # If scraping or searching was successful, generate a summary
            if intent_result['action_type'] in ['scrape_url', 'search_web', 'get_weather'] and action_result.get('status') == 'executed':
                action_data = action_result.get('data', '')
                if action_data:
                    from services.groq_service import chat_completion
                    summary_messages = [
                        {'role': 'system', 'content': 'You are a helpful AI assistant. The user wants you to summarize or answer questions based on the content of a web page, search results, or live weather data. Use the provided text to fulfill the user request in a natural way.'},
                        {'role': 'user', 'content': f"User request: {message}\n\nData:\n{action_data}"}
                    ]
                    summary_text, usage = chat_completion(
                        messages=summary_messages,
                        api_key=api_key,
                        model=model,
                        temperature=temperature
                    )
                    response_data['response'] = summary_text
                    
                    if user_id and usage:
                        memory.log_event(user_id, 'api_call', {
                            'service': 'groq',
                            'model': model,
                            'tokens': getattr(usage, 'total_tokens', 0)
                        })

        # Store assistant response in memory
        memory.add_message(session_id, 'assistant', response_data['response'], user_id)

        # Log analytics event
        if user_id:
            memory.log_event(user_id, 'message_sent', {
                'model': model,
                'intent': response_data['intent'],
                'action_type': response_data['action_type']
            })

        return jsonify(response_data), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@chat_bp.route('/document', methods=['POST'], strict_slashes=False)
def handle_document():
    """
    Process a document upload with an optional question.
    """
    try:
        if 'document' not in request.files:
            return jsonify({'error': 'No document file provided'}), 400
            
        file = request.files['document']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        message = request.form.get('message', 'Summarize this document.')
        model = validate_model(request.form.get('model', ''))
        temperature = validate_temperature(float(request.form.get('temperature', 0.7)))
        session_id = request.form.get('session_id', 'default')
        user_id = request.form.get('user_id')
        
        api_key = get_groq_key(request)
        if not api_key:
            return jsonify({'error': 'Groq API key not configured.'}), 401
            
        import os
        from werkzeug.utils import secure_filename
        from config import UPLOAD_FOLDER
        from utils.file_parser import extract_text_from_file
        from services.groq_service import chat_completion
        
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        ocr_api_key = request.form.get('ocr_api_key')
        extracted_text = extract_text_from_file(file_path, ocr_api_key)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            
        if extracted_text.startswith('Error') or extracted_text.startswith('Unsupported') or extracted_text.startswith('PyPDF2'):
            return jsonify({'error': extracted_text}), 400
            
        # Store user message
        memory.add_message(session_id, 'user', f"Uploaded document: {filename}\nQuery: {message}", user_id)
        
        # Build prompt
        system_prompt = "You are a helpful AI assistant. You will be provided with the text of a document and a user's query. Answer the query based ONLY on the provided document text."
        user_prompt = f"User Query: {message}\n\nDocument Text:\n{extracted_text}"
        
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        response_text, usage = chat_completion(messages, api_key, model, temperature)
        
        if user_id and usage:
            memory.log_event(user_id, 'api_call', {
                'service': 'groq',
                'model': model,
                'tokens': getattr(usage, 'total_tokens', 0)
            })
        
        # Store response
        memory.add_message(session_id, 'assistant', response_text, user_id)
        
        return jsonify({
            'intent': 'document_rag',
            'response': response_text,
            'action_type': None,
            'action_result': None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/conversations/<user_id>', methods=['GET'])
def get_user_conversations(user_id):
    """Fetch all conversation sessions for a given user."""
    try:
        conversations = memory.get_user_conversations(user_id)
        return jsonify({'conversations': conversations}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/session/<session_id>', methods=['GET'])
def get_session_history(session_id):
    """Fetch chat history for a specific session."""
    try:
        history = memory.get_session_history(session_id)
        return jsonify({'history': history}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Feature: Streaming Responses (SSE) ──────────────────────
@chat_bp.route('/chat/stream', methods=['POST'])
def handle_chat_stream():
    """
    Stream a chat response word-by-word using Server-Sent Events.
    Same input as /chat but returns an SSE stream.
    """
    from flask import Response, stream_with_context
    from services.groq_service import chat_completion_stream
    import json as _json

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400

    raw_message = data.get('message', '')
    is_valid, result = validate_message(raw_message)
    if not is_valid:
        return jsonify({'error': result}), 400
    message = sanitize_text(result)

    history = data.get('history', [])
    model = validate_model(data.get('model', ''))
    temperature = validate_temperature(data.get('temperature', 0.7))
    session_id = data.get('session_id', 'default')
    user_id = data.get('user_id')
    system_prompt = data.get('system_prompt', '')

    api_key = get_groq_key(request)
    if not api_key or api_key.lower() in ['undefined', 'null', 'none']:
        return jsonify({'error': 'Groq API key not configured. Please set it in Settings.'}), 401

    # --- Phase 1: Semantic Memory (Background Memory) ---
    if user_id:
        try:
            # Memory extraction is ALWAYS backgrounded to prevent blocking
            threading.Thread(target=brain.extract_and_remember, args=(user_id, message, api_key)).start()
        except Exception as e:
            print(f"[!] Memory handling error: {e}")

    memory.add_message(session_id, 'user', message, user_id)

    # Build messages
    base_sys = 'You are NexusAI, a helpful, friendly, and knowledgeable AI assistant. Provide clear, concise, and accurate responses. Use markdown formatting for better readability.'
    past_facts = ""
    sys_content = (system_prompt or base_sys) + past_facts
    messages = [{'role': 'system', 'content': sys_content}]

    # Add context summary if provided
    context_summary = data.get('context_summary', '')
    if context_summary:
        messages.append({'role': 'system', 'content': f'Here is a summary of your earlier conversation with this user for context:\n{context_summary}'})

    # OPTIMIZATION: Reduce history context for faster response
    if history:
        for msg in history[-5:]:  # Reduced from 10 to 5 messages
            messages.append({'role': msg.get('role', 'user'), 'content': msg.get('content', '')})
    messages.append({'role': 'user', 'content': message})

    def generate():
        try:
            # 1. Fast Intent Classification & Memory Recall
            from services.intent_engine import classify_intent
            from services.action_executor import execute_action
            
            forced_search = data.get('web_search', False)
            simple_chat = data.get('simple_chat', True)  # Default to True for faster response
            
            print(f"[DEBUG] Starting chat stream - simple_chat: {simple_chat}, forced_search: {forced_search}")
            
            # OPTIMIZATION: Skip memory recall by default for faster response
            # Only fetch if explicitly NOT simple_chat
            past_facts = ""
            if not simple_chat and user_id:
                try:
                    facts = brain.recall_facts(user_id, message)
                    if facts:
                        past_facts = "\n\nRELEVANT FACTS ABOUT USER:\n- " + "\n- ".join(facts)
                except:
                    pass

            # OPTIMIZATION: Skip LLM intent classification by default for faster response
            # Only classify if explicitly NOT simple_chat or forced_search is True
            if simple_chat and not forced_search:
                intent_result = {'intent': 'chat', 'action_type': None, 'params': None}
                intent_usage = None
                print(f"[DEBUG] Skipping intent classification")
            else:
                print(f"[DEBUG] Running intent classification")
                intent_result, intent_usage = classify_intent(message, api_key, history, model, temperature)
            
            if user_id and intent_usage:
                memory.log_event(user_id, 'api_call', {
                    'service': 'groq',
                    'model': model or FAST_MODEL,
                    'tokens': getattr(intent_usage, 'total_tokens', 0)
                })
            
            if forced_search:
                intent_result['intent'] = 'search'
                intent_result['action_type'] = 'search_web'
                intent_result['params'] = {'query': message}
                
            action_res_msg = None
            
            # 2. Execute Action if needed
            # Re-build sys content with past_facts if we found any
            final_sys_content = (system_prompt or base_sys) + past_facts
            messages[0]['content'] = final_sys_content

            if intent_result.get('intent') == 'action' and intent_result.get('action_type'):
                action_result = execute_action(
                    action_type=intent_result['action_type'],
                    params=intent_result.get('params'),
                )
                action_res_msg = action_result.get('message', '')
                
                # If scraping/searching, inject data into the prompt
                if intent_result['action_type'] in ['scrape_url', 'search_web', 'get_weather'] and action_result.get('status') == 'executed':
                    action_data = action_result.get('data', '')
                    if action_data:
                        messages.append({'role': 'system', 'content': f'Background Data to answer the user:\n{action_data}'})
                else:
                    messages.append({'role': 'system', 'content': f'System action executed: {action_res_msg}. Keep your response very brief (1 sentence) acknowledging this.'})
            
            # Send initial metadata chunk
            meta_chunk = {
                'metadata': True,
                'intent': intent_result.get('intent', 'chat'),
                'action_result': action_res_msg
            }
            yield f"data: {_json.dumps(meta_chunk)}\n\n"

            # 3. Stream the LLM response
            full_response = []
            
            print(f"[DEBUG] Starting LLM stream with {len(messages)} messages")
            
            # If the keyword matcher generated a static response, yield it instantly
            if intent_result.get('response'):
                print(f"[DEBUG] Using static response from intent")
                full_response.append(intent_result['response'])
                yield f"data: {_json.dumps({'chunk': intent_result['response']})}\n\n"
            else:
                print(f"[DEBUG] Calling chat_completion_stream")
                try:
                    for chunk in chat_completion_stream(messages, api_key, model, temperature):
                        full_response.append(chunk)
                        print(f"[DEBUG] Got chunk: {chunk[:50]}...")
                        yield f"data: {_json.dumps({'chunk': chunk})}\n\n"
                except Exception as e:
                    print(f"[ERROR] Stream failed: {e}")
                    yield f"data: {_json.dumps({'error': str(e)})}\n\n"
                    
            # Store complete response
            complete = ''.join(full_response)
            memory.add_message(session_id, 'assistant', complete, user_id)
            
            # Log analytics
            if user_id:
                memory.log_event(user_id, 'message_sent', {
                    'model': model,
                    'intent': intent_result.get('intent', 'chat'),
                    'action_type': intent_result.get('action_type')
                })
                
            yield f"data: {_json.dumps({'done': True, 'full_response': complete})}\n\n"
            
        except Exception as e:
            yield f"data: {_json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    )


# ─── Feature: Context Summary (Persistent Memory) ───────────
@chat_bp.route('/chat/context', methods=['POST'])
def generate_context_summary():
    """
    Generate a concise summary of the conversation so far.
    Used for persistent memory across sessions.
    """
    from services.groq_service import chat_completion

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400

    history = data.get('history', [])
    model = validate_model(data.get('model', ''))
    api_key = get_groq_key(request)
    if not api_key:
        return jsonify({'error': 'Groq API key not configured.'}), 401

    if len(history) < 4:
        return jsonify({'summary': ''}), 200

    # Build summary prompt
    conversation_text = '\n'.join([f"{m['role'].upper()}: {m['content'][:200]}" for m in history[-20:]])
    messages = [
        {'role': 'system', 'content': 'You are a conversation summarizer. Given the conversation below, create a brief 2-3 sentence summary capturing the key topics, facts, and user preferences discussed. Be concise and factual.'},
        {'role': 'user', 'content': f"Summarize this conversation:\n\n{conversation_text}"}
    ]

    try:
        summary = chat_completion(messages, api_key, model, temperature=0.3)
        return jsonify({'summary': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Feature: System Prompt Storage ──────────────────────────
_system_prompts = {}  # In-memory store: user_id -> prompt

@chat_bp.route('/chat/system_prompt', methods=['POST'])
def save_system_prompt():
    """Save a custom system prompt for a user."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    user_id = data.get('user_id', 'default')
    prompt = data.get('prompt', '')
    _system_prompts[str(user_id)] = prompt
    return jsonify({'success': True}), 200

@chat_bp.route('/chat/system_prompt/<user_id>', methods=['GET'])
def get_system_prompt(user_id):
    """Get saved system prompt for a user."""
    prompt = _system_prompts.get(str(user_id), '')
    return jsonify({'prompt': prompt}), 200

