#!/bin/bash

echo ""
echo " ============================================"
echo "  CipherLens - Image Encryption System"
echo "  Starting Backend + Frontend..."
echo " ============================================"
echo ""

# Start the FastAPI backend in the background
echo "[1/2] Starting FastAPI backend on http://localhost:8000 ..."
cd backend || exit
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Ensure the backend stops when this script is closed (CTRL+C)
trap "echo -e '\nStopping servers...'; kill $BACKEND_PID; exit" INT TERM EXIT

# Small delay to let the backend start
sleep 2

# Start the React frontend in the foreground
echo "[2/2] Starting React frontend on http://localhost:5173 ..."
cd frontend || exit
npm run dev
