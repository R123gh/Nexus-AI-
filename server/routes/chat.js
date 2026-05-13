'use strict';
/**
 * NexusAI Node.js — Chat Route
 * Handles fast streaming + simple chat directly from Node,
 * bypassing Python for maximum speed.
 */

const router = require('express').Router();
const db = require('../db');

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

function getApiKey(req) {
  return (
    req.headers['x-groq-key'] ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    process.env.GROQ_API_KEY ||
    ''
  ).trim();
}

function buildMessages(history, message, systemPrompt) {
  const sys = systemPrompt ||
    'You are NexusAI, a helpful, friendly, and knowledgeable AI assistant. Provide clear, concise, and accurate responses.';
  const msgs = [{ role: 'system', content: sys }];
  
  // Last 12 messages for context
  const window = (history || []).slice(-12);
  for (const m of window) {
    if (m.role === 'user' || m.role === 'assistant') {
      msgs.push({ role: m.role, content: m.content });
    }
  }
  
  // Add the CURRENT message which was being ignored!
  if (message) {
    msgs.push({ role: 'user', content: message });
  }
  
  return msgs;
}

// ─── POST /api/chat/stream  (SSE streaming) ──────────────────────────────────
router.post('/stream', async (req, res) => {
  const {
    message, history = [], model, temperature = 0.7,
    session_id = 'default', user_id, system_prompt, simple_chat = true,
  } = req.body;

  const api_key = getApiKey(req);
  if (!api_key || ['undefined', 'null', 'none'].includes(api_key.toLowerCase())) {
    return res.status(401).json({ error: 'Groq API key not configured. Please set it in Settings.' });
  }

  const resolvedModel = model || 'llama-3.3-70b-versatile';

  // Normalize session_id to avoid SQLite NOT NULL constraints
  const safeSessionId = session_id || 'default';

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let fullResponse = '';

  try {
    // Store user message inside try block
    if (user_id) db.addMessage(safeSessionId, 'user', message, user_id);
    else         db.addMessage(safeSessionId, 'user', message);

    const msgs = buildMessages(history, message, system_prompt);

    // Use native fetch (Node 18+)
    const groqRes = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: msgs,
        temperature: parseFloat(temperature) || 0.7,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (groqRes.status === 401) {
      send({ error: 'Invalid Groq API Key. Please check your key in Settings.' });
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      send({ error: `Groq API error (${groqRes.status}): ${errText.slice(0, 200)}` });
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Stream chunks with proper buffering
    const decoder = new TextDecoder();
    let streamBuffer = '';
    
    const reader = groqRes.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      
      // Only process complete lines — keep the last partial line in the buffer
      const newlineIndex = streamBuffer.lastIndexOf('\n');
      if (newlineIndex === -1) continue;

      const completeLines = streamBuffer.slice(0, newlineIndex);
      streamBuffer = streamBuffer.slice(newlineIndex + 1);

      for (const line of completeLines.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const raw = trimmed.slice(6).trim();
        if (raw === '[DONE]') continue; // changed from break to continue

        try {
          const parsed = JSON.parse(raw);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            fullResponse += token;
            send({ type: 'chunk', chunk: token });
          }
        } catch (e) {
          // Ignore partial or malformed JSON chunks
        }
      }
    }

    // Flush any remaining data in decoder
    const lastPart = decoder.decode();
    if (lastPart) {
        // Handle last part if needed, but Groq usually ends with [DONE]
    }

    // Store assistant response
    db.addMessage(safeSessionId, 'assistant', fullResponse, user_id || null);
    send({ type: 'done', response: fullResponse, intent: 'chat' });
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('[Chat/stream] Error:', err.message);
    send({ error: `Streaming error: ${err.message}` });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ─── POST /api/chat  (non-streaming fallback) ────────────────────────────────
router.post('/', async (req, res) => {
  const {
    message, history = [], model, temperature = 0.7,
    session_id = 'default', user_id, system_prompt,
  } = req.body;

  const api_key = getApiKey(req);
  if (!api_key || ['undefined', 'null', 'none'].includes(api_key.toLowerCase())) {
    return res.status(401).json({ error: 'Groq API key not configured. Please set it in Settings.' });
  }

  const resolvedModel = model || 'llama-3.3-70b-versatile';
  const safeSessionId = session_id || 'default';

  try {
    const msgs = buildMessages(history, message, system_prompt);

    const groqRes = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: msgs,
        temperature: parseFloat(temperature) || 0.7,
        max_tokens: 2048,
      }),
    });

    if (groqRes.status === 401) {
      return res.status(401).json({ error: 'Invalid Groq API Key. Please check your key in Settings.' });
    }
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(groqRes.status).json({ error: `Groq error: ${errText.slice(0, 200)}` });
    }

    const data = await groqRes.json();
    const response = data.choices?.[0]?.message?.content || '';

    db.addMessage(safeSessionId, 'user', message, user_id || null);
    db.addMessage(safeSessionId, 'assistant', response, user_id || null);

    return res.json({ response, intent: 'chat', model: resolvedModel });

  } catch (err) {
    console.error('[Chat] Error:', err.message);
    return res.status(500).json({ error: `Internal error: ${err.message}` });
  }
});

module.exports = router;
