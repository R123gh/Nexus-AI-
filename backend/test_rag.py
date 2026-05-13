import os
import requests

def test_rag():
    BASE_URL = 'http://127.0.0.1:5000/api/rag'
    
    print("1. Creating a new Knowledge Base...")
    create_resp = requests.post(f'{BASE_URL}/create', json={'name': 'Test KB', 'description': 'A KB for testing'})
    if create_resp.status_code != 201:
        print(f"Failed to create KB: {create_resp.text}")
        return
    
    kb_id = create_resp.json()['id']
    print(f"Created KB with ID: {kb_id}")
    
    print("\n2. Creating a sample text document...")
    sample_text = "NexusAI is a multi-modal assistant. The secret launch code is ALPHA-99. It supports voice, image, and RAG."
    with open('sample_doc.txt', 'w') as f:
        f.write(sample_text)
        
    print("\n3. Uploading document to KB...")
    with open('sample_doc.txt', 'rb') as f:
        upload_resp = requests.post(f'{BASE_URL}/{kb_id}/upload', files={'file': ('sample_doc.txt', f)})
        
    if upload_resp.status_code != 200:
        print(f"Failed to upload: {upload_resp.text}")
    else:
        print("Upload successful!")
        
    print("\n4. Testing chunk retrieval logic manually (simulating chat route)...")
    from services.rag_engine import retrieve_chunks
    chunks = retrieve_chunks(kb_id, "What is the secret launch code?")
    if chunks:
        print(f"Success! Retrieved {len(chunks)} relevant chunks.")
        print(f"Top chunk: {chunks[0]['text']}")
    else:
        print("Failed: No chunks retrieved.")
        
    print("\n5. Testing /chat endpoint (expected to fail with Groq API Key error)...")
    chat_resp = requests.post(f'{BASE_URL}/{kb_id}/chat', json={'message': 'What is the secret launch code?'})
    print(f"Chat response: HTTP {chat_resp.status_code} - {chat_resp.json()}")

if __name__ == '__main__':
    test_rag()
