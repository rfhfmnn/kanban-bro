import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';
import { INITIAL_USERS, INITIAL_BOARDS } from './mockData';

// Polyfill minimal localStorage for node environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    storage[k] = String(v);
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Frontend Data & API Service', () => {
  describe('Mock Data Integrity', () => {
    it('should have initial mock users with valid usernames and avatar colors', () => {
      expect(INITIAL_USERS.length).toBeGreaterThan(0);
      for (const user of INITIAL_USERS) {
        expect(user.username).toBeTruthy();
        expect(user.name).toBeTruthy();
        expect(user.avatar_color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('should have initial mock boards with valid structure and columns', () => {
      expect(INITIAL_BOARDS.length).toBeGreaterThan(0);
      for (const board of INITIAL_BOARDS) {
        expect(board.id).toBeTruthy();
        expect(board.name).toBeTruthy();
        expect(board.columns).toHaveLength(3);
        const columnIds = board.columns.map((c) => c.id);
        expect(columnIds).toEqual(['todo', 'in_progress', 'done']);
      }
    });
  });

  describe('API Client Requests & Header Injection', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should include X-Username from localStorage in API requests', async () => {
      localStorage.setItem('kanban_bro_current_username', 'tester_user');

      const mockResponseData = [{ username: 'tester_user', name: 'Tester' }];
      let capturedHeaders: Record<string, string> = {};

      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        capturedHeaders = options.headers;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });
      });

      const result = await api.users.list();
      expect(result).toEqual(mockResponseData);
      expect(capturedHeaders['X-Username']).toBe('tester_user');
      expect(capturedHeaders['Content-Type']).toBe('application/json');
    });

    it('should handle custom username override in headers', async () => {
      localStorage.setItem('kanban_bro_current_username', 'default_user');

      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        capturedHeaders = options.headers;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });
      });

      await api.boards.list('override_user');
      expect(capturedHeaders['X-Username']).toBe('override_user');
    });

    it('should throw an informative error when API returns non-2xx status', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ detail: 'Database error' }),
        });
      });

      await expect(api.users.list()).rejects.toThrow('Database error');
    });
  });
});
