import { API_BASE } from './helpers';

const getHeaders = (settings) => {
    const headers = { 'Content-Type': 'application/json' };
    if (settings?.groq_api_key) {
        headers['X-Groq-Key'] = settings.groq_api_key;
    }
    return headers;
};

export const apiLogin = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
};

export const apiRegister = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
};

export const apiChat = async (messages, settings, userId, sessionId, systemPrompt = null) => {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const history = messages.slice(0, -1);
    const endpoint = 'chat';

    
    const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(settings),
        body: JSON.stringify({ 
            message: lastMessage,
            history: history,
            model: settings.model,
            temperature: settings.temperature,
            user_id: userId,
            session_id: sessionId || 'default-session',

            system_prompt: systemPrompt,
            simple_chat: true
        })
    });

    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Chat request failed');
    }
    return res;
};


export const apiChatStream = async (messages, settings, userId, sessionId, onChunk) => {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const history = messages.slice(0, -1);
    
    const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: getHeaders(settings),
        body: JSON.stringify({ 
            message: lastMessage,
            history: history,
            model: settings.model,
            temperature: settings.temperature,
            user_id: userId,
            session_id: sessionId,
            simple_chat: settings.simple_chat !== false,
            system_prompt: settings.system_prompt || ''
        })
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Stream request failed' }));
        throw new Error(errData.error || 'Chat stream request failed');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';
    let lineBuffer = ''; // Buffer for partial SSE lines split across network chunks

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // Append decoded bytes to the line buffer
        lineBuffer += decoder.decode(value, { stream: true });

        // Extract only complete lines — keep the last partial line in the buffer
        const newlineIndex = lineBuffer.lastIndexOf('\n');
        if (newlineIndex === -1) continue; // No complete line yet

        const completeChunk = lineBuffer.slice(0, newlineIndex);
        lineBuffer = lineBuffer.slice(newlineIndex + 1);

        const lines = completeChunk.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.substring(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            
            try {
                const data = JSON.parse(dataStr);
                if (data.error) throw new Error(data.error);
                
                if (data.metadata) {
                    onChunk(fullResponse, data);
                }
                
                // Handle incremental token chunks
                if (data.chunk) {
                    fullResponse += data.chunk;
                    onChunk(fullResponse, null);
                } else if (data.content !== undefined && data.type === 'chunk') {
                    fullResponse = data.content;
                    onChunk(fullResponse, null);
                }
                
                // Done signal — return immediately with the full response
                if (data.done || data.type === 'done') {
                    return { 
                        response: data.response || data.full_response || fullResponse, 
                        intent: data.intent || 'chat',
                        actionResult: data.actionResult || data.action_result
                    };
                }
            } catch (e) {
                // Only log if it looks like valid data (not empty/whitespace)
                if (dataStr.length > 2) {
                    console.error('[SSE] Parse error:', e.message, '| Raw:', dataStr.slice(0, 120));
                }
            }
        }
    }

    // Fallback — stream ended without a 'done' event (e.g. connection drop)
    return { response: fullResponse, intent: 'chat' };
};

export const apiGetConversations = async (userId) => {
    const res = await fetch(`${API_BASE}/conversations/${userId}`);
    const data = await res.json();
    return data.conversations || [];
};

export const apiGetSessionHistory = async (sessionId) => {
    const res = await fetch(`${API_BASE}/session/${sessionId}`);
    const data = await res.json();
    return data.history || [];
};

export const apiTool = async (toolId, payload, settings) => {
    let body;
    const headers = getHeaders(settings);
    
    // Check if any payload value is a File
    const hasFile = Object.values(payload).some(val => val instanceof File);
    
    if (hasFile) {
        body = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                body.append(key, value);
            }
        });
        if (settings?.model) body.append('model', settings.model);
        // Remove Content-Type so browser sets it to multipart/form-data with boundary
        delete headers['Content-Type'];
    } else {
        body = JSON.stringify({
            ...payload,
            model: settings?.model
        });
    }

    const res = await fetch(`${API_BASE}/tools/${toolId}`, {
        method: 'POST',
        headers,
        body
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Tool execution failed');
    return data;
};

export const apiVoice = async (audioBlob, settings, userId) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (settings?.model) formData.append('model', settings.model);
    if (userId) formData.append('user_id', userId);
    
    const headers = getHeaders(settings);
    delete headers['Content-Type'];
    
    const res = await fetch(`${API_BASE}/voice`, {
        method: 'POST',
        headers,
        body: formData
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Voice processing failed');
    return data;
};

export const apiDocumentUpload = async (file, message, settings, sessionId, userId) => {
    const formData = new FormData();
    formData.append('document', file);
    if (message) formData.append('message', message);
    if (settings?.model) formData.append('model', settings.model);
    if (settings?.temperature) formData.append('temperature', settings.temperature);
    if (settings?.ocr_api_key) formData.append('ocr_api_key', settings.ocr_api_key);
    if (sessionId) formData.append('session_id', sessionId);
    if (userId) formData.append('user_id', userId);
    
    const headers = getHeaders(settings);
    delete headers['Content-Type'];
    
    const res = await fetch(`${API_BASE}/document`, {
        method: 'POST',
        headers,
        body: formData
    });
    
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${res.statusText}${errorText.includes('<!DOCTYPE') ? ' (Server returned HTML instead of JSON)' : ''}`);
    }
    
    const data = await res.json();
    return data;
};

// Knowledge Base APIs
export const apiGetKBs = async () => {
    const res = await fetch(`${API_BASE}/rag/list`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.kbs || []);
};

export const apiCreateKB = async (name, description) => {
    const res = await fetch(`${API_BASE}/rag/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
    });
    return await res.json();
};

