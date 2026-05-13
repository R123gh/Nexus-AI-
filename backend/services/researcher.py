import json
from services.groq_service import chat_completion
from services.orchestrator import web_search
from services.scraper_service import scrape_webpage
from services.planner import planner
from config import DEFAULT_CHAT_MODEL

RESEARCHER_PROMPT = """You are the NexusAI Deep Researcher. 
Your goal is to perform exhaustive research on a topic by gathering data from multiple sources and synthesizing it into a high-quality, professional report with citations.

You should:
1. Identify multiple research angles.
2. Search for diverse viewpoints.
3. Extract key data points, statistics, and expert opinions.
4. Provide a structured report with:
   - Executive Summary
   - Key Findings
   - Detailed Analysis
   - Conclusion
   - Sources Cited
"""

class DeepResearcher:
    """Specialized agent for multi-step, multi-source research."""
    
    def perform_research(self, topic, api_key, model=None):
        """Conduct deep research on a topic."""
        # 1. Use Planner to create a research plan
        plan_prompt = f"Plan a deep research project on: {topic}. Include steps for finding background, current status, key players, and future outlook."
        research_tasks = planner.decompose_goal(plan_prompt, api_key)
        
        gathered_data = []
        
        for task in research_tasks:
            print(f"[Research] Executing: {task}")
            # Simplified research loop for each task
            search_results = web_search(task, max_results=3)
            gathered_data.append(f"Task: {task}\nResults: {search_results}")
            
            # Extract URLs to scrape
            try:
                urls = [r.get('link') for r in json.loads(search_results) if r.get('link')]
                for url in urls[:1]: # Scrape at least one top result per task
                    print(f"[Research] Scraping: {url}")
                    content = scrape_webpage(url)
                    gathered_data.append(f"Source Content ({url}):\n{content[:2000]}") # Limit per source
            except:
                pass

        # 2. Final Synthesis into Report
        synthesis_prompt = f"""Based on the following research data, create a professional, detailed research report on "{topic}". 
Use citations like [Source: URL] where applicable.

Research Data:
{' '.join(gathered_data)}
"""
        
        report, usage = chat_completion(
            messages=[{'role': 'system', 'content': RESEARCHER_PROMPT},
                      {'role': 'user', 'content': synthesis_prompt}],
            api_key=api_key,
            model=model or DEFAULT_CHAT_MODEL,
            temperature=0.3
        )
        
        return report

# Global instance
researcher = DeepResearcher()
