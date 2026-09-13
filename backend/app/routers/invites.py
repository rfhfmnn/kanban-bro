import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import BoardMemberModel, BoardModel, InviteModel
from app.models.schemas import (
    BoardRole,
    Invite,
    InviteAction,
    InviteResponse,
    InviteSend,
    InviteStatus,
)
from app.routers.boards import get_board_or_404, verify_board_access

router = APIRouter(prefix="/api/invites", tags=["Invites"])

@router.get("", response_model=List[Invite])
def list_invites(
    username: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List pending invitations for a user."""
    target_user = username.strip().lower() if username else current_user

    invites = (
        db.query(InviteModel)
        .filter(
            InviteModel.invitee == target_user,
            InviteModel.status == "pending",
        )
        .all()
    )
    return [
        Invite(
            id=i.id,
            board_id=i.board_id,
            board_name=i.board_name,
            inviter=i.inviter,
            invitee=i.invitee,
            status=InviteStatus(i.status),
            created_at=i.created_at,
        )
        for i in invites
    ]

@router.post("", response_model=InviteResponse)
def send_invite(
    payload: InviteSend,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send invitation to join a board. Directly adds member if caller is Owner/Admin."""
    clean_invitee = payload.invitee.strip().lower()
    clean_inviter = payload.inviter.strip().lower() or current_user

    board = get_board_or_404(payload.board_id, db)
    caller_member = verify_board_access(board, current_user)

    # Check if already member
    existing_member = (
        db.query(BoardMemberModel)
        .filter(
            BoardMemberModel.board_id == payload.board_id,
            BoardMemberModel.username == clean_invitee,
        )
        .first()
    )
    if existing_member or board.owner == clean_invitee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"@{clean_invitee} is already a member of this board.",
        )

    is_owner = board.owner == current_user
    is_admin = caller_member["role"] == BoardRole.admin

    if is_owner or is_admin:
        # Direct addition per spec
        db.add(BoardMemberModel(
            id=f"{payload.board_id}_{clean_invitee}",
            board_id=payload.board_id,
            username=clean_invitee,
            role="member",
            permission="edit",
        ))
        db.commit()
        return InviteResponse(
            direct_added=True,
            message=f"Added @{clean_invitee} directly as a member.",
        )
    else:
        # Member invite -> pending request
        existing_invite = (
            db.query(InviteModel)
            .filter(
                InviteModel.board_id == payload.board_id,
                InviteModel.invitee == clean_invitee,
                InviteModel.status == "pending",
            )
            .first()
        )
        if existing_invite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An invitation has already been sent to @{clean_invitee}.",
            )

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        new_invite = InviteModel(
            id=f"inv-{int(time.time() * 1000)}",
            board_id=payload.board_id,
            board_name=board.name,
            inviter=clean_inviter,
            invitee=clean_invitee,
            status="pending",
            created_at=now,
        )
        db.add(new_invite)
        db.commit()
        return InviteResponse(
            direct_added=False,
            message=f"Invitation sent to @{clean_invitee}. It will appear in their pending requests.",
        )

@router.post("/{invite_id}/respond")
def respond_invite(
    invite_id: str,
    payload: InviteAction,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept or decline a pending board invitation."""
    invite = db.query(InviteModel).filter(InviteModel.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if invite.invitee.lower() != current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to respond to this invite")

    if payload.accept:
        invite.status = "accepted"
        # Add to board members
        existing = (
            db.query(BoardMemberModel)
            .filter(
                BoardMemberModel.board_id == invite.board_id,
                BoardMemberModel.username == current_user,
            )
            .first()
        )
        if not existing:
            db.add(BoardMemberModel(
                id=f"{invite.board_id}_{current_user}",
                board_id=invite.board_id,
                username=current_user,
                role="member",
                permission="edit",
            ))
        db.commit()
        return {"status": "accepted", "message": f"Accepted invitation to join {invite.board_name}"}
    else:
        invite.status = "declined"
        db.commit()
        return {"status": "declined", "message": f"Declined invitation to join {invite.board_name}"}
