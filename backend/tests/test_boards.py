def test_list_boards_unauthorized(client):
    # Missing X-Username header
    response = client.get("/api/boards")
    assert response.status_code == 401

def test_list_boards_authorized(client):
    headers = {"X-Username": "rafael"}
    response = client.get("/api/boards", headers=headers)
    assert response.status_code == 200
    boards = response.json()
    assert isinstance(boards, list)
    assert len(boards) >= 2
    # Ensure computed task counts exist
    for b in boards:
        assert "counts" in b
        assert "total" in b["counts"]
        assert "todo" in b["counts"]
        assert "in_progress" in b["counts"]
        assert "done" in b["counts"]
        assert "currentUserRole" in b
        assert "currentUserPermission" in b

def test_create_board(client):
    headers = {"X-Username": "rafael"}
    payload = {
        "name": "Sprint 99",
        "description": "Next generation platform",
        "owner": "rafael"
    }
    response = client.post("/api/boards", headers=headers, json=payload)
    assert response.status_code == 201
    board = response.json()
    assert board["name"] == "Sprint 99"
    assert board["owner"] == "rafael"
    assert len(board["columns"]) == 3
    col_ids = [c["id"] for c in board["columns"]]
    assert col_ids == ["todo", "in_progress", "done"]
    assert any(m["username"] == "rafael" and m["role"] == "owner" for m in board["members"])

def test_get_board_by_id(client):
    headers = {"X-Username": "rafael"}
    response = client.get("/api/boards/board-1", headers=headers)
    assert response.status_code == 200
    board = response.json()
    assert board["id"] == "board-1"
    assert board["name"] == "Product Launch Q4"

def test_get_board_not_found(client):
    headers = {"X-Username": "rafael"}
    response = client.get("/api/boards/non-existent-id", headers=headers)
    assert response.status_code == 404

def test_update_board_metadata(client):
    headers = {"X-Username": "rafael"}
    payload = {
        "name": "Product Launch Q4 (Updated Title)",
        "description": "Refreshed description"
    }
    response = client.patch("/api/boards/board-1", headers=headers, json=payload)
    assert response.status_code == 200
    board = response.json()
    assert board["name"] == "Product Launch Q4 (Updated Title)"
    assert board["description"] == "Refreshed description"

def test_update_column_name(client):
    headers = {"X-Username": "rafael"}
    payload = {"name": "Backlog & Triage"}
    response = client.patch("/api/boards/board-1/columns/todo", headers=headers, json=payload)
    assert response.status_code == 200
    board = response.json()
    todo_col = next(c for c in board["columns"] if c["id"] == "todo")
    assert todo_col["name"] == "Backlog & Triage"

def test_add_label(client):
    headers = {"X-Username": "rafael"}
    payload = {"name": "Security", "color": "#ef4444"}
    response = client.post("/api/boards/board-1/labels", headers=headers, json=payload)
    assert response.status_code == 201
    label = response.json()
    assert label["name"] == "Security"
    assert label["color"] == "#ef4444"

def test_delete_board_forbidden_for_non_owner(client):
    headers = {"X-Username": "bob"}
    # Bob is member, not owner of board-1
    response = client.delete("/api/boards/board-1", headers=headers)
    assert response.status_code == 403

def test_delete_board_by_owner(client):
    headers = {"X-Username": "rafael"}
    # Rafael is owner of board-3
    response = client.delete("/api/boards/board-3", headers=headers)
    assert response.status_code == 204

    # Verify it is deleted
    get_res = client.get("/api/boards/board-3", headers=headers)
    assert get_res.status_code == 404
