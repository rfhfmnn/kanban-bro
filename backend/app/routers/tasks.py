import json
import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import BoardModel, TaskCommentModel, TaskModel
from app.models.schemas import (
    ColumnStatus,
    CommentCreate,
    Priority,
    Task,
    TaskComment,
    TaskCreate,
    TaskMove,
    TaskUpdate,
    TaskWithBoardName,
)
from app.routers.boards import get_board_or_404, verify_board_access

router = APIRouter(tags=["Tasks"])

def get_task_or_404(task_id: str, db: Session) -> TaskModel:
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task

def format_task(task: TaskModel) -> Task:
    comments = [
        TaskComment(
            id=c.id,
            task_id=c.task_id,
            author=c.author,
            text=c.text,
            type=c.type,
            created_at=c.created_at,
        )
        for c in task.comments
    ]
    return Task(
        id=task.id,
        board_id=task.board_id,
        title=task.title,
        description=task.description or "",
        priority=Priority(task.priority),
        due_date=task.due_date or "",
        assignee=task.assignee or "",
        labels=task.labels,
        url=task.url or "",
        status=ColumnStatus(task.status),
        order=task.order,
        comments=comments,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )

@router.get("/api/boards/{board_id}/tasks", response_model=List[Task])
def list_board_tasks(
    board_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tasks for a board, ordered by column sequence."""
    board = get_board_or_404(board_id, db)
    verify_board_access(board, current_user)

    tasks = (
        db.query(TaskModel)
        .filter(TaskModel.board_id == board_id)
        .order_by(TaskModel.order.asc())
        .all()
    )
    return [format_task(t) for t in tasks]

@router.post("/api/boards/{board_id}/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(
    board_id: str,
    payload: TaskCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create task on a board. Requires Edit permission."""
    board = get_board_or_404(board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required to create tasks")

    same_col_count = (
        db.query(TaskModel)
        .filter(TaskModel.board_id == board_id, TaskModel.status == payload.status.value)
        .count()
    )

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    task_id = f"task-{int(time.time() * 1000)}"

    new_task = TaskModel(
        id=task_id,
        board_id=board_id,
        title=payload.title.strip(),
        description=payload.description or "",
        priority=payload.priority.value,
        due_date=payload.due_date or "",
        assignee=payload.assignee or "",
        labels_json=json.dumps(payload.labels or []),
        url=payload.url or "",
        status=payload.status.value,
        order=same_col_count,
        created_at=now,
        updated_at=now,
    )
    db.add(new_task)

    # Initial activity log comment
    init_comment = TaskCommentModel(
        id=f"c-{int(time.time() * 1000)}-init",
        task_id=task_id,
        author=current_user,
        text="Created the task",
        type="activity",
        created_at=now,
    )
    db.add(init_comment)

    db.commit()
    db.refresh(new_task)
    return format_task(new_task)

@router.get("/api/tasks", response_model=List[TaskWithBoardName])
def list_user_tasks(
    assignee: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tasks assigned to a user across all boards ('My Tasks')."""
    target = assignee.strip().lower() if assignee else current_user

    user_tasks = (
        db.query(TaskModel)
        .filter(TaskModel.assignee == target)
        .all()
    )

    boards = db.query(BoardModel).all()
    board_map = {b.id: b.name for b in boards}

    result = []
    for t in user_tasks:
        base = format_task(t)
        board_name = board_map.get(t.board_id, "Unknown Board")
        result.append(TaskWithBoardName(**base.model_dump(), boardName=board_name))

    result.sort(key=lambda x: x.due_date if x.due_date else "9999-99-99")
    return result

@router.patch("/api/tasks/{task_id}", response_model=Task)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update task fields. Requires Edit permission."""
    task = get_task_or_404(task_id, db)
    board = get_board_or_404(task.board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.description is not None:
        task.description = payload.description.strip()
    if payload.priority is not None:
        if payload.priority.value != task.priority:
            db.add(TaskCommentModel(
                id=f"c-{int(time.time() * 1000)}-pri",
                task_id=task_id,
                author=current_user,
                text=f"Changed priority to {payload.priority.value}",
                type="activity",
                created_at=now,
            ))
        task.priority = payload.priority.value
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.assignee is not None:
        if payload.assignee != task.assignee:
            db.add(TaskCommentModel(
                id=f"c-{int(time.time() * 1000)}-assign",
                task_id=task_id,
                author=current_user,
                text=f"Reassigned from @{task.assignee or 'none'} to @{payload.assignee}",
                type="activity",
                created_at=now,
            ))
        task.assignee = payload.assignee
    if payload.labels is not None:
        task.labels = payload.labels
    if payload.url is not None:
        task.url = payload.url
    if payload.status is not None:
        if payload.status.value != task.status:
            db.add(TaskCommentModel(
                id=f"c-{int(time.time() * 1000)}-status",
                task_id=task_id,
                author=current_user,
                text=f"Moved status to {payload.status.value}",
                type="activity",
                created_at=now,
            ))
        task.status = payload.status.value

    task.updated_at = now
    db.commit()
    db.refresh(task)
    return format_task(task)

@router.patch("/api/tasks/{task_id}/move", response_model=Task)
def move_task(
    task_id: str,
    payload: TaskMove,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Move and reorder task across columns."""
    task = get_task_or_404(task_id, db)
    board = get_board_or_404(task.board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if payload.status.value != task.status:
        db.add(TaskCommentModel(
            id=f"c-{int(time.time() * 1000)}-dnd",
            task_id=task_id,
            author=current_user,
            text=f"Moved task to {payload.status.value}",
            type="activity",
            created_at=now,
        ))

    task.status = payload.status.value
    task.order = payload.order
    task.updated_at = now

    # Re-index siblings in target column
    col_tasks = (
        db.query(TaskModel)
        .filter(
            TaskModel.board_id == task.board_id,
            TaskModel.status == payload.status.value,
            TaskModel.id != task_id,
        )
        .order_by(TaskModel.order.asc())
        .all()
    )
    col_tasks.insert(min(payload.order, len(col_tasks)), task)

    for idx, t in enumerate(col_tasks):
        t.order = idx

    db.commit()
    db.refresh(task)
    return format_task(task)

@router.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete task. Requires Edit permission."""
    task = get_task_or_404(task_id, db)
    board = get_board_or_404(task.board_id, db)
    member = verify_board_access(board, current_user)
    if member["permission"] != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Edit permission required")

    db.delete(task)
    db.commit()
    return None

@router.post("/api/tasks/{task_id}/comments", response_model=TaskComment, status_code=status.HTTP_201_CREATED)
def add_comment(
    task_id: str,
    payload: CommentCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a user comment to a task."""
    task = get_task_or_404(task_id, db)
    board = get_board_or_404(task.board_id, db)
    verify_board_access(board, current_user)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    author = payload.author if payload.author else current_user

    comment = TaskCommentModel(
        id=f"c-{int(time.time() * 1000)}",
        task_id=task_id,
        author=author,
        text=payload.text.strip(),
        type="comment",
        created_at=now,
    )
    db.add(comment)
    task.updated_at = now

    db.commit()
    db.refresh(comment)
    return TaskComment(
        id=comment.id,
        task_id=comment.task_id,
        author=comment.author,
        text=comment.text,
        type=comment.type,
        created_at=comment.created_at,
    )
