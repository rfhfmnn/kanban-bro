import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  Tag,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type {
  BoardColumn,
  BoardLabel,
  ColumnStatus,
  Priority,
  Task,
  User,
} from '../../types';
import { Modal } from '../ui/Modal';
import { PriorityBadge } from '../ui/PriorityBadge';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null; // null if creating new task
  boardId: string;
  defaultStatus?: ColumnStatus;
  columns: BoardColumn[];
  boardLabels: BoardLabel[];
  boardUsers: User[];
  canEdit: boolean;
  onSaveTask: (taskData: Partial<Task>) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onAddComment?: (taskId: string, text: string) => Promise<void>;
  onAddNewUserInline: (username: string, name: string) => Promise<User>;
  onAddNewLabelInline: (name: string, color: string) => Promise<BoardLabel>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  boardId,
  defaultStatus = 'todo',
  columns,
  boardLabels,
  boardUsers,
  canEdit,
  onSaveTask,
  onDeleteTask,
  onAddComment,
  onAddNewUserInline,
  onAddNewLabelInline,
}) => {


  // Form states
  const [title, setTitle] = useState(task ? task.title : '');
  const [description, setDescription] = useState(task ? task.description : '');
  const [status, setStatus] = useState<ColumnStatus>(
    task ? task.status : defaultStatus
  );
  const [priority, setPriority] = useState<Priority>(task ? task.priority : 'Medium');
  const [dueDate, setDueDate] = useState(task ? task.due_date : '');
  const [assignee, setAssignee] = useState(task ? task.assignee : '');
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    task ? task.labels : []
  );
  const [url, setUrl] = useState(task?.url || '');

  // Inline user addition state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [inlineUsername, setInlineUsername] = useState('');
  const [inlineName, setInlineName] = useState('');

  // Inline label addition state
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [inlineLabelName, setInlineLabelName] = useState('');
  const [inlineLabelColor, setInlineLabelColor] = useState('#6366f1');

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [saving, setSaving] = useState(false);

  // Sync state if task changes
  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date);
      setAssignee(task.assignee);
      setSelectedLabels(task.labels || []);
      setUrl(task.url || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('Medium');
      setDueDate('');
      setAssignee('');
      setSelectedLabels([]);
      setUrl('');
    }
  }, [task, defaultStatus, isOpen]);

  const handleToggleLabel = (labelId: string) => {
    if (!canEdit) return;
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter((id) => id !== labelId));
    } else {
      setSelectedLabels([...selectedLabels, labelId]);
    }
  };

  const handleCreateInlineUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineUsername.trim()) return;
    try {
      const newUser = await onAddNewUserInline(inlineUsername, inlineName);
      setAssignee(newUser.username);
      setInlineUsername('');
      setInlineName('');
      setIsAddingUser(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInlineLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineLabelName.trim()) return;
    try {
      const newLabel = await onAddNewLabelInline(inlineLabelName, inlineLabelColor);
      setSelectedLabels([...selectedLabels, newLabel.id]);
      setInlineLabelName('');
      setIsAddingLabel(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSaveTask({
        board_id: boardId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        due_date: dueDate,
        assignee,
        labels: selectedLabels,
        url: url.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !task || !onAddComment) return;
    try {
      await onAddComment(task.id, commentText.trim());
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDeleteTask) return;
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      await onDeleteTask(task.id);
      onClose();
    }
  };

  const colorPalette = [
    '#6366f1',
    '#ec4899',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#8b5cf6',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-slate-100">
            {task ? 'Task Details' : 'Create New Task'}
          </span>
          {task && <PriorityBadge priority={task.priority} size="sm" />}
        </div>
      }
    >
      <div className="space-y-5">
        {/* View-only banner */}
        {!canEdit && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You have view-only access to this board. Editing is disabled.</span>
          </div>
        )}

        {/* Tab Switcher for existing tasks */}
        {task && (
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'details'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Task Information
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'activity'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Activity & Comments ({task.comments?.length || 0})</span>
            </button>
          </div>
        )}

        {activeTab === 'details' ? (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                placeholder="What needs to be done?"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                required
              />
            </div>

            {/* Status & Priority & Due Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ColumnStatus)}
                  disabled={!canEdit}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  disabled={!canEdit}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                placeholder="Add more details, acceptance criteria, or context..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            {/* Assignee Selection + Inline Add User */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Assignee
                </label>
                {canEdit && !isAddingUser && (
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <UserPlus className="w-3 h-3" />
                    + Add new user
                  </button>
                )}
              </div>

              {isAddingUser ? (
                <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/40 space-y-2 mb-2">
                  <div className="text-[11px] font-semibold text-indigo-300">
                    Register New User Inline
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Username *"
                      value={inlineUsername}
                      onChange={(e) => setInlineUsername(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(false)}
                      className="px-2.5 py-1 text-[11px] text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateInlineUser}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Save & Assign
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {boardUsers.map((u) => (
                    <option key={u.username} value={u.username}>
                      @{u.username} ({u.name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Labels Selection + Inline Add Label */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Labels
                </label>
                {canEdit && !isAddingLabel && (
                  <button
                    type="button"
                    onClick={() => setIsAddingLabel(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Tag className="w-3 h-3" />
                    + Add new label
                  </button>
                )}
              </div>

              {isAddingLabel ? (
                <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/40 space-y-2 mb-2">
                  <div className="text-[11px] font-semibold text-indigo-300">
                    Create New Board Label
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Label name (e.g. Infrastructure)"
                      value={inlineLabelName}
                      onChange={(e) => setInlineLabelName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <div className="flex items-center gap-1">
                      {colorPalette.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setInlineLabelColor(c)}
                          className={`w-5 h-5 rounded-full border ${
                            inlineLabelColor === c
                              ? 'border-white scale-110 ring-1 ring-white'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingLabel(false)}
                      className="px-2.5 py-1 text-[11px] text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateInlineLabel}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Create & Tag
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                {boardLabels.map((lbl) => {
                  const isSelected = selectedLabels.includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      onClick={() => handleToggleLabel(lbl.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'ring-1 ring-white/30 font-semibold'
                          : 'opacity-40 hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: `${lbl.color}25`,
                        borderColor: lbl.color,
                        color: lbl.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: lbl.color }}
                      />
                      <span>{lbl.name}</span>
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional URL Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Link / Reference URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://github.com/... or Figma link"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {task && canEdit ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Task
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800"
                >
                  Close
                </button>
                {canEdit && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
                  </button>
                )}
              </div>
            </div>
          </form>
        ) : (
          /* Activity Log & Comments Tab */
          <div className="space-y-4">
            {/* Comment composer */}
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment or note..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3 h-3" />
                Post
              </button>
            </form>

            {/* Activity stream */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(task?.comments || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No comments or activity logged yet.
                </p>
              ) : (
                [...(task?.comments || [])].reverse().map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      c.type === 'activity'
                        ? 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                        : 'bg-slate-900 border-slate-700/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {c.type === 'activity' ? (
                          <Activity className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                        )}
                        <span className="font-semibold text-slate-300">
                          @{c.author}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="pl-4">{c.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
