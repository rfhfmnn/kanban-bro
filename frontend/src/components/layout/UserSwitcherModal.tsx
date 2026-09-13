import React, { useState } from 'react';
import { Check, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { UserAvatar } from '../ui/UserAvatar';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, allUsers, switchUser, createUser, resetAllData } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectUser = async (username: string) => {
    await switchUser(username);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setError('Please provide a username.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createUser(newUsername, newName || newUsername);
      setNewUsername('');
      setNewName('');
      setIsCreating(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all demo data (boards, tasks, users, invites) to original factory state?')) {
      setLoading(true);
      await resetAllData();
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch or Create Mock User">
      <div className="space-y-5">
        <p className="text-xs text-slate-400">
          Per spec: Mock auth allows fast switching between profiles to test permissions, invites, and board ownership without passwords.
        </p>

        {/* Existing Users List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Active Profile
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
            {allUsers.map((user) => {
              const isActive = currentUser ? user.username === currentUser.username : false;
              return (
                <button
                  key={user.username}
                  onClick={() => handleSelectUser(user.username)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-white ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      username={user.username}
                      name={user.name}
                      avatarColor={user.avatar_color}
                      size="md"
                    />
                    <div>
                      <div className="text-sm font-semibold">{user.name}</div>
                      <div className="text-xs text-slate-400">@{user.username}</div>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inline Create User or Form */}
        {!isCreating ? (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium py-1"
            >
              <Plus className="w-4 h-4" />
              Create new user
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors py-1"
              title="Restores seed data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Reset Demo Data
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3 pt-3 border-t border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              New User Account
            </div>
            {error && <div className="text-xs text-rose-400">{error}</div>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Username *</label>
                <input
                  type="text"
                  placeholder="e.g. sarah"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create & Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
