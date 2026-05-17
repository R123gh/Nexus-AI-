import os
import json
import uuid
import time
import chromadb
from chromadb.utils import embedding_functions
from utils.file_parser import extract_text_from_file

# Paths
RAG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'rag')
META_FILE = os.path.join(RAG_DIR, 'rag_meta.json')
DB_PATH = os.path.join(RAG_DIR, 'chroma_db')

os.makedirs(RAG_DIR, exist_ok=True)
os.makedirs(DB_PATH, exist_ok=True)

# Initialize Metadata
if not os.path.exists(META_FILE):
    with open(META_FILE, 'w') as f:
        json.dump([], f)

# Initialize ChromaDB Client
# Using PersistentClient for storage across restarts
chroma_client = chromadb.PersistentClient(path=DB_PATH)
# Default embedding function (all-MiniLM-L6-v2)
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

def get_kbs():
    """Retrieve all knowledge base metadata."""
    try:
        with open(META_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_kbs(kbs):
    """Save knowledge base metadata."""
    with open(META_FILE, 'w') as f:
        json.dump(kbs, f, indent=4)

def get_kb_collection(kb_id):
    """Get or create a ChromaDB collection for a specific KB."""
    return chroma_client.get_or_create_collection(
        name=f"kb_{kb_id}",
        embedding_function=embedding_fn
    )

def create_kb(name, description):
    """Create a new knowledge base entry."""
    kbs = get_kbs()
    kb_id = uuid.uuid4().hex[:12]
    kb = {
        'id': kb_id,
        'name': name,
        'description': description,
        'files': [],
        'created_at': time.time()
    }
    kbs.append(kb)
    save_kbs(kbs)
    
    # Initialize the collection in Chroma
    get_kb_collection(kb_id)
    
    return kb

def chunk_text(text, chunk_size=500, overlap=100):
    """
    Split text into overlapping chunks for better context retention.
    Step 1.1: Pre-processing for Embeddings.
    """
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 50:
            chunks.append(chunk)
    return chunks

def add_file_to_kb(kb_id, file_path, original_filename):
    """
    Ingest a file into the knowledge base.
    Workflow: Extract -> Chunk -> Embed -> Store in Vector DB.
    """
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb:
        raise ValueError("Knowledge Base not found")
        
    # 1. Extract text
    text = extract_text_from_file(file_path)
    if not text or (isinstance(text, str) and text.startswith("Error")):
        raise ValueError(f"Text extraction failed: {text}")
        
    # 2. Chunk text
    chunks = chunk_text(text)
    
    # 3. Store in Vector Database (ChromaDB)
    # Chroma handles Step 2 (Embedding) automatically during .add()
    collection = get_kb_collection(kb_id)
    
    ids = [f"{kb_id}_{original_filename}_{i}" for i in range(len(chunks))]
    metadatas = [{"source": original_filename, "chunk_idx": i} for i in range(len(chunks))]
    
    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )
    
    # Update metadata
    if original_filename not in kb['files']:
        kb['files'].append(original_filename)
    
    save_kbs(kbs)
    return kb

def delete_kb(kb_id):
    """Delete a knowledge base and its vector collection."""
    kbs = get_kbs()
    kbs = [k for k in kbs if k['id'] != kb_id]
    save_kbs(kbs)
    
    try:
        chroma_client.delete_collection(name=f"kb_{kb_id}")
    except:
        pass
    return True

def delete_file_from_kb(kb_id, filename):
    """Remove a specific file's vectors from the KB."""
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb:
        raise ValueError("Knowledge Base not found")
    
    # Delete from Chroma
    collection = get_kb_collection(kb_id)
    collection.delete(where={"source": filename})
    
    # Update metadata
    kb['files'] = [f for f in kb['files'] if f != filename]
    save_kbs(kbs)
    return kb

def retrieve_chunks(kb_id, query, top_k=5, threshold=None):
    """
    CORE RAG STEP 2 & 3: Convert query to embeddings and retrieve relevant documents.
    """
    # Performance Optimization: Bypass Vector DB queries if KB is empty to save ~8+ seconds of load time
    kbs = get_kbs()
    kb = next((k for k in kbs if k['id'] == kb_id), None)
    if not kb or not kb.get('files'):
        return []

    try:
        collection = get_kb_collection(kb_id)
        if collection.count() == 0:
            return []
            
        # Step 2 & 3: Embed query and search Vector DB
        results = collection.query(
            query_texts=[query],
            n_results=top_k
        )
        
        formatted_results = []
        # Chroma returns results in lists of lists
        docs = results.get('documents', [[]])[0]
        metas = results.get('metadatas', [[]])[0]
        distances = results.get('distances', [[]])[0] if 'distances' in results else [0] * len(docs)
        
        for i in range(len(docs)):
            # Convert distance to a similarity score (0 to 1)
            # L2 distance: lower is better. 
            score = 1.0 / (1.0 + distances[i]) if i < len(distances) else 0.5
            
            formatted_results.append({
                'text': docs[i],
                'source': metas[i].get('source', 'Unknown'),
                'score': score
            })
            
        return formatted_results
    except Exception as e:
        return []

def get_all_chunks(kb_id):
    """Retrieve all chunks stored in ChromaDB for a specific KB."""
    try:
        collection = get_kb_collection(kb_id)
        results = collection.get()
        
        docs = results.get('documents', [])
        metas = results.get('metadatas', [])
        
        formatted_chunks = []
        for i in range(len(docs)):
            formatted_chunks.append({
                'text': docs[i],
                'source': metas[i].get('source', 'Unknown') if i < len(metas) and metas[i] else 'Unknown'
            })
        return formatted_chunks
    except Exception as e:
        print(f"Error fetching chunks from Chroma: {e}")
        return []

