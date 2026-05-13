import json
from services.groq_service import chat_completion
from services.brain import brain
from services.memory import memory
from services.orchestrator import web_search
from config import DEFAULT_CHAT_MODEL

PREDICTIVE_PROMPT = """You are the NexusAI Predictive Life Assistant. 
Your goal is to analyze the user's recent activity and semantic memory to provide a proactive, helpful "Insight" or "Resource" that saves them time.

Based on the provided data, identify the user's current focus and suggest 3 high-value resources or a helpful next step.

RESPONSE FORMAT:
{
    "focus": "The topic the user is currently interested in",
    "insight": "A proactive suggestion or helpful observation",
    "resources": [{"title": "...", "url": "..."}, ...]
}
"""

class PredictiveAssistant:
    """Proactively offers help based on user history."""
    
    def get_proactive_insight(self, user_id, api_key):
        """Analyze user state and generate a proactive insight."""
        try:
            # 1. Gather context
            recent_events = memory.get_user_logs(user_id, limit=10)
            semantic_facts = brain.recall_facts(user_id, "current interests", n_results=5)
            
            context = {
                'recent_activity': [e['event_type'] for e in recent_events],
                'semantic_memory': semantic_facts
            }

            # 2. Analyze focus using LLM
            analysis_prompt = f"Analyze this user context and predict their next need or current research focus.\n\nContext: {json.dumps(context)}"
            
            analysis, usage = chat_completion(
                messages=[{'role': 'system', 'content': PREDICTIVE_PROMPT},
                          {'role': 'user', 'content': analysis_prompt}],
                api_key=api_key,
                model=DEFAULT_CHAT_MODEL,
                temperature=0.3
            )
            
            prediction = json.loads(analysis.strip())
            focus = prediction.get('focus', 'General Productivity')
            
            # 3. Augment with fresh web resources if focus is specific
            if focus and focus != 'General Productivity':
                search_results = web_search(f"Top 3 curated resources for {focus}", max_results=3)
                try:
                    urls = json.loads(search_results)
                    prediction['resources'] = [{'title': r['title'], 'url': r['link']} for r in urls]
                except:
                    pass
            
            return prediction
            
        except Exception as e:
            print(f"Predictive Error: {str(e)}")
            return {
                "focus": "Personalization",
                "insight": "I'm still learning your patterns. Tell me more about your goals!",
                "resources": []
            }

# Global instance
predictive_assistant = PredictiveAssistant()
