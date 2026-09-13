import json
from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserModel(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    avatar_color = Column(String, nullable=False, default="#6366f1")

class BoardModel(Base):
    __tablename__ = "boards"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    owner = Column(String, nullable=False, index=True)
    created_at = Column(String, nullable=False)

    columns = relationship(
        "BoardColumnModel",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardColumnModel.id",
    )
    members = relationship(
        "BoardMemberModel",
        back_populates="board",
        cascade="all, delete-orphan",
    )
    labels = relationship(
        "BoardLabelModel",
        back_populates="board",
        cascade="all, delete-orphan",
    )
    tasks = relationship(
        "TaskModel",
        back_populates="board",
        cascade="all, delete-orphan",
    )

class BoardColumnModel(Base):
    __tablename__ = "board_columns"

    id = Column(String, primary_key=True, index=True) # e.g. board-1_todo
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    column_key = Column(String, nullable=False) # 'todo', 'in_progress', 'done'
    name = Column(String, nullable=False)

    board = relationship("BoardModel", back_populates="columns")

class BoardMemberModel(Base):
    __tablename__ = "board_members"

    id = Column(String, primary_key=True, index=True)
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    username = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False, default="member") # 'owner', 'admin', 'member'
    permission = Column(String, nullable=False, default="edit") # 'edit', 'view'

    board = relationship("BoardModel", back_populates="members")

class BoardLabelModel(Base):
    __tablename__ = "board_labels"

    id = Column(String, primary_key=True, index=True)
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=False, default="#6366f1")

    board = relationship("BoardModel", back_populates="labels")

class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    priority = Column(String, nullable=False, default="Medium")
    due_date = Column(String, default="")
    assignee = Column(String, default="", index=True)
    labels_json = Column(Text, default="[]")
    url = Column(String, default="")
    status = Column(String, nullable=False, default="todo") # 'todo', 'in_progress', 'done'
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    board = relationship("BoardModel", back_populates="tasks")
    comments = relationship(
        "TaskCommentModel",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="TaskCommentModel.created_at",
    )

    @property
    def labels(self):
        try:
            return json.loads(self.labels_json) if self.labels_json else []
        except Exception:
            return []

    @labels.setter
    def labels(self, value):
        self.labels_json = json.dumps(value or [])

class TaskCommentModel(Base):
    __tablename__ = "task_comments"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    author = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    type = Column(String, nullable=False, default="comment") # 'comment', 'activity'
    created_at = Column(String, nullable=False)

    task = relationship("TaskModel", back_populates="comments")

class InviteModel(Base):
    __tablename__ = "invites"

    id = Column(String, primary_key=True, index=True)
    board_id = Column(String, nullable=False, index=True)
    board_name = Column(String, nullable=False)
    inviter = Column(String, nullable=False)
    invitee = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending") # 'pending', 'accepted', 'declined'
    created_at = Column(String, nullable=False)
