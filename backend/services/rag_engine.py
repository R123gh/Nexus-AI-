import os
import json
import uuid
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils.file_parser import extract_text_from_file

RAG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'rag')
META_FILE = os.path.join(RAG_DIR, 'rag_meta.json')

os.makedirs(RAG_DIR, exist_ok=True)

if not os.path.exists(META_FILE):
    with open(META_FILE, 'w') as f:
        json.dump([], f)

def get_kbs():
    with open(META_FILE, 'r') as f:
        return json.load(f)

def save_kbs(kbs):
    with open(META_FILE, 'w') as f:
        json.dump(kbs, f, indent=4)

def _index_kb(kb):
    """Consistently re-index a KB from its chunks."""
    texts = [c['text'] for c in kb['chunks']]
    kb_dir = os.path.join(RAG_DIR, kb['id'])
    os.makedirs(kb_dir, exist_ok=True)
    
    if not texts:
        # Clean up if empty
        for p in ['vectorizer.pkl', 'matrix.pkl']:
            path = os.path.join(kb_dir, p)
            if os.path.exists(path): os.remove(path)
        return
        
    print(f"Re-indexing KB {kb['id']} with {len(texts)} chunks...")
    vectorizer = TfidfVectorizer(
        stop_words='english', 
        ngram_range=(1, 2),
        lowercase=True,
        max_df=0.9,
        min_df=1
    )
    tfidf_matrix = vectorizer.fit_transform(texts)
    
    with open(os.path.join(kb_dir, 'vectorizer.pkl'), 'wb') as f:
        pickle.dump(vectorizer, f)
    with open(os.path.join(kb_dir, 'matrix.pkl'), 'wb') as f:
        pickle.dump(tfidf_matrix, f)

def create_kb(name, description):
    kbs = get_kbs()
    kb_id = f"kb_{uuid.uuid4().hex[:8]}"
    kb = {
        'id': kb_id,
        'name': name,
        'description': description,
        'files': [],
        'chunks': []
    }
    kbs.append(kb)
    save_kbs(kbs)
    return kb

def chunk_text(text, chunk_size=400, overlap=80):
    """Improved chunking for better context retention."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 30:
            chunks.append(chunk)
    return chunks

def add_file_to_kb(kb_id, file_path, original_filename):
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb:
        raise ValueError("Knowledge Base not found")
        
    text = extract_text_from_file(file_path)
    if not text.strip():
        raise ValueError("Could not extract any text from the file")
        
    new_chunks = chunk_text(text)
    
    for i, c in enumerate(new_chunks):
        kb['chunks'].append({
            'source': original_filename,
            'text': c
        })
        
    if original_filename not in kb['files']:
        kb['files'].append(original_filename)
    
    # Use centralized indexing
    _index_kb(kb)
    save_kbs(kbs)
    return kb

def delete_kb(kb_id):
    kbs = get_kbs()
    kbs = [k for k in kbs if k['id'] != kb_id]
    save_kbs(kbs)
    kb_dir = os.path.join(RAG_DIR, kb_id)
    if os.path.exists(kb_dir):
        import shutil
        shutil.rmtree(kb_dir)
    return True

def delete_file_from_kb(kb_id, filename):
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb:
        raise ValueError("Knowledge Base not found")
    
    # Remove file and its chunks
    kb['files'] = [f for f in kb['files'] if f != filename]
    kb['chunks'] = [c for c in kb['chunks'] if c['source'] != filename]
    
    # Re-index
    _index_kb(kb)
    save_kbs(kbs)
    return kb

def retrieve_chunks(kb_id, query, top_k=6, threshold=0.01):
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb or not kb['chunks']:
        return []
        
    kb_dir = os.path.join(RAG_DIR, kb_id)
    vec_path = os.path.join(kb_dir, 'vectorizer.pkl')
    mat_path = os.path.join(kb_dir, 'matrix.pkl')
    
    # AUTO-REINDEX if files are missing or mismatch suspected
    if not os.path.exists(vec_path) or not os.path.exists(mat_path):
        _index_kb(kb)
        
    try:
        with open(vec_path, 'rb') as f:
            vectorizer = pickle.load(f)
        with open(mat_path, 'rb') as f:
            tfidf_matrix = pickle.load(f)
            
        # Ensure query is processed the same way
        query_vec = vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()
        
        results = []
        indices = similarities.argsort()[::-1]
        
        for idx in indices:
            score = float(similarities[idx])
            if score < threshold or len(results) >= top_k:
                break
                
            chunk = kb['chunks'][idx].copy()
            chunk['score'] = score
            results.append(chunk)
        
        # Fallback: if no results above threshold, return top 3 anyway to provide SOME context
        if not results and kb['chunks']:
            for idx in indices[:3]:
                chunk = kb['chunks'][idx].copy()
                chunk['score'] = float(similarities[idx])
                results.append(chunk)

                
        return results
    except Exception as e:
        print(f"Retrieval Error: {str(e)}. Attempting re-index...")
        _index_kb(kb)
        return []
