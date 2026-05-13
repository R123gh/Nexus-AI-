"""
NexusAI — Image Route
POST /api/image — Image upload + Groq Vision analysis + OCR fallback.
"""

import os
from flask import Blueprint, request, jsonify
from config import get_groq_key, get_ocr_key, UPLOAD_FOLDER
from services.groq_service import analyze_image
from services.ocr_service import extract_text_from_image
from utils.validators import validate_image_file, safe_filename, validate_model

image_bp = Blueprint('image', __name__)


@image_bp.route('/image', methods=['POST'])
def handle_image():
    """
    Process an uploaded image.

    Expects multipart/form-data:
        image: image file (png/jpg/gif/webp)
        question: (optional) question about the image
        model: (optional) vision model ID

    Returns JSON:
    {
        "intent": "vision",
        "analysis": "...",
        "extracted_text": "...",
        "response": "..."
    }
    """
    try:
        # Check for image file
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided. Send as "image" field.'}), 400

        image_file = request.files['image']
        is_valid, error = validate_image_file(image_file)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Get API keys
        groq_key = get_groq_key(request)
        ocr_key = get_ocr_key(request)

        if not groq_key and not ocr_key:
            return jsonify({'error': 'No API key configured. Set Groq or OCR.space key in Settings.'}), 401

        # Get parameters
        question = request.form.get('question', 'What is in this image? Analyze and describe it in detail.')
        model = validate_model(request.form.get('model', ''))

        # Save image temporarily
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = safe_filename(image_file.filename or 'image.png')
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        image_file.save(filepath)

        analysis = ''
        extracted_text = ''

        try:
            # Primary: Groq Vision analysis
            if groq_key:
                try:
                    from services.memory import memory
                    user_id = request.form.get('user_id')
                    analysis, usage = analyze_image(
                        image_path=filepath,
                        question=question,
                        api_key=groq_key,
                        model=model if 'scout' in model.lower() or 'vision' in model.lower() else None,
                    )
                    
                    if user_id and usage:
                        memory.log_event(user_id, 'api_call', {
                            'service': 'groq',
                            'model': model if 'scout' in model.lower() or 'vision' in model.lower() else 'vision',
                            'tokens': getattr(usage, 'total_tokens', 0)
                        })
                except Exception as vision_err:
                    analysis = f'Vision analysis unavailable: {str(vision_err)}'

            # Fallback: OCR text extraction
            if ocr_key:
                try:
                    extracted_text = extract_text_from_image(filepath, ocr_key) or ''
                except Exception:
                    extracted_text = ''

            # Build response
            response_parts = []
            if analysis:
                response_parts.append(analysis)
            if extracted_text and extracted_text != 'No text detected in the image.':
                response_parts.append(f'\n\n**Extracted Text:**\n{extracted_text}')

            final_response = ''.join(response_parts) if response_parts else 'Could not analyze the image. Please check your API key configuration.'

            return jsonify({
                'intent': 'vision',
                'analysis': analysis,
                'extracted_text': extracted_text,
                'response': final_response,
            }), 200

        finally:
            # Clean up temp file
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError:
                    pass

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Image processing error: {str(e)}'}), 500
