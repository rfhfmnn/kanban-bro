from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.seed import seed_database, wipe_database

router = APIRouter(tags=["Utility"])

@router.post("/api/reset")
def reset_database(seed: bool = Query(False, description="Whether to re-seed demo data after wiping"), db: Session = Depends(get_db)):
    """Reset database. By default wipes all data clean (0 users, 0 boards)."""
    if seed:
        seed_database(db, force_reset=True)
        return {"message": "Demo data reset successfully"}
    wipe_database(db)
    return {"message": "Database reset to zero state (0 users, 0 boards)"}