export const apiUploadKB = async (kbId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/rag/${kbId}/upload`, {
        method: 'POST',
        body: formData
    });
    return await res.json();
};

export const apiDeleteKB = async (kbId) => {
    const res = await fetch(`${API_BASE}/rag/${kbId}/delete`, {
        method: 'DELETE'
    });
    return await res.json();
};

export const apiDeleteKBFile = async (kbId, filename) => {
    const res = await fetch(`${API_BASE}/rag/${kbId}/file/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    });
    return await res.json();
};

export const apiGetKBChunks = async (kbId) => {
    const res = await fetch(`${API_BASE}/rag/${kbId}/chunks`);
    return await res.json();
};

export const apiChatKB = async (kbId, message, history, settings, augmentWeb = false) => {
    const res = await fetch(`${API_BASE}/rag/${kbId}/chat`, {
        method: 'POST',
        headers: getHeaders(settings),
        body: JSON.stringify({
            message,
            history,
            model: settings.model,
            augment_web: augmentWeb,
            top_k: 5
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'RAG Chat failed');
    }
    return await res.json();
};


// Data Science APIs
export const apiDSUpload = async (file, sessionId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    const res = await fetch(`${API_BASE}/ds/upload`, {
        method: 'POST',
        body: formData
    });
    return await res.json();
};

export const apiDSEda = async (sessionId) => {
    const res = await fetch(`${API_BASE}/ds/eda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    });
    return await res.json();
};

export const apiDSTrain = async (sessionId, target, features, modelType) => {
    const res = await fetch(`${API_BASE}/ds/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, target, features, task_type: modelType, mode: 'ml' })
    });
    return await res.json();
};

export const apiDSVizData = async (sessionId, column) => {
    const res = await fetch(`${API_BASE}/ds/viz-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, column })
    });
    return await res.json();
};

export const apiDSPredict = async (sessionId, inputs) => {
    const res = await fetch(`${API_BASE}/ds/run-inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, inputs })
    });
    return await res.json();
};

export const apiDSClean = async (sessionId, action, column, strategy) => {
    const res = await fetch(`${API_BASE}/ds/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, action, column, strategy })
    });
    return await res.json();
};

export const apiDSScatter = async (sessionId, col_x, col_y) => {
    const res = await fetch(`${API_BASE}/ds/scatter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, col_x, col_y })
    });
    return await res.json();
};

export const apiDSExportUrl = (sessionId) => {
    return `${API_BASE}/ds/export?session_id=${sessionId}`;
};

// Code Workspace APIs
export const apiGetFiles = async () => {
    const res = await fetch(`${API_BASE}/code/files`);
    const data = await res.json();
    return data.files || [];
};

export const apiGetFileContent = async (path) => {
    const res = await fetch(`${API_BASE}/code/file?path=${encodeURIComponent(path)}`);
    return await res.json();
};

export const apiSaveFile = async (path, content) => {
    const res = await fetch(`${API_BASE}/code/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
    });
    return await res.json();
};

export const apiRunCode = async (path) => {
    const res = await fetch(`${API_BASE}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
    return await res.json();
};

export const apiGetPackages = async () => {
    const res = await fetch(`${API_BASE}/code/packages`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.packages || []);
};

export const apiInstallPackage = async (name) => {
    const res = await fetch(`${API_BASE}/code/packages/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: name })
    });
    return await res.json();
};

export const apiSwarm = async (task, settings) => {
    const res = await fetch(`${API_BASE}/swarm/execute`, {
        method: 'POST',
        headers: getHeaders(settings),
        body: JSON.stringify({ task, model: settings?.model })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Swarm execution failed');
    return data;
};
