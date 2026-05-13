import json
from services.groq_service import chat_completion
from services.researcher import researcher
from config import DEFAULT_CHAT_MODEL

RESEARCHER_ROLE = """You are the Swarm Researcher. Your job is to gather accurate, detailed information on the topic. 
Focus on data points, statistics, and diverse perspectives."""

WRITER_ROLE = """You are the Swarm Writer. Your job is to take raw research data and transform it into a compelling, structured, and easy-to-read narrative or report."""

CHECKER_ROLE = """You are the Swarm Fact-Checker. Your job is to scrutinize the writer's draft for inaccuracies, hallucinations, or missing information. 
Provide a list of "Critiques" and a "Confidence Score" (0-100%)."""

class SwarmCoordinator:
    """Coordinates a swarm of specialized AI agents."""
    
    def __init__(self, api_key, model=None):
        self.api_key = api_key
        self.model = model or DEFAULT_CHAT_MODEL

    def run_swarm(self, task):
        """Execute a peer-reviewed collaborative workflow."""
        results = {}
        
        # 1. RESEARCH PHASE
        print(f"[Swarm] Phase 1: Researching '{task}'...")
        # Use existing researcher service for deep retrieval
        research_data = researcher.perform_research(task, self.api_key, self.model)
        results['research'] = research_data

        # 2. WRITING PHASE
        print(f"[Swarm] Phase 2: Writing draft...")
        writer_prompt = f"Based on this research, write a comprehensive response for the task: {task}\n\nResearch Data:\n{research_data}"
        draft, usage = chat_completion(
            messages=[{'role': 'system', 'content': WRITER_ROLE},
                      {'role': 'user', 'content': writer_prompt}],
            api_key=self.api_key,
            model=self.model,
            temperature=0.7
        )
        results['draft'] = draft

        # 3. FACT-CHECK PHASE
        print(f"[Swarm] Phase 3: Fact-checking...")
        checker_prompt = f"Scrutinize this draft against the original research. Point out errors or missing context.\n\nOriginal Research:\n{research_data}\n\nWriter's Draft:\n{draft}"
        critique, usage = chat_completion(
            messages=[{'role': 'system', 'content': CHECKER_ROLE},
                      {'role': 'user', 'content': checker_prompt}],
            api_key=self.api_key,
            model=self.model,
            temperature=0.2
        )
        results['critique'] = critique

        # 4. FINAL SYNTHESIS
        print(f"[Swarm] Phase 4: Final Synthesis...")
        synthesis_prompt = f"Refine the draft by incorporating the fact-checker's critiques. Produce the final, polished output.\n\nDraft:\n{draft}\n\nCritiques:\n{critique}"
        final_output, usage = chat_completion(
            messages=[{'role': 'system', 'content': 'You are the Swarm Synthesizer. Deliver the perfect final version.'},
                      {'role': 'user', 'content': synthesis_prompt}],
            api_key=self.api_key,
            model=self.model,
            temperature=0.3
        )
        
        results['final_output'] = final_output
        return results

# Functional helper
def execute_swarm(task, api_key, model=None):
    swarm = SwarmCoordinator(api_key, model)
    return swarm.run_swarm(task)
