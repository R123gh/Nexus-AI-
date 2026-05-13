import json
from services.groq_service import chat_completion
from services.orchestrator import web_search
from services.scraper_service import scrape_webpage
from services.planner import planner
from config import DEFAULT_CHAT_MODEL

SHOPPING_PROMPT = """You are the NexusAI Smart Shopping Agent. 
Your goal is to find the best value for a product by searching multiple retailers and analyzing reviews.

You should:
1. Search for the product on major retail sites (Amazon, eBay, etc.).
2. Compare prices, including estimated shipping.
3. Extract key features and specifications.
4. Synthesize user reviews into a "Pros vs. Cons" list.
5. Provide a "Value Score" (1-10) and a final recommendation.
"""

class ShoppingAgent:
    """Specialized agent for product research and price comparison."""
    
    def search_product(self, product_name, api_key, model=None):
        """Perform deep shopping research on a product."""
        # 1. Plan the shopping research
        plan_prompt = f"Find the best price and reviews for: {product_name}. Check at least 3 different retailers and look for user feedback on Reddit or forums."
        shopping_tasks = planner.decompose_goal(plan_prompt, api_key)
        
        gathered_data = []
        
        for task in shopping_tasks:
            print(f"[Shopping] Task: {task}")
            search_results = web_search(task, max_results=4)
            gathered_data.append(f"Search Query: {task}\nResults: {search_results}")
            
            # Scrape a couple of top results for deeper analysis (e.g. detailed specs or reviews)
            try:
                results = json.loads(search_results)
                for res in results[:2]:
                    url = res.get('link')
                    if url:
                        print(f"[Shopping] Scraping for details: {url}")
                        content = scrape_webpage(url)
                        gathered_data.append(f"Details from {url}:\n{content[:1500]}")
            except:
                pass

        # 2. Synthesize into Shopping Report
        synthesis_prompt = f"""Based on the gathered data, create a comprehensive Shopping Report for: {product_name}.
Include a Price Comparison Table, Pros/Cons from reviews, and your final recommendation.

Gathered Data:
{' '.join(gathered_data)}
"""
        
        report, usage = chat_completion(
            messages=[{'role': 'system', 'content': SHOPPING_PROMPT},
                      {'role': 'user', 'content': synthesis_prompt}],
            api_key=api_key,
            model=model or DEFAULT_CHAT_MODEL,
            temperature=0.3
        )
        
        return report

# Global instance
shopping_agent = ShoppingAgent()
