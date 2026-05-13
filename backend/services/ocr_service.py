"""
NexusAI — OCR.space Fallback Service
Uses OCR.space API for text extraction from images when Groq Vision is unavailable.
"""

import base64
import requests


OCR_SPACE_URL = 'https://api.ocr.space/parse/image'


def extract_text_from_image(image_path, api_key):
    """
    Extract text from an image using OCR.space API.

    Args:
        image_path: Path to the image file
        api_key: OCR.space API key

    Returns:
        Extracted text string, or error message.
    """
    if not api_key:
        return None  # No key configured, skip OCR fallback

    try:
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')

        # Determine file type
        ext = image_path.rsplit('.', 1)[-1].lower()
        mime_map = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
        }
        filetype = mime_map.get(ext, 'image/png')

        payload = {
            'apikey': api_key,
            'base64Image': f'data:{filetype};base64,{image_data}',
            'language': 'eng',
            'isOverlayRequired': False,
            'detectOrientation': True,
            'scale': True,
            'OCREngine': 2,
        }

        response = requests.post(OCR_SPACE_URL, data=payload, timeout=30)
        result = response.json()

        if result.get('IsErroredOnProcessing'):
            error_msg = result.get('ErrorMessage', ['OCR processing failed'])
            return f'OCR Error: {error_msg[0] if isinstance(error_msg, list) else error_msg}'

        parsed_results = result.get('ParsedResults', [])
        if parsed_results:
            text = parsed_results[0].get('ParsedText', '').strip()
            return text if text else 'No text detected in the image.'

        return 'No text detected in the image.'

    except requests.Timeout:
        return 'OCR service timed out. Please try again.'
    except requests.RequestException as e:
        return f'OCR service error: {str(e)}'
    except Exception as e:
        return f'OCR processing error: {str(e)}'
