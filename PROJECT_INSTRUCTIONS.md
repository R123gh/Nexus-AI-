# NexusAI Project Instructions

Welcome to **NexusAI**, a next-generation full-stack AI development platform. This document provides comprehensive instructions on the system architecture, setup, development workflow, and deployment.

---

## 🏗️ System Architecture

NexusAI operates on a **Hybrid Microservice Architecture** designed for high-performance AI operations and responsive UI interactions.

1.  **API Gateway (Node.js)**: 
    - Handles authentication, real-time communication (Socket.IO), chat history, and core platform services.
    - Acts as a reverse proxy for the Python microservice.
    - Serves the compiled React frontend in production.
2.  **AI Microservice (Python/Flask)**: 
    - Dedicated to heavy compute tasks: Machine Learning, RAG (Retrieval-Augmented Generation), Data Science AutoML, and code execution.
    - Communicates with the Gateway via internal proxying on port 5001.
3.  **Neural Link (Core Engine)**:
    - A proprietary integration layer that allows the AI to "read and write" directly to the project's codebase, facilitating autonomous development.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (3.11.x recommended)
- **Git**
- **GROQ API Key** (or preferred LLM provider configured in `.env`)

---

## 🚀 Getting Started

### 1. Installation
The project includes a master installation script to set up all dependencies (Root, Frontend, Server, Backend).

```bash
# From the root directory
npm run install:all
```

### 2. Configuration
Create a `.env` file in the `backend/` directory (the Gateway is configured to look for it there).

```env
# API Keys
GROQ_API_KEY=your_key_here

# Server Config
PORT=5000
NODE_PORT=5000
PYTHON_PORT=5001

# Database (Optional/Configurable)
MONGODB_URI=your_mongo_uri
```

### 3. Development Mode
Run both the Node.js Gateway and the Python Backend simultaneously using the root command:

```bash
# Starts both servers concurrently
npm start
```

- **Frontend**: Usually runs via Vite on `http://localhost:5173` (during dev).
- **Gateway**: `http://localhost:5000`
- **Python ML**: `http://localhost:5001`

---

## 📂 Project Structure

```text
├── backend/            # Python Flask Microservice (ML, RAG, CodeBot Logic)
├── frontend/           # React/Vite Frontend (Nexus UI)
├── server/             # Node.js API Gateway & Native Routes
├── main.py             # Root Python entry (alternative)
├── index.js            # Root orchestration script
└── package.json        # Unified project scripts
```

---

## 🧩 Core Modules

### 1. Nexus CodeBot
The intelligent coding assistant. It uses the "Neural Link" to analyze the repository structure and inject logic directly into files.

### 2. Data Science Suite
A full-featured module for:
- **AutoML**: Automated model training on CSV/JSON data.
- **Visual Analytics**: Real-time charts and data exploration.
- **Predictive API**: Deploy and test models immediately after training.

### 3. Workspace & File Explorer
A high-performance file management system that mirrors the local environment, allowing for seamless AI-human collaboration on code.

---

## 🚢 Deployment (Render.com)

NexusAI is optimized for deployment on Render using a single web service that manages both runtimes.

1.  **Build Command**: `npm run deploy:prepare`
2.  **Start Command**: `npm start`
3.  **Environment**: Ensure `PYTHON_VERSION` is set to `3.11.10` in the Render dashboard.

---

## ⚠️ Troubleshooting

- **Neural Link Failed**: Ensure the Node Gateway is running and the Python proxy is correctly hitting port 5001.
- **Port Conflicts**: If port 5000 or 5001 is in use, update the `.env` file and restart the system.
- **Module Not Found**: Re-run `npm run install:all` to ensure all cross-service dependencies are linked.

---

*“NexusAI: Bridging the gap between human intuition and machine intelligence.”*
