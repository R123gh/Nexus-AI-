"""
NexusAI — AI Tools Service
Specialized AI-powered tools that leverage the Groq LLM with structured prompts
to solve real-world problems: salary prediction, resume analysis, code debugging, etc.
"""

from services.groq_service import chat_completion
from config import DEFAULT_CHAT_MODEL
import json
import requests
from datetime import datetime


# ─── Tool Registry ───────────────────────────────────────────────
TOOL_REGISTRY = {
    'salary-predictor': {
        'name': 'Salary Predictor',
        'icon': 'trending-up',
        'category': 'Career & Finance',
        'description': 'Predict salary ranges based on role, experience, location, and skills',
    },
    'resume-analyzer': {
        'name': 'Resume Analyzer',
        'icon': 'file-text',
        'category': 'Career & Finance',
        'description': 'Analyze your resume for ATS compatibility, gaps, and improvements',
    },
    'interview-prep': {
        'name': 'Interview Prep',
        'icon': 'users',
        'category': 'Career & Finance',
        'description': 'Get role-specific interview questions with model answers',
    },
    'code-debugger': {
        'name': 'Code Debugger',
        'icon': 'bug',
        'category': 'Developer Tools',
        'description': 'Find bugs, explain errors, and get fix suggestions for your code',
    },
    'email-writer': {
        'name': 'Email & Letter Writer',
        'icon': 'mail',
        'category': 'Writing & Documents',
        'description': 'Generate professional emails, cover letters, and formal documents',
    },
    'legal-explainer': {
        'name': 'Legal Document Explainer',
        'icon': 'scale',
        'category': 'Writing & Documents',
        'description': 'Simplify legal jargon in contracts and terms of service',
    },
    'text-summarizer': {
        'name': 'Text Summarizer',
        'icon': 'align-left',
        'category': 'Writing & Documents',
        'description': 'Summarize long articles, documents, or text into concise formats',
    },
    'language-translator': {
        'name': 'Language Translator',
        'icon': 'languages',
        'category': 'Writing & Documents',
        'description': 'Translate text between languages with high accuracy and cultural context',
    },
    'content-writer': {
        'name': 'Content / Blog Writer',
        'icon': 'pen-tool',
        'category': 'Writing & Documents',
        'description': 'Generate high-quality blog posts, articles, and marketing content',
    },
    'business-validator': {
        'name': 'Business Idea Validator',
        'icon': 'lightbulb',
        'category': 'Analysis & Learning',
        'description': 'Evaluate your startup or business idea with market analysis',
    },
    'math-solver': {
        'name': 'Math & Science Solver',
        'icon': 'calculator',
        'category': 'Analysis & Learning',
        'description': 'Solve math problems step-by-step and explain science concepts',
    },
    'sql-generator': {
        'name': 'SQL Query Generator',
        'icon': 'database',
        'category': 'Developer Tools',
        'description': 'Generate complex SQL queries from natural language descriptions',
    },
    'api-doc-generator': {
        'name': 'API Doc Generator',
        'icon': 'book-open',
        'category': 'Developer Tools',
        'description': 'Generate professional API documentation (Swagger/OpenAPI or Markdown) from code or specs',
    },
    'ux-reviewer': {
        'name': 'UI/UX Design Reviewer',
        'icon': 'layers',
        'category': 'Analysis & Learning',
        'description': 'Get expert feedback on your UI/UX designs, wireframes, or landing pages',
    },
    'youtube-summarizer': {
        'name': 'YouTube Video Summarizer',
        'icon': 'youtube',
        'category': 'Analysis & Learning',
        'description': 'Summarize YouTube videos from their URLs with key insights and chapters',
    },
    'website-analyzer': {
        'name': 'Website Scraper & Analyzer',
        'icon': 'globe',
        'category': 'Analysis & Learning',
        'description': 'Scrape and analyze any website for content summary, SEO, and key data',
    },
    'github-analyzer': {
        'name': 'GitHub Repository Analyzer',
        'icon': 'github',
        'category': 'Developer Tools',
        'description': 'Analyze GitHub repositories for tech stack, code quality, and project structure',
    },
    'webhook-dispatcher': {
        'name': 'Webhook / Zapier Dispatcher',
        'icon': 'send',
        'category': 'Developer Tools',
        'description': 'Send AI-generated data or custom payloads to Zapier, Make, or any Webhook URL',
    },
    'quiz-generator': {
        'name': 'AI Quiz Generator',
        'icon': 'help-circle',
        'category': 'Analysis & Learning',
        'description': 'Generate custom quizzes and MCQs from any topic or text for learning and assessment',
    },
    'concept-explainer': {
        'name': 'CS/ML Concept Explainer',
        'icon': 'book',
        'category': 'Analysis & Learning',
        'description': 'Get visual, step-by-step explanations of complex CS/ML concepts with diagrams and code',
    },
}


def get_tool_list():
    """Return the list of all available tools with metadata."""
    return TOOL_REGISTRY


# ─── System Prompts ──────────────────────────────────────────────

