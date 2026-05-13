"""
NexusAI — Security Module
Action whitelist enforcement and dangerous command blocking.
"""

from config import ALLOWED_ACTIONS, BLOCKED_COMMANDS


def is_action_allowed(action_type):
    """Check if an action type is in the whitelist."""
    return action_type in ALLOWED_ACTIONS


def is_command_safe(command_str):
    """
    Check if a command string is safe to execute.
    Blocks any command containing dangerous keywords.
    """
    if not command_str:
        return False
    tokens = command_str.lower().split()
    for token in tokens:
        # Strip path separators to catch things like /bin/rm
        base = token.rsplit('/', 1)[-1].rsplit('\\', 1)[-1]
        if base in BLOCKED_COMMANDS:
            return False
    # Block shell operators that could chain dangerous commands
    dangerous_operators = ['&&', '||', ';', '|', '>', '>>', '<']
    for op in dangerous_operators:
        if op in command_str:
            return False
    return True


def sanitize_url(url):
    """
    Sanitize a URL for safe opening.
    Only allows http/https protocols.
    """
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    # Auto-prepend https if no protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    # Block dangerous protocols
    if url.startswith(('file://', 'javascript:', 'data:', 'ftp://')):
        return None
    return url


def validate_action_request(action_type, params=None):
    """
    Fully validate an action request.
    Returns (is_valid, error_message).
    """
    if not action_type:
        return False, 'No action type specified.'

    if not is_action_allowed(action_type):
        return False, f'Action "{action_type}" is not allowed. Permitted: {", ".join(ALLOWED_ACTIONS)}'

    # Validate params for URL-based actions
    if action_type in ('open_url', 'search_web'):
        if not params:
            return False, f'Action "{action_type}" requires parameters.'
        url = params.get('url', '') or params.get('query', '')
        if not url:
            return False, f'Action "{action_type}" requires a URL or query.'

    return True, None
