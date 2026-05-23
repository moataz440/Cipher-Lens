#!/bin/bash

echo "============================================"
echo " CipherLens - Initializing Project..."
echo "============================================"
echo ""

echo "[1/2] Setting up Python Virtual Environment (Backend)..."
cd backend || exit
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
cd ..

echo ""
echo "[2/2] Installing Node Dependencies (Frontend)..."
cd frontend || exit
npm install
cd ..

echo ""
echo "============================================"
echo " Setup Complete! "
echo " You can now run './start.sh' to start the app."
echo "============================================"
