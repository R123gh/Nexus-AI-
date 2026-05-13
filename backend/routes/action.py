"""
NexusAI — Action Route
POST /api/action — Direct action execution endpoint.
"""

from flask import Blueprint, request, jsonify
from services.action_executor import execute_action
from utils.security import validate_action_request

action_bp = Blueprint('action', __name__)


@action_bp.route('/action', methods=['POST'])
def handle_action():
    """
    Execute a system action directly.

    Expects JSON:
    {
        "action_type": "open_youtube" | "open_google" | "open_url" | "search_web" | "open_app",
        "params": {"url": "...", "query": "...", "app": "..."}
    }

    Returns JSON:
    {
        "action": "...",
        "status": "executed|error|blocked",
        "message": "..."
    }
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400

        action_type = data.get('action_type', '')
        params = data.get('params', {})

        # Security validation
        is_valid, error = validate_action_request(action_type, params)
        if not is_valid:
            return jsonify({
                'action': action_type,
                'status': 'blocked',
                'message': error,
            }), 403

        # Execute
        result = execute_action(action_type, params)

        return jsonify({
            'action': action_type,
            'status': result.get('status', 'error'),
            'message': result.get('message', ''),
        }), 200

    except Exception as e:
        return jsonify({
            'action': data.get('action_type', 'unknown') if data else 'unknown',
            'status': 'error',
            'message': f'Action execution error: {str(e)}',
        }), 500
