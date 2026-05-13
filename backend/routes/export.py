from flask import Blueprint, jsonify, send_file
from services.memory import memory
import json
import io
import time

export_bp = Blueprint('export', __name__)

@export_bp.route('/all/<int:user_id>', methods=['GET'])
def export_all(user_id):
    try:
        # Gather all data
        profile = memory.get_user_profile(user_id)
        conversations = memory.get_user_conversations(user_id)
        
        # Get full history for each conversation
        full_history = {}
        for conv in conversations:
            sid = conv.get('session_id')
            if sid:
                full_history[sid] = memory.get_session_history(sid)
        
        analytics = memory.get_usage_stats(user_id)
        keys = memory.get_api_keys(user_id) # Exporting keys too, user should be careful
        
        export_data = {
            'export_date': time.strftime('%Y-%m-%d %H:%M:%S'),
            'user_profile': profile,
            'conversations': conversations,
            'chat_histories': full_history,
            'usage_analytics': analytics,
            'api_vault_keys': keys
        }
        
        # Create a JSON file in memory
        json_str = json.dumps(export_data, indent=4)
        mem = io.BytesIO()
        mem.write(json_str.encode('utf-8'))
        mem.seek(0)
        
        filename = f"nexusai_export_{user_id}_{int(time.time())}.json"
        
        return send_file(
            mem,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
