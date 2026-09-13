import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, Edit2, Plus, Sparkles } from 'lucide-react';
import type { BoardColumn, BoardLabel, ColumnStatus, Task, User } from '../../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: BoardColumn;
  tasks: Task[];
  allLabels: BoardLabel[];
  allUsers: User[];
  canEdit: boolean;
  onUpdateColumnName: (columnId: ColumnStatus, newName: string) => Promise<void>;
  onSelectTask: (task: Task) => void;
  onAddTask: (columnId: ColumnStatus) => void;
  onMoveStatus: (taskId: string, newStatus: ColumnStatus) => void;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  tasks,
  allLabels,
  allUsers,
  canEdit,
  onUpdateColumnName,
  onSelectTask,
  onAddTask,
  onMoveStatus,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [colName, setColName] = useState(column.name);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'Column', columnId: column.id },
  });

  const handleSaveName = async () => {
    if (colName.trim() && colName !== column.name) {
      await onUpdateColumnName(column.id, colName.trim());
    }
    setIsEditingName(false);
  };

  const statusAccent = {
    todo: 'border-t-slate-500',
    in_progress: 'border-t-indigo-500',
    done: 'border-t-emerald-500',
  }[column.id];

  return (
    <div
      className={`flex flex-col w-full min-w-[300px] max-w-[380px] bg-slate-900/50 rounded-2xl border border-slate-800/80 border-t-2 ${statusAccent} p-3 shadow-lg flex-1 h-full min-h-[550px] transition-colors ${
        isOver ? 'ring-2 ring-indigo-500/50 bg-slate-900/80' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setColName(column.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="w-full bg-slate-950 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 truncate group">
              <h3 className="text-sm font-bold text-slate-200 tracking-tight truncate">
                {column.name}
              </h3>
              {canEdit && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-slate-300 transition-opacity"
                  title="Rename column"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700 shrink-0">
            {tasks.length}
          </span>
        </div>

        {/* Add Task Button */}
        {canEdit && (
          <button
            onClick={() => onAddTask(column.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={`Add task to ${column.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Task Cards Droppable Area */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1 pb-4 min-h-[300px]"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              allLabels={allLabels}
              allUsers={allUsers}
              canEdit={canEdit}
              onSelect={onSelectTask}
              onMoveStatus={onMoveStatus}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600 border border-dashed border-slate-800/80 rounded-xl text-center p-4 my-auto">
            <Sparkles className="w-5 h-5 mb-2 text-slate-700" />
            <p className="text-xs font-medium text-slate-500">No tasks in {column.name}</p>
            {canEdit && (
              <button
                onClick={() => onAddTask(column.id)}
                className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                + Add a task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
