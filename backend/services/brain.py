import chromadb
import os
import time
from chromadb.utils import embedding_functions
from services.groq_service import chat_completion
from config import DEFAULT_CHAT_MODEL, FAST_MODEL

# Persistent storage for ChromaDB
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'nexus_brain')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

class NexusBrain:
    """Semantic Long-Term Memory for NexusAI."""
    
    def __init__(self):
        self.client = chromadb.PersistentClient(path=DB_PATH)
        # Default embedding function
        self.embed_fn = embedding_functions.DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name="user_memory",
            embedding_function=self.embed_fn
        )
        # Add simple cache for faster lookups
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes

    def store_fact(self, user_id, content, metadata=None):
        """Store a fact or preference about the user."""
        id = f"fact_{int(time.time() * 1000)}"
        self.collection.add(
            documents=[content],
            metadatas=[{**(metadata or {}), "user_id": str(user_id)}],
            ids=[id]
        )
        return id

    def recall_facts(self, user_id, query, n_results=5):
        """Retrieve relevant facts for a given query."""
        # Check cache first
        cache_key = f"{user_id}_{query}_{n_results}"
        current_time = int(time.time())
        
        if cache_key in self._cache:
            cached_data, cache_time = self._cache[cache_key]
            if current_time - cache_time < self._cache_ttl:
                return cached_data
        
        # Query ChromaDB
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"user_id": str(user_id)}
        )
        documents = results.get('documents', [[]])[0]
        
        # Cache the result
        self._cache[cache_key] = (documents, current_time)
        
        # Clean up old cache entries (simple LRU)
        if len(self._cache) > 100:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
        
        return documents

    def extract_and_remember(self, user_id, message, api_key):
        """
        Analyze a user message to extract important facts or preferences 
        and store them in memory.
        """
        # Guard: don't waste an API call if key is missing/invalid
        if not api_key or api_key.strip() in ('', 'undefined', 'null', 'none'):
            return False

        try:
            prompt = f"""Extract any important facts, user preferences, or biographical details from the following message. 
If no new information is present, return "NONE".
Example: "I am a Python developer and I love dark mode." -> "User is a Python developer. User prefers dark mode."

Message: "{message}"
Result:"""
            
            extraction, usage = chat_completion(
                messages=[{'role': 'system', 'content': 'You are a knowledge extraction assistant.'},
                          {'role': 'user', 'content': prompt}],
                api_key=api_key,
                model=FAST_MODEL,
                temperature=0.1
            )
            
            if extraction.strip().upper() != "NONE":
                facts = extraction.split('\n')
                for fact in facts:
                    if fact.strip():
                        self.store_fact(user_id, fact.strip())
                return True
        except Exception as e:
            print(f"[Brain] Memory extraction skipped: {e}")
        return False

# Global instance
brain = NexusBrain()
