import React, { useState } from 'react';
import { X, Sparkles, Copy, Volume2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { apiTool } from '../utils/api';

const ToolPanel = ({ tool, category, onClose, settings }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Basic validation for required fields
      const requiredMissing = [];
      // Note: In a real app we'd have a schema, but for now we'll just try to send it
      
      const res = await apiTool(tool.id, formData, settings);
      setResult(res.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const html = marked.parse(text, {
      highlight: (code, lang) => {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    });
    return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const renderFormFields = () => {
    // This is a simplified version of the logic in the old app.js
    // In a mature app, we'd define the fields in the tool config
    
    const inputStyle = {
      width: '100%',
      padding: '12px',
      background: 'var(--bg-0)',
      border: '1px solid var(--border-default)',
      borderRadius: '4px',
      color: 'var(--text-0)',
      fontSize: '0.9rem',
      outline: 'none',
      marginBottom: '16px'
    };

    const labelStyle = {
      display: 'block',
      fontSize: '0.8rem',
      fontWeight: '600',
      color: 'var(--text-2)',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    };

    // Mapping based on tool ID
    switch (tool.id) {
      case 'salary-predictor':
        return (
          <>
            <label style={labelStyle}>Job Role</label>
            <input style={inputStyle} placeholder="e.g. Software Engineer" onChange={e => updateField('role', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Experience</label>
                <input style={inputStyle} placeholder="e.g. 5 years" onChange={e => updateField('experience', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} placeholder="e.g. New York, Remote" onChange={e => updateField('location', e.target.value)} />
              </div>
            </div>
          </>
        );
      case 'resume-analyzer':
        return (
          <>
            <label style={labelStyle}>Upload Resume (PDF/Docx)</label>
            <input type="file" accept=".pdf,.doc,.docx" style={inputStyle} onChange={e => updateField('resume_file', e.target.files[0])} />
            <label style={labelStyle}>Or Paste Resume Text</label>
            <textarea style={{ ...inputStyle, height: '120px' }} placeholder="Paste your resume text here if you don't have a file..." onChange={e => updateField('resume_text', e.target.value)} />
            <label style={labelStyle}>Target Role (Optional)</label>
            <input style={inputStyle} placeholder="e.g. Frontend Developer" onChange={e => updateField('target_role', e.target.value)} />
          </>
        );
      case 'interview-prep':
        return (
          <>
            <label style={labelStyle}>Target Job Role</label>
            <input style={inputStyle} placeholder="e.g. React Developer" onChange={e => updateField('role', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Experience Level</label>
                <select style={inputStyle} onChange={e => updateField('experience_level', e.target.value)}>
                  <option value="junior">Junior / Entry Level</option>
                  <option value="mid-level">Mid Level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / Manager</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Target Company (Optional)</label>
                <input style={inputStyle} placeholder="e.g. Google, Stripe" onChange={e => updateField('company', e.target.value)} />
              </div>
            </div>
          </>
        );
      case 'code-debugger':
        return (
          <>
            <label style={labelStyle}>Code to Debug</label>
            <textarea style={{ ...inputStyle, height: '200px', fontFamily: 'var(--font-mono)' }} placeholder="Paste your code here..." onChange={e => updateField('code', e.target.value)} />
            <label style={labelStyle}>Error Message (Optional)</label>
            <textarea style={{ ...inputStyle, height: '80px' }} placeholder="Paste the error message here..." onChange={e => updateField('error_message', e.target.value)} />
          </>
        );
      case 'email-writer':
        return (
          <>
            <label style={labelStyle}>Email Context / Purpose</label>
            <textarea style={{ ...inputStyle, height: '120px' }} placeholder="What is the email about?" onChange={e => updateField('context', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tone</label>
                <select style={inputStyle} onChange={e => updateField('tone', e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Recipient (Optional)</label>
                <input style={inputStyle} placeholder="e.g. Manager, Client" onChange={e => updateField('recipient', e.target.value)} />
              </div>
            </div>
          </>
        );
      case 'legal-explainer':
        return (
          <>
            <label style={labelStyle}>Legal Document Text</label>
            <textarea style={{ ...inputStyle, height: '200px' }} placeholder="Paste the legal contract, terms of service, or document here..." onChange={e => updateField('legal_text', e.target.value)} />
            <label style={labelStyle}>Document Type (Optional)</label>
            <input style={inputStyle} placeholder="e.g. Employment Contract, NDA" onChange={e => updateField('document_type', e.target.value)} />
          </>
        );
      case 'text-summarizer':
        return (
          <>
            <label style={labelStyle}>Text to Summarize</label>
            <textarea style={{ ...inputStyle, height: '200px' }} placeholder="Paste the long article or document here..." onChange={e => updateField('text', e.target.value)} />
            <label style={labelStyle}>Format</label>
            <select style={inputStyle} onChange={e => updateField('format', e.target.value)}>
              <option value="bullet points">Bullet Points</option>
              <option value="paragraph">Short Paragraphs</option>
              <option value="executive summary">Executive Summary</option>
            </select>
          </>
        );
      case 'language-translator':
        return (
          <>
            <label style={labelStyle}>Text to Translate</label>
            <textarea style={{ ...inputStyle, height: '150px' }} placeholder="Paste text here..." onChange={e => updateField('text', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Target Language</label>
                <input style={inputStyle} placeholder="e.g. Spanish, Japanese" onChange={e => updateField('target_language', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tone</label>
                <select style={inputStyle} onChange={e => updateField('tone', e.target.value)}>
                  <option value="neutral">Neutral</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual / Conversational</option>
                </select>
              </div>
            </div>
          </>
        );
      case 'content-writer':
        return (
          <>
            <label style={labelStyle}>Topic / Title</label>
            <input style={inputStyle} placeholder="What should the content be about?" onChange={e => updateField('topic', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Content Type</label>
                <select style={inputStyle} onChange={e => updateField('type', e.target.value)}>
                  <option value="blog post">Blog Post</option>
                  <option value="article">Article</option>
                  <option value="social media post">Social Media Post</option>
                  <option value="marketing copy">Marketing Copy</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Length</label>
                <select style={inputStyle} onChange={e => updateField('length', e.target.value)}>
                  <option value="medium">Medium (~700 words)</option>
                  <option value="short">Short (~300 words)</option>
                  <option value="long">Long (1000+ words)</option>
                </select>
              </div>
            </div>
          </>
        );
      case 'business-validator':
        return (
          <>
            <label style={labelStyle}>Business Idea</label>
            <textarea style={{ ...inputStyle, height: '150px' }} placeholder="Describe your startup or business idea in detail..." onChange={e => updateField('idea', e.target.value)} />
            <label style={labelStyle}>Target Market (Optional)</label>
            <input style={inputStyle} placeholder="e.g. Gen Z students, B2B SaaS companies" onChange={e => updateField('target_market', e.target.value)} />
          </>
        );
      case 'math-solver':
        return (
          <>
            <label style={labelStyle}>Problem Statement</label>
            <textarea style={{ ...inputStyle, height: '120px' }} placeholder="Paste your math or science problem here..." onChange={e => updateField('problem', e.target.value)} />
            <label style={labelStyle}>Subject Area</label>
            <select style={inputStyle} onChange={e => updateField('subject', e.target.value)}>
              <option value="mathematics">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="computer science">Computer Science</option>
            </select>
          </>
        );
      case 'sql-generator':
        return (
          <>
            <label style={labelStyle}>Query Description</label>
            <textarea style={{ ...inputStyle, height: '100px' }} placeholder="e.g. Get all orders from the last 30 days..." onChange={e => updateField('description', e.target.value)} />
            <label style={labelStyle}>Table Schema (Optional)</label>
            <textarea style={{ ...inputStyle, height: '100px', fontFamily: 'var(--font-mono)' }} placeholder="e.g. Users(id, email), Orders(id, user_id, amount)..." onChange={e => updateField('schema', e.target.value)} />
          </>
        );
      case 'api-doc-generator':
        return (
          <>
            <label style={labelStyle}>API Code / Context</label>
            <textarea style={{ ...inputStyle, height: '180px', fontFamily: 'var(--font-mono)' }} placeholder="Paste your route code or API description here..." onChange={e => updateField('input_text', e.target.value)} />
            <label style={labelStyle}>Format</label>
            <select style={inputStyle} onChange={e => updateField('format', e.target.value)}>
              <option value="markdown">Markdown (Standard)</option>
              <option value="openapi-yaml">OpenAPI / Swagger (YAML)</option>
              <option value="openapi-json">OpenAPI / Swagger (JSON)</option>
            </select>
          </>
        );
      case 'ux-reviewer':
        return (
          <>
            <label style={labelStyle}>Design Description / Concepts</label>
            <textarea style={{ ...inputStyle, height: '150px' }} placeholder="Describe your UI/UX design, wireframe, or page flow..." onChange={e => updateField('description', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Platform</label>
                <select style={inputStyle} onChange={e => updateField('platform', e.target.value)}>
                  <option value="Web">Web Application</option>
                  <option value="Mobile App">Mobile App (iOS/Android)</option>
                  <option value="Landing Page">Marketing Landing Page</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Target Audience</label>
                <input style={inputStyle} placeholder="e.g. Elderly users, Pro developers" onChange={e => updateField('target_audience', e.target.value)} />
              </div>
            </div>
          </>
        );
      case 'youtube-summarizer':
        return (
          <>
            <label style={labelStyle}>YouTube Video URL</label>
            <input style={inputStyle} placeholder="https://www.youtube.com/watch?v=..." onChange={e => updateField('video_url', e.target.value)} />
          </>
        );
      case 'website-analyzer':
        return (
          <>
            <label style={labelStyle}>Website URL</label>
            <input style={inputStyle} placeholder="https://example.com" onChange={e => updateField('url', e.target.value)} />
          </>
        );
      case 'github-analyzer':
        return (
          <>
            <label style={labelStyle}>GitHub Repository URL</label>
            <input style={inputStyle} placeholder="https://github.com/owner/repo" onChange={e => updateField('repo_url', e.target.value)} />
          </>
        );
      case 'webhook-dispatcher':
        return (
          <>
            <label style={labelStyle}>Target Webhook URL</label>
            <input style={inputStyle} placeholder="https://hooks.zapier.com/..." onChange={e => updateField('webhook_url', e.target.value)} />
            <label style={labelStyle}>Payload Data (JSON format or description)</label>
            <textarea style={{ ...inputStyle, height: '150px', fontFamily: 'var(--font-mono)' }} placeholder='{"name": "John Doe", "email": "john@example.com"}' onChange={e => updateField('payload', e.target.value)} />
          </>
        );
      case 'quiz-generator':
        return (
          <>
            <label style={labelStyle}>Quiz Topic</label>
            <input style={inputStyle} placeholder="e.g. World War II History, Python Basics" onChange={e => updateField('topic', e.target.value)} />
            <label style={labelStyle}>Or paste source material to generate from:</label>
            <textarea style={{ ...inputStyle, height: '100px' }} placeholder="(Optional) Paste an article or notes to test on..." onChange={e => updateField('context_text', e.target.value)} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Number of Questions</label>
                <input style={inputStyle} type="number" min="1" max="20" placeholder="5" onChange={e => updateField('num_questions', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Difficulty</label>
                <select style={inputStyle} onChange={e => updateField('difficulty', e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </>
        );
      case 'concept-explainer':
        return (
          <>
            <label style={labelStyle}>CS/ML Concept</label>
            <input style={inputStyle} placeholder="e.g. Backpropagation, React Hooks, DNS" onChange={e => updateField('concept', e.target.value)} />
            <label style={labelStyle}>Target Level</label>
            <select style={inputStyle} onChange={e => updateField('level', e.target.value)}>
              <option value="beginner">Beginner (ELI5)</option>
              <option value="intermediate">Intermediate (Student)</option>
              <option value="advanced">Advanced (Professional)</option>
            </select>
          </>
        );
      default:
        return (
          <>
            <label style={labelStyle}>Input Data</label>
            <textarea style={{ ...inputStyle, height: '150px' }} placeholder="Provide necessary input for this tool..." onChange={e => updateField('input_text', e.target.value)} />
          </>
        );
    }
  };

  return (
    <div className="tool-panel-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(8px)', padding: '40px'
    }}>
      <div className="tool-panel" style={{
        width: '100%', maxWidth: '900px', height: '90vh', background: 'var(--bg-1)',
        borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out', boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
      }}>
        <div className="tool-panel-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{tool.name}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category.label}</span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="tool-panel-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '32px', lineHeight: '1.6' }}>{tool.desc}</p>
          
          {!result ? (
            <div className="tool-form">
              {renderFormFields()}
              <button 
                className="tool-submit-btn" 
                onClick={handleSubmit} 
                disabled={loading}
                style={{
                  width: '100%', padding: '16px', background: 'var(--text-0)', color: 'var(--bg-0)',
                  border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  marginTop: '16px', transition: 'var(--transition)'
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? 'Processing...' : `Run ${tool.name}`}
              </button>
            </div>
          ) : (
            <div className="tool-result">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-1)' }}>
                  <CheckCircle size={16} /> Result Generated
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="icon-btn" onClick={() => navigator.clipboard.writeText(result)} title="Copy Result">
                    <Copy size={16} />
                  </button>
                  <button className="icon-btn" title="Read Aloud">
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '20px', background: 'var(--bg-0)', border: '1px solid var(--border-subtle)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                {renderMarkdown(result)}
              </div>
              <button 
                className="tool-submit-btn" 
                onClick={() => setResult(null)}
                style={{
                  width: '100%', padding: '12px', background: 'transparent', color: 'var(--text-1)',
                  border: '1px solid var(--border-subtle)', borderRadius: '4px', fontWeight: '600', cursor: 'pointer',
                  marginTop: '24px'
                }}
              >
                Run Again
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,59,48,0.1)', border: '1px solid var(--error)', borderRadius: '4px', color: 'var(--error)', display: 'flex', gap: '12px', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolPanel;
