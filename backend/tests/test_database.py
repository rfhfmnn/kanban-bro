import os
from unittest.mock import patch
from app.db.database import get_database_url

def test_get_database_url_default_sqlite():
    """Test that default URL is sqlite when no environment variables are set."""
    with patch.dict(os.environ, {}, clear=True):
        url = get_database_url()
        assert url == "sqlite:///./kanban.db"

def test_get_database_url_explicit_database_url():
    """Test that explicit DATABASE_URL is respected."""
    with patch.dict(os.environ, {"DATABASE_URL": "postgresql://sdip:sdip@localhost:5432/sdip"}, clear=True):
        url = get_database_url()
        assert url == "postgresql://sdip:sdip@localhost:5432/sdip"

def test_get_database_url_postgres_prefix_normalized():
    """Test that legacy postgres:// prefix is normalized to postgresql://."""
    with patch.dict(os.environ, {"DATABASE_URL": "postgres://sdip:sdip@localhost:5432/sdip"}, clear=True):
        url = get_database_url()
        assert url == "postgresql://sdip:sdip@localhost:5432/sdip"

def test_get_database_url_from_postgres_env_vars():
    """Test resolution from individual POSTGRES_* environment variables."""
    env = {
        "POSTGRES_USER": "testuser",
        "POSTGRES_PASSWORD": "secretpassword",
        "POSTGRES_HOST": "dbhost",
        "POSTGRES_PORT": "5433",
        "POSTGRES_DB": "testdb",
    }
    with patch.dict(os.environ, env, clear=True):
        url = get_database_url()
        assert url == "postgresql://testuser:secretpassword@dbhost:5433/testdb"

def test_get_database_url_use_postgres_flag():
    """Test resolution when USE_POSTGRES is set to true with defaults."""
    with patch.dict(os.environ, {"USE_POSTGRES": "true"}, clear=True):
        url = get_database_url()
        assert url == "postgresql://sdip:sdip@localhost:5432/sdip"
