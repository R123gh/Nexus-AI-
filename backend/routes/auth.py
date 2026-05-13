from flask import Blueprint, request, jsonify
from services.memory import memory

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    
    result = memory.register_user(data['username'], data['password'])
    if result.get('success'):
        return jsonify({'success': True, 'user_id': result['user_id']})
    return jsonify({'error': result.get('error')}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    
    result = memory.login_user(data['username'], data['password'])
    if result.get('success'):
        return jsonify(result)
    return jsonify({'error': result.get('error')}), 401

@auth_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    profile = memory.get_user_profile(user_id)
    if profile:
        return jsonify(profile)
    return jsonify({'error': 'User not found'}), 404

@auth_bp.route('/profile/update', methods=['POST'])
def update_profile():
    data = request.get_json()
    print(f"Update Profile Request: {data}")
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    success = memory.update_user_profile(user_id, data)
    print(f"Update Success: {success}")
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to update profile'}), 400
