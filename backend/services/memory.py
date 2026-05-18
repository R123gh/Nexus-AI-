"""
NexusAI — Conversation Memory
SQLite-backed conversation history store with session management and user auth.
"""

import time
import sqlite3
import os
import threading
from werkzeug.security import generate_password_hash, check_password_hash
from config import MAX_HISTORY_PER_SESSION, MONGO_URI
from datetime import datetime
from pymongo import MongoClient

mongo_db = None
mongo_users = None
mongo_messages = None

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nexus_memory.db')

try:
    if MONGO_URI:
        mongo_client = MongoClient(MONGO_URI)
        # Use the database specified in URI or default to 'nexusai_db'
        mongo_db = mongo_client.get_default_database() if '?' in MONGO_URI or '/' in MONGO_URI.split('//')[-1] else mongo_client['nexusai_db']
        mongo_users = mongo_db['users']
        # Create a unique index for username
        mongo_users.create_index('username', unique=True)
        
        # Drop the unique email index if it exists, as it prevents multiple users with null emails
        try:
            mongo_users.drop_index('email_1')
        except Exception:
            pass
            
        mongo_messages = mongo_db['messages']
        mongo_messages.create_index([('session_id', 1), ('timestamp', 1)])
        mongo_messages.create_index('user_id')
        
        print(f"Successfully connected to MongoDB Atlas: {mongo_db.name}")
    else:
        print("Warning: MONGO_URI not provided. Falling back to SQLite for Auth.")
except Exception as e:
    print(f"MongoDB connection failed: {e}. Falling back to SQLite.")


