'use strict';
/**
 * pythonProxy.js
 * 
 * Forwards all ML/AI-heavy routes to the Python Flask microservice
 * running on port 5001. All Python-specific features (RAG, Code execution,
 * Data Science, Voice, Images, Swarm, Orchestration, Tools) go through here.
 * 
 * Node.js stays non-blocking; Python handles the heavy lifting.
 */

const http = require('http');
const url = require('url');

const PYTHON_BASE = process.env.PYTHON_BASE || 'http://127.0.0.1:5001';

async function pythonProxy(req, res) {
  const targetUrl = `${PYTHON_BASE}${req.originalUrl}`;
  console.log(`[PythonProxy] Proxying ${req.method} ${req.originalUrl} to ${targetUrl}`);
  
  const parsedUrl = url.parse(targetUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.path,
    method: req.method,
    headers: { ...req.headers }
  };

  // Remove host header to avoid issues with target server
  delete options.headers.host;

  const proxyReq = http.request(options, (pyRes) => {
    console.log(`[PythonProxy] ${req.method} ${req.originalUrl} -> ${pyRes.statusCode}`);
    // Copy status code and headers
    res.status(pyRes.statusCode);
    Object.keys(pyRes.headers).forEach(key => {
      res.setHeader(key, pyRes.headers[key]);
    });

    // Pipe response back to client
    pyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[PythonProxy] Proxy error: ${err.message}`);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Python microservice unavailable',
        details: err.message
      });
    }
  });

  // Pipe the incoming request body to the proxy request
  if (req.body && Object.keys(req.body).length > 0 && !req.headers['content-type']?.includes('multipart')) {
    // If body was already parsed by Express middleware and is not multipart, 
    // we must write the stringified version since the stream is already consumed.
    const bodyData = JSON.stringify(req.body);
    // Update content-length to match the new stringified body
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
    proxyReq.end();
  } else {
    // For multipart or unparsed requests, pipe the raw stream
    req.pipe(proxyReq);
  }
}

module.exports = pythonProxy;
