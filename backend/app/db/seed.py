import json
from sqlalchemy.orm import Session
from app.db.mock_db import (
    INITIAL_BOARDS,
    INITIAL_INVITES,
    INITIAL_TASKS,
    INITIAL_USERS,
)
from app.db.models import (
    BoardColumnModel,
    BoardLabelModel,
    BoardMemberModel,
    BoardModel,
    InviteModel,
    TaskCommentModel,
    TaskModel,
    UserModel,
)

def wipe_database(db: Session):
    """Completely wipe all data from the database (0 users, 0 boards, 0 tasks)."""
    db.query(TaskCommentModel).delete()
    db.query(TaskModel).delete()
    db.query(BoardLabelModel).delete()
    db.query(BoardMemberModel).delete()
    db.query(BoardColumnModel).delete()
    db.query(BoardModel).delete()
    db.query(InviteModel).delete()
    db.query(UserModel).delete()
    db.commit()

def seed_database(db: Session, force_reset: bool = False):
    """Seed initial data into the database if empty or force_reset is True."""
    if force_reset:
        wipe_database(db)

    # Check if already seeded
    existing_user = db.query(UserModel).first()
    if existing_user:
        return

    # Seed Users
    for u in INITIAL_USERS:
        db.add(UserModel(
            username=u["username"],
            name=u["name"],
            avatar_color=u["avatar_color"],
        ))

    # Seed Boards, Columns, Members, Labels
    for b in INITIAL_BOARDS:
        board_obj = BoardModel(
            id=b["id"],
            name=b["name"],
            description=b["description"],
            owner=b["owner"],
            created_at=b["created_at"],
        )
        db.add(board_obj)

        for col in b["columns"]:
            db.add(BoardColumnModel(
                id=f"{b['id']}_{col['id']}",
                board_id=b["id"],
                column_key=col["id"],
                name=col["name"],
            ))

        for m in b["members"]:
            db.add(BoardMemberModel(
                id=f"{b['id']}_{m['username']}",
                board_id=b["id"],
                username=m["username"],
                role=m["role"],
                permission=m["permission"],
            ))

        for lbl in b["labels"]:
            db.add(BoardLabelModel(
                id=lbl["id"],
                board_id=b["id"],
                name=lbl["name"],
                color=lbl["color"],
            ))

    # Seed Tasks and Comments
    for t in INITIAL_TASKS:
        task_obj = TaskModel(
            id=t["id"],
            board_id=t["board_id"],
            title=t["title"],
            description=t["description"],
            priority=t["priority"],
            due_date=t["due_date"],
            assignee=t["assignee"],
            labels_json=json.dumps(t["labels"]),
            url=t["url"],
            status=t["status"],
            order=t["order"],
            created_at=t["created_at"],
            updated_at=t["updated_at"],
        )
        db.add(task_obj)

        for c in t["comments"]:
            db.add(TaskCommentModel(
                id=c["id"],
                task_id=t["id"],
                author=c["author"],
                text=c["text"],
                type=c["type"],
                created_at=c["created_at"],
            ))

    # Seed Invites
    for inv in INITIAL_INVITES:
        db.add(InviteModel(
            id=inv["id"],
            board_id=inv["board_id"],
            board_name=inv["board_name"],
            inviter=inv["inviter"],
            invitee=inv["invitee"],
            status=inv["status"],
            created_at=inv["created_at"],
        ))

    db.commit()
