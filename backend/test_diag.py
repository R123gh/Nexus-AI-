import requests

API_BASE = "http://127.0.0.1:5000/api/ds"
SESSION_ID = "test_diag"

def test_diag():
    print("Testing /test-post...")
    res = requests.post(f"{API_BASE}/test-post")
    print("Test Status:", res.status_code)
    try: print("Test JSON:", res.json())
    except: print("Test Text:", res.text[:200])

    print("\nTesting /run-inference...")
    res = requests.post(f"{API_BASE}/run-inference", json={"session_id": SESSION_ID, "inputs": {}})
    print("Inference Status:", res.status_code)
    try: print("Inference JSON:", res.json())
    except: print("Inference Text:", res.text[:200])

if __name__ == "__main__":
    test_diag()
