import type {
  Board,
  BoardLabel,
  ColumnStatus,
  Invite,
  Task,
  TaskComment,
  User,
} from '../types';
import {
  INITIAL_BOARDS,
  INITIAL_INVITES,
  INITIAL_TASKS,
  INITIAL_USERS,
} from './mockData';

const STORAGE_KEYS = {
  USERS: 'kanban_bro_users',
  BOARDS: 'kanban_bro_boards',
  TASKS: 'kanban_bro_tasks',
  INVITES: 'kanban_bro_invites',
};

// Simulated network delay helper
const delay = (ms = 75) => new Promise((resolve) => setTimeout(resolve, ms));

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading ${key} from storage`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage`, e);
  }
}

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

export const api = {
  // Reset all state to initial defaults
  async resetAll(): Promise<void> {
    await delay();
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(INITIAL_BOARDS));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    localStorage.setItem(STORAGE_KEYS.INVITES, JSON.stringify(INITIAL_INVITES));
  },

  // USERS
  users: {
    async list(): Promise<User[]> {
      await delay();
      return loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    },

    async create(username: string, name: string, avatar_color?: string): Promise<User> {
      await delay();
      const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const cleanUsername = username.trim().toLowerCase();
      
      const existing = users.find((u) => u.username === cleanUsername);
      if (existing) {
        return existing;
      }

      const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#3b82f6'];
      const chosenColor = avatar_color || colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
        username: cleanUsername,
        name: name.trim() || cleanUsername,
        avatar_color: chosenColor,
      };

      users.push(newUser);
      saveToStorage(STORAGE_KEYS.USERS, users);
      return newUser;
    },
  },

  // BOARDS
  boards: {
    async list(username: string): Promise<BoardWithCounts[]> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const cleanUsername = username.trim().toLowerCase();

      // Filter boards user is member or owner of
      const userBoards = boards.filter((b) =>
        b.owner === cleanUsername || b.members.some((m) => m.username === cleanUsername)
      );

      return userBoards.map((board) => {
        const boardTasks = tasks.filter((t) => t.board_id === board.id);
        const memberInfo = board.members.find((m) => m.username === cleanUsername);
        const isOwner = board.owner === cleanUsername;

        return {
          ...board,
          currentUserRole: isOwner ? 'owner' : memberInfo?.role || 'member',
          currentUserPermission: isOwner ? 'edit' : memberInfo?.permission || 'view',
          counts: {
            total: boardTasks.length,
            todo: boardTasks.filter((t) => t.status === 'todo').length,
            in_progress: boardTasks.filter((t) => t.status === 'in_progress').length,
            done: boardTasks.filter((t) => t.status === 'done').length,
          },
        };
      });
    },

    async get(id: string): Promise<Board | null> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      return boards.find((b) => b.id === id) || null;
    },

    async create(name: string, description: string, ownerUsername: string): Promise<Board> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const cleanOwner = ownerUsername.trim().toLowerCase();

      const newBoard: Board = {
        id: `board-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        owner: cleanOwner,
        columns: [
          { id: 'todo', name: 'To Do' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'done', name: 'Done' },
        ],
        members: [{ username: cleanOwner, role: 'owner', permission: 'edit' }],
        labels: [
          { id: `lbl-${Date.now()}-1`, name: 'Frontend', color: '#6366f1' },
          { id: `lbl-${Date.now()}-2`, name: 'Backend', color: '#10b981' },
          { id: `lbl-${Date.now()}-3`, name: 'Bug', color: '#ef4444' },
        ],
        created_at: new Date().toISOString(),
      };

      boards.push(newBoard);
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      return newBoard;
    },

    async update(id: string, updates: Partial<Pick<Board, 'name' | 'description' | 'columns'>>): Promise<Board> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const index = boards.findIndex((b) => b.id === id);
      if (index === -1) throw new Error('Board not found');

      const updated = { ...boards[index], ...updates };
      boards[index] = updated;
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      return updated;
    },

    async updateColumnName(boardId: string, columnId: ColumnStatus, newName: string): Promise<Board> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const index = boards.findIndex((b) => b.id === boardId);
      if (index === -1) throw new Error('Board not found');

      const updatedColumns = boards[index].columns.map((col) =>
        col.id === columnId ? { ...col, name: newName.trim() } : col
      );

      boards[index] = { ...boards[index], columns: updatedColumns };
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      return boards[index];
    },

    async addLabel(boardId: string, label: { name: string; color: string }): Promise<BoardLabel> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const index = boards.findIndex((b) => b.id === boardId);
      if (index === -1) throw new Error('Board not found');

      const newLabel: BoardLabel = {
        id: `lbl-${Date.now()}`,
        name: label.name.trim(),
        color: label.color,
      };

      boards[index].labels.push(newLabel);
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      return newLabel;
    },

    async delete(id: string): Promise<void> {
      await delay();
      let boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      boards = boards.filter((b) => b.id !== id);
      saveToStorage(STORAGE_KEYS.BOARDS, boards);

      // Clean up tasks associated with board
      let tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      tasks = tasks.filter((t) => t.board_id !== id);
      saveToStorage(STORAGE_KEYS.TASKS, tasks);
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
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const index = boards.findIndex((b) => b.id === boardId);
      if (index === -1) throw new Error('Board not found');

      const board = boards[index];
      const memberIndex = board.members.findIndex((m) => m.username === targetUsername);
      if (memberIndex === -1) throw new Error('Member not found');

      // Cannot downgrade owner
      if (board.owner === targetUsername) {
        throw new Error('Cannot modify the owner role');
      }

      board.members[memberIndex] = {
        username: targetUsername,
        role,
        permission,
      };

      boards[index] = board;
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      return board;
    },

    async remove(boardId: string, targetUsername: string): Promise<Board> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const index = boards.findIndex((b) => b.id === boardId);
      if (index === -1) throw new Error('Board not found');

      const board = boards[index];
      if (board.owner === targetUsername) {
        throw new Error('Cannot remove board owner');
      }

      board.members = board.members.filter((m) => m.username !== targetUsername);
      boards[index] = board;
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      return board;
    },
  },

  // TASKS
  tasks: {
    async list(boardId: string): Promise<Task[]> {
      await delay();
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      return tasks
        .filter((t) => t.board_id === boardId)
        .sort((a, b) => a.order - b.order);
    },

    async listByUser(username: string): Promise<(Task & { boardName: string })[]> {
      await delay();
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const cleanUsername = username.trim().toLowerCase();

      const userBoardsMap = new Map<string, string>();
      boards.forEach((b) => userBoardsMap.set(b.id, b.name));

      return tasks
        .filter((t) => t.assignee.toLowerCase() === cleanUsername)
        .map((t) => ({
          ...t,
          boardName: userBoardsMap.get(t.board_id) || 'Unknown Board',
        }))
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    },

    async create(
      data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'comments' | 'order'>,
      actorUsername?: string
    ): Promise<Task> {
      await delay();
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);

      const sameColumnTasks = tasks.filter(
        (t) => t.board_id === data.board_id && t.status === data.status
      );

      const now = new Date().toISOString();
      const initialComments: TaskComment[] = [];

      if (actorUsername) {
        initialComments.push({
          id: `c-${Date.now()}-init`,
          task_id: `task-${Date.now()}`,
          author: actorUsername,
          text: 'Created the task',
          type: 'activity',
          created_at: now,
        });
      }

      const newTask: Task = {
        ...data,
        id: `task-${Date.now()}`,
        order: sameColumnTasks.length,
        comments: initialComments,
        created_at: now,
        updated_at: now,
      };

      tasks.push(newTask);
      saveToStorage(STORAGE_KEYS.TASKS, tasks);
      return newTask;
    },

    async update(
      taskId: string,
      updates: Partial<Omit<Task, 'id' | 'board_id' | 'created_at'>>,
      actorUsername?: string
    ): Promise<Task> {
      await delay();
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index === -1) throw new Error('Task not found');

      const oldTask = tasks[index];
      const now = new Date().toISOString();

      const newComments = [...(oldTask.comments || [])];

      // Auto-activity logs for important changes
      if (actorUsername) {
        if (updates.status && updates.status !== oldTask.status) {
          const statusLabels: Record<ColumnStatus, string> = {
            todo: 'To Do',
            in_progress: 'In Progress',
            done: 'Done',
          };
          newComments.push({
            id: `c-${Date.now()}-status`,
            task_id: taskId,
            author: actorUsername,
            text: `Moved status from ${statusLabels[oldTask.status]} to ${statusLabels[updates.status]}`,
            type: 'activity',
            created_at: now,
          });
        }
        if (updates.assignee && updates.assignee !== oldTask.assignee) {
          newComments.push({
            id: `c-${Date.now()}-assignee`,
            task_id: taskId,
            author: actorUsername,
            text: `Reassigned from @${oldTask.assignee || 'none'} to @${updates.assignee}`,
            type: 'activity',
            created_at: now,
          });
        }
        if (updates.priority && updates.priority !== oldTask.priority) {
          newComments.push({
            id: `c-${Date.now()}-pri`,
            task_id: taskId,
            author: actorUsername,
            text: `Changed priority to ${updates.priority}`,
            type: 'activity',
            created_at: now,
          });
        }
      }

      const updatedTask: Task = {
        ...oldTask,
        ...updates,
        comments: newComments,
        updated_at: now,
      };

      tasks[index] = updatedTask;
      saveToStorage(STORAGE_KEYS.TASKS, tasks);
      return updatedTask;
    },

    async move(
      taskId: string,
      newStatus: ColumnStatus,
      newOrder: number,
      actorUsername?: string
    ): Promise<Task> {
      await delay(40);
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found');

      const oldStatus = task.status;
      const statusChanged = oldStatus !== newStatus;
      const now = new Date().toISOString();

      if (statusChanged && actorUsername) {
        const statusLabels: Record<ColumnStatus, string> = {
          todo: 'To Do',
          in_progress: 'In Progress',
          done: 'Done',
        };
        task.comments.push({
          id: `c-${Date.now()}-dnd`,
          task_id: taskId,
          author: actorUsername,
          text: `Moved task to ${statusLabels[newStatus]}`,
          type: 'activity',
          created_at: now,
        });
      }

      task.status = newStatus;
      task.order = newOrder;
      task.updated_at = now;

      // Re-index siblings in the new column
      const colTasks = tasks
        .filter((t) => t.board_id === task.board_id && t.status === newStatus && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      colTasks.splice(newOrder, 0, task);
      colTasks.forEach((t, idx) => {
        t.order = idx;
      });

      saveToStorage(STORAGE_KEYS.TASKS, tasks);
      return task;
    },

    async delete(taskId: string): Promise<void> {
      await delay();
      let tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      tasks = tasks.filter((t) => t.id !== taskId);
      saveToStorage(STORAGE_KEYS.TASKS, tasks);
    },

    async addComment(taskId: string, author: string, text: string): Promise<TaskComment> {
      await delay();
      const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found');

      const comment: TaskComment = {
        id: `c-${Date.now()}`,
        task_id: taskId,
        author: author.trim().toLowerCase(),
        text: text.trim(),
        type: 'comment',
        created_at: new Date().toISOString(),
      };

      task.comments.push(comment);
      task.updated_at = new Date().toISOString();
      saveToStorage(STORAGE_KEYS.TASKS, tasks);
      return comment;
    },
  },

  // INVITES
  invites: {
    async list(username: string): Promise<Invite[]> {
      await delay();
      const invites = loadFromStorage<Invite[]>(STORAGE_KEYS.INVITES, INITIAL_INVITES);
      const cleanUsername = username.trim().toLowerCase();
      return invites.filter((inv) => inv.invitee.toLowerCase() === cleanUsername && inv.status === 'pending');
    },

    async send(
      boardId: string,
      inviterUsername: string,
      inviteeUsername: string
    ): Promise<{ directAdded: boolean; message: string }> {
      await delay();
      const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
      const cleanInviter = inviterUsername.trim().toLowerCase();
      const cleanInvitee = inviteeUsername.trim().toLowerCase();

      const boardIndex = boards.findIndex((b) => b.id === boardId);
      if (boardIndex === -1) throw new Error('Board not found');
      const board = boards[boardIndex];

      // Check if already member
      if (board.members.some((m) => m.username === cleanInvitee)) {
        throw new Error(`@${cleanInvitee} is already a member of this board.`);
      }

      // Check inviter permissions
      const inviterMember = board.members.find((m) => m.username === cleanInviter);
      const isOwner = board.owner === cleanInviter;
      const isAdmin = inviterMember?.role === 'admin';

      if (isOwner || isAdmin) {
        // Direct addition per spec
        board.members.push({
          username: cleanInvitee,
          role: 'member',
          permission: 'edit',
        });
        boards[boardIndex] = board;
        saveToStorage(STORAGE_KEYS.BOARDS, boards);
        return {
          directAdded: true,
          message: `Added @${cleanInvitee} directly as a member.`,
        };
      } else {
        // Member invite -> pending request per spec
        const invites = loadFromStorage<Invite[]>(STORAGE_KEYS.INVITES, INITIAL_INVITES);
        const existing = invites.find(
          (inv) =>
            inv.board_id === boardId &&
            inv.invitee.toLowerCase() === cleanInvitee &&
            inv.status === 'pending'
        );
        if (existing) {
          throw new Error(`An invitation has already been sent to @${cleanInvitee}.`);
        }

        const newInvite: Invite = {
          id: `inv-${Date.now()}`,
          board_id: boardId,
          board_name: board.name,
          inviter: cleanInviter,
          invitee: cleanInvitee,
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        invites.push(newInvite);
        saveToStorage(STORAGE_KEYS.INVITES, invites);
        return {
          directAdded: false,
          message: `Invitation sent to @${cleanInvitee}. It will appear in their pending requests.`,
        };
      }
    },

    async respond(inviteId: string, accept: boolean): Promise<void> {
      await delay();
      const invites = loadFromStorage<Invite[]>(STORAGE_KEYS.INVITES, INITIAL_INVITES);
      const inviteIndex = invites.findIndex((i) => i.id === inviteId);
      if (inviteIndex === -1) throw new Error('Invite not found');

      const invite = invites[inviteIndex];
      invite.status = accept ? 'accepted' : 'declined';
      saveToStorage(STORAGE_KEYS.INVITES, invites);

      if (accept) {
        const boards = loadFromStorage<Board[]>(STORAGE_KEYS.BOARDS, INITIAL_BOARDS);
        const boardIndex = boards.findIndex((b) => b.id === invite.board_id);
        if (boardIndex !== -1) {
          const board = boards[boardIndex];
          if (!board.members.some((m) => m.username === invite.invitee)) {
            board.members.push({
              username: invite.invitee,
              role: 'member',
              permission: 'edit',
            });
            boards[boardIndex] = board;
            saveToStorage(STORAGE_KEYS.BOARDS, boards);
          }
        }
      }
    },
  },
};
