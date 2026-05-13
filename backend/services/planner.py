import json
import re
from services.groq_service import chat_completion
from config import DEFAULT_CHAT_MODEL
from services.orchestrator import run_orchestrator

PLANNER_PROMPT = """You are the NexusAI Strategic Architect. 
Your goal is to analyze a complex user request, determine the domain (e.g., Tech, Business, Marketing, Science, Legal), assume the appropriate expert persona, and break the request down into a series of highly structured, executable sub-tasks.

RESPONSE FORMAT:
You MUST respond with ONLY valid JSON in this exact format:
{
    "domain": "The core domain (e.g., 'Business', 'Tech', 'Creative')",
    "persona": "The expert persona to assume (e.g., 'Senior Solutions Architect', 'MBA Business Strategist')",
    "tasks": [
        "Phase 1: Research and analyze current market data",
        "Phase 2: Draft technical implementation strategy",
        ...
    ]
}

Example:
User: "Write a business plan for a SaaS AI video editor."
Result: {
    "domain": "Business",
    "persona": "Startup Founder & Business Strategist",
    "tasks": ["Conduct competitive analysis of AI video editors", "Define target audience and pricing model", "Outline go-to-market strategy", "Draft financial projections"]
}
"""

class StrategicPlanner:
    """Handles advanced goal decomposition using domain-specific expert personas."""
    
    def decompose_goal(self, prompt, api_key, model=None):
        """Break down a complex goal into sub-tasks with an expert persona."""
        response, usage = chat_completion(
            messages=[{'role': 'system', 'content': PLANNER_PROMPT},
                      {'role': 'user', 'content': f"Decompose this goal: {prompt}"}],
            api_key=api_key,
            model=model or DEFAULT_CHAT_MODEL,
            temperature=0.2
        )
        
        try:
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                cleaned = re.sub(r'\s*```$', '', cleaned)
                
            plan = json.loads(cleaned)
            return plan
        except Exception as e:
            # Fallback
            return {
                "domain": "General",
                "persona": "AI Assistant",
                "tasks": [prompt]
            }

    def execute_advanced_goal(self, prompt, api_key, history=None, model=None):
        """Decompose and then execute the plan step-by-step using the expert persona."""
        plan = self.decompose_goal(prompt, api_key, model)
        
        domain = plan.get('domain', 'General')
        persona = plan.get('persona', 'AI Assistant')
        tasks = plan.get('tasks', [prompt])
        
        if len(tasks) <= 1:
            # Simple task, run through normal orchestrator
            return run_orchestrator(prompt, api_key, history, model)
        
        context_results = []
        full_report = f"### Strategic Plan: {prompt}\n\n**Domain:** {domain} | **Expertise:** {persona}\n\n"
        
        for i, task in enumerate(tasks):
            print(f"[*] Executing Phase {i+1}/{len(tasks)}: {task} (as {persona})")
            
            # Run sub-task with previous context and the expert persona
            sub_prompt = f"As a {persona}, complete this task: '{task}'.\n\nContext from previous phases:\n{' '.join(context_results[-2:])}"
            
            # We use the autonomous orchestrator to solve each sub-task
            result = run_orchestrator(sub_prompt, api_key, history, model)
            
            context_results.append(result)
            full_report += f"#### Phase {i+1}: {task}\n{result}\n\n"
            
        # Final synthesis
        synthesis_prompt = f"You are acting as a {persona} specializing in {domain}. Synthesize the following multi-phase research into a final, professional, and comprehensive report/solution for the user's original request.\n\nOriginal Request: {prompt}\n\nExecution Report:\n{full_report}"
        
        final_answer, usage = chat_completion(
            messages=[{'role': 'system', 'content': 'You are a master synthesizer. Format your response beautifully using markdown (headers, bullet points, code blocks if necessary).'},
                      {'role': 'user', 'content': synthesis_prompt}],
            api_key=api_key,
            model=model or DEFAULT_CHAT_MODEL,
            temperature=0.4
        )
        
        return final_answer

# Global instance
planner = StrategicPlanner()
