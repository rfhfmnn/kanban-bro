import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file if available
env_paths = [
    Path.cwd() / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",  # backend/.env
    Path(__file__).resolve().parent.parent.parent.parent / ".env",  # repo root .env
]
for p in env_paths:
    if p.is_file():
        load_dotenv(p)
        break

def get_database_url() -> str:
    """Resolve database URL from environment variables, supporting PostgreSQL and SQLite."""
    # 1. Explicit DATABASE_URL
    url = os.getenv("DATABASE_URL")
    if url:
        # Standardize postgres:// to postgresql:// for SQLAlchemy compatibility
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # 2. Individual Postgres environment variables or flag
    postgres_host = os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST")
    postgres_db = os.getenv("POSTGRES_DB")
    postgres_user = os.getenv("POSTGRES_USER")
    postgres_password = os.getenv("POSTGRES_PASSWORD")
    postgres_port = os.getenv("POSTGRES_PORT") or os.getenv("DB_PORT", "5432")
    use_postgres = os.getenv("USE_POSTGRES", "").lower() in ("true", "1", "yes")

    if use_postgres or postgres_host or postgres_db or (postgres_user and postgres_password):
        user = postgres_user or "sdip"
        password = postgres_password or "sdip"
        host = postgres_host or "localhost"
        port = postgres_port or "5432"
        db = postgres_db or "sdip"
        return f"postgresql://{user}:{password}@{host}:{port}/{db}"

    # 3. Default fallback to local SQLite
    return "sqlite:///./kanban.db"

DATABASE_URL = get_database_url()

engine_kwargs = {"echo": False}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL configuration with connection health check and pooling
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 3600

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency that yields a database session and closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

