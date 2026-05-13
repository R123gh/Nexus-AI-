"""
NexusAI — Autonomous Workflow Orchestrator
Breaks down complex user requests into tasks and executes them using available tools.
"""

import json
import re
from duckduckgo_search import DDGS
from services.groq_service import chat_completion
from services.ai_tools import execute_tool
from services.scraper_service import scrape_webpage
from services.rag_engine import retrieve_chunks, get_kbs
from config import DEFAULT_CHAT_MODEL

PLANNER_SYSTEM_PROMPT = """You are the NexusAI Orchestrator. Your goal is to solve complex multi-step problems by planning and executing tasks.

You have access to the following tools:
1. "web_search": Search the web for up-to-date information. (params: query)
2. "scrape_page": Scrape and read the content of a specific URL. (params: url)
3. "ai_tool": Use specialized AI tools like 'salary-predictor', 'resume-analyzer', 'interview-prep', 'code-debugger', 'email-writer', 'legal-explainer', 'business-validator', 'math-solver'. (params: tool_name, data)
4. "rag_search": Search through uploaded Knowledge Bases. (params: kb_id, query)
5. "final_answer": Provide the final comprehensive answer to the user. (params: content)

Workflow:
1. Analyze the user's request.
2. Break it down into a logical sequence of tasks.
3. For each task, select the appropriate tool and parameters.
4. After receiving an observation (tool result), decide if more tasks are needed or if you can provide the final answer.
5. IMPORTANT: If an observation indicates missing information, asks a question, or if you need clarification from the user, you MUST immediately use the "final_answer" action to ask the user. Do NOT loop or guess.

RESPONSE FORMAT:
You MUST respond with ONLY valid JSON in this format:
{
    "thought": "Your reasoning about what to do next",
    "action": "tool_name",
    "params": { ... tool parameters ... }
}

Example:
User: "Research current trends in React and write a professional email to my team about it."
Thought: "I need to search for current React trends first."
Action: "web_search"
Params: {"query": "React trends 2025"}

Observation: [search results]
Thought: "I have enough info. Now I'll write the email using the email-writer tool."
Action: "ai_tool"
Params: {"tool_name": "email-writer", "data": {"context": "React trends in 2025: Server Components, Concurrent Mode, etc.", "tone": "professional", "recipient": "Team"}}

Observation: [email draft]
Thought: "I'm done. Providing final answer."
Action: "final_answer"
Params: {"content": "... full email and summary ..."}
"""

def web_search(query, max_results=5):
    """Perform a web search using DuckDuckGo."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return json.dumps(results)
    except Exception as e:
        return f"Error searching: {str(e)}"

def run_orchestrator(user_prompt, api_key, history=None, model=None):
    """
    Execute the Autonomous Workflow loop.
    """
    # Validate API key upfront
    if not api_key or api_key.strip() in ('', 'undefined', 'null', 'none'):
        return "⚠️ Groq API key not configured. Please set it in Settings to use the orchestrator."

    messages = [
        {'role': 'system', 'content': PLANNER_SYSTEM_PROMPT},
    ]
    
    if history:
        for msg in history[-5:]:
            messages.append({'role': msg['role'], 'content': msg['content']})
            
    messages.append({'role': 'user', 'content': user_prompt})
    
    max_iterations = 5
    observations = []
    
    for i in range(max_iterations):
        try:
            # Get next action from LLM
            response, usage = chat_completion(
                messages=messages,
                api_key=api_key,
                model=model or DEFAULT_CHAT_MODEL,
                temperature=0.3
            )
            
            # Guard against empty response
            if not response or not response.strip():
                return "I wasn't able to generate a response. Please try rephrasing your request."
            
            # Parse JSON
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                cleaned = re.sub(r'\s*```$', '', cleaned)
            
            # Try to parse as JSON; if it fails, treat the raw response as a direct answer
            try:
                plan = json.loads(cleaned)
            except json.JSONDecodeError:
                # LLM returned plain text instead of JSON — use it as the final answer
                return response.strip()

            thought = plan.get('thought', '')
            action = plan.get('action', '')
            params = plan.get('params', {})
            
            print(f"Iteration {i+1} - Thought: {thought}")
            print(f"Iteration {i+1} - Action: {action}")
            
            if action == 'final_answer':
                return params.get('content', 'No content provided in final answer.')
            
            # Execute Action
            observation = ""
            if action == 'web_search':
                observation = web_search(params.get('query', ''))
            elif action == 'scrape_page':
                observation = scrape_webpage(params.get('url', ''))
            elif action == 'ai_tool':
                tool_result = execute_tool(
                    params.get('tool_name'),
                    params.get('data', {}),
                    api_key,
                    model
                )
                if 'error' in tool_result:
                    return tool_result['error']
                observation = tool_result.get('result')
            elif action == 'rag_search':
                chunks = retrieve_chunks(params.get('kb_id'), params.get('query', ''))
                observation = json.dumps(chunks)
            else:
                observation = f"Error: Unknown action '{action}'"
            
            # Feed back to LLM
            messages.append({'role': 'assistant', 'content': response})
            messages.append({'role': 'user', 'content': f"Observation: {observation}"})
            observations.append(observation)
            
        except Exception as e:
            error_msg = str(e)
            # Provide a user-friendly message instead of raw traceback
            if 'API Key' in error_msg or 'API key' in error_msg:
                return f"⚠️ {error_msg}"
            return f"I encountered an issue while processing your request: {error_msg}\n\nPlease try again or simplify your request."
            
    # Graceful fallback if max iterations reached
    fallback_obs = str(observations[-1:]) if observations else "No observations made."
    return f"I analyzed your request but needed more information to complete it. \n\n**Last System Observation:** {fallback_obs}\n\nPlease provide more details or clarify what you'd like me to do!"
