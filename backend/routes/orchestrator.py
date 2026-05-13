"""
NexusAI — Orchestrator Route
POST /api/orchestrate — Multi-step autonomous planning and execution.
"""

from flask import Blueprint, request, jsonify
from config import get_groq_key
from services.orchestrator import run_orchestrator
from services.memory import memory
from utils.validators import validate_message, sanitize_text, validate_model

orchestrator_bp = Blueprint('orchestrator', __name__)

@orchestrator_bp.route('/orchestrate', methods=['POST'])
def handle_orchestration():
    """
    Process a complex request using the Autonomous Orchestrator.
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400

        # Validate message
        raw_message = data.get('message', '')
        if not raw_message:
            return jsonify({'error': 'Message is required'}), 400
        message = sanitize_text(raw_message)

        # Get parameters
        history = data.get('history', [])
        model = validate_model(data.get('model', ''))
        session_id = data.get('session_id') or 'default'

        user_id = data.get('user_id')

        # Get API key
        api_key = get_groq_key(request)
        if not api_key or api_key.lower() in ['undefined', 'null', 'none']:
            return jsonify({'error': 'Groq API key not configured in Settings.'}), 401


        # Store user message in memory
        memory.add_message(session_id, 'user', f"[Orchestration] {message}", user_id)

        # Run Orchestrator
        response_text = run_orchestrator(
            user_prompt=message,
            api_key=api_key,
            history=history,
            model=model
        )

        # Store assistant response in memory
        memory.add_message(session_id, 'assistant', response_text, user_id)

        return jsonify({
            'intent': 'orchestration',
            'response': response_text,
            'action_type': 'autonomous_workflow',
            'action_result': 'Executed successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': f'Orchestrator error: {str(e)}'}), 500
