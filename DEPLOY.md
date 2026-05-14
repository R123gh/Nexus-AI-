# 🚀 NexusAI Deployment Guide

This guide explains how to deploy the entire NexusAI platform (Frontend, Node.js Gateway, and Python Microservice) to the cloud.

## 🏗️ Architecture Overview
- **Frontend**: React (Vite) -> Built into static files.
- **Gateway**: Node.js (Express) -> Serves the Frontend and routes APIs.
- **Microservice**: Python (Flask/FastAPI) -> Handles ML/AI logic.

---

## 🌩️ Option 1: Render (Recommended for Beginners)

Render is great for hosting all three components.

### 1. Python Microservice
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Root Directory: `backend`
4. Runtime: `Python`
5. Build Command: `pip install --break-system-packages -r requirements.txt`
6. Start Command: `gunicorn --worker-class gevent -w 1 app:app`
7. **Environment Variables**: Add your `GROQ_API_KEY`, `MONGO_URI`, etc.
8. Copy the provided URL (e.g., `https://nexus-python.onrender.com`).

### 2. Node.js Gateway + Frontend
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Root Directory: `.` (Project root)
4. Runtime: `Node`
5. Build Command: `npm run deploy:prepare`
6. Start Command: `npm run start:server`
7. **Environment Variables**:
   - `PYTHON_BASE`: Paste your Python service URL from step 1.
   - `NODE_ENV`: `production`
   - `NODE_PORT`: `10000` (Render's default)

---

## 🛠️ Option 2: VPS (DigitalOcean / AWS EC2)

For a more robust setup using a single server.

### 1. Prerequisites
Install Node.js, Python 3.10+, and `pm2`.

### 2. Setup
```bash
git clone <your-repo-url>
cd "Full stack AI"
npm run deploy:prepare
```

### 3. Run with PM2
```bash
# Start Python
cd backend
pm2 start app.py --name nexus-python --interpreter python3

# Start Node
cd ../server
pm2 start index.js --name nexus-gateway
```

### 4. Reverse Proxy (Nginx)
Configure Nginx to point to `http://localhost:5000`.

---

## 📝 Environment Variables Checklist

Ensure these are set in your deployment platform:
- `MONGO_URI`: Your MongoDB Atlas connection string.
- `GROQ_API_KEY`: Your Groq Cloud API key.
- `PYTHON_BASE`: (For Node) The URL where the Python service is hosted.
- `JWT_SECRET`: A secure random string for authentication.

### 🚩 Common Fixes
- **PEP 668 (Externally Managed Environment)**: If you see a `pip` error about "managed environments", ensure you are using the `--break-system-packages` flag in your build command (I have updated `package.json` to handle this).
- **ModuleNotFoundError (eventlet/gunicorn)**: Ensure these are in `backend/requirements.txt`.
- **CORS Errors**: Check that `PYTHON_BASE` in the Node service doesn't have a trailing slash.
- **Port Binding**: Render expects the service to listen on `0.0.0.0`.

---

## ✅ Deployment Success
Once deployed, navigating to your Node service URL will load the **NexusAI** interface, which will automatically communicate with the backend gateway and the Python microservice.
