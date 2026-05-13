"""
NexusAI — Python Microservice (Port 5001)
Handles ML/AI-heavy operations: RAG, Code execution, Data Science,
Voice, Images, Swarm, Orchestration, Tools.
Fast I/O routes (chat, auth, vault, notifications) are now handled
by the Node.js server on port 5000.
"""
from gevent import monkey
monkey.patch_all()
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from config import UPLOAD_FOLDER, MAX_CONTENT_LENGTH

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

CORS(app, resources={r'/api/*': {
    'origins': '*',
    'allow_headers': ['Content-Type', 'X-Groq-Key', 'Authorization'],
    'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}})

# ─── SocketIO (Python-side, for code collaboration) ──────────
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('join_workspace')
def handle_join(data):
    room = data.get('room', 'default')
    username = data.get('username', 'Guest')
    join_room(room)
    emit('user_joined', {'username': username, 'id': username}, room=room)

@socketio.on('code_sync')
def handle_code_sync(data):
    room = data.get('room', 'default')
    emit('code_update', data, room=room, include_self=False)

@socketio.on('cursor_sync')
def handle_cursor_sync(data):
    room = data.get('room', 'default')
    emit('cursor_update', data, room=room, include_self=False)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Register ML/AI Route Blueprints ─────────────────────────
from routes.chat import chat_bp          # kept for backward compat
from routes.voice import voice_bp
from routes.image import image_bp
from routes.action import action_bp
from routes.tools import tools_bp
from routes.rag import rag_bp
from routes.ds import ds_bp
from routes.code import code_bp
from routes.orchestrator import orchestrator_bp
from routes.swarm import swarm_bp

# Legacy routes — still served by Python for compat
from routes.auth import auth_bp
from routes.notifications import notifications_bp
from routes.vault import vault_bp
from routes.analytics import analytics_bp
from routes.export import export_bp
from routes.webhooks import webhooks_bp

app.register_blueprint(chat_bp,          url_prefix='/api')
app.register_blueprint(voice_bp,         url_prefix='/api')
app.register_blueprint(image_bp,         url_prefix='/api')
app.register_blueprint(action_bp,        url_prefix='/api')
app.register_blueprint(tools_bp,         url_prefix='/api/tools')
app.register_blueprint(rag_bp,           url_prefix='/api/rag')
app.register_blueprint(ds_bp,            url_prefix='/api/ds')
app.register_blueprint(code_bp,          url_prefix='/api/code')
app.register_blueprint(orchestrator_bp,  url_prefix='/api')
app.register_blueprint(swarm_bp,         url_prefix='/api/swarm')
app.register_blueprint(auth_bp,          url_prefix='/api/auth')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(vault_bp,         url_prefix='/api/vault')
app.register_blueprint(analytics_bp,     url_prefix='/api/analytics')
app.register_blueprint(export_bp,        url_prefix='/api/export')
app.register_blueprint(webhooks_bp,      url_prefix='/api/webhooks')

# ─── Health Check ────────────────────────────────────────────
@app.route('/api/python/health')
def health():
    from services.memory import memory
    return jsonify({
        'status': 'ok',
        'service': 'NexusAI Python Microservice',
        'port': 5001,
        'memory': memory.get_stats(),
    })


# ─── Run ─────────────────────────────────────────────────────
if __name__ == '__main__':
    print('\n' + '=' * 60)
    print('  NexusAI Python Microservice')
    print('  API: http://127.0.0.1:5001/api')
    print('  (Node.js is the primary server on port 5000)')
    print('=' * 60 + '\n')
    socketio.run(
        app,
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5001)),
        debug=False,
        use_reloader=False,
    )
