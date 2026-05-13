'use strict';
require('dotenv').config({ path: '../backend/.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server: SocketIO } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ──────────────────────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
  socket.on('join_room', (room) => socket.join(room));
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(morgan('dev'));

// ─── Routes Requirements ─────────────────────────────────────────────────────
const chatRoutes      = require('./routes/chat');
const authRoutes      = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const vaultRoutes     = require('./routes/vault');
const notifRoutes     = require('./routes/notifications');
const exportRoutes    = require('./routes/export');
const webhookRoutes   = require('./routes/webhooks');
const pythonProxy     = require('./routes/pythonProxy');
const convRoutes      = require('./routes/conversations');

// ─── API Gateway Logic (NODE vs PYTHON) ──────────────────────────────────────
const NODE_API_ROUTES = [
  '/api/chat',
  '/api/auth',
  '/api/analytics',
  '/api/vault',
  '/api/notifications',
  '/api/export',
  '/api/webhooks',
  '/api/conversations',
  '/api/health'
];

// If it's a Python route, handle it BEFORE body parsers to protect the stream
app.use('/api', (req, res, next) => {
  const isNodeRoute = NODE_API_ROUTES.some(route => req.path.startsWith(route.replace('/api', '')));
  // Note: req.path in app.use('/api') is relative to /api, e.g. /document
  
  if (isNodeRoute) {
    next();
  } else {
    console.log(`[Gateway] Routing ${req.method} ${req.originalUrl} to Python Microservice`);
    return pythonProxy(req, res);
  }
});

// ─── Standard Body Parsers (For Node routes only) ────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiter for AI chat endpoints
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Node.js Native API Routes ──────────────────────────────────────────────
app.use('/api/chat',          chatLimiter, chatRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/vault',         vaultRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/export',        exportRoutes);
app.use('/api/webhooks',      webhookRoutes);
app.use('/api/conversations', convRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'NexusAI Node.js v1.5-GATEWAY',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Serve Frontend (dist) ───────────────────────────────────────────────────
const DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(DIST));
app.get('/*', (req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found on Node or Python' });
  res.sendFile(path.join(DIST, 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.NODE_PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NexusAI Gateway active on http://127.0.0.1:${PORT}`);
  console.log(`   Python Microservice: http://127.0.0.1:5001`);
  console.log(`   Mode: Hybrid (Node + Python)\n`);
});

module.exports = { app, io };
