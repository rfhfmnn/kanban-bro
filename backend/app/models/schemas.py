from datetime import date, datetime
from enum import Enum
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl

# --- Enums ---
class Priority(str, Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"

class ColumnStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"

class BoardRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"

class BoardPermission(str, Enum):
    edit = "edit"
    view = "view"

class InviteStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"

# --- User Schemas ---
class User(BaseModel):
    username: str
    name: str
    avatar_color: str

class UserCreate(BaseModel):
    username: str
    name: Optional[str] = None
    avatar_color: Optional[str] = None

# --- Board Column & Label Schemas ---
class BoardColumn(BaseModel):
    id: ColumnStatus
    name: str

class BoardLabel(BaseModel):
    id: str
    name: str
    color: str

class LabelCreate(BaseModel):
    name: str
    color: str

# --- Board Member Schemas ---
class BoardMember(BaseModel):
    username: str
    role: BoardRole
    permission: BoardPermission

class MemberUpdate(BaseModel):
    role: BoardRole
    permission: BoardPermission

# --- Board Schemas ---
class Board(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner: str
    columns: List[BoardColumn]
    members: List[BoardMember]
    labels: List[BoardLabel]
    created_at: str

class BoardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner: str

class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class BoardCounts(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int

class BoardWithCounts(Board):
    counts: BoardCounts
    currentUserRole: Optional[BoardRole] = None
    currentUserPermission: Optional[BoardPermission] = None

# --- Task Comment Schemas ---
class TaskComment(BaseModel):
    id: str
    task_id: str
    author: str
    text: str
    type: Literal["comment", "activity"]
    created_at: str

class CommentCreate(BaseModel):
    author: Optional[str] = None
    text: str

# --- Task Schemas ---
class Task(BaseModel):
    id: str
    board_id: str
    title: str
    description: str = ""
    priority: Priority
    due_date: str = ""
    assignee: str = ""
    labels: List[str] = []
    url: Optional[str] = ""
    status: ColumnStatus
    comments: List[TaskComment] = []
    order: int
    created_at: str
    updated_at: str

class TaskWithBoardName(Task):
    boardName: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[Priority] = Priority.Medium
    due_date: Optional[str] = ""
    assignee: Optional[str] = ""
    labels: Optional[List[str]] = []
    url: Optional[str] = ""
    status: Optional[ColumnStatus] = ColumnStatus.todo

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    due_date: Optional[str] = None
    assignee: Optional[str] = None
    labels: Optional[List[str]] = None
    url: Optional[str] = None
    status: Optional[ColumnStatus] = None

class TaskMove(BaseModel):
    status: ColumnStatus
    order: int

# --- Invite Schemas ---
class Invite(BaseModel):
    id: str
    board_id: str
    board_name: str
    inviter: str
    invitee: str
    status: InviteStatus
    created_at: str

class InviteSend(BaseModel):
    board_id: str
    inviter: str
    invitee: str

class InviteResponse(BaseModel):
    direct_added: bool
    message: str

class InviteAction(BaseModel):
    accept: bool

# --- Error Schema ---
class ErrorResponse(BaseModel):
    detail: str
