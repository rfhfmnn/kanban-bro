import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Board, BoardPermission, BoardRole, User } from '../../types';
import { Modal } from '../ui/Modal';
import { UserAvatar } from '../ui/UserAvatar';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  allKnownUsers: User[];
  onBoardUpdated: () => Promise<void>;
  onBoardDeleted: () => void;
}

export const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  onClose,
  board,
  allKnownUsers,
  onBoardUpdated,
  onBoardDeleted,
}) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const currentMember = board.members.find((m) => m.username === currentUser.username);
  const isOwner = board.owner === currentUser.username;
  const isAdmin = currentMember?.role === 'admin';
  const canManage = isOwner || isAdmin;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setLoading(true);
    setInviteFeedback(null);
    try {
      const res = await api.invites.send(
        board.id,
        currentUser.username,
        inviteUsername.trim().toLowerCase()
      );
      setInviteFeedback({
        type: 'success',
        message: res.message,
      });
      setInviteUsername('');
      await onBoardUpdated();
    } catch (err: any) {
      setInviteFeedback({
        type: 'error',
        message: err.message || 'Failed to send invite',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async (
    targetUsername: string,
    role: BoardRole,
    permission: BoardPermission
  ) => {
    if (!canManage) return;
    try {
      await api.members.update(
        board.id,
        targetUsername,
        role === 'admin' ? 'admin' : 'member',
        permission
      );
      await onBoardUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update member');
    }
  };

  const handleRemoveMember = async (targetUsername: string) => {
    if (!canManage) return;
    if (window.confirm(`Remove @${targetUsername} from "${board.name}"?`)) {
      try {
        await api.members.remove(board.id, targetUsername);
        await onBoardUpdated();
      } catch (err: any) {
        alert(err.message || 'Failed to remove member');
      }
    }
  };

  const handleDeleteBoard = async () => {
    if (!isOwner) return;
    if (
      window.confirm(
        `Are you sure you want to completely delete the board "${board.name}" and all its tasks? This cannot be undone.`
      )
    ) {
      try {
        await api.boards.delete(board.id);
        onClose();
        onBoardDeleted();
      } catch (err: any) {
        alert(err.message || 'Failed to delete board');
      }
    }
  };

  // Filter users not already in the board for invite suggestions
  const candidateUsers = allKnownUsers.filter(
    (u) => !board.members.some((m) => m.username.toLowerCase() === u.username.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span className="text-base font-bold text-slate-100">
            Board Members & Permissions
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Permission explanation banner */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
          <p>
            {canManage ? (
              <span>
                As an <strong>{isOwner ? 'Owner' : 'Admin'}</strong>, you can add members directly, adjust their roles, and set Edit vs View-only permissions.
              </span>
            ) : (
              <span>
                As a regular <strong>Member</strong>, you can invite new users. Your invitations will be sent as pending requests for them to accept.
              </span>
            )}
          </p>
        </div>

        {/* Invite User Form */}
        <form onSubmit={handleSendInvite} className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Invite Team Member
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                list="candidate-users"
                placeholder="Enter username (e.g. david, sarah)"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
              <datalist id="candidate-users">
                {candidateUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </datalist>
            </div>

            <button
              type="submit"
              disabled={loading || !inviteUsername.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{canManage ? 'Add Member' : 'Send Invite'}</span>
            </button>
          </div>

          {inviteFeedback && (
            <div
              className={`flex items-center gap-1.5 text-xs p-2 rounded-lg ${
                inviteFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {inviteFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{inviteFeedback.message}</span>
            </div>
          )}
        </form>

        {/* Members List */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Members ({board.members.length})
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {board.members.map((member) => {
              const userInfo = allKnownUsers.find(
                (u) => u.username.toLowerCase() === member.username.toLowerCase()
              );
              const isMemberOwner = board.owner === member.username;

              return (
                <div
                  key={member.username}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      username={member.username}
                      name={userInfo?.name}
                      avatarColor={userInfo?.avatar_color}
                      size="md"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        {userInfo?.name || member.username}
                        {isMemberOwner && (
                          <span className="ml-2 px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">@{member.username}</div>
                    </div>
                  </div>

                  {/* Role & Permission controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {canManage && !isMemberOwner ? (
                      <>
                        {/* Role selector */}
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateMember(
                              member.username,
                              e.target.value as BoardRole,
                              member.permission
                            )
                          }
                          className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>

                        {/* Permission selector */}
                        <select
                          value={member.permission}
                          onChange={(e) =>
                            handleUpdateMember(
                              member.username,
                              member.role,
                              e.target.value as BoardPermission
                            )
                          }
                          className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="edit">Can Edit</option>
                          <option value="view">View Only</option>
                        </select>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.username)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Remove from board"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {isMemberOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
                          {member.permission === 'edit' ? 'Edit' : 'View Only'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Owner Danger Zone */}
        {isOwner && (
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-rose-400">Danger Zone</div>
              <div className="text-[11px] text-slate-500">
                Permanently delete this board and its contents.
              </div>
            </div>
            <button
              onClick={handleDeleteBoard}
              className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/30 hover:border-transparent text-rose-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Delete Board
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
