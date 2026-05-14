export const API_BASE = import.meta.env.MODE === 'development'
    ? 'http://127.0.0.1:5001/api'
    : window.location.origin + '/api';


export const DEFAULT_SETTINGS = {
    voiceEnabled: true,
    model: 'llama-3.3-70b-versatile',
    automationEnabled: true,
    groq_api_key: '',
    ocr_api_key: '',
    temperature: 0.7,
    theme: 'dark',
    systemPrompt: '',
    simple_chat: true
};

export const MODELS = [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Fast and versatile' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', desc: 'Vision capable' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'Strong reasoning' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultra fast' },
];

export const TOOL_CATEGORIES = [
    {
        id: 'career', label: 'Career and Finance', iconClass: 'career',
        tools: [
            { id: 'salary-predictor', name: 'Salary Predictor', icon: 'trending-up', desc: 'Predict salary ranges based on role, experience, location, and skills' },
            { id: 'resume-analyzer', name: 'Resume Analyzer', icon: 'file-text', desc: 'Analyze your resume for ATS compatibility, gaps, and improvements' },
            { id: 'interview-prep', name: 'Interview Prep', icon: 'users', desc: 'Get role-specific interview questions with model answers' },
        ]
    },
    {
        id: 'developer', label: 'Developer Tools', iconClass: 'developer',
        tools: [
            { id: 'code-debugger', name: 'Code Debugger', icon: 'bug', desc: 'Find bugs, explain errors, and get fix suggestions for your code' },
            { id: 'sql-generator', name: 'SQL Query Generator', icon: 'database', desc: 'Generate complex SQL queries from natural language descriptions' },
            { id: 'api-doc-generator', name: 'API Doc Generator', icon: 'book-open', desc: 'Generate professional API documentation from code or specs' },
            { id: 'github-analyzer', name: 'GitHub Repo Analyzer', icon: 'github', desc: 'Analyze tech stack, structure, and quality of any GitHub repo' },
            { id: 'webhook-dispatcher', name: 'Webhook Dispatcher', icon: 'send', desc: 'Send custom data or AI payloads to Zapier, Make, or custom URLs' },
        ]
    },
    {
        id: 'writing', label: 'Writing and Documents', iconClass: 'writing',
        tools: [
            { id: 'email-writer', name: 'Email and Letter Writer', icon: 'mail', desc: 'Generate professional emails, cover letters, and formal documents' },
            { id: 'legal-explainer', name: 'Legal Explainer', icon: 'scale', desc: 'Simplify legal jargon in contracts and terms of service' },
            { id: 'text-summarizer', name: 'Text Summarizer', icon: 'align-left', desc: 'Summarize long articles, documents, or text into concise formats' },
            { id: 'language-translator', name: 'Language Translator', icon: 'languages', desc: 'Translate text between languages with high accuracy and cultural context' },
            { id: 'content-writer', name: 'Content / Blog Writer', icon: 'pen-tool', desc: 'Generate high-quality blog posts, articles, and marketing content' },
        ]
    },
    {
        id: 'analysis', label: 'Analysis and Learning', iconClass: 'analysis',
        tools: [
            { id: 'business-validator', name: 'Business Validator', icon: 'lightbulb', desc: 'Evaluate your startup or business idea with market analysis' },
            { id: 'math-solver', name: 'Math and Science Solver', icon: 'calculator', desc: 'Solve math problems step-by-step and explain science concepts' },
            { id: 'ux-reviewer', name: 'UI/UX Design Reviewer', icon: 'layers', desc: 'Get expert feedback on your UI/UX designs, wireframes, or landing pages' },
            { id: 'youtube-summarizer', name: 'YouTube Video Summarizer', icon: 'youtube', desc: 'Summarize YouTube videos from their URLs with key insights and chapters' },
            { id: 'website-analyzer', name: 'Website Scraper and Analyzer', icon: 'globe', desc: 'Scrape and analyze any website for content summary, SEO, and key data' },
            { id: 'quiz-generator', name: 'AI Quiz Generator', icon: 'help-circle', desc: 'Generate custom quizzes and MCQs from any topic or document text' },
            { id: 'concept-explainer', name: 'CS/ML Concept Explainer', icon: 'book', desc: 'Visual, step-by-step explanations of CS/ML concepts with code' },
        ]
    },
    {
        id: 'support', label: 'AI Support', iconClass: 'support',
        tools: [
            { id: 'support-platform', name: 'AI Customer Support', icon: 'customer-service', desc: 'Multi-tenant support system with AI routing and suggested replies' },
        ]
    },
];

export const formatTime = (ts) => {
    if (!ts) return '';
    const date = typeof ts === 'number' ? new Date(ts < 10000000000 ? ts * 1000 : ts) : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (ts) => {
    if (!ts) return '';
    const date = typeof ts === 'number' ? new Date(ts < 10000000000 ? ts * 1000 : ts) : new Date(ts);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};
