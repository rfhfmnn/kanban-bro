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
Double-click [run.bat](run.bat) in the root directory. It will launch both services in dedicated terminals and automatically open `http://localhost:5173` in your browser.

---

## 🐳 Docker (Full-Stack Container)

You can build and run the entire application (both frontend and backend) in a single container using the multi-stage `Dockerfile`. The backend compiles the frontend with Node and serves both the static assets and the API on port 8000.

### 1. Build the Docker Image
```bash
docker build -t kanban-bro:latest .
```

### 2. Run the Container
```bash
docker run --rm -p 8000:8000 --name kanban-bro kanban-bro:latest
```

### 3. Database Options (SQLite or PostgreSQL)

#### Option A: PostgreSQL with Existing Container
If you already launched the PostgreSQL container (`interview-canvas-db`):
```bash
docker run -d \
  --name interview-canvas-db \
  -e POSTGRES_USER=sdip \
  -e POSTGRES_PASSWORD=sdip \
  -e POSTGRES_DB=sdip \
  -p 5432:5432 \
  -v interview-canvas-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Connect the Kanban Bro container to it:
```bash
# Connect to host Postgres (Linux / macOS / Windows Docker Desktop)
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql://sdip:sdip@host.docker.internal:5432/sdip \
  --name kanban-bro kanban-bro:latest
```

#### Option B: One-Command Docker Compose (App + Postgres)
Run both the app and PostgreSQL together:
```bash
docker compose up -d
```

#### Option C: Persistent SQLite
```bash
# Linux / macOS / Git Bash
docker run --rm -p 8000:8000 \
  -v kanban-data:/data \
  -e DATABASE_URL=sqlite:////data/kanban.db \
  --name kanban-bro kanban-bro:latest
```

```powershell
# Windows PowerShell
docker run --rm -p 8000:8000 `
  -v kanban-data:/data `
  -e DATABASE_URL=sqlite:////data/kanban.db `
  --name kanban-bro kanban-bro:latest
```

### 4. Access the Application
- **Web Application & Frontend**: http://localhost:8000
- **API Health Check**: http://localhost:8000/api/health (shows database engine)
- **Interactive Swagger Docs**: http://localhost:8000/docs


## 🛠️ Manual Run

### 1. Backend (FastAPI + uv)
```bash
cd backend
uv sync

# Run with default SQLite:
uv run uvicorn app.main:app --port 8000 --reload

# Or run with PostgreSQL:
# (Set DATABASE_URL or configure .env)
# Linux/macOS:
export DATABASE_URL="postgresql://sdip:sdip@localhost:5432/sdip"
uv run uvicorn app.main:app --port 8000 --reload

# Windows PowerShell:
$env:DATABASE_URL="postgresql://sdip:sdip@localhost:5432/sdip"
uv run uvicorn app.main:app --port 8000 --reload
```
- API URL: http://localhost:8000
- Interactive Swagger Docs: http://localhost:8000/docs
- Database Reset & Seed Script: `uv run python reset_db.py`

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

![Kanban Bro Technical Architecture & Workflow](docs/architecture.jpg)

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
        DB[("Database (PostgreSQL / SQLite)\n(psycopg2 / kanban.db)")]
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

---

## 🔄 CI/CD Pipeline & Render Deployment

Kanban Bro features an automated GitHub Actions CI/CD workflow in [`.github/workflows/ci-cd.yaml`](.github/workflows/ci-cd.yaml):

1. **Parallel Unit Tests**:
   - **Backend**: Runs Python 3.12 unit tests using `uv` and `pytest`.
   - **Frontend**: Runs TypeScript compilation, Vite production build, and `vitest` unit tests.
2. **Integration & End-to-End Tests**:
   - Starts the full stack via `docker compose up -d --build`.
   - Waits for `/api/health` with PostgreSQL database connectivity.
   - Runs backend integration tests (`test_compose_integration.py`, `test_postgres_live.py`, `test_two_session_live.py`).
   - Runs Playwright browser tests in Chromium against the live container.
   - Automatically tears down the stack with `docker compose down -v`.
3. **Continuous Deployment to Render**:
   - Deploys on pushes to `main` via Render Deploy Hook (`RENDER_DEPLOY_HOOK_URL`) or Render native GitHub connection.
4. **Health Endpoint Validation**:
   - Automatically polls `https://<RENDER_APP_URL>/api/health` (default: `https://kanban-bro.onrender.com/api/health`) until HTTP 200 and `{"status": "ok"}` are verified.

See the [Render Deployment Guide](docs/render-deployment.md) for step-by-step instructions.