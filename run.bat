@echo off
title Kanban Bro Launcher
echo =========================================
echo    Starting Kanban Bro (Full-Stack)      
echo =========================================

echo [*] Starting Backend on http://localhost:8000...
start "Kanban Backend (FastAPI)" cmd /k "cd backend && uv run uvicorn app.main:app --port 8000 --reload"

echo [*] Starting Frontend on http://localhost:5173...
start "Kanban Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are starting!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo.
timeout /t 3 >nul
start http://localhost:5173
