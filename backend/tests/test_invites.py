def test_list_pending_invites(client):
    headers = {"X-Username": "david"}
    response = client.get("/api/invites?username=david", headers=headers)
    assert response.status_code == 200
    invites = response.json()
    assert isinstance(invites, list)
    assert len(invites) == 2
    for inv in invites:
        assert inv["invitee"] == "david"
        assert inv["status"] == "pending"

def test_send_invite_direct_addition_by_admin(client):
    headers = {"X-Username": "alice"} # Alice is admin of board-1
    payload = {
        "board_id": "board-1",
        "inviter": "alice",
        "invitee": "newbie"
    }
    response = client.post("/api/invites", headers=headers, json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["direct_added"] is True
    assert "directly" in res["message"]

    # Verify newbie is now a member of board-1
    board_res = client.get("/api/boards/board-1", headers=headers)
    board = board_res.json()
    assert any(m["username"] == "newbie" for m in board["members"])

def test_send_invite_pending_request_by_member(client):
    headers = {"X-Username": "bob"} # Bob is regular member of board-1
    payload = {
        "board_id": "board-1",
        "inviter": "bob",
        "invitee": "candidate"
    }
    response = client.post("/api/invites", headers=headers, json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["direct_added"] is False
    assert "pending" in res["message"]

    # Verify candidate has a pending invite
    cand_headers = {"X-Username": "candidate"}
    invites_res = client.get("/api/invites?username=candidate", headers=cand_headers)
    assert any(i["invitee"] == "candidate" for i in invites_res.json())

def test_respond_invite_accept(client):
    headers = {"X-Username": "david"}
    # inv-1 is invite for david to join board-2
    payload = {"accept": True}
    response = client.post("/api/invites/inv-1/respond", headers=headers, json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "accepted"

    # Verify david is now in board-2 members
    board_res = client.get("/api/boards/board-2", headers=headers)
    board = board_res.json()
    assert any(m["username"] == "david" and m["permission"] == "edit" for m in board["members"])

def test_respond_invite_decline(client):
    headers = {"X-Username": "david"}
    # inv-2 is invite for david to join board-1
    payload = {"accept": False}
    response = client.post("/api/invites/inv-2/respond", headers=headers, json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "declined"
