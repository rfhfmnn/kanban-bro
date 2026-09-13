import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import (
    BoardColumnModel,
    BoardLabelModel,
    BoardMemberModel,
    BoardModel,
    TaskModel,
)
from app.models.schemas import (
    Board,
    BoardColumn,
    BoardCounts,
    BoardCreate,
    BoardLabel,
    BoardMember,
    BoardRole,
    BoardUpdate,
    BoardWithCounts,
    ColumnStatus,
    LabelCreate,
)

router = APIRouter(prefix="/api/boards", tags=["Boards"])

def get_board_or_404(board_id: str, db: Session) -> BoardModel:
    board = db.query(BoardModel).filter(BoardModel.id == board_id).first()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board

def verify_board_access(board: BoardModel, username: str) -> dict:
    if board.owner == username:
        return {"role": BoardRole.owner, "permission": "edit"}
    member = next((m for m in board.members if m.username == username), None)
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this board")
    return {"role": BoardRole(member.role), "permission": member.permission}

def format_board(board: BoardModel) -> Board:
    order_map = {"todo": 0, "in_progress": 1, "done": 2}
    cols = [
        BoardColumn(id=ColumnStatus(c.column_key), name=c.name)
        for c in board.columns
    ]
    cols.sort(key=lambda c: order_map.get(c.id.value, 99))

    members = [
        BoardMember(username=m.username, role=BoardRole(m.role), permission=m.permission)
        for m in board.members
    ]
    labels = [
        BoardLabel(id=l.id, name=l.name, color=l.color)
        for l in board.labels
    ]
    return Board(
        id=board.id,
        name=board.name,
        description=board.description or "",
        owner=board.owner,
        columns=cols,
        members=members,
        labels=labels,
        created_at=board.created_at,
    )

@router.get("", response_model=List[BoardWithCounts])
def list_boards(
    username: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List boards for authenticated user with task counts."""
    target_user = username.strip().lower() if username else current_user

    # Fetch boards user owns or belongs to
    boards = db.query(BoardModel).all()
    user_boards = []

    for board in boards:
        is_owner = board.owner == target_user
        member = next((m for m in board.members if m.username == target_user), None)
        if not is_owner and not member:
            continue

        base_board = format_board(board)

        # Compute task counts
        board_tasks = db.query(TaskModel).filter(TaskModel.board_id == board.id).all()
        counts = BoardCounts(
            total=len(board_tasks),
            todo=len([t for t in board_tasks if t.status == "todo"]),
            in_progress=len([t for t in board_tasks if t.status == "in_progress"]),
            done=len([t for t in board_tasks if t.status == "done"]),
        )

        current_role = BoardRole.owner if is_owner else BoardRole(member.role)
        current_perm = "edit" if is_owner else member.permission

        user_boards.append(
            BoardWithCounts(
                **base_board.model_dump(),
                counts=counts,
                currentUserRole=current_role,
                currentUserPermission=current_perm,
            )
        )

    return user_boards

@router.post("", response_model=Board, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new board with owner and standard columns."""
    board_id = f"board-{int(time.time() * 1000)}"
    owner = payload.owner.strip().lower() or current_user
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    new_board = BoardModel(
        id=board_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else "",
        owner=owner,
        created_at=now,
    )
    db.add(new_board)

    # Columns
    cols = [
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
    ]
    for key, name in cols:
        db.add(BoardColumnModel(
            id=f"{board_id}_{key}",
            board_id=board_id,
            column_key=key,
            name=name,
        ))

    # Owner Member
    db.add(BoardMemberModel(
        id=f"{board_id}_{owner}",
        board_id=board_id,
        username=owner,
        role="owner",
        permission="edit",
    ))

    # Default labels
    default_labels = [
        ("Frontend", "#6366f1"),
        ("Backend", "#10b981"),
        ("Bug", "#ef4444"),
    ]
    for idx, (lbl_name, lbl_color) in enumerate(default_labels, 1):
        db.add(BoardLabelModel(
            id=f"lbl-{int(time.time())}-{idx}",
            board_id=board_id,
            name=lbl_name,
            color=lbl_color,
        ))

    db.commit()
    db.refresh(new_board)
    return format_board(new_board)

@router.get("/{board_id}", response_model=Board)
def get_board(
    board_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get board details by ID."""
    board = get_board_or_404(board_id, db)
    verify_board_access(board, current_user)
    return format_board(board)

@router.patch("/{board_id}", response_model=Board)
def update_board(
    board_id: str,
    payload: BoardUpdate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update board name or description."""
    board = get_board_or_404(board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

    if payload.name is not None:
        board.name = payload.name.strip()
    if payload.description is not None:
        board.description = payload.description.strip()

    db.commit()
    db.refresh(board)
    return format_board(board)

@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a board. Only the Owner can delete a board."""
    board = get_board_or_404(board_id, db)
    if board.owner != current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the board owner can delete this board",
        )

    db.delete(board)
    db.commit()
    return None

@router.patch("/{board_id}/columns/{column_id}", response_model=Board)
def update_column_name(
    board_id: str,
    column_id: ColumnStatus,
    payload: dict,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename a fixed column."""
    name = payload.get("name")
    if not name or not name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column name is required")

    board = get_board_or_404(board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

    col = db.query(BoardColumnModel).filter(
        BoardColumnModel.board_id == board_id,
        BoardColumnModel.column_key == column_id.value,
    ).first()
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")

    col.name = name.strip()
    db.commit()
    db.refresh(board)
    return format_board(board)

@router.post("/{board_id}/labels", response_model=BoardLabel, status_code=status.HTTP_201_CREATED)
def add_label(
    board_id: str,
    payload: LabelCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a label to a board."""
    board = get_board_or_404(board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

    new_label = BoardLabelModel(
        id=f"lbl-{int(time.time() * 1000)}",
        board_id=board_id,
        name=payload.name.strip(),
        color=payload.color.strip(),
    )
    db.add(new_label)
    db.commit()
    db.refresh(new_label)
    return BoardLabel(id=new_label.id, name=new_label.name, color=new_label.color)
