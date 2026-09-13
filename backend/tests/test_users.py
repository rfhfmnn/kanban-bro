def test_list_users(client):
    response = client.get("/api/users")
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 4
    usernames = [u["username"] for u in users]
    assert "rafael" in usernames
    assert "alice" in usernames

def test_create_new_user(client):
    payload = {
        "username": "sarah",
        "name": "Sarah Connor",
        "avatar_color": "#ec4899"
    }
    response = client.post("/api/users", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "sarah"
    assert data["name"] == "Sarah Connor"
    assert data["avatar_color"] == "#ec4899"

def test_create_existing_user_returns_existing(client):
    payload = {
        "username": "rafael",
        "name": "New Name Should Be Ignored"
    }
    response = client.post("/api/users", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "rafael"
    assert data["name"] == "Rafael Hoffmann"
