import os
import shutil
import subprocess
import time
import uuid
import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import BoardModel, TaskModel

BASE_URL = os.getenv("COMPOSE_APP_URL", "http://localhost:8000")
PG_URL = os.getenv("COMPOSE_PG_URL", "postgresql://sdip:sdip@localhost:5432/sdip")


def is_compose_env_running() -> bool:
    """Check if the Docker Compose app and postgres instances are reachable."""
    try:
        r = httpx.get(f"{BASE_URL}/api/health", timeout=3.0)
        if r.status_code != 200:
            return False
        data = r.json()
        return data.get("database") == "postgresql"
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not is_compose_env_running(),
    reason="Docker Compose environment not running on localhost:8000 or not using PostgreSQL",
)


def test_compose_services_health_and_db_engine():
    """Scenario 1: Verify app health and internal networking to the postgres service."""
    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] == "ok"
        assert data["app"] == "Kanban Bro API"
        assert data["persistence"] == "SQLAlchemy"
        assert data["database"] == "postgresql"


def test_compose_frontend_static_serving():
    """Scenario 2: Verify the full-stack container serves the React frontend and handles SPA routing."""
    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        # 1. Root index.html
        resp_root = client.get("/")
        assert resp_root.status_code == 200
        assert "text/html" in resp_root.headers.get("content-type", "")
        assert '<div id="root">' in resp_root.text

        # 2. Client-side SPA routing fallback
        resp_spa = client.get("/boards/board-1")
        assert resp_spa.status_code == 200
        assert '<div id="root">' in resp_spa.text


def test_compose_end_to_end_kanban_workflow():
    """Scenario 3: Multi-step end-to-end CRUD workflow through the HTTP API."""
    unique_suffix = uuid.uuid4().hex[:8]
    board_name = f"Compose Test Board {unique_suffix}"
    task_title = f"Task Compose {unique_suffix}"

    headers = {"X-Username": "rafael"}
    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        # Step 1: Create a board
        board_payload = {
            "name": board_name,
            "description": "Integration test board for docker-compose",
            "owner": "rafael",
        }
        res_board = client.post("/api/boards", json=board_payload, headers=headers)
        assert res_board.status_code == 201
        board = res_board.json()
        board_id = board["id"]
        assert board["name"] == board_name

        # Step 2: Create a task in that board
        task_payload = {
            "title": task_title,
            "description": "End-to-end verification",
            "priority": "High",
            "due_date": "2026-12-31",
            "assignee": "rafael",
            "labels": ["lbl-1"],
            "status": "todo",
        }
        res_task = client.post(f"/api/boards/{board_id}/tasks", json=task_payload, headers=headers)
        assert res_task.status_code == 201
        task = res_task.json()
        task_id = task["id"]
        assert task["title"] == task_title
        assert task["status"] == "todo"

        # Step 3: Transition task to 'in_progress' and then 'done'
        res_update1 = client.patch(
            f"/api/tasks/{task_id}",
            json={"status": "in_progress"},
            headers=headers,
        )
        assert res_update1.status_code == 200
        assert res_update1.json()["status"] == "in_progress"

        res_update2 = client.patch(
            f"/api/tasks/{task_id}",
            json={"status": "done"},
            headers=headers,
        )
        assert res_update2.status_code == 200
        assert res_update2.json()["status"] == "done"

        # Step 4: Verify task list reflects final status
        res_tasks = client.get(f"/api/boards/{board_id}/tasks", headers=headers)
        assert res_tasks.status_code == 200
        tasks = res_tasks.json()
        target = next((t for t in tasks if t["id"] == task_id), None)
        assert target is not None
        assert target["status"] == "done"


def test_compose_cross_verification_in_database():
    """Scenario 4: Direct PostgreSQL inspection of data created via the app container."""
    unique_suffix = uuid.uuid4().hex[:8]
    board_name = f"Cross-Verify Board {unique_suffix}"
    task_title = f"Cross-Verify Task {unique_suffix}"

    headers = {"X-Username": "rafael"}
    board_id = None
    task_id = None

    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        # Create board and task via HTTP
        b_res = client.post(
            "/api/boards",
            json={"name": board_name, "owner": "rafael"},
            headers=headers,
        )
        assert b_res.status_code == 201
        board_id = b_res.json()["id"]

        t_res = client.post(
            f"/api/boards/{board_id}/tasks",
            json={"title": task_title, "status": "in_progress", "priority": "Medium"},
            headers=headers,
        )
        assert t_res.status_code == 201
        task_id = t_res.json()["id"]

    # Direct verification against PostgreSQL database on host port 5432
    engine = create_engine(PG_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        db_board = session.query(BoardModel).filter(BoardModel.id == board_id).first()
        assert db_board is not None
        assert db_board.name == board_name
        assert db_board.owner == "rafael"

        db_task = session.query(TaskModel).filter(TaskModel.id == task_id).first()
        assert db_task is not None
        assert db_task.title == task_title
        assert db_task.status == "in_progress"
        assert db_task.board_id == board_id
    finally:
        session.close()
        engine.dispose()


def test_compose_persistence_across_app_restart():
    """Scenario 5: Verify volume data persistence when the app container restarts."""
    if not shutil.which("docker"):
        pytest.skip("Docker CLI is not available in test runner to trigger container restart")

    unique_suffix = uuid.uuid4().hex[:8]
    task_title = f"Restart Persistence Task {unique_suffix}"
    headers = {"X-Username": "rafael"}

    task_id = None
    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        # Create a task on board-1
        res = client.post(
            "/api/boards/board-1/tasks",
            json={"title": task_title, "status": "todo", "priority": "High"},
            headers=headers,
        )
        assert res.status_code == 201
        task_id = res.json()["id"]

    # Restart app container
    restart_result = subprocess.run(
        ["docker", "restart", "kanban-bro-app"],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert restart_result.returncode == 0

    # Wait for the app container to come back up and be healthy
    app_ready = False
    for _ in range(30):
        try:
            r = httpx.get(f"{BASE_URL}/api/health", timeout=2.0)
            if r.status_code == 200:
                app_ready = True
                break
        except Exception:
            pass
        time.sleep(1)

    assert app_ready, "App container failed to recover after restart!"

    # Verify task is still present after restart
    with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
        res = client.get("/api/boards/board-1/tasks", headers=headers)
        assert res.status_code == 200
        tasks = res.json()
        target = next((t for t in tasks if t["id"] == task_id), None)
        assert target is not None
        assert target["title"] == task_title
