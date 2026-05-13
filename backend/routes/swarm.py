from flask import Blueprint, request, jsonify
from config import get_groq_key
from services.swarm import execute_swarm
from utils.validators import validate_model

swarm_bp = Blueprint('swarm', __name__)

@swarm_bp.route('/execute', methods=['POST'])
def run_swarm_task():
    """Run a multi-agent collaborative task."""
    try:
        data = request.json or {}
        task = data.get('task', '').strip()
        user_id = data.get('user_id')
        
        if not task:
            return jsonify({'error': 'Task description is required'}), 400
            
        api_key = get_groq_key(request)
        if not api_key:
            return jsonify({'error': 'Groq API key not configured'}), 401
            
        model = validate_model(data.get('model', ''))
        
        # Log analytics
        if user_id:
            from services.memory import memory
            memory.log_event(user_id, 'swarm_task_started', {'task': task})
            
        results = execute_swarm(task, api_key, model)
        
        return jsonify({
            'task': task,
            'results': results,
            'status': 'completed'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
