import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user
from app.db.mock_db import db
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

def get_board_or_404(board_id: str) -> dict:
    board = next((b for b in db.boards if b["id"] == board_id), None)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board

def verify_board_access(board: dict, username: str) -> dict:
    if board["owner"] == username:
        return {"role": BoardRole.owner, "permission": "edit"}
    member = next((m for m in board["members"] if m["username"] == username), None)
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this board")
    return member

@router.get("", response_model=List[BoardWithCounts])
def list_boards(
    username: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user),
):
    """List boards for authenticated user with task counts."""
    target_user = username.strip().lower() if username else current_user

    with db._lock:
        user_boards = []
        for board in db.boards:
            is_owner = board["owner"] == target_user
            member = next((m for m in board["members"] if m["username"] == target_user), None)
            if not is_owner and not member:
                continue

            # Task counts
            board_tasks = [t for t in db.tasks if t["board_id"] == board["id"]]
            counts = BoardCounts(
                total=len(board_tasks),
                todo=len([t for t in board_tasks if t["status"] == "todo"]),
                in_progress=len([t for t in board_tasks if t["status"] == "in_progress"]),
                done=len([t for t in board_tasks if t["status"] == "done"]),
            )

            current_role = BoardRole.owner if is_owner else (BoardRole(member["role"]) if member else BoardRole.member)
            current_perm = "edit" if is_owner else (member["permission"] if member else "view")

            board_dict = {
                **board,
                "counts": counts,
                "currentUserRole": current_role,
                "currentUserPermission": current_perm,
            }
            user_boards.append(BoardWithCounts(**board_dict))

        return user_boards

@router.post("", response_model=Board, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreate,
    current_user: str = Depends(get_current_user),
):
    """Create a new board."""
    with db._lock:
        board_id = f"board-{int(time.time() * 1000)}"
        owner = payload.owner.strip().lower() or current_user
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        new_board = {
            "id": board_id,
            "name": payload.name.strip(),
            "description": payload.description.strip() if payload.description else "",
            "owner": owner,
            "columns": [
                {"id": "todo", "name": "To Do"},
                {"id": "in_progress", "name": "In Progress"},
                {"id": "done", "name": "Done"},
            ],
            "members": [{"username": owner, "role": "owner", "permission": "edit"}],
            "labels": [
                {"id": f"lbl-{int(time.time())}-1", "name": "Frontend", "color": "#6366f1"},
                {"id": f"lbl-{int(time.time())}-2", "name": "Backend", "color": "#10b981"},
                {"id": f"lbl-{int(time.time())}-3", "name": "Bug", "color": "#ef4444"},
            ],
            "created_at": now,
        }
        db.boards.append(new_board)
        return Board(**new_board)

@router.get("/{board_id}", response_model=Board)
def get_board(
    board_id: str,
    current_user: str = Depends(get_current_user),
):
    """Get board details by ID."""
    with db._lock:
        board = get_board_or_404(board_id)
        verify_board_access(board, current_user)
        return Board(**board)

@router.patch("/{board_id}", response_model=Board)
def update_board(
    board_id: str,
    payload: BoardUpdate,
    current_user: str = Depends(get_current_user),
):
    """Update board name or description."""
    with db._lock:
        board = get_board_or_404(board_id)
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

        if payload.name is not None:
            board["name"] = payload.name.strip()
        if payload.description is not None:
            board["description"] = payload.description.strip()

        return Board(**board)

@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: str,
    current_user: str = Depends(get_current_user),
):
    """Delete a board. Only the Owner can delete a board."""
    with db._lock:
        board = get_board_or_404(board_id)
        if board["owner"] != current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the board owner can delete this board",
            )

        db.boards = [b for b in db.boards if b["id"] != board_id]
        db.tasks = [t for t in db.tasks if t["board_id"] != board_id]
        return None

@router.patch("/{board_id}/columns/{column_id}", response_model=Board)
def update_column_name(
    board_id: str,
    column_id: ColumnStatus,
    payload: dict,
    current_user: str = Depends(get_current_user),
):
    """Rename a fixed column."""
    name = payload.get("name")
    if not name or not name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column name is required")

    with db._lock:
        board = get_board_or_404(board_id)
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

        col = next((c for c in board["columns"] if c["id"] == column_id.value), None)
        if not col:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")

        col["name"] = name.strip()
        return Board(**board)

@router.post("/{board_id}/labels", response_model=BoardLabel, status_code=status.HTTP_201_CREATED)
def add_label(
    board_id: str,
    payload: LabelCreate,
    current_user: str = Depends(get_current_user),
):
    """Add a label to a board."""
    with db._lock:
        board = get_board_or_404(board_id)
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

        new_label = {
            "id": f"lbl-{int(time.time() * 1000)}",
            "name": payload.name.strip(),
            "color": payload.color.strip(),
        }
        board["labels"].append(new_label)
        return BoardLabel(**new_label)