SALARY_SYSTEM_PROMPT = """You are an elite Tech Career Advisor and Compensation Analyst. Provide a highly accurate, market-relevant salary analysis based on the latest industry trends, tech stacks, and economic data.
You MUST respond in beautifully formatted markdown with these exact sections. Do not use generic numbers; ensure all estimates are deeply tailored to the provided skills and location.

## 💰 Professional Compensation Analysis

### 📊 Estimated Salary Range
Provide a precise estimation based on current market rates.
| Percentile | Annual Base Salary (INR) | Estimated Total Comp (Inc. Bonuses/Equity) |
|------------|------------------------|----------------------------------------|
| 25th (Low) | ₹XX,XX,XXX | ₹XX,XX,XXX |
| 50th (Median)| ₹XX,XX,XXX | ₹XX,XX,XXX |
| 75th (High)| ₹XX,XX,XXX | ₹XX,XX,XXX |
| 90th (Top) | ₹XX,XX,XXX | ₹XX,XX,XXX |

### 🔍 Market Context & Relevancy
- **Current Market Demand**: [Analyze the current demand for this specific role and tech stack]
- **Location Premium**: [Explain how the specific location impacts the salary (e.g., Tier 1 vs Tier 2, Remote global vs local)]
- **Skill Value Breakdown**: [Highlight exactly which of their skills are driving their value up or holding it back]

### 📈 5-Year Career Trajectory
Project the potential career growth and title progressions over the next 5 years, including expected salary milestones if they upskill correctly.

### 🎯 High-Impact Action Items for Negotiation
1. **[Specific action]**: [Why it works]
2. **[Specific action]**: [Why it works]
3. **[Specific action]**: [Why it works]

### 🏢 Target Companies for Maximum Comp
List 5 specific companies or company tiers (e.g., "Series B Fintechs", "FAANG") that historically pay the 75th+ percentile for this exact profile.

Be highly specific. Use Indian Rupees (INR / ₹). Ensure the analysis feels premium, authoritative, and deeply tailored to the user's specific input."""


RESUME_SYSTEM_PROMPT = """You are a professional resume reviewer and ATS (Applicant Tracking System) expert. Analyze the provided resume text and give detailed feedback.

You MUST respond in well-formatted markdown with these exact sections:

## 📄 Resume Analysis Report

### Overall Score: X/100
Provide a realistic score out of 100.

### ✅ Strengths
- List 3-5 strong points of the resume

### ⚠️ Areas for Improvement
- List 4-6 specific areas that need work, with concrete suggestions

### 🔍 ATS Compatibility
- **ATS Score**: X/100
- **Missing Keywords**: List important keywords for the target role that are missing
- **Format Issues**: Any formatting problems that might affect ATS parsing

### 📝 Section-by-Section Review
- **Contact Info**: [feedback]
- **Summary/Objective**: [feedback]
- **Experience**: [feedback]
- **Education**: [feedback]
- **Skills**: [feedback]
- **Projects**: [feedback]

### 🎯 Recommended Action Items
Numbered list of the top 5 things to fix immediately, in priority order.

Be specific and actionable. Don't use generic advice."""


CODE_DEBUGGER_SYSTEM_PROMPT = """You are an expert software developer and debugging specialist. Analyze the provided code or error message and provide a comprehensive debugging report.

You MUST respond in well-formatted markdown with these sections:

## 🐛 Debug Analysis

### Problem Identified
Clear, concise description of the bug or error.

### Root Cause
Explain WHY the error occurs — the underlying logic or syntax issue.

### 🔧 Fixed Code
```[language]
// Provide the COMPLETE corrected code
```

### What Changed
- Bullet-point list explaining each change and why

### 💡 Best Practices
- 2-3 best practices related to this type of error that prevent it in the future

### ⚡ Performance Notes
Any performance considerations or optimizations if applicable.

Always provide working, tested code. If the language is not specified, detect it automatically."""


BUSINESS_VALIDATOR_SYSTEM_PROMPT = """You are a seasoned startup advisor and business analyst. Evaluate the business idea provided and give a thorough analysis.

You MUST respond in well-formatted markdown with these sections:

## 📊 Business Idea Validation Report

### Overall Viability Score: X/10
A realistic score with justification.

### 💡 Idea Summary
One-paragraph summary of the business concept.

### SWOT Analysis
| | Positive | Negative |
|---|---------|----------|
| **Internal** | **Strengths**: List 3-4 | **Weaknesses**: List 3-4 |
| **External** | **Opportunities**: List 3-4 | **Threats**: List 3-4 |

### 📈 Market Analysis
- **Target Market Size**: Estimated TAM/SAM/SOM
- **Target Audience**: Who are the customers?
- **Market Trends**: Current trends supporting/opposing this idea

### 🏢 Competitor Landscape
| Competitor | What They Do | Your Advantage |
|-----------|-------------|----------------|
| List 3-5 competitors |  |  |

### 💰 Revenue Model Suggestions
- 3-4 realistic monetization strategies

### 🚀 Recommended Next Steps
Numbered list of 5 concrete actions to validate and launch this idea.

### ⚠️ Key Risks
Top 3 risks and how to mitigate them.

Be realistic and data-driven. Don't just praise the idea — give honest, constructive feedback."""


EMAIL_WRITER_SYSTEM_PROMPT = """You are a professional communication expert specializing in business writing. Generate polished, professional emails or letters based on the user's requirements.

You MUST respond in well-formatted markdown with these sections:

## ✍️ Generated Email/Letter

### Subject Line
**Subject**: [Compelling subject line]

### Message
---
[Full, formatted email body with proper greeting, paragraphs, and sign-off]

---

### 📋 Key Elements Used
- **Tone**: [Professional/Formal/Friendly/Persuasive]
- **Word Count**: ~XXX words
- **Purpose**: [What this email aims to achieve]

### 💡 Alternative Versions

#### Shorter Version (if applicable)
A more concise version of the same message.

#### More Formal Version (if applicable)
A more formal alternative.

### 📝 Tips for This Type of Email
- 2-3 tips specific to this type of communication

Make the email sound natural, not robotic. Match the tone to the context."""


