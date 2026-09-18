import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import UserModel
from app.db.seed import seed_database

POSTGRES_TEST_URL = os.getenv("POSTGRES_TEST_URL", "postgresql://sdip:sdip@localhost:5432/sdip")

def is_postgres_available():
    try:
        engine = create_engine(POSTGRES_TEST_URL, connect_args={"connect_timeout": 2})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

@pytest.mark.skipif(not is_postgres_available(), reason="PostgreSQL container not running or unreachable")
def test_postgres_schema_and_crud():
    """Verify schema creation, seeding, and querying directly on a live PostgreSQL database."""
    engine = create_engine(POSTGRES_TEST_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    
    # Verify tables creation
    Base.metadata.create_all(bind=engine)
    
    session = Session()
    try:
        # Seed test data
        seed_database(session, force_reset=True)
        
        # Verify users exist
        users = session.query(UserModel).all()
        assert len(users) >= 3
        usernames = [u.username for u in users]
        assert "rafael" in usernames
        
        # Test insert new user in Postgres
        new_user = UserModel(username="pg_tester", name="Postgres Tester", avatar_color="#10b981")
        session.add(new_user)
        session.commit()
        
        fetched = session.query(UserModel).filter(UserModel.username == "pg_tester").first()
        assert fetched is not None
        assert fetched.name == "Postgres Tester"
        
        # Cleanup
        session.delete(fetched)
        session.commit()
    finally:
        session.close()
        engine.dispose()
