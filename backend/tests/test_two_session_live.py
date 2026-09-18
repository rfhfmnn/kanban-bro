import httpx
import pytest
from app.db.database import SessionLocal, engine
from app.db.models import TaskModel

def test_two_session_persistence_live():
    """Verify task creation in Session 1 persists and can be retrieved and modified in Session 2."""
    base_url = "http://localhost:8000"

    # Step 0: Ensure backend server is reachable and running PostgreSQL
    try:
        r = httpx.get(f"{base_url}/api/health", timeout=3.0)
        assert r.status_code == 200
        health = r.json()
        assert health.get("database") == "postgresql"
    except Exception as exc:
        pytest.skip(f"Backend on {base_url} is not reachable or not on postgres: {exc}")

    # ==========================================================
    # Session 1: Client creates a task and closes session
    # ==========================================================
    task_id = None
    with httpx.Client(base_url=base_url) as session1:
        payload = {
            "title": "Postgres Two-Session Persistence Task",
            "description": "Created in Session 1 to verify persistence",
            "priority": "High",
            "due_date": "2026-11-20",
            "assignee": "rafael",
            "labels": ["lbl-1", "lbl-2"],
            "status": "todo"
        }
        res1 = session1.post("/api/boards/board-1/tasks", json=payload, headers={"X-Username": "rafael"})
        assert res1.status_code == 201
        data1 = res1.json()
        task_id = data1["id"]
        assert data1["title"] == "Postgres Two-Session Persistence Task"

    # Session 1 is completely closed and discarded here.

    # ==========================================================
    # Session 2: A brand new client session queries and updates the task
    # ==========================================================
    with httpx.Client(base_url=base_url) as session2:
        res2 = session2.get("/api/boards/board-1/tasks", headers={"X-Username": "rafael"})
        assert res2.status_code == 200
        tasks = res2.json()
        tasks_map = {t["id"]: t for t in tasks}
        assert task_id in tasks_map, f"Task {task_id} not found in Session 2 tasks list!"
        assert tasks_map[task_id]["title"] == "Postgres Two-Session Persistence Task"
        assert tasks_map[task_id]["status"] == "todo"

        # Modify task in Session 2
        update_payload = {
            "status": "in_progress",
            "description": "Updated during Session 2",
        }
        res_update = session2.patch(f"/api/tasks/{task_id}", json=update_payload, headers={"X-Username": "rafael"})
        assert res_update.status_code == 200
        assert res_update.json()["status"] == "in_progress"

    # ==========================================================
    # Session 3: A third fresh client verifies persistence of updates
    # ==========================================================
    with httpx.Client(base_url=base_url) as session3:
        res3 = session3.get("/api/boards/board-1/tasks", headers={"X-Username": "rafael"})
        assert res3.status_code == 200
        tasks3 = res3.json()
        tasks_map3 = {t["id"]: t for t in tasks3}
        assert task_id in tasks_map3
        assert tasks_map3[task_id]["status"] == "in_progress"
        assert tasks_map3[task_id]["description"] == "Updated during Session 2"

    # ==========================================================
    # Database Layer: Direct raw verification in PostgreSQL
    # ==========================================================
    import os
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    pg_url = (
        os.getenv("SDIP_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or "postgresql://sdip:sdip@localhost:5432/sdip"
    )
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    direct_engine = create_engine(pg_url)
    DirectSession = sessionmaker(bind=direct_engine)
    db = DirectSession()
    try:
        db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        assert db_task is not None, f"Task {task_id} not found in PostgreSQL!"
        assert db_task.title == "Postgres Two-Session Persistence Task"
        assert db_task.status == "in_progress"
        assert db_task.description == "Updated during Session 2"

        # Cleanup test task
        db.delete(db_task)
        db.commit()
    finally:
        db.close()
        direct_engine.dispose()
