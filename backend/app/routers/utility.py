from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.seed import seed_database

router = APIRouter(tags=["Utility"])

@router.post("/api/reset")
def reset_database(db: Session = Depends(get_db)):
    """Reset database to initial seed data."""
    seed_database(db, force_reset=True)
    return {"message": "Demo data reset successfully"}
