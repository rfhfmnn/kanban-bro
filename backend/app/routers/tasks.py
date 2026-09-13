import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user
from app.db.mock_db import db
from app.models.schemas import (
    CommentCreate,
    Task,
    TaskComment,
    TaskCreate,
    TaskMove,
    TaskUpdate,
    TaskWithBoardName,
)
from app.routers.boards import get_board_or_404, verify_board_access

router = APIRouter(tags=["Tasks"])

def get_task_or_404(task_id: str) -> dict:
    task = next((t for t in db.tasks if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task

@router.get("/api/boards/{board_id}/tasks", response_model=List[Task])
def list_board_tasks(
    board_id: str,
    current_user: str = Depends(get_current_user),
):
    """List tasks for a board, ordered by position."""
    with db._lock:
        board = get_board_or_404(board_id)
        verify_board_access(board, current_user)

        board_tasks = [t for t in db.tasks if t["board_id"] == board_id]
        board_tasks.sort(key=lambda x: x.get("order", 0))
        return [Task(**t) for t in board_tasks]

@router.post("/api/boards/{board_id}/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(
    board_id: str,
    payload: TaskCreate,
    current_user: str = Depends(get_current_user),
):
    """Create task on a board. Requires Edit permission."""
    with db._lock:
        board = get_board_or_404(board_id)
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required to create tasks")

        same_col = [t for t in db.tasks if t["board_id"] == board_id and t["status"] == payload.status.value]
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        task_id = f"task-{int(time.time() * 1000)}"

        new_task = {
            "id": task_id,
            "board_id": board_id,
            "title": payload.title.strip(),
            "description": payload.description or "",
            "priority": payload.priority.value,
            "due_date": payload.due_date or "",
            "assignee": payload.assignee or "",
            "labels": payload.labels or [],
            "url": payload.url or "",
            "status": payload.status.value,
            "order": len(same_col),
            "comments": [
                {
                    "id": f"c-{int(time.time() * 1000)}-init",
                    "task_id": task_id,
                    "author": current_user,
                    "text": "Created the task",
                    "type": "activity",
                    "created_at": now,
                }
            ],
            "created_at": now,
            "updated_at": now,
        }
        db.tasks.append(new_task)
        return Task(**new_task)

@router.get("/api/tasks", response_model=List[TaskWithBoardName])
def list_user_tasks(
    assignee: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user),
):
    """List tasks assigned to a user across all boards ('My Tasks')."""
    target = assignee.strip().lower() if assignee else current_user

    with db._lock:
        board_names = {b["id"]: b["name"] for b in db.boards}
        user_tasks = [t for t in db.tasks if t["assignee"].lower() == target]

        result = []
        for t in user_tasks:
            board_name = board_names.get(t["board_id"], "Unknown Board")
            result.append(TaskWithBoardName(**t, boardName=board_name))

        result.sort(key=lambda x: x.due_date if x.due_date else "9999-99-99")
        return result

@router.patch("/api/tasks/{task_id}", response_model=Task)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: str = Depends(get_current_user),
):
    """Update task fields. Requires Edit permission."""
    with db._lock:
        task = get_task_or_404(task_id)
        board = get_board_or_404(task["board_id"])
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if payload.title is not None:
            task["title"] = payload.title.strip()
        if payload.description is not None:
            task["description"] = payload.description.strip()
        if payload.priority is not None:
            if payload.priority.value != task["priority"]:
                task["comments"].append({
                    "id": f"c-{int(time.time() * 1000)}-pri",
                    "task_id": task_id,
                    "author": current_user,
                    "text": f"Changed priority to {payload.priority.value}",
                    "type": "activity",
                    "created_at": now,
                })
            task["priority"] = payload.priority.value
        if payload.due_date is not None:
            task["due_date"] = payload.due_date
        if payload.assignee is not None:
            if payload.assignee != task["assignee"]:
                task["comments"].append({
                    "id": f"c-{int(time.time() * 1000)}-assign",
                    "task_id": task_id,
                    "author": current_user,
                    "text": f"Reassigned from @{task['assignee'] or 'none'} to @{payload.assignee}",
                    "type": "activity",
                    "created_at": now,
                })
            task["assignee"] = payload.assignee
        if payload.labels is not None:
            task["labels"] = payload.labels
        if payload.url is not None:
            task["url"] = payload.url
        if payload.status is not None:
            if payload.status.value != task["status"]:
                task["comments"].append({
                    "id": f"c-{int(time.time() * 1000)}-status",
                    "task_id": task_id,
                    "author": current_user,
                    "text": f"Moved status to {payload.status.value}",
                    "type": "activity",
                    "created_at": now,
                })
            task["status"] = payload.status.value

        task["updated_at"] = now
        return Task(**task)

@router.patch("/api/tasks/{task_id}/move", response_model=Task)
def move_task(
    task_id: str,
    payload: TaskMove,
    current_user: str = Depends(get_current_user),
):
    """Move and reorder task across columns."""
    with db._lock:
        task = get_task_or_404(task_id)
        board = get_board_or_404(task["board_id"])
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if payload.status.value != task["status"]:
            task["comments"].append({
                "id": f"c-{int(time.time() * 1000)}-dnd",
                "task_id": task_id,
                "author": current_user,
                "text": f"Moved task to {payload.status.value}",
                "type": "activity",
                "created_at": now,
            })

        task["status"] = payload.status.value
        task["order"] = payload.order
        task["updated_at"] = now

        # Re-index siblings in target column
        col_tasks = [t for t in db.tasks if t["board_id"] == task["board_id"] and t["status"] == payload.status.value and t["id"] != task_id]
        col_tasks.sort(key=lambda x: x.get("order", 0))
        col_tasks.insert(min(payload.order, len(col_tasks)), task)

        for idx, t in enumerate(col_tasks):
            t["order"] = idx

        return Task(**task)

@router.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: str = Depends(get_current_user),
):
    """Delete task. Requires Edit permission."""
    with db._lock:
        task = get_task_or_404(task_id)
        board = get_board_or_404(task["board_id"])
        member = verify_board_access(board, current_user)
        if member["permission"] != "edit":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

        db.tasks = [t for t in db.tasks if t["id"] != task_id]
        return None

@router.post("/api/tasks/{task_id}/comments", response_model=TaskComment, status_code=status.HTTP_201_CREATED)
def add_comment(
    task_id: str,
    payload: CommentCreate,
    current_user: str = Depends(get_current_user),
):
    """Add a user comment to a task."""
    with db._lock:
        task = get_task_or_404(task_id)
        board = get_board_or_404(task["board_id"])
        verify_board_access(board, current_user)

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        author = payload.author if payload.author else current_user

        comment = {
            "id": f"c-{int(time.time() * 1000)}",
            "task_id": task_id,
            "author": author,
            "text": payload.text.strip(),
            "type": "comment",
            "created_at": now,
        }
        task["comments"].append(comment)
        task["updated_at"] = now
        return TaskComment(**comment)
