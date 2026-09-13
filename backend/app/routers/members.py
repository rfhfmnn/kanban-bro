from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import BoardMemberModel, BoardModel
from app.models.schemas import Board, BoardRole, MemberUpdate
from app.routers.boards import format_board, get_board_or_404, verify_board_access

router = APIRouter(prefix="/api/boards/{board_id}/members", tags=["Members"])

@router.patch("/{username}", response_model=Board)
def update_member(
    board_id: str,
    username: str,
    payload: MemberUpdate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update member role or permission. Requires Owner or Admin role."""
    clean_username = username.strip().lower()

    board = get_board_or_404(board_id, db)
    caller_member = verify_board_access(board, current_user)

    is_owner = board.owner == current_user
    is_admin = caller_member["role"] == BoardRole.admin
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only board owner or admin can update member permissions",
        )

    if board.owner == clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify the owner role",
        )

    target = db.query(BoardMemberModel).filter(
        BoardMemberModel.board_id == board_id,
        BoardMemberModel.username == clean_username,
    ).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    target.role = payload.role.value
    target.permission = payload.permission.value
    db.commit()
    db.refresh(board)
    return format_board(board)

@router.delete("/{username}", response_model=Board)
def remove_member(
    board_id: str,
    username: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove member from board. Requires Owner or Admin role."""
    clean_username = username.strip().lower()

    board = get_board_or_404(board_id, db)
    caller_member = verify_board_access(board, current_user)

    is_owner = board.owner == current_user
    is_admin = caller_member["role"] == BoardRole.admin
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only board owner or admin can remove members",
        )

    if board.owner == clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove board owner",
        )

    target = db.query(BoardMemberModel).filter(
        BoardMemberModel.board_id == board_id,
        BoardMemberModel.username == clean_username,
    ).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    db.delete(target)
    db.commit()
    db.refresh(board)
    return format_board(board)
