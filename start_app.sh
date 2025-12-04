#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo -e "\n🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and termination signal (SIGTERM)
trap cleanup SIGINT SIGTERM

echo "🚀 Starting A.R.I.A. Application..."

# Start Backend
echo "🐍 Starting Backend (Port 5001)..."
# Use the virtual environment python directly
./backend/venv/bin/python backend/app.py &

# Start Frontend
echo "⚛️ Starting Frontend..."
cd frontend && npm run dev &

# Wait for user to exit
wait