MATH_SOLVER_SYSTEM_PROMPT = """You are a brilliant mathematician and science educator. Solve the given problem with clear, step-by-step explanations.

You MUST respond in well-formatted markdown with these sections:

## 🧮 Solution

### Problem Statement
Restate the problem clearly.

### Step-by-Step Solution

**Step 1**: [Description]
[Show the work with proper mathematical notation]

**Step 2**: [Description]
[Continue showing work]

(Continue for all steps needed)

### ✅ Final Answer
**Answer**: [Clear, boxed answer]

### 📚 Concept Explanation
Explain the underlying concept/theorem/formula used and WHY it works.

### 🔄 Similar Practice Problems
Provide 2-3 similar problems for practice (without solutions).

### 💡 Common Mistakes to Avoid
- 2-3 common mistakes students make with this type of problem

Use proper mathematical notation. For complex formulas, describe them clearly since we're using text."""


INTERVIEW_PREP_SYSTEM_PROMPT = """You are an expert career coach and interview preparation specialist. Generate comprehensive interview preparation material for the specified role.

You MUST respond in well-formatted markdown with these sections:

## 📋 Interview Preparation Guide

### Role Overview
Brief description of what this role entails and what interviewers look for.

### 🎯 Technical Questions (5-7 questions)
For each question:
**Q: [Question]**
**Model Answer**: [Detailed answer with examples]
**Key Points**: [2-3 bullet points to remember]

---

### 🧠 Behavioral Questions (4-5 questions)
For each question:
**Q: [Question]**
**STAR Method Answer**:
- **Situation**: [example]
- **Task**: [example]
- **Action**: [example]
- **Result**: [example]

---

### 💡 Questions to Ask the Interviewer
- 5 smart questions to ask at the end of the interview

### 📝 Preparation Checklist
- [ ] Research the company
- [ ] [More specific checklist items]

### ⚠️ Common Mistakes to Avoid
- 3-4 mistakes specific to this role's interviews

Tailor everything specifically to the role and experience level provided."""


LEGAL_EXPLAINER_SYSTEM_PROMPT = """You are a legal analyst who specializes in making complex legal documents understandable for non-lawyers. Analyze the provided legal text.

You MUST respond in well-formatted markdown with these sections:

## ⚖️ Legal Document Analysis

### 📄 Document Type
What type of legal document this appears to be.

### 🔑 Key Points (Plain English)
- Numbered list of the most important things this document says, in simple everyday language

### ⚠️ Watch Out For
- Red flags or concerning clauses explained in plain English
- What rights you might be giving up

### ✅ Your Rights
- What protections or rights this document gives you

### 📊 Section-by-Section Breakdown
For each major section of the document:
**Section: [Name]**
- **Legal Says**: Brief quote or paraphrase
- **In Plain English**: What it actually means for you

### 🎯 Action Items
- What you should do before signing
- Questions to ask the other party

### ⚡ Quick Summary
A 2-3 sentence summary a teenager could understand.

IMPORTANT: You are NOT providing legal advice. Always recommend consulting a qualified attorney for important legal decisions. Include this disclaimer."""


TEXT_SUMMARIZER_SYSTEM_PROMPT = """You are an expert editor and summarizer. Given a long text, extract the core message, key arguments, and essential details based on the requested format.

You MUST respond in well-formatted markdown with these sections:

## 📋 Text Summary

### Quick Overview
A 1-2 sentence distillation of the entire text.

### 📝 Main Summary
Provide the summary in the requested format.

### 🔑 Key Takeaways
- 3 to 5 bullet points highlighting the most crucial information or insights.

### 📊 Vital Statistics / Facts
- Any important numbers, dates, or factual claims mentioned in the text (if applicable).

Keep the summary accurate and objective. Do not add outside information not present in the original text."""


LANGUAGE_TRANSLATOR_SYSTEM_PROMPT = """You are an expert linguist and professional translator. Translate the provided text accurately while maintaining the original meaning, tone, and cultural nuances.

You MUST respond in well-formatted markdown with these sections:

## 🌐 Translation Result

### Translated Text
[Provide the complete translation here in clear text]

---

### 📝 Linguistic Notes
- **Tone Preserved**: [Brief note on how the requested tone was maintained]
- **Cultural Nuances**: [Any cultural context or idioms that were adapted]
- **Key Terms**: [2-3 key terms and their literal vs contextual meaning, if applicable]

### 💡 Alternative Phrasing (Optional)
Provide 1-2 alternative ways to phrase the translation for different contexts (e.g., more formal, more casual) if applicable.
"""


CONTENT_WRITER_SYSTEM_PROMPT = """You are a world-class content creator, SEO expert, and professional blogger. Generate high-quality, engaging, and original content based on the provided topic and requirements.

You MUST respond in well-formatted markdown with these sections:

## 📝 Generated Content

### Title
[Compelling, SEO-friendly title]

### Content Body
[The full content, formatted with appropriate subheadings, paragraphs, and formatting]

---

### 📊 Content Strategy Notes
- **Target Audience**: [Who this content is best suited for]
- **SEO Optimization**: [How the content was optimized for search engines]
- **Tone Analysis**: [Brief explanation of how the requested tone was implemented]
- **Word Count**: ~XXX words

### 🚀 Recommended Meta Description
[A concise, 150-160 character meta description for search engines]

### 🏷️ Suggested Tags
[5-7 relevant tags/hashtags]
"""


