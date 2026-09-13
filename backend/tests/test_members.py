def test_update_member_role_and_permission(client):
    headers = {"X-Username": "rafael"}
    # Rafael is owner of board-1, updates bob to admin
    payload = {
        "role": "admin",
        "permission": "edit"
    }
    response = client.patch("/api/boards/board-1/members/bob", headers=headers, json=payload)
    assert response.status_code == 200
    board = response.json()
    bob_member = next(m for m in board["members"] if m["username"] == "bob")
    assert bob_member["role"] == "admin"
    assert bob_member["permission"] == "edit"

def test_cannot_modify_owner_role(client):
    headers = {"X-Username": "alice"} # Alice is admin
    payload = {
        "role": "member",
        "permission": "view"
    }
    response = client.patch("/api/boards/board-1/members/rafael", headers=headers, json=payload)
    assert response.status_code == 400

def test_remove_member(client):
    headers = {"X-Username": "rafael"}
    response = client.delete("/api/boards/board-1/members/clara", headers=headers)
    assert response.status_code == 200
    board = response.json()
    assert not any(m["username"] == "clara" for m in board["members"])

def test_cannot_remove_owner(client):
    headers = {"X-Username": "alice"}
    response = client.delete("/api/boards/board-1/members/rafael", headers=headers)
    assert response.status_code == 400