class ConversationMemory:
    """Thread-safe SQLite-backed conversation storage."""

    def __init__(self):
        self._lock = threading.Lock()
        self._init_db()

    def _get_conn(self):
        return sqlite3.connect(DB_PATH, check_same_thread=False)

    def _init_db(self):
        with self._lock:
            with self._get_conn() as conn:
                # Create users table
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        avatar_url TEXT,
                        bio TEXT,
                        email TEXT,
                        created_at REAL NOT NULL
                    )
                ''')
                # Try adding user_id to existing messages table, ignore if it exists
                try:
                    conn.execute('ALTER TABLE messages ADD COLUMN user_id INTEGER')
                except sqlite3.OperationalError:
                    pass
                
                try:
                    conn.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT')
                    conn.execute('ALTER TABLE users ADD COLUMN bio TEXT')
                    conn.execute('ALTER TABLE users ADD COLUMN email TEXT')
                except sqlite3.OperationalError:
                    pass
                
                # Create API keys vault table
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS api_keys (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        service TEXT NOT NULL,
                        api_key TEXT NOT NULL,
                        updated_at REAL NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        UNIQUE(user_id, service)
                    )
                ''')
                
                # Create usage analytics table
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS usage_analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        event_type TEXT NOT NULL,
                        metadata TEXT,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                ''')
                
                # Create messages table if not exists
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        session_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                ''')
                # Create notifications table
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS notifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        type TEXT DEFAULT 'info',
                        is_read INTEGER DEFAULT 0,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                ''')
                conn.execute('CREATE INDEX IF NOT EXISTS idx_notify_user ON notifications (user_id)')
                conn.commit()

    # ─── Auth Methods ──────────────────────────────────────────────
    def register_user(self, username, password):
        """Register a new user."""
        hash_pw = generate_password_hash(password)
        
        # MongoDB Implementation
        if mongo_users is not None:
            try:
                # Need an integer ID for backward compatibility with sqlite tables
                # Find max id to increment
                max_user = mongo_users.find_one(sort=[("id", -1)])
                new_id = (max_user["id"] + 1) if max_user and "id" in max_user else 1
                
                mongo_users.insert_one({
                    "id": new_id,
                    "username": username,
                    "password_hash": hash_pw,
                    "created_at": datetime.utcnow().isoformat() + 'Z',
                    "avatar_url": None,
                    "bio": None,
                    "email": None
                })
                # Also create in sqlite to maintain foreign keys
                with self._lock:
                    with self._get_conn() as conn:
                        try:
                            conn.execute(
                                'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
                                (new_id, username, hash_pw, datetime.utcnow().isoformat() + 'Z')
                            )
                            conn.commit()
                        except sqlite3.IntegrityError:
                            pass
                return {'success': True, 'user_id': new_id}
            except Exception as e:
                if 'duplicate key error' in str(e).lower():
                    return {'success': False, 'error': 'Username already exists.'}
                return {'success': False, 'error': str(e)}

        # SQLite Fallback
        with self._lock:
            with self._get_conn() as conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute(
                        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
                        (username, hash_pw, datetime.utcnow().isoformat() + 'Z')
                    )
                    conn.commit()
                    return {'success': True, 'user_id': cursor.lastrowid}
                except sqlite3.IntegrityError:
                    return {'success': False, 'error': 'Username already exists.'}

    def login_user(self, username, password):
        """Authenticate a user."""
        # MongoDB Implementation
        if mongo_users is not None:
            user = mongo_users.find_one({"username": username})
            if user and check_password_hash(user["password_hash"], password):
                return {
                    'success': True, 
                    'user_id': user.get("id"),
                    'avatar_url': user.get("avatar_url"),
                    'bio': user.get("bio"),
                    'email': user.get("email")
                }
            return {'success': False, 'error': 'Invalid username or password.'}

        # SQLite Fallback
        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT id, password_hash, avatar_url, bio, email FROM users WHERE username = ?', (username,))
                row = cursor.fetchone()
                if row and check_password_hash(row[1], password):
                    return {
                        'success': True, 
                        'user_id': row[0],
                        'avatar_url': row[2],
                        'bio': row[3],
                        'email': row[4]
                    }
                return {'success': False, 'error': 'Invalid username or password.'}

    def update_user_profile(self, user_id, profile_data):
        """Update user profile details."""
        # MongoDB Implementation
        if mongo_users is not None:
            try:
                update_fields = {}
                for k, v in profile_data.items():
                    if k in ['avatar_url', 'bio', 'email']:
                        update_fields[k] = v
                if not update_fields:
                    return False
                mongo_users.update_one({"id": user_id}, {"$set": update_fields})
                # Update sqlite as well for consistency
                with self._lock:
                    with self._get_conn() as conn:
                        fields = [f"{k} = ?" for k in update_fields.keys()]
                        values = list(update_fields.values()) + [user_id]
                        query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
                        conn.execute(query, values)
                        conn.commit()
                return True
            except Exception as e:
                print(f"Error updating user profile in Mongo: {e}")
                return False

        # SQLite Fallback
        with self._lock:
            try:
                with self._get_conn() as conn:
                    fields = []
                    values = []
                    for k, v in profile_data.items():
                        if k in ['avatar_url', 'bio', 'email']:
                            fields.append(f"{k} = ?")
                            values.append(v)
                    
                    if not fields:
                        return False
                    
                    values.append(user_id)
                    query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
                    conn.execute(query, values)
                    conn.commit()
                    return True
            except Exception as e:
                print(f"Error updating user profile: {e}")
                return False

    def get_user_profile(self, user_id):
        """Get user profile details."""
        # MongoDB Implementation
        if mongo_users is not None:
            user = mongo_users.find_one({"id": user_id})
            if user:
                return {
                    'username': user.get('username'),
                    'avatar_url': user.get('avatar_url'),
                    'bio': user.get('bio'),
                    'email': user.get('email')
                }
            return None

        # SQLite Fallback
        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT username, avatar_url, bio, email FROM users WHERE id = ?', (user_id,))
                row = cursor.fetchone()
                if row:
                    return {
                        'username': row[0],
                        'avatar_url': row[1],
                        'bio': row[2],
                        'email': row[3]
                    }
                return None

    def save_api_key(self, user_id, service, api_key):
        """Save or update an API key for a user."""
        with self._lock:
            with self._get_conn() as conn:
                conn.execute('''
                    INSERT INTO api_keys (user_id, service, api_key, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(user_id, service) DO UPDATE SET
                        api_key = excluded.api_key,
                        updated_at = excluded.updated_at
                ''', (user_id, service, api_key, datetime.utcnow().isoformat() + 'Z'))
                conn.commit()
                return True

    def get_api_keys(self, user_id):
        """Get all API keys for a user."""
        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT service, api_key FROM api_keys WHERE user_id = ?', (user_id,))
                return {row[0]: row[1] for row in cursor.fetchall()}

    def delete_api_key(self, user_id, service):
        """Delete an API key for a user."""
        with self._lock:
            with self._get_conn() as conn:
                conn.execute('DELETE FROM api_keys WHERE user_id = ? AND service = ?', (user_id, service))
                conn.commit()
                return True

    def log_event(self, user_id, event_type, metadata=None):
        """Log a usage event."""
        with self._lock:
            with self._get_conn() as conn:
                import json
                from datetime import datetime
                conn.execute('''
                    INSERT INTO usage_analytics (user_id, event_type, metadata, timestamp)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, event_type, json.dumps(metadata) if metadata else None, datetime.utcnow().isoformat() + 'Z'))
                conn.commit()
                return True

    def get_usage_stats(self, user_id):
        """Get aggregated usage stats for a user."""
        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # Count messages
                cursor.execute('SELECT COUNT(*) FROM messages WHERE user_id = ?', (user_id,))
                message_count = cursor.fetchone()[0]
                
                # Count tool usages from analytics
                cursor.execute('SELECT COUNT(*) FROM usage_analytics WHERE user_id = ? AND event_type = "tool_usage"', (user_id,))
                tool_count = cursor.fetchone()[0]
                
                cursor.execute('''
                    SELECT date(timestamp) as d, COUNT(*) 
                    FROM messages 
                    WHERE user_id = ? AND timestamp > datetime('now', '-7 days')
                    GROUP BY d
                ''', (user_id,))
                daily_messages = {row[0]: row[1] for row in cursor.fetchall()}
                
                # Get API usage
                api_usage = self.get_api_usage_stats(user_id)
                
                return {
                    'total_messages': message_count,
                    'total_tool_calls': tool_count,
                    'daily_activity': daily_messages,
                    'api_usage': api_usage
                }

    def get_api_usage_stats(self, user_id):
        """Get API usage stats by service for a user."""
        with self._lock:
            with self._get_conn() as conn:
                import json
                cursor = conn.cursor()
                
                # Fetch api_call events
                cursor.execute('''
                    SELECT metadata, timestamp 
                    FROM usage_analytics 
                    WHERE user_id = ? AND event_type = "api_call"
                ''', (user_id,))
                
                rows = cursor.fetchall()
                usage_by_service = {}
                
                for row in rows:
                    try:
                        meta = json.loads(row[0]) if row[0] else {}
                        service = meta.get('service', 'unknown')
                        tokens = meta.get('tokens', 0)
                        
                        if service not in usage_by_service:
                            usage_by_service[service] = {'calls': 0, 'tokens': 0}
                        
                        usage_by_service[service]['calls'] += 1
                        usage_by_service[service]['tokens'] += tokens
                    except:
                        continue
                
                return usage_by_service

    # ─── Message Methods ───────────────────────────────────────────
    def add_message(self, session_id, role, content, user_id=None):
        """Add a message to a session's history with MongoDB Atlas cloud sync."""
        try:
            if user_id is not None:
                user_id = int(user_id)
        except:
            pass

        if mongo_messages is not None:
            try:
                mongo_messages.insert_one({
                    'user_id': user_id,
                    'session_id': session_id,
                    'role': role,
                    'content': content,
                    'timestamp': time.time()
                })
            except Exception as e:
                print(f"MongoDB write failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                conn.execute(
                    'INSERT INTO messages (user_id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
                    (user_id, session_id, role, content, time.time())
                )
                conn.commit()

                # Trim history to max length
                cursor = conn.cursor()
                cursor.execute('SELECT COUNT(*) FROM messages WHERE session_id = ?', (session_id,))
                count = cursor.fetchone()[0]
                if count > MAX_HISTORY_PER_SESSION:
                    excess = count - MAX_HISTORY_PER_SESSION
                    cursor.execute('''
                        DELETE FROM messages 
                        WHERE id IN (
                            SELECT id FROM messages 
                            WHERE session_id = ? 
                            ORDER BY timestamp ASC 
                            LIMIT ?
                        )
                    ''', (session_id, excess))
                    conn.commit()

    def get_history(self, session_id, limit=None):
        """Get conversation history for a session."""
        if mongo_messages is not None:
            try:
                cursor = mongo_messages.find({"session_id": session_id}).sort("timestamp", 1)
                messages = [{'role': doc.get('role'), 'content': doc.get('content')} for doc in cursor]
                if limit:
                    messages = messages[-limit:]
                return messages
            except Exception as e:
                print(f"MongoDB get history failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                query = 'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
                cursor.execute(query, (session_id,))
                messages = [{'role': row[0], 'content': row[1]} for row in cursor.fetchall()]
                if limit:
                    messages = messages[-limit:]
                return messages

    def get_user_history(self, user_id, limit=None):
        """Get all conversation history for a user."""
        try:
            if user_id is not None:
                user_id = int(user_id)
        except:
            pass

        if mongo_messages is not None:
            try:
                cursor = mongo_messages.find({"user_id": user_id}).sort("timestamp", 1)
                messages = [{'role': doc.get('role'), 'content': doc.get('content')} for doc in cursor]
                if limit:
                    messages = messages[-limit:]
                return messages
            except Exception as e:
                print(f"MongoDB get user history failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                query = 'SELECT role, content FROM messages WHERE user_id = ? ORDER BY timestamp ASC'
                cursor.execute(query, (user_id,))
                messages = [{'role': row[0], 'content': row[1]} for row in cursor.fetchall()]
                if limit:
                    messages = messages[-limit:]
                return messages

    def get_user_conversations(self, user_id):
        """Get all sessions for a user with title and timestamp from MongoDB Atlas."""
        try:
            if user_id is not None:
                user_id = int(user_id)
        except:
            pass

        if mongo_messages is not None:
            try:
                pipeline = [
                    {"$match": {"user_id": user_id, "role": "user"}},
                    {"$sort": {"timestamp": -1}},
                    {"$group": {
                        "_id": "$session_id",
                        "content": {"$first": "$content"},
                        "last_updated": {"$first": "$timestamp"}
                    }},
                    {"$sort": {"last_updated": -1}}
                ]
                results = list(mongo_messages.aggregate(pipeline))
                conversations = []
                for row in results:
                    sid = row["_id"]
                    content = row.get("content", "")
                    title = content[:40] + ('...' if len(content) > 40 else '')
                    conversations.append({
                        'session_id': sid,
                        'title': title,
                        'updated_at': row.get("last_updated")
                    })
                return conversations
            except Exception as e:
                print(f"MongoDB get user conversations failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                query = '''
                    SELECT session_id, content, MAX(timestamp) as last_updated
                    FROM messages 
                    WHERE user_id = ? AND role = 'user'
                    GROUP BY session_id
                    ORDER BY last_updated DESC
                '''
                cursor.execute(query, (user_id,))
                return [{'session_id': row[0], 'title': row[1][:40] + ('...' if len(row[1]) > 40 else ''), 'updated_at': row[2]} for row in cursor.fetchall()]

    def get_session_history(self, session_id):
        """Get full conversation history for a specific session."""
        if mongo_messages is not None:
            try:
                cursor = mongo_messages.find({"session_id": session_id}).sort("timestamp", 1)
                return [{'role': doc.get('role'), 'content': doc.get('content'), 'timestamp': doc.get('timestamp')} for doc in cursor]
            except Exception as e:
                print(f"MongoDB get session history failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                query = 'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
                cursor.execute(query, (session_id,))
                return [{'role': row[0], 'content': row[1], 'timestamp': row[2]} for row in cursor.fetchall()]

    def clear_session(self, session_id):
        """Clear all messages in a session."""
        if mongo_messages is not None:
            try:
                mongo_messages.delete_many({"session_id": session_id})
            except Exception as e:
                print(f"MongoDB delete session failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                conn.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
                conn.commit()

    def clear_user_conversations(self, user_id):
        """Clear all conversations for a user."""
        try:
            if user_id is not None:
                user_id = int(user_id)
        except:
            pass

        if mongo_messages is not None:
            try:
                mongo_messages.delete_many({"user_id": user_id})
            except Exception as e:
                print(f"MongoDB delete user conversations failed: {e}. Falling back to SQLite.")

        with self._lock:
            with self._get_conn() as conn:
                conn.execute('DELETE FROM messages WHERE user_id = ?', (user_id,))
                conn.commit()

    def get_stats(self):
        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT COUNT(DISTINCT session_id) FROM messages')
                active_sessions = cursor.fetchone()[0]
                cursor.execute('SELECT COUNT(*) FROM messages')
                total_messages = cursor.fetchone()[0]
                return {
                    'active_sessions': active_sessions,
                    'total_messages': total_messages,
                }

    # ─── Notification Methods ──────────────────────────────────────
    def add_notification(self, user_id, title, message, notify_type='info'):
        """Create a new notification for a user."""
        with self._lock:
            with self._get_conn() as conn:
                from datetime import datetime
                conn.execute(
                    'INSERT INTO notifications (user_id, title, message, type, timestamp) VALUES (?, ?, ?, ?, ?)',
                    (user_id, title, message, notify_type, datetime.utcnow().isoformat() + 'Z')
                )
                conn.commit()

    def get_notifications(self, user_id, limit=20):
        """Get recent notifications for a user."""
        with self._lock:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT id, title, message, type, is_read, timestamp FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
                    (user_id, limit)
                )
                return [
                    {'id': row[0], 'title': row[1], 'message': row[2], 'type': row[3], 'is_read': bool(row[4]), 'timestamp': row[5]}
                    for row in cursor.fetchall()
                ]

    def mark_notification_read(self, notification_id, user_id):
        """Mark a notification as read."""
        with self._lock:
            with self._get_conn() as conn:
                conn.execute(
                    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
                    (notification_id, user_id)
                )
                conn.commit()

    def mark_all_read(self, user_id):
        """Mark all notifications as read for a user."""
        with self._lock:
            with self._get_conn() as conn:
                conn.execute(
                    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
                    (user_id,)
                )
                conn.commit()

    def delete_notification(self, notification_id, user_id):
        """Delete a notification."""
        with self._lock:
            with self._get_conn() as conn:
                conn.execute(
                    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
                    (notification_id, user_id)
                )
                conn.commit()

    def get_user_logs(self, user_id, limit=10):
        """Get recent usage analytics logs for a user (for Predictive Assistant)."""
        with self._lock:
            with self._get_conn() as conn:
                import json
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT event_type, metadata, timestamp FROM usage_analytics WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
                    (user_id, limit)
                )
                logs = []
                for row in cursor.fetchall():
                    entry = {
                        'event_type': row[0],
                        'timestamp': row[2]
                    }
                    if row[1]:
                        try:
                            entry['metadata'] = json.loads(row[1])
                        except:
                            entry['metadata'] = row[1]
                    logs.append(entry)
                return logs

# Global singleton instance
memory = ConversationMemory()
