from flask import Blueprint, request, jsonify
from services.memory import memory

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    """Fetch notifications for a specific user."""
    limit = request.args.get('limit', 20, type=int)
    results = memory.get_notifications(user_id, limit)
    return jsonify({'notifications': results})

@notifications_bp.route('/read/<int:notification_id>', methods=['POST'])
def mark_read(notification_id):
    """Mark a specific notification as read."""
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    memory.mark_notification_read(notification_id, user_id)
    return jsonify({'success': True})

@notifications_bp.route('/read-all/<int:user_id>', methods=['POST'])
def mark_all_read(user_id):
    """Mark all notifications for a user as read."""
    memory.mark_all_read(user_id)
    return jsonify({'success': True})

@notifications_bp.route('/delete/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a specific notification."""
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
        
    memory.delete_notification(notification_id, user_id)
    return jsonify({'success': True})

@notifications_bp.route('/create', methods=['POST'])
def create_notification():
    """Manual trigger for creating a notification (internal/admin use)."""
    data = request.json
    user_id = data.get('user_id')
    title = data.get('title')
    message = data.get('message')
    notify_type = data.get('type', 'info')
    
    if not all([user_id, title, message]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    memory.add_notification(user_id, title, message, notify_type)
    return jsonify({'success': True})
