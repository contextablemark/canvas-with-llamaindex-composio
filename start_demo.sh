#!/bin/bash

# Pitch Platform Demo Startup Script
# Ensures everything is ready for the hackathon presentation

echo "🏆 Starting Pitch Platform Demo"
echo "================================"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Installing..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi

# Start the system
echo "🚀 Starting development servers..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:9000"
echo "   API Docs: http://localhost:9000/docs"
echo "   Health:   http://localhost:9000/health"
echo ""

# Run tests in background
echo "🧪 Running system tests..."
python3 test_pitch_system.py &
TEST_PID=$!

# Start the main application
pnpm dev

# Cleanup
kill $TEST_PID 2>/dev/null
