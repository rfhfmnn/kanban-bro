from app.db.models import BoardModel, TaskModel, UserModel

def test_database_persistence_across_sessions(client, db_session):
    """Verify that a task created via API actually persists in the database table."""
    headers = {"X-Username": "rafael"}
    payload = {
        "title": "Persistent Task Verification",
        "description": "Stored in SQLite via SQLAlchemy",
        "priority": "High",
        "due_date": "2026-10-10",
        "assignee": "rafael",
        "labels": ["lbl-1", "lbl-2"],
        "status": "todo"
    }
    create_res = client.post("/api/boards/board-1/tasks", headers=headers, json=payload)
    assert create_res.status_code == 201
    task_data = create_res.json()
    task_id = task_data["id"]

    # Directly query the database session to verify persistent row
    db_task = db_session.query(TaskModel).filter(TaskModel.id == task_id).first()
    assert db_task is not None
    assert db_task.title == "Persistent Task Verification"
    assert db_task.board_id == "board-1"
    assert db_task.priority == "High"
    assert db_task.labels == ["lbl-1", "lbl-2"]
    assert len(db_task.comments) >= 1

def test_cascade_delete_board_removes_tasks(client, db_session):
    """Verify that deleting a board cascades to remove its tasks, columns, and members in the database."""
    headers = {"X-Username": "rafael"}
    # Board-3 is owned by rafael
    delete_res = client.delete("/api/boards/board-3", headers=headers)
    assert delete_res.status_code == 204

    # Verify board is deleted from DB
    db_board = db_session.query(BoardModel).filter(BoardModel.id == "board-3").first()
    assert db_board is None

    # Verify task-8 (which was on board-3) is deleted via cascade
    db_task = db_session.query(TaskModel).filter(TaskModel.id == "task-8").first()
    assert db_task is None

def test_user_persistence(client, db_session):
    """Verify newly created users persist in UserModel table."""
    payload = {
        "username": "charlie",
        "name": "Charlie Chaplin",
        "avatar_color": "#8b5cf6"
    }
    res = client.post("/api/users", json=payload)
    assert res.status_code == 200

    db_user = db_session.query(UserModel).filter(UserModel.username == "charlie").first()
    assert db_user is not None
    assert db_user.name == "Charlie Chaplin"
    assert db_user.avatar_color == "#8b5cf6"
