'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Shared DB path with Flask (same SQLite file)
const DB_PATH = path.join(__dirname, '../backend/nexus_memory.db');
const db = new Database(DB_PATH);

// Enable WAL mode for much better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema init (idempotent) ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    email TEXT,
    created_at REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service TEXT NOT NULL,
    api_key TEXT NOT NULL,
    updated_at REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, service)
  );
  CREATE TABLE IF NOT EXISTS usage_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    metadata TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_msg_session  ON messages (session_id);
  CREATE INDEX IF NOT EXISTS idx_msg_user     ON messages (user_id);
  CREATE INDEX IF NOT EXISTS idx_notify_user  ON notifications (user_id);
`);

// ─── Prepared Statements ──────────────────────────────────────────────────
const stmts = {
  // Auth
  insertUser:      db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'),
  findUserByName:  db.prepare('SELECT id, username, password_hash, avatar_url, bio, email FROM users WHERE username = ?'),
  findUserById:    db.prepare('SELECT id, username, avatar_url, bio, email FROM users WHERE id = ?'),
  updateProfile:   db.prepare('UPDATE users SET avatar_url=?, bio=?, email=? WHERE id=?'),

  // Messages
  insertMsg:       db.prepare('INSERT INTO messages (user_id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'),
  getHistory:      db.prepare('SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC'),
  getHistoryLimit: db.prepare('SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?'),
  getUserConvs:    db.prepare(`
    SELECT session_id, content, MAX(timestamp) as last_updated
    FROM messages WHERE user_id = ? AND role = 'user'
    GROUP BY session_id ORDER BY last_updated DESC
  `),
  countSession:    db.prepare('SELECT COUNT(*) as cnt FROM messages WHERE session_id = ?'),
  trimOldest:      db.prepare(`
    DELETE FROM messages WHERE id IN (
      SELECT id FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?
    )
  `),

  // API Keys
  upsertKey:       db.prepare(`
    INSERT INTO api_keys (user_id, service, api_key, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, service) DO UPDATE SET api_key=excluded.api_key, updated_at=excluded.updated_at
  `),
  getKeys:         db.prepare('SELECT service, api_key FROM api_keys WHERE user_id = ?'),
  deleteKey:       db.prepare('DELETE FROM api_keys WHERE user_id = ? AND service = ?'),

  // Analytics
  logEvent:        db.prepare('INSERT INTO usage_analytics (user_id, event_type, metadata, timestamp) VALUES (?, ?, ?, ?)'),
  getStats:        db.prepare('SELECT COUNT(*) as cnt FROM messages WHERE user_id = ?'),
  getToolCount:    db.prepare('SELECT COUNT(*) as cnt FROM usage_analytics WHERE user_id = ? AND event_type = \'tool_usage\''),
  getDailyMsgs:    db.prepare(`
    SELECT date(timestamp) as d, COUNT(*) as cnt
    FROM messages WHERE user_id = ? AND timestamp > datetime('now','-7 days')
    GROUP BY d
  `),

  // Notifications
  addNotif:        db.prepare('INSERT INTO notifications (user_id, title, message, type, timestamp) VALUES (?, ?, ?, ?, ?)'),
  getNotifs:       db.prepare('SELECT id, title, message, type, is_read, timestamp FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'),
  markRead:        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'),
  markAllRead:     db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?'),
  deleteNotif:     db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?'),
};

const MAX_HISTORY = parseInt(process.env.MAX_HISTORY_PER_SESSION || '100');

// ─── Auth ─────────────────────────────────────────────────────────────────
function registerUser(username, password) {
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = stmts.insertUser.run(username, hash, new Date().toISOString());
    return { success: true, user_id: info.lastInsertRowid };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { success: false, error: 'Username already exists.' };
    return { success: false, error: e.message };
  }
}

function loginUser(username, password) {
  const user = stmts.findUserByName.get(username);
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    return { success: true, user_id: user.id, username: user.username, avatar_url: user.avatar_url, bio: user.bio, email: user.email };
  }
  return { success: false, error: 'Invalid username or password.' };
}

function getUserProfile(user_id) {
  return stmts.findUserById.get(user_id) || null;
}

function updateUserProfile(user_id, { avatar_url, bio, email }) {
  stmts.updateProfile.run(avatar_url || null, bio || null, email || null, user_id);
  return true;
}

// ─── Messages ─────────────────────────────────────────────────────────────
function addMessage(session_id, role, content, user_id = null) {
  stmts.insertMsg.run(user_id, session_id, role, content, new Date().toISOString());
  // Trim old messages
  const { cnt } = stmts.countSession.get(session_id);
  if (cnt > MAX_HISTORY) {
    stmts.trimOldest.run(session_id, cnt - MAX_HISTORY);
  }
}

function getHistory(session_id) {
  return stmts.getHistory.all(session_id).map(r => ({ role: r.role, content: r.content, timestamp: r.timestamp }));
}

function getHistoryLimited(session_id, limit) {
  const rows = stmts.getHistoryLimit.all(session_id, limit);
  return rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

function getUserConversations(user_id) {
  return stmts.getUserConvs.all(user_id).map(r => ({
    session_id: r.session_id,
    title: (r.content || '').substring(0, 40) + ((r.content || '').length > 40 ? '...' : ''),
    updated_at: r.last_updated,
  }));
}

// ─── API Keys ──────────────────────────────────────────────────────────────
function saveApiKey(user_id, service, api_key) {
  stmts.upsertKey.run(user_id, service, api_key, Date.now());
}
function getApiKeys(user_id) {
  const rows = stmts.getKeys.all(user_id);
  return Object.fromEntries(rows.map(r => [r.service, r.api_key]));
}
function deleteApiKey(user_id, service) {
  stmts.deleteKey.run(user_id, service);
}

// ─── Analytics ────────────────────────────────────────────────────────────
function logEvent(user_id, event_type, metadata = null) {
  stmts.logEvent.run(user_id, event_type, metadata ? JSON.stringify(metadata) : null, new Date().toISOString());
}
function getUsageStats(user_id) {
  const { cnt: total_messages } = stmts.getStats.get(user_id);
  const { cnt: total_tool_calls } = stmts.getToolCount.get(user_id);
  const daily = stmts.getDailyMsgs.all(user_id);
  const daily_activity = Object.fromEntries(daily.map(r => [r.d, r.cnt]));
  return { total_messages, total_tool_calls, daily_activity, api_usage: {} };
}

// ─── Notifications ─────────────────────────────────────────────────────────
function addNotification(user_id, title, message, type = 'info') {
  stmts.addNotif.run(user_id, title, message, type, new Date().toISOString());
}
function getNotifications(user_id, limit = 20) {
  return stmts.getNotifs.all(user_id, limit).map(r => ({
    id: r.id, title: r.title, message: r.message, type: r.type, is_read: !!r.is_read, timestamp: r.timestamp,
  }));
}
function markNotificationRead(id, user_id) { stmts.markRead.run(id, user_id); }
function markAllRead(user_id)              { stmts.markAllRead.run(user_id); }
function deleteNotification(id, user_id)   { stmts.deleteNotif.run(id, user_id); }

module.exports = {
  registerUser, loginUser, getUserProfile, updateUserProfile,
  addMessage, getHistory, getHistoryLimited, getUserConversations,
  saveApiKey, getApiKeys, deleteApiKey,
  logEvent, getUsageStats,
  addNotification, getNotifications, markNotificationRead, markAllRead, deleteNotification,
};
