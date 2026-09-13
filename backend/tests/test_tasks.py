def test_list_board_tasks(client):
    headers = {"X-Username": "rafael"}
    response = client.get("/api/boards/board-1/tasks", headers=headers)
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)
    assert len(tasks) >= 4

def test_create_task_success(client):
    headers = {"X-Username": "rafael"}
    payload = {
        "title": "Build FastAPI backend",
        "description": "Implement all endpoints",
        "priority": "High",
        "due_date": "2026-09-30",
        "assignee": "rafael",
        "labels": ["lbl-1"],
        "status": "todo"
    }
    response = client.post("/api/boards/board-1/tasks", headers=headers, json=payload)
    assert response.status_code == 201
    task = response.json()
    assert task["title"] == "Build FastAPI backend"
    assert task["status"] == "todo"
    assert task["priority"] == "High"
    assert task["board_id"] == "board-1"

def test_create_task_forbidden_for_view_only(client):
    headers = {"X-Username": "clara"}
    # Clara is view-only on board-1
    payload = {
        "title": "Unauthorized task creation",
        "status": "todo"
    }
    response = client.post("/api/boards/board-1/tasks", headers=headers, json=payload)
    assert response.status_code == 403

def test_list_user_tasks_cross_board(client):
    headers = {"X-Username": "rafael"}
    response = client.get("/api/tasks?assignee=rafael", headers=headers)
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)
    assert len(tasks) >= 2
    for t in tasks:
        assert t["assignee"] == "rafael"
        assert "boardName" in t

def test_update_task(client):
    headers = {"X-Username": "rafael"}
    payload = {
        "title": "Implement drag-and-drop board cards (Updated)",
        "priority": "Low"
    }
    response = client.patch("/api/tasks/task-1", headers=headers, json=payload)
    assert response.status_code == 200
    task = response.json()
    assert task["title"] == "Implement drag-and-drop board cards (Updated)"
    assert task["priority"] == "Low"

def test_move_task(client):
    headers = {"X-Username": "rafael"}
    payload = {
        "status": "done",
        "order": 0
    }
    response = client.patch("/api/tasks/task-1/move", headers=headers, json=payload)
    assert response.status_code == 200
    task = response.json()
    assert task["status"] == "done"
    assert task["order"] == 0

def test_delete_task(client):
    headers = {"X-Username": "rafael"}
    response = client.delete("/api/tasks/task-1", headers=headers)
    assert response.status_code == 204

def test_add_comment(client):
    headers = {"X-Username": "rafael"}
    payload = {
        "text": "Reviewed and ready for staging deployment!"
    }
    response = client.post("/api/tasks/task-2/comments", headers=headers, json=payload)
    assert response.status_code == 201
    comment = response.json()
    assert comment["author"] == "rafael"
    assert comment["text"] == "Reviewed and ready for staging deployment!"
    assert comment["type"] == "comment"
