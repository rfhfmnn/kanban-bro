import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db.seed import seed_database
from app.main import app

# In-memory SQLite database for tests with StaticPool so all connections share the same memory
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables and seed data for each test run."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db, force_reset=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    """Direct database session for tests verifying persistence."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    """Test client overriding get_db to point to in-memory test database."""
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
