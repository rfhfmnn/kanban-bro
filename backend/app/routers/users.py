import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import UserModel
from app.models.schemas import User, UserCreate

router = APIRouter(prefix="/api/users", tags=["Users"])

COLOR_PALETTE = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#3b82f6"]

@router.get("", response_model=List[User])
def list_users(db: Session = Depends(get_db)):
    """List all registered users from database."""
    users = db.query(UserModel).all()
    return [
        User(username=u.username, name=u.name, avatar_color=u.avatar_color)
        for u in users
    ]

@router.post("", response_model=User)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Register or get existing user with mock auth."""
    clean_username = payload.username.strip().lower()
    if not clean_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")

    existing = db.query(UserModel).filter(UserModel.username == clean_username).first()
    if existing:
        return User(username=existing.username, name=existing.name, avatar_color=existing.avatar_color)

    name = payload.name.strip() if payload.name and payload.name.strip() else clean_username
    avatar_color = payload.avatar_color if payload.avatar_color else random.choice(COLOR_PALETTE)

    new_user = UserModel(
        username=clean_username,
        name=name,
        avatar_color=avatar_color,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return User(username=new_user.username, name=new_user.name, avatar_color=new_user.avatar_color)
