from flask import Blueprint, jsonify, request
from services.memory import memory
from services.predictive import predictive_assistant
from config import get_groq_key

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/stats/<int:user_id>', methods=['GET'])
def get_stats(user_id):
    try:
        stats = memory.get_usage_stats(user_id)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/predictive/<int:user_id>', methods=['GET'])
def get_predictive_insight(user_id):
    try:
        api_key = get_groq_key(request)
        if not api_key:
            return jsonify({'error': 'Groq API key required for predictive analysis'}), 401
            
        insight = predictive_assistant.get_proactive_insight(user_id, api_key)
        return jsonify(insight)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/logs/<int:user_id>', methods=['GET'])
def get_user_logs(user_id):
    try:
        logs = memory.get_user_logs(user_id)
        return jsonify(logs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
