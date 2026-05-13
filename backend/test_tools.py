import os
from config import GROQ_API_KEY
from services.ai_tools import execute_tool

def test_all_tools():
    # Provide a mock API key if not set, or we assume it's loaded by config.py
    # If the user hasn't set one, it will fail unless they have GROQ_API_KEY in their env.
    api_key = GROQ_API_KEY
    if not api_key:
        print("Warning: GROQ_API_KEY is not set. Tools may fail.")
        
    # We will just print the result of the prompt or mock the chat_completion.
    # Actually, let's just make a dry run or actual run if API key is present.
    # If API key is not present, we can't test the actual Groq API, but we can test if the functions don't crash.
    
    print("Testing salary-predictor...")
    try:
        r = execute_tool('salary-predictor', {'role': 'Dev', 'experience': '2 years', 'location': 'Delhi'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing resume-analyzer...")
    try:
        r = execute_tool('resume-analyzer', {'resume_text': 'I am a dev.', 'target_role': 'Dev'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing interview-prep...")
    try:
        r = execute_tool('interview-prep', {'role': 'Dev', 'experience_level': 'junior'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing code-debugger...")
    try:
        r = execute_tool('code-debugger', {'code': 'print(1)', 'language': 'python'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing email-writer...")
    try:
        r = execute_tool('email-writer', {'context': 'Requesting vacation', 'email_type': 'professional email', 'tone': 'formal'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing legal-explainer...")
    try:
        r = execute_tool('legal-explainer', {'legal_text': 'Party A agrees to indemnify Party B'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing business-validator...")
    try:
        r = execute_tool('business-validator', {'idea': 'A food delivery app for pets'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

    print("Testing math-solver...")
    try:
        r = execute_tool('math-solver', {'problem': '2x + 4 = 10', 'subject': 'mathematics'}, api_key)
        print("Success" if 'error' not in r else f"Failed: {r['error']}")
    except Exception as e:
        print(f"Crash: {e}")

if __name__ == '__main__':
    test_all_tools()
