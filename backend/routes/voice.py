"""
NexusAI — Voice Route
POST /api/voice — Audio upload, Whisper STT, then intent pipeline.
"""

import os
from flask import Blueprint, request, jsonify
from config import get_groq_key, UPLOAD_FOLDER
from services.groq_service import transcribe_audio
from services.intent_engine import classify_intent
from services.action_executor import execute_action
from services.memory import memory
from utils.validators import validate_audio_file, safe_filename, validate_temperature, validate_model

voice_bp = Blueprint('voice', __name__)


@voice_bp.route('/voice', methods=['POST'])
def handle_voice():
    """
    Process a voice recording.

    Expects multipart/form-data:
        audio: audio file (webm/wav/mp3)
        model: (optional) model ID
        temperature: (optional) float

    Returns JSON:
    {
        "transcript": "...",
        "intent": "...",
        "response": "...",
        "action_type": null | "...",
        "action_result": null | "..."
    }
    """
    try:
        # Check for audio file
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided. Send as "audio" field.'}), 400

        audio_file = request.files['audio']
        is_valid, error = validate_audio_file(audio_file)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Get API key
        api_key = get_groq_key(request)
        if not api_key:
            return jsonify({'error': 'Groq API key not configured.'}), 401

        # Get parameters
        model = validate_model(request.form.get('model', ''))
        temperature = validate_temperature(request.form.get('temperature', 0.7))

        
        # Save audio with unique filename
        import uuid
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        unique_id = uuid.uuid4().hex
        filename = f"voice_{unique_id}.webm"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        audio_file.save(filepath)

        try:
            # 1. Transcribe audio
            transcript = transcribe_audio(filepath, api_key)

            if not transcript or transcript.strip() == '':
                return jsonify({
                    'transcript': '',
                    'response': "I'm sorry, I couldn't hear anything. Could you please try again?",
                    'error': 'Empty transcript'
                }), 200

            # 2. Generate a quick response using a fast model
            from services.groq_service import chat_completion
            from config import FAST_MODEL
            
            # Simple prompt for voice interaction
            messages = [
                {"role": "system", "content": "You are a helpful, concise voice assistant. Give short, direct answers suitable for being read aloud."},
                {"role": "user", "content": transcript}
            ]
            
            response_text, _ = chat_completion(messages, api_key, model=FAST_MODEL)

            return jsonify({
                'transcript': transcript,
                'response': response_text,
                'intent': 'voice_chat'
            }), 200

        finally:
            # Clean up temp file
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception:
                    pass

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Voice processing error: {str(e)}'}), 500
