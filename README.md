# kanban-bro

A full-stack Kanban board application with a FastAPI backend, SQLite/SQLAlchemy database, and React + TypeScript + Tailwind CSS frontend.

## 🚀 One-Click Run

### Option 1: Bash (Git Bash / Linux / macOS / WSL)
Run the single bash script at the root:
```bash
./run.sh
```
*(Press `Ctrl+C` in the terminal to stop both services cleanly).*

### Option 2: Windows Batch (File Explorer)
Double-click [run.bat](file:///c:/Users/rafah/Documents/ML/ai-dev-tools-zoomcamp/kanban-bro/run.bat) in the root directory. It will launch both services in dedicated terminals and automatically open `http://localhost:5173` in your browser.

---

## 🛠️ Manual Run

### 1. Backend (FastAPI + uv)
```bash
cd backend
uv sync
uv run uvicorn app.main:app --port 8000 --reload
```
- API URL: http://localhost:8000
- Interactive Swagger Docs: http://localhost:8000/docs

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Web Application: http://localhost:5173

---

## 🧪 Running Tests
```bash
cd backend
uv run pytest
```

---

## 📊 System Architecture & Flow

### 1. High-Level Architecture
```mermaid
graph TD
    subgraph Client ["Frontend (React + Vite on :5173)"]
        UI["Interactive UI (Tailwind CSS)"]
        DND["Drag & Drop Engine (@dnd-kit)"]
        Auth["Auth Context & User Switcher"]
        ApiClient["HTTP Client (services/api.ts)"]
        UI --> Auth
        UI --> DND
        UI --> ApiClient
    end

    subgraph Server ["Backend (FastAPI on :8000)"]
        CORS["CORS Middleware"]
        AuthHeader["X-Username Header Extractor"]
        Routers["API Routers\n(/users, /boards, /tasks, /invites)"]
        CORS --> AuthHeader
        AuthHeader --> Routers
    end

    subgraph Storage ["Database Layer"]
        ORM["SQLAlchemy ORM Models"]
        DB[("SQLite Database\n(backend/kanban.db)")]
        Routers --> ORM
        ORM --> DB
    end

    ApiClient -- "REST API (JSON + X-Username)" --> CORS
```

### 2. Startup & User Onboarding Flow
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend (Vite)
    participant Backend as FastAPI (:8000)
    participant DB as SQLite (kanban.db)

    User->>Frontend: Opens http://localhost:5173
    Frontend->>Backend: GET /api/users
    Backend->>DB: Query UserModel.all()
    DB-->>Backend: Return users list

    alt Database is empty (Zero State)
        Backend-->>Frontend: [] (No users)
        Frontend->>User: Displays Welcome Setup Screen
        User->>Frontend: Submits Name & Username
        Frontend->>Backend: POST /api/users {username, name}
        Backend->>DB: Save new UserModel
        DB-->>Backend: Confirmed
        Backend-->>Frontend: Returns created User
        Frontend->>Frontend: Save active username in localStorage
    else Existing Users
        Backend-->>Frontend: [user1, user2, ...]
        Frontend->>Frontend: Load saved user or default to first
    end

    Frontend->>Backend: GET /api/boards?username=... (X-Username)
    Backend->>DB: Fetch boards with membership & task counts
    DB-->>Backend: Return board list
    Backend-->>Frontend: Render Dashboard / Active Board
```

### 3. Task Drag-and-Drop Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Board as BoardView (React)
    participant Dnd as @dnd-kit
    participant API as api.tasks.move()
    participant Server as FastAPI
    participant DB as SQLite

    User->>Dnd: Drags card to new column
    Dnd->>Board: onDragEnd(taskId, targetColumn, order)
    Board->>Board: Optimistic UI state update
    Board->>API: PATCH /api/tasks/{id}/move {status, order}
    API->>Server: HTTP PATCH (Header: X-Username)
    Server->>DB: Verify user edit permission on board
    Server->>DB: Update task status & reorder siblings
    DB-->>Server: Commit transaction
    Server-->>Board: 200 OK (Updated task)
```