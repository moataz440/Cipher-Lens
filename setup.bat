@echo off
title CipherLens - First Time Setup

echo ============================================
echo  CipherLens - Initializing Project...
echo ============================================
echo.

echo [1/2] Setting up Python Virtual Environment (Backend)...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo.
echo [2/2] Installing Node Dependencies (Frontend)...
cd frontend
call npm install
cd ..

echo.
echo ============================================
echo  Setup Complete! 
echo  You can now run "start.bat" to start the app.
echo ============================================
pause
