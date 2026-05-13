"""
NexusAI — Input Validation & Sanitization
"""

import os
from config import ALLOWED_IMAGE_TYPES, ALLOWED_AUDIO_TYPES


def validate_message(message):
    """Validate a chat message input."""
    if not message or not isinstance(message, str):
        return False, 'Message must be a non-empty string.'
    message = message.strip()
    if len(message) == 0:
        return False, 'Message cannot be blank.'
    if len(message) > 10000:
        return False, 'Message exceeds maximum length (10,000 characters).'
    return True, message


def validate_file_type(filename, allowed_types):
    """Check if a filename has an allowed extension."""
    if not filename:
        return False
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in allowed_types


def validate_image_file(file):
    """Validate an uploaded image file."""
    if file is None:
        return False, 'No image file provided.'
    if not file.filename:
        return False, 'Image file has no filename.'
    if not validate_file_type(file.filename, ALLOWED_IMAGE_TYPES):
        return False, f'Unsupported image type. Allowed: {", ".join(ALLOWED_IMAGE_TYPES)}'
    return True, None


def validate_audio_file(file):
    """Validate an uploaded audio file."""
    if file is None:
        return False, 'No audio file provided.'
    if not file.filename:
        return False, 'Audio file has no filename.'
    if not validate_file_type(file.filename, ALLOWED_AUDIO_TYPES):
        return False, f'Unsupported audio type. Allowed: {", ".join(ALLOWED_AUDIO_TYPES)}'
    return True, None


def sanitize_text(text):
    """Basic text sanitization — strip control characters."""
    if not text:
        return ''
    # Remove null bytes and other problematic control chars (keep newlines/tabs)
    cleaned = ''.join(
        ch for ch in text
        if ch in ('\n', '\r', '\t') or (ord(ch) >= 32)
    )
    return cleaned.strip()


def validate_temperature(value):
    """Validate temperature parameter."""
    try:
        temp = float(value)
        return max(0.0, min(1.0, temp))
    except (TypeError, ValueError):
        return 0.7


def validate_model(model_str):
    """Validate model name against known models."""
    known_models = {
        'llama-3.3-70b-versatile',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'mixtral-8x7b-32768',
        'llama-3.1-8b-instant',
    }
    if model_str in known_models:
        return model_str
    return 'llama-3.3-70b-versatile'


def safe_filename(filename):
    """Generate a safe filename for uploads."""
    import uuid
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f'{uuid.uuid4().hex[:12]}.{ext}'
