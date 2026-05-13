"""
NexusAI — Central Configuration
Loads API keys from environment variables or request headers.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── API Keys ────────────────────────────────────────────────
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
OCR_SPACE_API_KEY = os.getenv('OCR_SPACE_API_KEY', '')
MONGO_URI = os.getenv('MONGO_URI', '')


# ─── Model Defaults ──────────────────────────────────────────
DEFAULT_CHAT_MODEL = 'llama-3.3-70b-versatile'
FAST_MODEL = 'llama-3.1-8b-instant'
DEFAULT_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
DEFAULT_STT_MODEL = 'whisper-large-v3-turbo'
DEFAULT_TEMPERATURE = 0.7

# ─── Upload Config ────────────────────────────────────────────
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

# ─── Allowed File Types ───────────────────────────────────────
ALLOWED_IMAGE_TYPES = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_AUDIO_TYPES = {'webm', 'wav', 'mp3', 'ogg', 'm4a'}

# ─── Action Whitelist ─────────────────────────────────────────
ALLOWED_ACTIONS = {
    'open_youtube',
    'open_google',
    'open_url',
    'search_web',
    'open_app',
    'scrape_url',
    'get_weather',
    'list_files',
    'move_file',
    'create_file',
    'delete_file',
}

# ─── Dangerous Commands (blocked) ─────────────────────────────
BLOCKED_COMMANDS = {
    'rm', 'del', 'format', 'shutdown', 'reboot',
    'mkfs', 'dd', 'fdisk', 'diskpart', 'rmdir',
    'kill', 'taskkill', 'reg', 'regedit',
}

# ─── Memory Config ────────────────────────────────────────────
MAX_HISTORY_PER_SESSION = 20
MAX_SESSIONS = 100
SESSION_TTL_SECONDS = 3600  # 1 hour


def get_groq_key(request=None):
    """Get Groq API key from request header or environment."""
    if request:
        header_key = request.headers.get('X-Groq-Key', '').strip()
        if header_key:
            return header_key
    return GROQ_API_KEY


def get_ocr_key(request=None):
    """Get OCR.space API key from request header or environment."""
    if request:
        header_key = request.headers.get('X-OCR-Key', '').strip()
        if header_key:
            return header_key
    return OCR_SPACE_API_KEY
