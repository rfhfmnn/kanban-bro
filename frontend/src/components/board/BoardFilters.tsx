import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
import type { BoardLabel, TaskFilterOptions, User } from '../../types';

interface BoardFiltersProps {
  filters: TaskFilterOptions;
  onChange: (filters: TaskFilterOptions) => void;
  labels: BoardLabel[];
  members: User[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

export const BoardFilters: React.FC<BoardFiltersProps> = ({
  filters,
  onChange,
  labels,
  members,
  hasActiveFilters,
  onReset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Assignee Filter */}
      <select
        value={filters.assignee}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="">All Assignees</option>
        {members.map((m) => (
          <option key={m.username} value={m.username}>
            @{m.username} ({m.name})
          </option>
        ))}
      </select>

      {/* Label Filter */}
      <select
        value={filters.labelId}
        onChange={(e) => onChange({ ...filters, labelId: e.target.value })}
        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="">All Labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      {/* Priority Filter */}
      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="">All Priorities</option>
        <option value="High">High Priority</option>
        <option value="Medium">Medium Priority</option>
        <option value="Low">Low Priority</option>
      </select>

      {/* Due Date Filter */}
      <select
        value={filters.dueDateFilter}
        onChange={(e) =>
          onChange({
            ...filters,
            dueDateFilter: e.target.value as TaskFilterOptions['dueDateFilter'],
          })
        }
        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="all">All Dates</option>
        <option value="overdue">🚨 Overdue Only</option>
        <option value="today">📅 Due Today</option>
        <option value="upcoming">🗓️ Upcoming</option>
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
          title="Reset all filters"
        >
          <RotateCcw className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
};
