"""
NexusAI — Intent Classification Engine
Uses LLM + keyword fast-path to classify user input into:
  chat, search, action, vision
"""

import json
import re
from services.groq_service import chat_completion
from config import DEFAULT_CHAT_MODEL, FAST_MODEL


# ─── Keyword-Based Fast Path ─────────────────────────────────
# Catches common commands before hitting the LLM for speed.

ACTION_PATTERNS = [
    # YouTube
    (r'\b(?:open|launch|play|go to)\b.*\byoutube\b', {
        'intent': 'action',
        'action_type': 'open_youtube',
        'params': {'url': 'https://www.youtube.com'},
        'response': 'Opening YouTube for you!'
    }),
    # Google
    (r'\b(?:open|launch|go to)\b.*\bgoogle\b', {
        'intent': 'action',
        'action_type': 'open_google',
        'params': {'url': 'https://www.google.com'},
        'response': 'Opening Google for you!'
    }),
    # Generic URL opening
    (r'\b(?:open|launch|navigate|go to)\b.*\b(https?://\S+|[\w.-]+\.(?:com|org|net|io|dev|co|ai)\S*)\b', None),
    # Web search
    (r'\b(?:search|look up|find|google)\b\s+(?:for\s+)?(.+)', None),
]


def _keyword_classify(text):
    """
    Attempt fast classification via regex patterns.
    Returns intent dict or None if no match.
    """
    lower = text.lower().strip()

    # Static action patterns (YouTube, Google)
    for pattern, static_result in ACTION_PATTERNS:
        match = re.search(pattern, lower, re.IGNORECASE)
        if match:
            if static_result:
                return static_result

            # Dynamic URL open
            if 'open' in lower or 'launch' in lower or 'navigate' in lower or 'go to' in lower:
                # Try to extract a URL
                url_match = re.search(r'(https?://\S+|[\w.-]+\.(?:com|org|net|io|dev|co|ai)\S*)', text, re.IGNORECASE)
                if url_match:
                    url = url_match.group(1)
                    if not url.startswith('http'):
                        url = 'https://' + url
                    return {
                        'intent': 'action',
                        'action_type': 'open_url',
                        'params': {'url': url},
                        'response': f'Opening {url_match.group(1)} for you!'
                    }

            # Dynamic search
            if 'search' in lower or 'look up' in lower or 'find' in lower:
                query_match = re.search(r'(?:search|look up|find|google)\s+(?:for\s+)?(.+)', text, re.IGNORECASE)
                if query_match:
                    query = query_match.group(1).strip().rstrip('.')
                    return {
                        'intent': 'action',
                        'action_type': 'search_web',
                        'params': {'query': query, 'url': f'https://www.google.com/search?q={query.replace(" ", "+")}'},
                        'response': f'Searching the web for "{query}"!'
                    }

            # Weather
            if 'weather' in lower or 'forecast' in lower or 'temperature' in lower:
                weather_match = re.search(r'(?:weather|forecast|temperature)\s+(?:in|for|at)\s+([a-zA-Z\s]+)', text, re.IGNORECASE)
                if weather_match:
                    location = weather_match.group(1).strip().rstrip('?')
                    return {
                        'intent': 'action',
                        'action_type': 'get_weather',
                        'params': {'location': location},
                        'response': f'Checking the weather in {location}...'
                    }

    return None


# ─── LLM-Based Classification ────────────────────────────────

INTENT_SYSTEM_PROMPT = """You are an intent classification engine. Analyze the user's message and determine the intent.

Respond with ONLY valid JSON (no markdown, no explanation) in this exact format:
{
    "intent": "chat" | "search" | "action" | "vision",
    "action_type": null | "open_youtube" | "open_google" | "open_url" | "search_web" | "open_app" | "scrape_url" | "get_weather" | "list_files" | "move_file" | "create_file" | "delete_file",
    "params": null | {"url": "...", "query": "...", "app": "...", "location": "...", "path": "...", "src": "...", "dst": "...", "content": "..."}
}

Intent categories:
- "chat": General conversation, questions, explanations, coding help
- "search": User wants to search for information on the web
- "action": User wants to open a website, application, perform a system action (list/move/create/delete files), read a webpage, or check weather.
- "vision": User is asking about an image (this is typically set by the system, not the user)

Examples:
- "What is Python?" → {"intent": "chat", "action_type": null, "params": null}
- "Open YouTube" → {"intent": "action", "action_type": "open_youtube", "params": {"url": "https://www.youtube.com"}}
- "Move the file report.txt to the backup folder" → {"intent": "action", "action_type": "move_file", "params": {"src": "report.txt", "dst": "backup/report.txt"}}
- "List files in my downloads" → {"intent": "action", "action_type": "list_files", "params": {"path": "C:/Users/name/Downloads"}}"""


def classify_intent(user_message, api_key, history=None, model=None, temperature=0.7):
    """
    Classify the user's intent using keyword fast-path + LLM fallback.

    Args:
        user_message: The raw user input text
        api_key: Groq API key
        history: Optional conversation history
        model: Model to use for LLM classification
        temperature: LLM temperature

    Returns:
        Dict with keys: intent, action_type, params, response
    """
    # Try keyword fast-path first
    fast_result = _keyword_classify(user_message)
    if fast_result:
        return fast_result, None

    # Fall back to LLM classification
    messages = [{'role': 'system', 'content': INTENT_SYSTEM_PROMPT}]

    # Add conversation history for context (last few messages)
    if history:
        for msg in history[-6:]:
            messages.append({
                'role': msg.get('role', 'user'),
                'content': msg.get('content', ''),
            })

    messages.append({'role': 'user', 'content': user_message})

    try:
        raw_response, usage = chat_completion(
            messages=messages,
            api_key=api_key,
            model=model or FAST_MODEL,
            temperature=temperature,
        )

        # Parse JSON from response
        # Strip markdown code fences if present
        cleaned = raw_response.strip()
        if cleaned.startswith('```'):
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)

        result = json.loads(cleaned)

        # Validate required fields
        if 'intent' not in result:
            raise ValueError('Missing required fields')

        return {
            'intent': result.get('intent', 'chat'),
            'action_type': result.get('action_type'),
            'params': result.get('params'),
            'response': result.get('response', ''),
        }, usage

    except (json.JSONDecodeError, ValueError, KeyError):
        # If LLM didn't return valid JSON, treat as chat and use the raw response
        # Make a simple chat call instead
        chat_messages = [
            {'role': 'system', 'content': 'You are NexusAI, a helpful, friendly, and knowledgeable AI assistant. Provide clear, concise, and accurate responses.'}
        ]
        if history:
            for msg in history[-10:]:
                chat_messages.append({
                    'role': msg.get('role', 'user'),
                    'content': msg.get('content', ''),
                })
        chat_messages.append({'role': 'user', 'content': user_message})

        response_text, usage = chat_completion(
            messages=chat_messages,
            api_key=api_key,
            model=model or DEFAULT_CHAT_MODEL,
            temperature=temperature,
        )

        return {
            'intent': 'chat',
            'action_type': None,
            'params': None,
            'response': response_text,
        }, usage