SQL_GENERATOR_SYSTEM_PROMPT = """You are an expert SQL developer and database architect. Your task is to generate high-quality, optimized SQL queries based on natural language descriptions and optional schema information.

You MUST respond in well-formatted markdown with these exact sections:

## 🔍 SQL Query Analysis

### 📝 Generated Query
```sql
[The complete, optimized SQL query]
```

### 📖 Explanation
Explain what the query does in simple terms, breaking down each major clause (SELECT, JOIN, WHERE, GROUP BY, etc.).

### 🛠️ Schema Assumptions
List the tables and columns you assumed exist to make this query work (if not explicitly provided).

### ⚡ Optimization Notes
- Mention index suggestions or performance considerations for this specific query.
- Explain why you chose certain joins or subqueries.

### 💡 Alternative Versions (Optional)
If there's a more modern way (e.g., using CTEs vs subqueries) or database-specific syntax (PostgreSQL vs MySQL vs SQL Server), provide it here.

Always follow best practices: use aliases for clarity, use proper indentation, and prefer CTEs for complex logic.
"""


API_DOC_SYSTEM_PROMPT = """You are an expert technical writer and API architect. Your task is to generate comprehensive, professional API documentation based on provided code, endpoints, or descriptions.

You MUST respond in well-formatted markdown with these sections:

## 📖 API Documentation

### 🚀 Overview
A brief summary of what the API or endpoint does.

### 📍 Endpoints
For each endpoint:
**[METHOD] /path**
- **Description**: [what it does]
- **Authentication**: [Required/None]
- **Request Parameters/Body**: 
  - Table showing name, type, requirement, and description
- **Response (Success)**:
  - Status Code: 200/201
  - Example JSON
- **Response (Error)**:
  - Status Codes: 400/401/404/500
  - Example Error JSON

### 🛠️ Usage Example
Provide a `curl` or `fetch` example for the primary endpoint.

### 📝 Integration Notes
- Best practices for using this API.
- Rate limiting or security considerations.

If the user specifies a format like OpenAPI/Swagger (YAML/JSON), provide that in a code block instead of the markdown sections above, but still include a brief markdown introduction.
"""


UX_REVIEWER_SYSTEM_PROMPT = """You are a world-class UI/UX Designer and User Experience Researcher. Your task is to provide a comprehensive, expert-level review of a design concept, landing page description, or wireframe.

You MUST respond in well-formatted markdown with these exact sections:

## 🎨 UI/UX Design Review

### 🌟 Overall Impression
A 2-3 sentence high-level summary of the design's strengths and weaknesses.

### 📐 Visual Design (UI)
- **Hierarchy**: [Feedback on how information is prioritized visually]
- **Typography**: [Analysis of font choices, readability, and scaling]
- **Color Palette**: [Feedback on color harmony, contrast, and accessibility]
- **Consistency**: [Notes on the cohesive feel of components]

### 🧠 User Experience (UX)
- **Usability**: [How easy it is for a user to achieve their goal]
- **Navigation**: [Analysis of the user journey and menu structures]
- **Accessibility (a11y)**: [Critical notes on color contrast, font size, and navigation]
- **Emotional Design**: [The "feel" and psychological impact of the design]

### 🚩 Critical Red Flags
- Numbered list of things that MUST be fixed immediately.

### 🚀 Recommended Improvements
- 3-5 specific, actionable design changes to elevate the experience.

### 💡 Inspiration & Best Practices
- Mention 1-2 design systems or platforms that do this well (e.g., Apple HIG, Material Design, Shopify Polaris).

Be constructive, specific, and professional. Use design terminology correctly."""


YOUTUBE_SUMMARIZER_SYSTEM_PROMPT = """You are an expert video content analyst and summarizer. Given the transcript of a YouTube video, provide a comprehensive summary and analysis.

You MUST respond in well-formatted markdown with these exact sections:

## 📺 YouTube Video Summary

### 🚀 One-Sentence Pitch
A single, powerful sentence that captures the essence of the video.

### 📝 Executive Summary
A detailed 2-3 paragraph summary of the video's core message and narrative.

### 🔑 Key Takeaways & Insights
- List 5-7 most important points, insights, or facts mentioned in the video.

### 📂 Chapter-wise Breakdown
Create a logical breakdown of the video content into chapters/themes with brief summaries for each.

### 💡 Notable Quotes (if any)
Extract 2-3 impactful quotes or statements from the transcript.

### 🎯 Target Audience
Who is this video primarily for and why?

### 🏁 Final Conclusion
A concluding thought on the value of the video content.

Maintain an objective yet engaging tone. If the transcript is in a language other than English, provide the summary in English."""


WEBSITE_ANALYZER_SYSTEM_PROMPT = """You are an expert web analyst and content strategist. Given the content of a website, provide a comprehensive analysis.

You MUST respond in well-formatted markdown with these exact sections:

## 🌐 Website Analysis Report

### 📑 Content Overview
A clear 2-3 paragraph summary of what the website is about and its primary purpose.

### 🔍 Key Insights & Information
- Extract the most important 5-8 points, facts, or value propositions mentioned.

### 📈 SEO & Performance Review
- **Meta Title Analysis**: [feedback]
- **Content Hierarchy**: [feedback on use of headings]
- **Keyword Density**: [main topics found]
- **Readability Score**: [Easy/Moderate/Difficult]

### 🎯 Target Audience & Tone
- Who is this site for?
- What is the brand voice?

### ⚠️ UX & Conversion Observations
- Any obvious strengths or weaknesses in how information is presented.

### 🏁 Competitive Edge
One paragraph on what makes this content unique or how it compares to industry standards.

Maintain a professional, analytical tone."""


