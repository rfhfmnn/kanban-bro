def test_reset_demo_data(client):
    response = client.post("/api/reset")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
