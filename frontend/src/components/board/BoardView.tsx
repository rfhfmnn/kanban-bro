import React, { useEffect, useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Lock,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type {
  Board,
  ColumnStatus,
  Task,
  TaskFilterOptions,
} from '../../types';
import { UserAvatar } from '../ui/UserAvatar';
import { BoardFilters } from './BoardFilters';
import { Column } from './Column';
import { MembersModal } from './MembersModal';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

interface BoardViewProps {
  boardId: string;
  onBackToDashboard: () => void;
  openTaskId?: string | null;
  onClearOpenTask?: () => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  boardId,
  onBackToDashboard,
  openTaskId,
  onClearOpenTask,
}) => {
  const { currentUser, allUsers, refreshUsers } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Dragging State for DnD Overlay
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [defaultNewTaskColumn, setDefaultNewTaskColumn] = useState<ColumnStatus>('todo');
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<TaskFilterOptions>({
    searchQuery: '',
    assignee: '',
    labelId: '',
    priority: '',
    dueDateFilter: 'all',
  });

  // DnD Sensors configuration (distance: 5px allows smooth clicks without triggering drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchBoardData = async () => {
    try {
      const [b, t] = await Promise.all([
        api.boards.get(boardId),
        api.tasks.list(boardId),
      ]);
      setBoard(b);
      setTasks(t);

      // If openTaskId passed in props, open that task modal directly
      if (openTaskId) {
        const target = t.find((item) => item.id === openTaskId);
        if (target) {
          setSelectedTask(target);
          setIsTaskModalOpen(true);
        }
      }
    } catch (e) {
      console.error('Failed to load board data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  if (!currentUser) return null;

  // Determine user permissions for this board
  const isOwner = board?.owner === currentUser.username;
  const currentMember = board?.members.find((m) => m.username === currentUser.username);
  const isAdmin = currentMember?.role === 'admin';
  const canEdit = isOwner || currentMember?.permission === 'edit';

  // Handlers for Column renaming
  const handleUpdateColumnName = async (columnId: ColumnStatus, newName: string) => {
    if (!canEdit || !board) return;
    try {
      const updated = await api.boards.updateColumnName(board.id, columnId, newName);
      setBoard(updated);
    } catch (e) {
      console.error('Failed to update column name', e);
    }
  };

  // Task operations
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!canEdit || !board) return;
    if (selectedTask) {
      // Update existing
      const updated = await api.tasks.update(
        selectedTask.id,
        taskData,
        currentUser.username
      );
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // Create new
      const created = await api.tasks.create(
        {
          board_id: board.id,
          title: taskData.title || 'Untitled Task',
          description: taskData.description || '',
          priority: taskData.priority || 'Medium',
          due_date: taskData.due_date || '',
          assignee: taskData.assignee || '',
          labels: taskData.labels || [],
          url: taskData.url || '',
          status: taskData.status || defaultNewTaskColumn,
        },
        currentUser.username
      );
      setTasks((prev) => [...prev, created]);
    }
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!canEdit) return;
    await api.tasks.delete(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleAddComment = async (taskId: string, text: string) => {
    const comment = await api.tasks.addComment(taskId, currentUser.username, text);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, comments: [...(t.comments || []), comment] };
        }
        return t;
      })
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) =>
        prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null
      );
    }
  };

  // Fallback direct status mover
  const handleMoveStatus = async (taskId: string, newStatus: ColumnStatus) => {
    if (!canEdit) return;
    const sameCol = tasks.filter((t) => t.status === newStatus);
    const updated = await api.tasks.move(taskId, newStatus, sameCol.length, currentUser.username);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  // Inline user / label creators from modal
  const handleAddNewUserInline = async (username: string, name: string) => {
    const newUser = await api.users.create(username, name);
    await refreshUsers();
    // Add to board members as well
    if (board && !board.members.some((m) => m.username === newUser.username)) {
      await api.invites.send(board.id, currentUser.username, newUser.username);
      await fetchBoardData();
    }
    return newUser;
  };

  const handleAddNewLabelInline = async (name: string, color: string) => {
    if (!board) throw new Error('No active board');
    const newLabel = await api.boards.addLabel(board.id, { name, color });
    await fetchBoardData();
    return newLabel;
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    if (!canEdit) return;
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dragging over a Column container
    const isOverColumn = ['todo', 'in_progress', 'done'].includes(overId);

    if (isOverColumn) {
      const targetColumn = overId as ColumnStatus;
      if (activeTask.status !== targetColumn) {
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, status: targetColumn } : t))
        );
      }
      return;
    }

    // Dragging over another Task card
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: overTask.status } : t))
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    if (!canEdit) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    let targetStatus = task.status;
    let newIndex = 0;

    if (['todo', 'in_progress', 'done'].includes(overId)) {
      targetStatus = overId as ColumnStatus;
      const colTasks = tasks.filter((t) => t.status === targetStatus);
      newIndex = colTasks.length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        const colTasks = tasks.filter((t) => t.status === targetStatus);
        newIndex = colTasks.findIndex((t) => t.id === overId);
        if (newIndex === -1) newIndex = 0;
      }
    }

    try {
      await api.tasks.move(activeId, targetStatus, newIndex, currentUser.username);
      await fetchBoardData();
    } catch (e) {
      console.error('Failed to persist task move', e);
    }
  };

  // Filter logic
  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Assignee
      if (filters.assignee && task.assignee !== filters.assignee) {
        return false;
      }

      // Label
      if (filters.labelId && !task.labels.includes(filters.labelId)) {
        return false;
      }

      // Priority
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      // Due Date
      if (filters.dueDateFilter !== 'all') {
        const isDone = task.status === 'done';
        const isOverdue = task.due_date && task.due_date < today && !isDone;
        const isToday = task.due_date === today;

        if (filters.dueDateFilter === 'overdue' && !isOverdue) return false;
        if (filters.dueDateFilter === 'today' && !isToday) return false;
        if (filters.dueDateFilter === 'upcoming' && (!task.due_date || task.due_date <= today))
          return false;
      }

      return true;
    });
  }, [tasks, filters, today]);

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    Boolean(filters.assignee) ||
    Boolean(filters.labelId) ||
    Boolean(filters.priority) ||
    filters.dueDateFilter !== 'all';

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      assignee: '',
      labelId: '',
      priority: '',
      dueDateFilter: 'all',
    });
  };

  if (loading || !board) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
        <p className="text-sm">Loading board workspace...</p>
      </div>
    );
  }

  // Get users registered to this board
  const registeredBoardUsers = allUsers.filter((u) =>
    board.members.some((m) => m.username.toLowerCase() === u.username.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Board Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              {board.name}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isOwner
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : isAdmin
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : canEdit
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isOwner
                ? 'Owner'
                : isAdmin
                ? 'Admin'
                : canEdit
                ? 'Member (Edit)'
                : 'Member (View Only)'}
            </span>
          </div>

          {board.description && (
            <p className="text-xs text-slate-400 pl-9 max-w-2xl leading-relaxed">
              {board.description}
            </p>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Members button */}
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-all shadow-sm"
          >
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {board.members.slice(0, 3).map((m) => (
                <UserAvatar
                  key={m.username}
                  username={m.username}
                  size="xs"
                  className="ring-1 ring-slate-900"
                />
              ))}
            </div>
            <span>{board.members.length} Members</span>
          </button>

          {/* New Task Button */}
          {canEdit && (
            <button
              onClick={() => {
                setSelectedTask(null);
                setDefaultNewTaskColumn('todo');
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* View-Only Alert Banner */}
      {!canEdit && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            You have <strong>View-Only</strong> permissions on this board. You can browse tasks, comments, and filters, but editing and drag-and-drop are restricted.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <BoardFilters
        filters={filters}
        onChange={setFilters}
        labels={board.labels}
        members={registeredBoardUsers}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      />

      {/* Drag and Drop Canvas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 items-start">
          {board.columns.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);

            return (
              <Column
                key={column.id}
                column={column}
                tasks={columnTasks}
                allLabels={board.labels}
                allUsers={allUsers}
                canEdit={canEdit}
                onUpdateColumnName={handleUpdateColumnName}
                onSelectTask={(task) => {
                  setSelectedTask(task);
                  setIsTaskModalOpen(true);
                }}
                onAddTask={(colId) => {
                  setSelectedTask(null);
                  setDefaultNewTaskColumn(colId);
                  setIsTaskModalOpen(true);
                }}
                onMoveStatus={handleMoveStatus}
              />
            );
          })}
        </div>

        {/* Drag Overlay during active dragging */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105 shadow-2xl">
              <TaskCard
                task={activeTask}
                allLabels={board.labels}
                allUsers={allUsers}
                canEdit={canEdit}
                onSelect={() => {}}
                onMoveStatus={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
          if (onClearOpenTask) onClearOpenTask();
        }}
        task={selectedTask}
        boardId={board.id}
        defaultStatus={defaultNewTaskColumn}
        columns={board.columns}
        boardLabels={board.labels}
        boardUsers={registeredBoardUsers}
        canEdit={canEdit}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onAddComment={handleAddComment}
        onAddNewUserInline={handleAddNewUserInline}
        onAddNewLabelInline={handleAddNewLabelInline}
      />

      {/* Members & Permissions Modal */}
      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        board={board}
        allKnownUsers={allUsers}
        onBoardUpdated={fetchBoardData}
        onBoardDeleted={onBackToDashboard}
      />
    </div>
  );
};
