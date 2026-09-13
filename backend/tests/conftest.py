import pytest
from fastapi.testclient import TestClient

# We will import app once it is defined
from app.main import app
from app.db.mock_db import db

@pytest.fixture(autouse=True)
def reset_database():
    """Reset mock database before each test run."""
    db.reset()
    yield

@pytest.fixture
def client():
    """Test client for FastAPI app."""
    return TestClient(app)
