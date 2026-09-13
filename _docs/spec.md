# Kanban Board — Project Scope

## Tooling
- **Backend**: Python, managed with `uv` (dependency management + running)
- **Frontend**: Node.js
- No prior knowledge of these tools is required — Claude will handle setup, dependency installation, and running commands.

## Overview
Multi-user kanban board application, built end-to-end in phases: mocked frontend → OpenAPI contract → FastAPI backend → integration → testing → SQLite persistence.

---

## Domain Model

### Task
- `title` (string)
- `description` (string)
- `priority` (enum, e.g. Low / Medium / High)
- `due_date` (date only, no time)
- `assignee` (one user, selected from board's registered users; can add new users inline)
- `labels` (multiple, from board-managed list of name+color; can add new labels inline)
- `url` (string, optional link)
- `status` (To Do / In Progress / Done)
- `comments` / activity log (in scope)

### Board
- Fixed columns: **To Do / In Progress / Done**
  - Column names are editable text; columns cannot be added/removed/reordered
- Has one **Owner**, plus members
- No structural difference between "personal" and "team" boards — a personal board is simply one with no other members yet

### User
- Mock auth: user picks or creates a username, no password
- Session persisted in browser `localStorage`
- Global registry of users (used for assignee dropdown across boards)

### Roles & Permissions (per board)
- **Owner**: full control, can delete board, manage members and their permissions
- **Admin**: can manage members (add directly, set edit/view), manage board settings
- **Member**: can be set to **Edit** or **View-only** by Owner/Admin
  - Any member can invite others, but invites from Members create a **pending request**
  - Owner/Admin-issued invites add the user directly
- Permissions are scoped **per board** — a user only sees/edits tasks on boards they belong to (no per-task restrictions)

### Labels
- Per-board managed list: `name` + `color`
- Selectable from list when tagging a task; inline "create new" supported

### Invites
- Owner/Admin → adds member directly
- Member → sends invite → appears in invitee's **pending invites** list on their dashboard → accept/decline

---

## Frontend Features
- **Dashboard**: board list (with task counts per board), pending invites list, "My Tasks" view (tasks assigned to the user across all boards)
- **Board switcher**: user can belong to unlimited boards
- **Board view**:
  - Drag-and-drop between columns (`@dnd-kit`)
  - Manual "change status" control as fallback (accessibility/simplicity)
  - Filters: assignee, label, priority, due date range, title search
  - Overdue tasks (past due date, not in Done) visually flagged
- **Task detail**: full field editing, comments/activity log
- **Assignee/label pickers**: dropdown from board list + inline "add new"

### Stack
- React + TypeScript
- Tailwind CSS + shadcn/ui components
- State management: React built-ins only (`useState` / `useContext`)
- Drag-and-drop: `@dnd-kit`

---

## Build Phases

1. **Frontend with mocked backend**
   - In-memory mock service layer (fake data, simulated network delay)
   - Service layer function signatures act as the future API contract

2. **OpenAPI contract generation**
   - Done later via code-assistant prompt reading `frontend/`'s API client, generating `openapi.yaml` at repo root (endpoints, methods, request/response bodies, auth requirements)

3. **FastAPI backend**
   - Implements the generated OpenAPI contract
   - Auth: trusts a `username` field passed in requests (no tokens/sessions, matches frontend mock auth)
   - Project managed with `uv` (venv + dependencies + run commands)

4. **Frontend-backend integration**
   - Swap mock service layer internals for real HTTP calls, keep same function signatures

5. **Testing**
   - Manual end-to-end testing
   - Backend: automated tests with `pytest`
   - Frontend: component/unit tests with Vitest + React Testing Library

6. **Persistence**
   - SQLite + SQLAlchemy
   - Schema created via `Base.metadata.create_all()` (no Alembic/migrations)

---

## Project Structure
Monorepo:
```
/frontend   → React + TypeScript app
/backend    → FastAPI app
/openapi.yaml
```

## Explicitly Out of Scope
- Docker / containerized deployment (purely local dev)
- Real password-based auth, JWT, sessions
- Per-task permission overrides (permissions are board-level only)
- MSW (Mock Service Worker)
- Browser-based E2E tests (Playwright/Cypress)
- Alembic migrations