WEBHOOK_DISPATCHER_SYSTEM_PROMPT = """You are a specialized Integration Engineer. Your task is to format data for external delivery via webhooks (Zapier, Make, etc.).

You MUST respond in well-formatted markdown with these exact sections:

## ⚡ Webhook Integration Status

### 📤 Payload Delivery Summary
A summary of what was sent and to which service (if identifiable from the URL).

### 📋 JSON Payload Preview
A clean code block showing the exact JSON structure sent to the webhook.

### ✅ Response Data
The raw or formatted response received from the target server.

### 💡 Integration Tips
- How to use this data in Zapier/Make.
- Recommended triggers or actions based on the payload.

Maintain a technical, execution-oriented tone."""


QUIZ_GENERATOR_SYSTEM_PROMPT = """You are an expert educator and assessment designer. Your goal is to generate high-quality, challenging, and educational quizzes.

You MUST respond in well-formatted markdown with these exact sections:

## 🎓 AI Generated Quiz: [Topic Name]

### 📝 Instructions
Briefly explain the focus of this quiz and what it covers.

### ❓ Questions
For each question, provide:
1. **Question [Number]**: [The question text]
   - A) [Option 1]
   - B) [Option 2]
   - C) [Option 3]
   - D) [Option 4]

---

### ✅ Answer Key & Explanations
Provide the correct answer and a detailed 1-2 sentence explanation for WHY it is correct.
- **Q1**: [Correct Letter] - [Explanation]
- **Q2**: [Correct Letter] - [Explanation]
...

### 📊 Skill Assessment
A summary of what skills or knowledge areas are tested in this quiz.

Maintain an encouraging and educational tone."""


CONCEPT_EXPLAINER_SYSTEM_PROMPT = """You are an elite Technical Educator and AI Tutor. Your goal is to simplify complex Computer Science and Machine Learning concepts.

You MUST respond in well-formatted markdown with these exact sections:

## 🎓 Concept: [Concept Name]

### 💡 High-Level Overview
A simple, intuitive analogy or "ELI5" (Explain Like I'm 5) explanation of the concept.

### 🛠️ How it Works (Step-by-Step)
Break down the mechanics of the concept into 3-5 logical steps.

### 📊 Visual Diagram
Provide a **Mermaid.js** diagram (flowchart, sequence, or class diagram) that visualizes the concept. Use the `mermaid` code block.

### 💻 Code Implementation
A clean, well-commented code example in Python (or the most relevant language) that demonstrates the concept in action.

### 🚀 Real-World Applications
List 3-4 practical uses of this concept in the industry today.

### 📚 Deep Dive Tips
Suggest what to study next to master this topic.

Maintain a clear, encouraging, and highly technical yet accessible tone."""


GITHUB_ANALYZER_SYSTEM_PROMPT = """You are an expert software architect and technical lead. Your task is to analyze a GitHub repository based on its metadata, README, and file structure.

You MUST respond in well-formatted markdown with these exact sections:

## 🐙 GitHub Repository Analysis

### 🚀 Project Mission
A high-level summary of what this project aims to achieve and its value proposition.

### 🛠️ Technical Stack
- **Primary Language**: [language]
- **Frameworks & Libraries**: [analysis based on file names and README]
- **Infrastructure/DevOps**: [any signs of Docker, CI/CD, cloud providers]

### 📂 Architecture & Structure
Analyze the project's organization (e.g., MVC, Monolith, Microservices) based on the top-level file structure.

### 📝 README Evaluation
- **Clarity**: [How well it explains the project]
- **Documentation Quality**: [Setup instructions, API docs, etc.]
- **Visuals/Badges**: [presence of demos or CI/CD status]

### ⚖️ Project Health
- **Popularity**: [Stars/Forks analysis]
- **Maintenance**: [Impression of how active the project is]

### 🎯 Key Features & Functionality
Numbered list of the core features identified.

### 💡 Architect's Recommendations
3-5 technical recommendations for the project (e.g., "Add unit tests", "Improve documentation", "Containerize the app").

Maintain a deep technical tone while remaining constructive."""


# ─── Tool Execution Functions ────────────────────────────────────

