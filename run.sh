#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo "   Starting Kanban Bro (Full-Stack)      "
echo "========================================="

# Clean up child processes on exit (Ctrl+C)
cleanup() {
    echo ""
    echo "Shutting down Kanban Bro services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start FastAPI Backend
echo "-> Starting Backend on http://localhost:8000..."
(
    cd backend
    uv run uvicorn app.main:app --port 8000 --reload
) &

# 2. Start Vite Frontend
echo "-> Starting Frontend on http://localhost:5173..."
(
    cd frontend
    npm run dev
) &

echo ""
echo "Both services are running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for both processes
wait
