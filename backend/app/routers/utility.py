from fastapi import APIRouter
from app.db.mock_db import db

router = APIRouter(tags=["Utility"])

@router.post("/api/reset")
def reset_database():
    """Reset mock database to initial seed data."""
    db.reset()
    return {"message": "Demo data reset successfully"}
