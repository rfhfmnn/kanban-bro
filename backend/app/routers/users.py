import random
from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.mock_db import db
from app.models.schemas import User, UserCreate

router = APIRouter(prefix="/api/users", tags=["Users"])

COLOR_PALETTE = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#3b82f6"]

@router.get("", response_model=List[User])
def list_users():
    """List all registered users."""
    with db._lock:
        return [User(**u) for u in db.users]

@router.post("", response_model=User)
def create_user(payload: UserCreate):
    """Register or get existing user with mock auth."""
    clean_username = payload.username.strip().lower()
    if not clean_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")

    with db._lock:
        existing = next((u for u in db.users if u["username"] == clean_username), None)
        if existing:
            return User(**existing)

        new_user = {
            "username": clean_username,
            "name": payload.name.strip() if payload.name and payload.name.strip() else clean_username,
            "avatar_color": payload.avatar_color if payload.avatar_color else random.choice(COLOR_PALETTE),
        }
        db.users.append(new_user)
        return User(**new_user)
