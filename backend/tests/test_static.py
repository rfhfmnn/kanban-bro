from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

def test_api_health():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_docs_accessible():
    client = TestClient(app)
    response = client.get("/docs")
    assert response.status_code == 200

def test_unknown_api_route_returns_404():
    client = TestClient(app)
    response = client.get("/api/definitely_not_a_real_route")
    assert response.status_code == 404
    # Ensure it's not returning HTML
    assert "text/html" not in response.headers.get("content-type", "")

def test_static_and_spa_serving():
    client = TestClient(app)
    # Check root route
    response = client.get("/")
    assert response.status_code == 200

    # If static files are built, test frontend SPA and asset delivery
    if "text/html" in response.headers.get("content-type", ""):
        assert "<!DOCTYPE html>" in response.text or "<html" in response.text

        # Test SPA route fallback
        spa_response = client.get("/dashboard")
        assert spa_response.status_code == 200
        assert "<html" in spa_response.text

        # Test board view subroute
        board_response = client.get("/board/some-id")
        assert board_response.status_code == 200
        assert "<html" in board_response.text

        # Test static asset if present
        assets_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist" / "assets"
        if assets_dir.is_dir():
            js_files = list(assets_dir.glob("*.js"))
            if js_files:
                asset_resp = client.get(f"/assets/{js_files[0].name}")
                assert asset_resp.status_code == 200
                assert "javascript" in asset_resp.headers.get("content-type", "")
