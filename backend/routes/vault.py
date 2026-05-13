from flask import Blueprint, request, jsonify
from services.memory import memory
import requests

vault_bp = Blueprint('vault', __name__)

@vault_bp.route('/keys/<int:user_id>', methods=['GET'])
def get_keys(user_id):
    keys = memory.get_api_keys(user_id)
    # Mask keys for security
    masked_keys = {k: f"{v[:4]}...{v[-4:]}" if len(v) > 8 else "****" for k, v in keys.items()}
    return jsonify({'keys': masked_keys})

@vault_bp.route('/keys/save', methods=['POST'])
def save_key():
    data = request.get_json()
    user_id = data.get('user_id')
    service = data.get('service')
    api_key = data.get('api_key')
    
    if not all([user_id, service, api_key]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    memory.save_api_key(user_id, service, api_key)
    return jsonify({'success': True})

@vault_bp.route('/keys/validate', methods=['POST'])
def validate_key():
    data = request.get_json()
    service = data.get('service')
    api_key = data.get('api_key')
    
    if service == 'groq':
        try:
            headers = {'Authorization': f'Bearer {api_key}'}
            res = requests.get('https://api.groq.com/openai/v1/models', headers=headers, timeout=5)
            if res.status_code == 200:
                return jsonify({'valid': True})
            return jsonify({'valid': False, 'error': 'Invalid API Key'})
        except Exception as e:
            return jsonify({'valid': False, 'error': str(e)})
    
    elif service == 'ocr':
        try:
            res = requests.get(f'https://api.ocr.space/parse/image?apikey={api_key}', timeout=5)
            # OCR space returns 200 even for invalid keys sometimes, but with error message
            if res.status_code == 200:
                return jsonify({'valid': True})
            return jsonify({'valid': False, 'error': 'Invalid API Key'})
        except Exception as e:
            return jsonify({'valid': False, 'error': str(e)})
            
    return jsonify({'error': 'Unsupported service'}), 400
    
@vault_bp.route('/keys/delete', methods=['DELETE'])
def delete_key():
    data = request.get_json()
    user_id = data.get('user_id')
    service = data.get('service')
    
    if not all([user_id, service]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    memory.delete_api_key(user_id, service)
    return jsonify({'success': True})
