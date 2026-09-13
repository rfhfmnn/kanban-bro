from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.db.mock_db import db
from app.models.schemas import Board, BoardRole, MemberUpdate
from app.routers.boards import get_board_or_404, verify_board_access

router = APIRouter(prefix="/api/boards/{board_id}/members", tags=["Members"])

@router.patch("/{username}", response_model=Board)
def update_member(
    board_id: str,
    username: str,
    payload: MemberUpdate,
    current_user: str = Depends(get_current_user),
):
    """Update member role or permission. Requires Owner or Admin role."""
    clean_username = username.strip().lower()

    with db._lock:
        board = get_board_or_404(board_id)
        caller_member = verify_board_access(board, current_user)

        # Check if caller is owner or admin
        is_owner = board["owner"] == current_user
        is_admin = caller_member.get("role") == BoardRole.admin or caller_member.get("role") == "admin"
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only board owner or admin can update member permissions",
            )

        if board["owner"] == clean_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify the owner role",
            )

        target = next((m for m in board["members"] if m["username"] == clean_username), None)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

        target["role"] = payload.role.value
        target["permission"] = payload.permission.value
        return Board(**board)

@router.delete("/{username}", response_model=Board)
def remove_member(
    board_id: str,
    username: str,
    current_user: str = Depends(get_current_user),
):
    """Remove member from board. Requires Owner or Admin role."""
    clean_username = username.strip().lower()

    with db._lock:
        board = get_board_or_404(board_id)
        caller_member = verify_board_access(board, current_user)

        is_owner = board["owner"] == current_user
        is_admin = caller_member.get("role") == BoardRole.admin or caller_member.get("role") == "admin"
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only board owner or admin can remove members",
            )

        if board["owner"] == clean_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove board owner",
            )

        target = next((m for m in board["members"] if m["username"] == clean_username), None)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

        board["members"] = [m for m in board["members"] if m["username"] != clean_username]
        return Board(**board)
