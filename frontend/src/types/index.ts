export type Priority = 'Low' | 'Medium' | 'High';

export type ColumnStatus = 'todo' | 'in_progress' | 'done';

export interface BoardColumn {
  id: ColumnStatus;
  name: string;
}

export interface BoardLabel {
  id: string;
  name: string;
  color: string; // e.g. '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'
}

export interface TaskComment {
  id: string;
  task_id: string;
  author: string; // username
  text: string;
  type: 'comment' | 'activity';
  created_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  title: string;
  description: string;
  priority: Priority;
  due_date: string; // YYYY-MM-DD
  assignee: string; // username
  labels: string[]; // label IDs
  url?: string;
  status: ColumnStatus;
  comments: TaskComment[];
  order: number;
  created_at: string;
  updated_at: string;
}

export type BoardRole = 'owner' | 'admin' | 'member';
export type BoardPermission = 'edit' | 'view';

export interface BoardMember {
  username: string;
  role: BoardRole;
  permission: BoardPermission;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  owner: string; // username
  columns: BoardColumn[];
  members: BoardMember[];
  labels: BoardLabel[];
  created_at: string;
}

export interface User {
  username: string;
  name: string;
  avatar_color: string;
}

export interface Invite {
  id: string;
  board_id: string;
  board_name: string;
  inviter: string;
  invitee: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface TaskFilterOptions {
  searchQuery: string;
  assignee: string; // '' for all
  labelId: string; // '' for all
  priority: string; // '' for all
  dueDateFilter: 'all' | 'overdue' | 'today' | 'upcoming';
}
