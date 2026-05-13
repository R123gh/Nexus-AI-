from flask import Blueprint, request, jsonify
from services.memory import memory
import time

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('/incoming', methods=['POST'])
def handle_incoming_webhook():
    """
    Endpoint for external services (Zapier, Make, etc.) to push data to NexusAI.
    Expected payload: { "user_id": 1, "title": "...", "message": "...", "type": "..." }
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No payload received'}), 400
        
    user_id = data.get('user_id', 1) # Default to user 1 if not specified
    title = data.get('title', 'Incoming Webhook')
    message = data.get('message', 'Data received from external service.')
    notif_type = data.get('type', 'info')
    
    # Store in memory notifications
    memory.add_notification(user_id, title, message, notif_type)
    
    return jsonify({
        'success': True,
        'received_at': int(time.time()),
        'status': 'Notification created'
    })

@webhooks_bp.route('/status', methods=['GET'])
def webhook_status():
    return jsonify({
        'service': 'NexusAI Webhook Engine',
        'status': 'active',
        'endpoints': {
            'incoming': '/api/webhooks/incoming'
        }
    })
