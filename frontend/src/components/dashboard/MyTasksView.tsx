import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Kanban,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ColumnStatus, Task } from '../../types';
import { PriorityBadge } from '../ui/PriorityBadge';

interface TaskWithBoard extends Task {
  boardName: string;
}

interface MyTasksViewProps {
  onSelectTask: (boardId: string, taskId: string) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({ onSelectTask }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<TaskWithBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'done'>('all');

  useEffect(() => {
    if (!currentUser) return;
    const user = currentUser;
    async function fetchTasks() {
      setLoading(true);
      try {
        const userTasks = await api.tasks.listByUser(user.username);
        setTasks(userTasks);
      } catch (e) {
        console.error('Failed to load user tasks', e);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [currentUser?.username]);

  if (!currentUser) return null;

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    const isDone = t.status === 'done';
    const isOverdue = t.due_date && t.due_date < today && !isDone;

    if (filter === 'done') return isDone;
    if (filter === 'overdue') return isOverdue;
    if (filter === 'pending') return !isDone;
    return true;
  });

  const overdueCount = tasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== 'done'
  ).length;

  const statusLabels: Record<ColumnStatus, { label: string; color: string }> = {
    todo: { label: 'To Do', color: 'bg-slate-800 text-slate-300 border-slate-700' },
    in_progress: {
      label: 'In Progress',
      color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    },
    done: {
      label: 'Done',
      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <ListTodo className="w-6 h-6 text-indigo-400" />
            My Assigned Tasks
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            All tasks currently assigned to @{currentUser.username} across every board.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({tasks.filter((t) => t.status !== 'done').length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Overdue</span>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold">
                {overdueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'done'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Done ({tasks.filter((t) => t.status === 'done').length})
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
          <p className="text-sm">Fetching your tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-300">No tasks found</h4>
          <p className="text-xs text-slate-500 mt-1">
            {filter === 'overdue'
              ? 'Great work! You have no overdue tasks.'
              : 'You have no tasks matching this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'done';
            const isOverdue = task.due_date && task.due_date < today && !isDone;
            const statusConfig = statusLabels[task.status] || statusLabels.todo;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.board_id, task.id)}
                className={`group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isOverdue
                    ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/25">
                      <Kanban className="w-3 h-3" />
                      {task.boardName}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    <PriorityBadge priority={task.priority} size="sm" />
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-md animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1.5 text-xs ${
                        isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{task.due_date}</span>
                    </div>
                  )}

                  <div className="text-slate-400 group-hover:text-slate-200 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
