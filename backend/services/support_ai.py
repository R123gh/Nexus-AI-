"""
NexusAI — Support AI Service
Handles ticket analysis, automated replies, and query routing.
"""

from services.groq_service import chat_completion
import json

class SupportAIService:
    def analyze_ticket(self, message, api_key):
        """Analyze ticket content for priority and category."""
        system_prompt = (
            "You are a Support Ticket Analyzer. Categorize the ticket and assign a priority (low, medium, high, urgent). "
            "Also provide a brief, professional initial response. "
            "Return JSON only: {\"category\": \"...\", \"priority\": \"...\", \"suggested_reply\": \"...\"}"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Ticket Message: {message}"}
        ]
        
        try:
            response, usage = chat_completion(messages, api_key, model="llama-3.3-70b-versatile", temperature=0.3)
            # Clean response if AI adds markdown
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            return json.loads(response)
        except Exception as e:
            print(f"Error analyzing ticket: {e}")
            return {"category": "General", "priority": "medium", "suggested_reply": "Thank you for contacting us. An agent will be with you shortly."}

    def process_support_query(self, tenant_id, message, history, api_key):
        """Handle real-time support chat with multi-tenant awareness."""
        # In a real app, we'd fetch tenant-specific knowledge base here.
        # For now, we use a specialized system prompt.
        
        system_prompt = (
            f"You are an AI Support Assistant for Business ID: {tenant_id}. "
            "Your goal is to help users with their queries based on common support patterns. "
            "If the query is too complex (e.g. billing disputes, technical bugs), suggest routing to a human agent. "
            "Be polite, professional, and concise."
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history[-5:]:
            messages.append(msg)
        messages.append({"role": "user", "content": message})
        
        try:
            response_text, usage = chat_completion(messages, api_key, model="llama-3.3-70b-versatile", temperature=0.5)
            
            # Simple heuristic for complex routing
            routing_keywords = ["human", "agent", "manager", "complex", "refund", "billing", "error"]
            needs_routing = any(kw in message.lower() for kw in routing_keywords) or \
                            any(kw in response_text.lower() for kw in ["human agent", "transfer you"])
            
            return {
                "response": response_text,
                "needs_routing": needs_routing,
                "suggested_action": "route_to_agent" if needs_routing else "none"
            }
        except Exception as e:
            return {"response": f"I apologize, I'm having trouble processing that. Error: {str(e)}", "needs_routing": True}

support_ai = SupportAIService()