def predict_salary(data, api_key, model=None):
    """Predict salary based on role, experience, location, and skills."""
    role = data.get('role', 'Software Engineer')
    experience = data.get('experience', '3 years')
    location = data.get('location', 'India')
    skills = data.get('skills', '')
    education = data.get('education', '')
    industry = data.get('industry', '')

    user_message = f"""Predict the salary for the following profile:

- **Job Role/Title**: {role}
- **Experience**: {experience}
- **Location**: {location}
- **Key Skills**: {skills or 'Not specified'}
- **Education**: {education or 'Not specified'}
- **Industry**: {industry or 'Not specified'}

Provide detailed salary estimates with ranges, growth projections, and actionable tips."""

    messages = [
        {'role': 'system', 'content': SALARY_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.5,
    )
    return {'tool': 'salary-predictor', 'result': result}


def analyze_resume(data, api_key, model=None):
    """Analyze a resume and provide ATS score, gaps, and improvements."""
    resume_text = data.get('resume_text', '')
    target_role = data.get('target_role', '')

    if not resume_text.strip():
        return {'tool': 'resume-analyzer', 'error': 'Please paste your resume text.'}

    user_message = f"""Analyze the following resume{f' for a "{target_role}" position' if target_role else ''}:

---
{resume_text}
---

Provide a detailed analysis with scores, strengths, weaknesses, and actionable improvements."""

    messages = [
        {'role': 'system', 'content': RESUME_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'resume-analyzer', 'result': result}


def debug_code(data, api_key, model=None):
    """Debug code and provide fixes with explanations."""
    code = data.get('code', '')
    error_message = data.get('error_message', '')
    language = data.get('language', 'auto-detect')

    if not code.strip() and not error_message.strip():
        return {'tool': 'code-debugger', 'error': 'Please provide code or an error message to debug.'}

    parts = []
    if language and language != 'auto-detect':
        parts.append(f"**Language**: {language}")
    if code:
        parts.append(f"**Code**:\n```\n{code}\n```")
    if error_message:
        parts.append(f"**Error Message**:\n```\n{error_message}\n```")

    user_message = "Debug the following:\n\n" + "\n\n".join(parts)

    messages = [
        {'role': 'system', 'content': CODE_DEBUGGER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.3,
    )
    return {'tool': 'code-debugger', 'result': result}


def validate_business(data, api_key, model=None):
    """Evaluate a business idea with SWOT analysis and market insights."""
    idea = data.get('idea', '')
    target_market = data.get('target_market', '')
    budget = data.get('budget', '')

    if not idea.strip():
        return {'tool': 'business-validator', 'error': 'Please describe your business idea.'}

    user_message = f"""Evaluate this business idea:

**Business Idea**: {idea}
**Target Market**: {target_market or 'Not specified'}
**Initial Budget**: {budget or 'Not specified'}

Provide a thorough validation with SWOT analysis, market analysis, and actionable next steps."""

    messages = [
        {'role': 'system', 'content': BUSINESS_VALIDATOR_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.5,
    )
    return {'tool': 'business-validator', 'result': result}


def write_email(data, api_key, model=None):
    """Generate professional emails and letters."""
    email_type = data.get('email_type', 'professional email')
    context = data.get('context', '')
    tone = data.get('tone', 'professional')
    recipient = data.get('recipient', '')

    if not context.strip():
        return {'tool': 'email-writer', 'error': 'Please describe what the email should be about.'}

    user_message = f"""Write a {email_type} with the following details:

**Type**: {email_type}
**Recipient**: {recipient or 'Not specified'}
**Tone**: {tone}
**Context/Purpose**: {context}

Generate a polished, ready-to-send email with subject line and alternative versions."""

    messages = [
        {'role': 'system', 'content': EMAIL_WRITER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.6,
    )
    return {'tool': 'email-writer', 'result': result}


def solve_math(data, api_key, model=None):
    """Solve math and science problems step-by-step."""
    problem = data.get('problem', '')
    subject = data.get('subject', 'mathematics')

    if not problem.strip():
        return {'tool': 'math-solver', 'error': 'Please enter a math or science problem.'}

    user_message = f"""Solve this {subject} problem step-by-step:

{problem}

Show all work clearly with proper mathematical notation and explanations."""

    messages = [
        {'role': 'system', 'content': MATH_SOLVER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.3,
    )
    return {'tool': 'math-solver', 'result': result}


def prepare_interview(data, api_key, model=None):
    """Generate role-specific interview questions and model answers."""
    role = data.get('role', '')
    experience_level = data.get('experience_level', 'mid-level')
    company = data.get('company', '')
    focus_areas = data.get('focus_areas', '')

    if not role.strip():
        return {'tool': 'interview-prep', 'error': 'Please specify the job role.'}

    user_message = f"""Prepare interview material for:

**Role**: {role}
**Experience Level**: {experience_level}
**Target Company**: {company or 'General'}
**Focus Areas**: {focus_areas or 'All areas'}

Generate comprehensive interview questions with detailed model answers."""

    messages = [
        {'role': 'system', 'content': INTERVIEW_PREP_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.5,
    )
    return {'tool': 'interview-prep', 'result': result}


def explain_legal(data, api_key, model=None):
    """Simplify legal documents into plain English."""
    legal_text = data.get('legal_text', '')
    document_type = data.get('document_type', '')

    if not legal_text.strip():
        return {'tool': 'legal-explainer', 'error': 'Please paste the legal text you want explained.'}

    user_message = f"""Explain this{f' {document_type}' if document_type else ' legal document'} in plain English:

---
{legal_text}
---

Make it understandable for someone with no legal background."""

    messages = [
        {'role': 'system', 'content': LEGAL_EXPLAINER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'legal-explainer', 'result': result}


def summarize_text(data, api_key, model=None):
    """Summarize text based on requested format."""
    text = data.get('text', '')
    format_type = data.get('format', 'bullet points')

    if not text.strip():
        return {'tool': 'text-summarizer', 'error': 'Please provide the text you want to summarize.'}

    user_message = f"""Summarize the following text using a "{format_type}" format:

---
{text}
---

Ensure the summary captures the main points accurately."""

    messages = [
        {'role': 'system', 'content': TEXT_SUMMARIZER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.3,
    )
    return {'tool': 'text-summarizer', 'result': result}


def translate_language(data, api_key, model=None):
    """Translate text between languages."""
    text = data.get('text', '')
    source_language = data.get('source_language', 'auto-detect')
    if not source_language:
        source_language = 'auto-detect'
    target_language = data.get('target_language', '')
    tone = data.get('tone', 'neutral')

    if not text.strip():
        return {'tool': 'language-translator', 'error': 'Please provide the text you want to translate.'}
    if not target_language.strip():
        return {'tool': 'language-translator', 'error': 'Please specify the target language.'}

    user_message = f"""Translate the following text:

**Source Language**: {source_language}
**Target Language**: {target_language}
**Requested Tone**: {tone}

**Original Text**:
---
{text}
---

Provide a high-quality translation with linguistic notes."""

    messages = [
        {'role': 'system', 'content': LANGUAGE_TRANSLATOR_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.3,
    )
    return {'tool': 'language-translator', 'result': result}


def write_content(data, api_key, model=None):
    """Generate blog posts, articles, and marketing content."""
    topic = data.get('topic', '')
    content_type = data.get('type', 'blog post')
    length = data.get('length', 'medium')
    tone = data.get('tone', 'professional')
    keywords = data.get('keywords', '')

    if not topic.strip():
        return {'tool': 'content-writer', 'error': 'Please provide a topic or title for the content.'}

    length_map = {
        'short': 'approximately 300 words',
        'medium': 'approximately 700 words',
        'long': 'at least 1200 words with in-depth analysis'
    }

    user_message = f"""Generate {content_type} about:

**Topic**: {topic}
**Requested Length**: {length_map.get(length, 'medium')}
**Tone**: {tone}
**Keywords to Include**: {keywords or 'Use natural relevant keywords'}

Ensure the content is engaging, original, and formatted perfectly for the web."""

    messages = [
        {'role': 'system', 'content': CONTENT_WRITER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.7,  # Higher temperature for creativity
    )
    return {'tool': 'content-writer', 'result': result}


def generate_sql(data, api_key, model=None):
    """Generate SQL queries from natural language."""
    description = data.get('description', '')
    schema = data.get('schema', '')
    dialect = data.get('dialect', 'standard')

    if not description.strip():
        return {'tool': 'sql-generator', 'error': 'Please provide a description of the query you want to generate.'}

    parts = [f"**Query Description**: {description}"]
    if schema:
        parts.append(f"**Database Schema/Context**: {schema}")
    if dialect:
        parts.append(f"**SQL Dialect**: {dialect}")

    user_message = "Generate an SQL query for the following request:\n\n" + "\n\n".join(parts)

    messages = [
        {'role': 'system', 'content': SQL_GENERATOR_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.3,  # Lower temperature for precision
    )
    return {'tool': 'sql-generator', 'result': result}


def generate_api_doc(data, api_key, model=None):
    """Generate API documentation from code or descriptions."""
    input_text = data.get('input_text', '')
    format_type = data.get('format', 'markdown')
    include_examples = data.get('include_examples', True)

    if not input_text.strip():
        return {'tool': 'api-doc-generator', 'error': 'Please provide code or a description of your API endpoints.'}

    parts = [f"**API Context/Code**: \n```\n{input_text}\n```"]
    parts.append(f"**Requested Format**: {format_type}")
    parts.append(f"**Include Examples**: {'Yes' if include_examples else 'No'}")

    user_message = "Generate professional API documentation for the following:\n\n" + "\n\n".join(parts)

    messages = [
        {'role': 'system', 'content': API_DOC_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'api-doc-generator', 'result': result}


def review_design(data, api_key, model=None):
    """Provide expert feedback on UI/UX designs."""
    description = data.get('description', '')
    target_audience = data.get('target_audience', '')
    platform = data.get('platform', 'Web')
    goals = data.get('goals', '')

    if not description.strip():
        return {'tool': 'ux-reviewer', 'error': 'Please describe the design or provide a link/context for review.'}

    parts = [f"**Design Description**: {description}"]
    parts.append(f"**Platform**: {platform}")
    if target_audience:
        parts.append(f"**Target Audience**: {target_audience}")
    if goals:
        parts.append(f"**Primary Goals**: {goals}")

    user_message = "Review the following design concept:\n\n" + "\n\n".join(parts)

    messages = [
        {'role': 'system', 'content': UX_REVIEWER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.6,  # Slightly higher for creative feedback
    )
    return {'tool': 'ux-reviewer', 'result': result}


def summarize_youtube_video(data, api_key, model=None):
    """Fetch transcript and summarize a YouTube video."""
    video_url = data.get('video_url', '')
    
    if not video_url.strip():
        return {'tool': 'youtube-summarizer', 'error': 'Please provide a YouTube video URL.'}
    
    from services.youtube_transcript import get_youtube_transcript
    
    try:
        transcript = get_youtube_transcript(video_url)
    except Exception as e:
        return {'tool': 'youtube-summarizer', 'error': f'Failed to get transcript: {str(e)}'}
    
    # Check if transcript is too long (basic limit)
    if len(transcript) > 40000:
        transcript = transcript[:40000] + "... [Transcript truncated due to length]"
        
    user_message = f"""Summarize the following YouTube video transcript:

---
{transcript}
---

Provide a detailed summary with insights, chapters, and key takeaways."""

    messages = [
        {'role': 'system', 'content': YOUTUBE_SUMMARIZER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'youtube-summarizer', 'result': result}


def analyze_website(data, api_key, model=None):
    """Scrape and analyze website content."""
    url = data.get('url', '')
    
    if not url.strip():
        return {'tool': 'website-analyzer', 'error': 'Please provide a website URL.'}
    
    from services.web_scraper import scrape_website_content
    
    try:
        scraped = scrape_website_content(url)
        content = scraped['content']
        title = scraped['title']
    except Exception as e:
        return {'tool': 'website-analyzer', 'error': f'Failed to scrape website: {str(e)}'}
    
    # Check if content is too long
    if len(content) > 30000:
        content = content[:30000] + "... [Content truncated due to length]"
        
    user_message = f"""Analyze the following website content:

**Title**: {title}
**URL**: {url}

---
**Content**:
{content}
---

Provide a detailed analysis report with content summary, SEO insights, and key takeaways."""

    messages = [
        {'role': 'system', 'content': WEBSITE_ANALYZER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'website-analyzer', 'result': result}


def analyze_github_repo(data, api_key, model=None):
    """Fetch GitHub details and analyze the repository."""
    repo_url = data.get('repo_url', '')
    
    if not repo_url.strip():
        return {'tool': 'github-analyzer', 'error': 'Please provide a GitHub repository URL.'}
    
    from services.github_service import get_repo_details
    
    try:
        details = get_repo_details(repo_url)
    except Exception as e:
        return {'tool': 'github-analyzer', 'error': f'Failed to fetch repository details: {str(e)}'}
    
    # Truncate README if too long
    readme = details['readme']
    if len(readme) > 20000:
        readme = readme[:20000] + "... [README truncated]"
        
    user_message = f"""Analyze the following GitHub Repository:

**Repository**: {details['name']}
**Primary Language**: {details['language']}
**Stars**: {details['stars']} | **Forks**: {details['forks']}
**Description**: {details['description']}

**Top-Level Structure**:
{', '.join(details['structure'])}

**README Content**:
---
{readme}
---

Provide a comprehensive technical analysis of this project."""

    messages = [
        {'role': 'system', 'content': GITHUB_ANALYZER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'github-analyzer', 'result': result}


def dispatch_webhook(data, api_key, model=None):
    """Send data to a webhook and analyze the response."""
    webhook_url = data.get('webhook_url', '')
    payload_type = data.get('payload_type', 'custom')
    custom_payload = data.get('payload', '')
    
    if not webhook_url.strip():
        return {'tool': 'webhook-dispatcher', 'error': 'Please provide a Webhook URL.'}
    
    from services.webhook_service import send_webhook_payload
    
    # Prepare the payload
    try:
        if payload_type == 'json':
            payload = json.loads(custom_payload)
        else:
            payload = {"message": custom_payload, "source": "NexusAI", "timestamp": str(datetime.now())}
    except Exception as e:
        return {'tool': 'webhook-dispatcher', 'error': f'Invalid JSON payload: {str(e)}'}
        
    try:
        response_data = send_webhook_payload(webhook_url, payload)
    except Exception as e:
        return {'tool': 'webhook-dispatcher', 'error': str(e)}
        
    user_message = f"""The following data was sent to a webhook:

**Webhook URL**: {webhook_url}
**Payload Sent**:
```json
{json.dumps(payload, indent=2)}
```

**Server Response**:
```json
{json.dumps(response_data, indent=2)}
```

Provide an integration status report and tips for using this data in automation workflows."""

    messages = [
        {'role': 'system', 'content': WEBHOOK_DISPATCHER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.2,
    )
    return {'tool': 'webhook-dispatcher', 'result': result}


def generate_quiz(data, api_key, model=None):
    """Generate a quiz from a topic or text."""
    topic = data.get('topic', '')
    num_questions = data.get('num_questions', '5')
    difficulty = data.get('difficulty', 'medium')
    context_text = data.get('context_text', '')
    
    if not topic.strip() and not context_text.strip():
        return {'tool': 'quiz-generator', 'error': 'Please provide a topic or source text for the quiz.'}
        
    user_message = f"""Generate a quiz with the following parameters:
**Topic/Title**: {topic}
**Number of Questions**: {num_questions}
**Difficulty Level**: {difficulty}

"""
    if context_text:
        user_message += f"\n**Source Text to generate quiz from**:\n---\n{context_text[:15000]}\n---"
        
    user_message += "\n\nEnsure questions are varied and cover the main concepts thoroughly."

    messages = [
        {'role': 'system', 'content': QUIZ_GENERATOR_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.5,
    )
    return {'tool': 'quiz-generator', 'result': result}


def explain_concept(data, api_key, model=None):
    """Explain a CS/ML concept with diagrams and code."""
    concept = data.get('concept', '')
    level = data.get('level', 'intermediate')
    
    if not concept.strip():
        return {'tool': 'concept-explainer', 'error': 'Please provide a concept to explain.'}
        
    user_message = f"""Explain the following concept:
**Concept**: {concept}
**Target Level**: {level}

Provide a visual breakdown, Mermaid diagram, and a code example."""

    messages = [
        {'role': 'system', 'content': CONCEPT_EXPLAINER_SYSTEM_PROMPT},
        {'role': 'user', 'content': user_message},
    ]

    result, _ = chat_completion(
        messages=messages,
        api_key=api_key,
        model=model or DEFAULT_CHAT_MODEL,
        temperature=0.4,
    )
    return {'tool': 'concept-explainer', 'result': result}




# ─── Tool Dispatcher ─────────────────────────────────────────────

TOOL_FUNCTIONS = {
    'salary-predictor': predict_salary,
    'resume-analyzer': analyze_resume,
    'code-debugger': debug_code,
    'business-validator': validate_business,
    'email-writer': write_email,
    'math-solver': solve_math,
    'interview-prep': prepare_interview,
    'legal-explainer': explain_legal,
    'text-summarizer': summarize_text,
    'language-translator': translate_language,
    'content-writer': write_content,
    'sql-generator': generate_sql,
    'api-doc-generator': generate_api_doc,
    'ux-reviewer': review_design,
    'youtube-summarizer': summarize_youtube_video,
    'website-analyzer': analyze_website,
    'github-analyzer': analyze_github_repo,
    'webhook-dispatcher': dispatch_webhook,
    'quiz-generator': generate_quiz,
    'concept-explainer': explain_concept,
}


def execute_tool(tool_name, data, api_key, model=None):
    """
    Execute an AI tool by name.

    Args:
        tool_name: Tool identifier (e.g., 'salary-predictor')
        data: Dict with tool-specific input fields
        api_key: Groq API key
        model: Optional model override

    Returns:
        Dict with 'tool', 'result' (or 'error')
    """
    func = TOOL_FUNCTIONS.get(tool_name)
    if not func:
        return {'tool': tool_name, 'error': f'Unknown tool: {tool_name}'}
    return func(data, api_key, model)
