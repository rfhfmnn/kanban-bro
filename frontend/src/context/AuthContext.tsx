import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  switchUser: (username: string) => Promise<void>;
  createUser: (username: string, name: string) => Promise<User>;
  refreshUsers: () => Promise<void>;
  currentView: 'dashboard' | 'board' | 'my-tasks';
  setCurrentView: (view: 'dashboard' | 'board' | 'my-tasks') => void;
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  openTaskDetailId: string | null;
  setOpenTaskDetailId: (id: string | null) => void;
  resetAllData: () => Promise<void>;
}

const CURRENT_USER_KEY = 'kanban_bro_current_username';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>({
    username: 'rafael',
    name: 'Rafael Hoffmann',
    avatar_color: '#6366f1',
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'board' | 'my-tasks'>('dashboard');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [openTaskDetailId, setOpenTaskDetailId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load known users and active session on mount
  useEffect(() => {
    async function init() {
      try {
        const users = await api.users.list();
        setAllUsers(users);

        const savedUsername = localStorage.getItem(CURRENT_USER_KEY) || 'rafael';
        const found = users.find((u) => u.username === savedUsername.toLowerCase());
        if (found) {
          setCurrentUser(found);
        } else if (users.length > 0) {
          setCurrentUser(users[0]);
          localStorage.setItem(CURRENT_USER_KEY, users[0].username);
        }
      } catch (err) {
        console.error('Failed to load initial auth state', err);
      } finally {
        setInitialized(true);
      }
    }
    init();
  }, []);

  const refreshUsers = async () => {
    const users = await api.users.list();
    setAllUsers(users);
  };

  const switchUser = async (username: string) => {
    const clean = username.trim().toLowerCase();
    const user = allUsers.find((u) => u.username === clean);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, user.username);
    }
  };

  const createUser = async (username: string, name: string) => {
    const newUser = await api.users.create(username, name);
    await refreshUsers();
    setCurrentUser(newUser);
    localStorage.setItem(CURRENT_USER_KEY, newUser.username);
    return newUser;
  };

  const resetAllData = async () => {
    await api.resetAll();
    await refreshUsers();
    const users = await api.users.list();
    const defaultUser = users.find((u) => u.username === 'rafael') || users[0];
    setCurrentUser(defaultUser);
    localStorage.setItem(CURRENT_USER_KEY, defaultUser.username);
    setActiveBoardId(null);
    setCurrentView('dashboard');
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
        <span>Loading Kanban Bro...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        switchUser,
        createUser,
        refreshUsers,
        currentView,
        setCurrentView,
        activeBoardId,
        setActiveBoardId,
        openTaskDetailId,
        setOpenTaskDetailId,
        resetAllData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
