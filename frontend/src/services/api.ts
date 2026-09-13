import type {
  Board,
  BoardLabel,
  ColumnStatus,
  Invite,
  Task,
  TaskComment,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CURRENT_USER_KEY = 'kanban_bro_current_username';

export interface BoardWithCounts extends Board {
  counts: {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
  };
  currentUserRole?: 'owner' | 'admin' | 'member';
  currentUserPermission?: 'edit' | 'view';
}

function getActiveUsername(): string {
  try {
    return localStorage.getItem(CURRENT_USER_KEY) || '';
  } catch {
    return '';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  customUsername?: string
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const username = customUsername || getActiveUsername();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Username': username,
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // Keep default errorMessage
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Reset all state on the backend to initial defaults
  async resetAll(): Promise<void> {
    await request<void>('/api/reset', { method: 'POST' });
  },

  // USERS
  users: {
    async list(): Promise<User[]> {
      return request<User[]>('/api/users');
    },

    async create(username: string, name: string, avatar_color?: string): Promise<User> {
      return request<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          name: name.trim() || username.trim().toLowerCase(),
          avatar_color,
        }),
      });
    },
  },

  // BOARDS
  boards: {
    async list(username: string): Promise<BoardWithCounts[]> {
      const cleanUser = username.trim().toLowerCase();
      return request<BoardWithCounts[]>(
        `/api/boards?username=${encodeURIComponent(cleanUser)}`,
        {},
        cleanUser
      );
    },

    async get(id: string): Promise<Board | null> {
      try {
        return await request<Board>(`/api/boards/${encodeURIComponent(id)}`);
      } catch (err: any) {
        if (err.message.includes('404')) return null;
        throw err;
      }
    },

    async create(name: string, description: string, ownerUsername: string): Promise<Board> {
      const cleanOwner = ownerUsername.trim().toLowerCase();
      return request<Board>(
        '/api/boards',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            owner: cleanOwner,
          }),
        },
        cleanOwner
      );
    },

    async update(
      id: string,
      updates: Partial<Pick<Board, 'name' | 'description' | 'columns'>>
    ): Promise<Board> {
      return request<Board>(`/api/boards/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    async updateColumnName(
      boardId: string,
      columnId: ColumnStatus,
      newName: string
    ): Promise<Board> {
      return request<Board>(
        `/api/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: newName.trim() }),
        }
      );
    },

    async addLabel(
      boardId: string,
      label: { name: string; color: string }
    ): Promise<BoardLabel> {
      return request<BoardLabel>(
        `/api/boards/${encodeURIComponent(boardId)}/labels`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: label.name.trim(),
            color: label.color,
          }),
        }
      );
    },

    async delete(id: string): Promise<void> {
      await request<void>(`/api/boards/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
  },

  // MEMBERS & PERMISSIONS
  members: {
    async update(
      boardId: string,
      targetUsername: string,
      role: 'admin' | 'member',
      permission: 'edit' | 'view'
    ): Promise<Board> {
      return request<Board>(
        `/api/boards/${encodeURIComponent(boardId)}/members/${encodeURIComponent(targetUsername)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role, permission }),
        }
      );
    },

    async remove(boardId: string, targetUsername: string): Promise<Board> {
      return request<Board>(
        `/api/boards/${encodeURIComponent(boardId)}/members/${encodeURIComponent(targetUsername)}`,
        {
          method: 'DELETE',
        }
      );
    },
  },

  // TASKS
  tasks: {
    async list(boardId: string): Promise<Task[]> {
      return request<Task[]>(`/api/boards/${encodeURIComponent(boardId)}/tasks`);
    },

    async listByUser(username: string): Promise<(Task & { boardName: string })[]> {
      const cleanUser = username.trim().toLowerCase();
      return request<(Task & { boardName: string })[]>(
        `/api/tasks?assignee=${encodeURIComponent(cleanUser)}`,
        {},
        cleanUser
      );
    },

    async create(
      data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'comments' | 'order'>,
      actorUsername?: string
    ): Promise<Task> {
      return request<Task>(
        `/api/boards/${encodeURIComponent(data.board_id)}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: data.title.trim(),
            description: data.description,
            priority: data.priority,
            due_date: data.due_date,
            assignee: data.assignee,
            labels: data.labels,
            url: data.url,
            status: data.status,
          }),
        },
        actorUsername
      );
    },

    async update(
      taskId: string,
      updates: Partial<Omit<Task, 'id' | 'board_id' | 'created_at'>>,
      actorUsername?: string
    ): Promise<Task> {
      return request<Task>(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
        actorUsername
      );
    },

    async move(
      taskId: string,
      newStatus: ColumnStatus,
      newOrder: number,
      actorUsername?: string
    ): Promise<Task> {
      return request<Task>(
        `/api/tasks/${encodeURIComponent(taskId)}/move`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: newStatus,
            order: newOrder,
          }),
        },
        actorUsername
      );
    },

    async delete(taskId: string): Promise<void> {
      await request<void>(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
    },

    async addComment(
      taskId: string,
      author: string,
      text: string
    ): Promise<TaskComment> {
      return request<TaskComment>(
        `/api/tasks/${encodeURIComponent(taskId)}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            author: author.trim().toLowerCase(),
            text: text.trim(),
          }),
        },
        author
      );
    },
  },

  // INVITES
  invites: {
    async list(username: string): Promise<Invite[]> {
      const cleanUser = username.trim().toLowerCase();
      return request<Invite[]>(
        `/api/invites?username=${encodeURIComponent(cleanUser)}`,
        {},
        cleanUser
      );
    },

    async send(
      boardId: string,
      inviterUsername: string,
      inviteeUsername: string
    ): Promise<{ directAdded: boolean; message: string }> {
      const res = await request<{ direct_added: boolean; message: string }>(
        '/api/invites',
        {
          method: 'POST',
          body: JSON.stringify({
            board_id: boardId,
            inviter: inviterUsername.trim().toLowerCase(),
            invitee: inviteeUsername.trim().toLowerCase(),
          }),
        },
        inviterUsername
      );

      return {
        directAdded: res.direct_added,
        message: res.message,
      };
    },

    async respond(inviteId: string, accept: boolean): Promise<void> {
      await request<void>(
        `/api/invites/${encodeURIComponent(inviteId)}/respond`,
        {
          method: 'POST',
          body: JSON.stringify({ accept }),
        }
      );
    },
  },
};
