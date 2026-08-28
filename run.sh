#!/usr/bin/env bash

# QuantCopilot AI - Startup Script

echo "========================================="
echo "   Starting QuantCopilot AI Services     "
echo "========================================="

# 1. Activate Python Virtual Environment
if [ -f ".venv/Scripts/activate" ]; then
    echo "[+] Activating virtual environment (.venv/Scripts/activate)..."
    source .venv/Scripts/activate
elif [ -f ".venv/bin/activate" ]; then
    echo "[+] Activating virtual environment (.venv/bin/activate)..."
    source .venv/bin/activate
elif [ -f "backend/venv/bin/activate" ]; then
    echo "[+] Activating backend venv..."
    source backend/venv/bin/activate
fi

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "[!] Stopping all background services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Start Backend FastAPI Server (Port 8000)
echo "[+] Starting FastAPI Backend on http://localhost:8000 ..."
(cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# 3. Start Frontend Next.js Server (Port 3000)
echo "[+] Starting Next.js Frontend on http://localhost:3000 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "========================================="
echo " Backend:  http://localhost:8000"
echo " API Docs: http://localhost:8000/docs"
echo " Frontend: http://localhost:3000"
echo " Press Ctrl+C to stop all services"
echo "========================================="

# Keep script running and wait for all child processes
wait
