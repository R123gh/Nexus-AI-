"""
NexusAI — Groq API Service (Resilient Requests Edition)
Uses standard requests library to avoid SDK/eventlet conflicts on Windows.
"""

import os
import requests
import json
import base64
import time
from config import DEFAULT_CHAT_MODEL, DEFAULT_VISION_MODEL, DEFAULT_STT_MODEL

API_URL = "https://api.groq.com/openai/v1/chat/completions"

def _get_headers(api_key):
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

def chat_completion(messages, api_key, model=None, temperature=0.7):
    """
    Generate a chat completion using raw requests for maximum stability.
    """
    payload = {
        "model": model or DEFAULT_CHAT_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 2048
    }

    # Validate API key upfront to avoid wasted network calls
    if not api_key or api_key.strip() in ('', 'undefined', 'null', 'none'):
        raise Exception("Groq API key not configured. Please set it in Settings.")

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = requests.post(
                API_URL, 
                headers=_get_headers(api_key), 
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content'], data.get('usage')
            
            # Auth errors should NEVER retry — fail immediately
            if response.status_code == 401:
                raise Exception("Invalid Groq API Key. Please check your key in Settings.")
            if response.status_code == 429:
                time.sleep(1)  # brief rate-limit pause
                continue
                
            raise Exception(f"Groq API returned {response.status_code}: {response.text}")
            
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                time.sleep(0.5)
                continue
            raise Exception(f"Connection to Groq failed: {str(e)}")

def chat_completion_stream(messages, api_key, model=None, temperature=0.7):
    """
    Generate a streaming chat completion using requests stream.
    """
    payload = {
        "model": model or DEFAULT_CHAT_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 2048,
        "stream": True
    }

    # Validate API key upfront to fail fast
    if not api_key or api_key.strip() in ('', 'undefined', 'null', 'none'):
        raise Exception("Groq API key not configured. Please set it in Settings.")

    try:
        response = requests.post(
            API_URL, 
            headers=_get_headers(api_key), 
            json=payload,
            timeout=45,
            stream=True
        )
        
        if response.status_code == 401:
            raise Exception("Invalid Groq API Key. Please check your key in Settings.")
        if response.status_code != 200:
            raise Exception(f"Groq API error ({response.status_code}): {response.text[:200]}")

        for line in response.iter_lines():
            if line:
                line_text = line.decode('utf-8')
                if line_text.startswith('data: '):
                    data_str = line_text[6:]
                    if data_str.strip() == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        content = data['choices'][0].get('delta', {}).get('content')
                        if content:
                            yield content
                    except:
                        continue
    except requests.exceptions.RequestException as e:
        raise Exception(f"Connection to Groq failed: {str(e)}")

def transcribe_audio(file_path, api_key):
    """
    Transcribe audio using requests to Groq Whisper endpoint.
    """
    STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
    
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        data = {"model": DEFAULT_STT_MODEL, "response_format": "text"}
        
        response = requests.post(
            STT_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files=files,
            data=data,
            timeout=60
        )
        
    if response.status_code == 200:
        return response.text.strip()
    raise Exception(f"Transcription failed: {response.text}")

def analyze_image(image_path, question, api_key, model=None):
    """
    Analyze image using requests.
    """
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    ext = image_path.rsplit('.', 1)[-1].lower()
    mime_type = f"image/{ext}" if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp'] else 'image/png'

    messages = [
        {
            'role': 'user',
            'content': [
                {'type': 'text', 'text': question or 'Describe this image.'},
                {'type': 'image_url', 'image_url': {'url': f'data:{mime_type};base64,{image_data}'}}
            ],
        }
    ]
    
    return chat_completion(messages, api_key, model or DEFAULT_VISION_MODEL)
