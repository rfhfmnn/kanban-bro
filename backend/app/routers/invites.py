import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user
from app.db.mock_db import db
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
):
    """List pending invitations for a user."""
    target_user = username.strip().lower() if username else current_user

    with db._lock:
        user_invites = [
            i for i in db.invites
            if i["invitee"].lower() == target_user and i["status"] == "pending"
        ]
        return [Invite(**i) for i in user_invites]

@router.post("", response_model=InviteResponse)
def send_invite(
    payload: InviteSend,
    current_user: str = Depends(get_current_user),
):
    """Send invitation to join a board. Directly adds member if caller is Owner/Admin."""
    clean_invitee = payload.invitee.strip().lower()
    clean_inviter = payload.inviter.strip().lower() or current_user

    with db._lock:
        board = get_board_or_404(payload.board_id)
        caller_member = verify_board_access(board, current_user)

        # Check if already member
        if any(m["username"].lower() == clean_invitee for m in board["members"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"@{clean_invitee} is already a member of this board.",
            )

        is_owner = board["owner"] == current_user
        is_admin = caller_member.get("role") == BoardRole.admin or caller_member.get("role") == "admin"

        if is_owner or is_admin:
            # Direct addition per spec
            board["members"].append({
                "username": clean_invitee,
                "role": "member",
                "permission": "edit",
            })
            return InviteResponse(
                direct_added=True,
                message=f"Added @{clean_invitee} directly as a member.",
            )
        else:
            # Member invite -> pending request
            existing_invite = next(
                (i for i in db.invites if i["board_id"] == payload.board_id and i["invitee"].lower() == clean_invitee and i["status"] == "pending"),
                None,
            )
            if existing_invite:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An invitation has already been sent to @{clean_invitee}.",
                )

            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            new_invite = {
                "id": f"inv-{int(time.time() * 1000)}",
                "board_id": payload.board_id,
                "board_name": board["name"],
                "inviter": clean_inviter,
                "invitee": clean_invitee,
                "status": "pending",
                "created_at": now,
            }
            db.invites.append(new_invite)
            return InviteResponse(
                direct_added=False,
                message=f"Invitation sent to @{clean_invitee}. It will appear in their pending requests.",
            )

@router.post("/{invite_id}/respond")
def respond_invite(
    invite_id: str,
    payload: InviteAction,
    current_user: str = Depends(get_current_user),
):
    """Accept or decline a pending board invitation."""
    with db._lock:
        invite = next((i for i in db.invites if i["id"] == invite_id), None)
        if not invite:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

        if invite["invitee"].lower() != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to respond to this invite")

        if payload.accept:
            invite["status"] = "accepted"
            # Add to board members
            board = next((b for b in db.boards if b["id"] == invite["board_id"]), None)
            if board and not any(m["username"].lower() == current_user for m in board["members"]):
                board["members"].append({
                    "username": current_user,
                    "role": "member",
                    "permission": "edit",
                })
            return {"status": "accepted", "message": f"Accepted invitation to join {invite['board_name']}"}
        else:
            invite["status"] = "declined"
            return {"status": "declined", "message": f"Declined invitation to join {invite['board_name']}"}
