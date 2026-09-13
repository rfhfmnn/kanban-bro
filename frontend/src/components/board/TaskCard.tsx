import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  Calendar,
  ExternalLink,
  GripVertical,
  MessageSquare,
  MoreHorizontal,
  MoveRight,
} from 'lucide-react';
import type { BoardLabel, ColumnStatus, Task, User } from '../../types';
import { LabelPill } from '../ui/LabelPill';
import { PriorityBadge } from '../ui/PriorityBadge';
import { UserAvatar } from '../ui/UserAvatar';

interface TaskCardProps {
  task: Task;
  allLabels: BoardLabel[];
  allUsers: User[];
  canEdit: boolean;
  onSelect: (task: Task) => void;
  onMoveStatus: (taskId: string, newStatus: ColumnStatus) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  allLabels,
  allUsers,
  canEdit,
  onSelect,
  onMoveStatus,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const today = new Date().toISOString().split('T')[0];
  const isDone = task.status === 'done';
  const isOverdue = task.due_date && task.due_date < today && !isDone;

  const taskLabels = allLabels.filter((l) => task.labels.includes(l.id));
  const assigneeUser = allUsers.find(
    (u) => u.username.toLowerCase() === task.assignee.toLowerCase()
  );

  const nextStatuses: { id: ColumnStatus; label: string }[] = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ].filter((s) => s.id !== task.status) as { id: ColumnStatus; label: string }[];

  const commentsCount = (task.comments || []).filter((c) => c.type === 'comment').length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border p-3.5 transition-all duration-150 select-none ${
        isDragging
          ? 'opacity-40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-2xl scale-[1.02] bg-slate-800'
          : isOverdue
          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70 shadow-sm'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850 shadow-sm'
      }`}
    >
      {/* Overdue Alert Banner */}
      {isOverdue && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Overdue ({task.due_date})</span>
        </div>
      )}

      {/* Card Header: Labels + Drag handle / Status dropdown */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1 items-center">
          <PriorityBadge priority={task.priority} size="sm" />
          {taskLabels.slice(0, 2).map((lbl) => (
            <LabelPill key={lbl.id} label={lbl} size="sm" />
          ))}
          {taskLabels.length > 2 && (
            <span className="text-[10px] text-slate-400 font-medium">
              +{taskLabels.length - 2}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Manual Status Changer (Fallback per spec) */}
          {canEdit && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusMenu(!showStatusMenu);
                }}
                className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Change task status (fallback)"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showStatusMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusMenu(false);
                    }}
                  />
                  <div className="absolute right-0 mt-1 w-36 rounded-lg bg-slate-950 border border-slate-700 shadow-xl py-1 z-40">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                      Move To...
                    </div>
                    {nextStatuses.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveStatus(task.id, s.id);
                          setShowStatusMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <MoveRight className="w-3 h-3" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dnd Drag Handle */}
          {canEdit && (
            <div
              {...attributes}
              {...listeners}
              className="p-1 rounded-md text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors"
              title="Drag to reorder or move column"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Task Title & Clickable Area */}
      <div
        onClick={() => onSelect(task)}
        className="cursor-pointer space-y-1.5"
      >
        <h4 className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Card Footer: Assignee, Due Date, Links, Comments */}
      <div
        onClick={() => onSelect(task)}
        className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 cursor-pointer text-slate-400 text-[11px]"
      >
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <UserAvatar
              username={task.assignee}
              name={assigneeUser?.name}
              avatarColor={assigneeUser?.avatar_color}
              size="xs"
            />
          ) : (
            <span className="text-[10px] text-slate-500 italic">Unassigned</span>
          )}

          {task.due_date && (
            <div
              className={`flex items-center gap-1 ${
                isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{task.due_date.slice(5)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-indigo-400 transition-colors"
              title="Open linked URL"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {commentsCount > 0 && (
            <div className="flex items-center gap-0.5 hover:text-slate-300">
              <MessageSquare className="w-3 h-3" />
              <span>{commentsCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
