@echo off
title CipherLens - Starting Servers...

echo.
echo  ============================================
echo   CipherLens - Image Encryption System
echo   Starting Backend + Frontend...
echo  ============================================
echo.

:: Start the FastAPI backend in a new terminal window
echo [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "CipherLens Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Small delay so backend gets a head start
timeout /t 2 /nobreak >nul

:: Start the Vite frontend in a new terminal window
echo [2/2] Starting React frontend on http://localhost:5173 ...
start "CipherLens Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  Both servers are starting in separate windows.
echo  - Backend:  http://localhost:8000
echo  - Frontend: http://localhost:5173
echo  - API Docs: http://localhost:8000/docs
echo.
echo  Close those windows to stop the servers.
pause
