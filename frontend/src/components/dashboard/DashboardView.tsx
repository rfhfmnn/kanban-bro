import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Kanban,
  ListTodo,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { BoardWithCounts } from '../../services/api';
import type { Invite } from '../../types';
import { UserAvatar } from '../ui/UserAvatar';
import { PendingInvites } from './PendingInvites';

interface DashboardViewProps {
  onSelectBoard: (boardId: string) => void;
  onCreateBoardClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectBoard,
  onCreateBoardClick,
}) => {
  const { currentUser, setCurrentView } = useAuth();
  const [boards, setBoards] = useState<BoardWithCounts[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!currentUser) return;
    try {
      const [userBoards, userInvites] = await Promise.all([
        api.boards.list(currentUser.username),
        api.invites.list(currentUser.username),
      ]);
      setBoards(userBoards);
      setInvites(userInvites);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser?.username]);

  if (!currentUser) return null;

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      await api.invites.respond(inviteId, accept);
      await loadDashboardData();
    } catch (e) {
      console.error('Error responding to invite', e);
    }
  };

  const totalTasks = boards.reduce((acc, b) => acc + b.counts.total, 0);
  const activeTasks = boards.reduce(
    (acc, b) => acc + b.counts.todo + b.counts.in_progress,
    0
  );
  const completedTasks = boards.reduce((acc, b) => acc + b.counts.done, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <span>Active Profile:</span>
              <span className="text-white">@{currentUser.username}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              You are collaborating on <strong>{boards.length}</strong> board{boards.length === 1 ? '' : 's'}. Track progress, drag tasks across columns, or invite teammates to join your boards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentView('my-tasks')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
            >
              <ListTodo className="w-4 h-4 text-indigo-400" />
              View My Tasks
            </button>
            <button
              onClick={onCreateBoardClick}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Board
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div>
            <div className="text-xs text-slate-400 font-medium">Accessible Boards</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{boards.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Tasks</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{totalTasks}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">In Progress / To Do</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">{activeTasks}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Completed Tasks</div>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">{completedTasks}</div>
          </div>
        </div>
      </div>

      {/* Pending Invites Alert */}
      <PendingInvites invites={invites} onRespond={handleRespondInvite} />

      {/* Boards Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Kanban className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Your Boards</h2>
          </div>
          <button
            onClick={onCreateBoardClick}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New Board
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
            <p className="text-sm">Loading boards...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {boards.map((board) => {
              const role = board.currentUserRole || 'member';
              const permission = board.currentUserPermission || 'view';

              const roleBadgeConfig = {
                owner: { label: 'Owner', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
                admin: { label: 'Admin', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
                member: {
                  label: permission === 'edit' ? 'Member (Edit)' : 'Member (View Only)',
                  color: permission === 'edit' ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                },
              }[role];

              const total = board.counts.total;
              const donePercent = total > 0 ? Math.round((board.counts.done / total) * 100) : 0;

              return (
                <div
                  key={board.id}
                  onClick={() => onSelectBoard(board.id)}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-indigo-500/5"
                >
                  <div className="space-y-3">
                    {/* Top Row: Role Badge & Members */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleBadgeConfig.color}`}
                      >
                        {roleBadgeConfig.label}
                      </span>

                      {/* Member avatars */}
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {board.members.slice(0, 4).map((m) => (
                          <UserAvatar
                            key={m.username}
                            username={m.username}
                            size="xs"
                            className="ring-2 ring-slate-900"
                          />
                        ))}
                        {board.members.length > 4 && (
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[9px] flex items-center justify-center text-slate-300 font-bold">
                            +{board.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Board Name & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {board.name}
                      </h3>
                      {board.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {board.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Task counts & Progress */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                    {/* Breakdown pills */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {total} {total === 1 ? 'task' : 'tasks'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">To Do: {board.counts.todo}</span>
                        <span className="text-indigo-400">Active: {board.counts.in_progress}</span>
                        <span className="text-emerald-400">Done: {board.counts.done}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${donePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Owner: @{board.owner}</span>
                      <span className="group-hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors">
                        Open Board <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Create Board Placeholder Card */}
            <button
              onClick={onCreateBoardClick}
              className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/30 text-slate-500 hover:text-indigo-300 transition-all min-h-[220px] group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 group-hover:border-indigo-500/30 transition-all mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-300 group-hover:text-white">
                Create New Board
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Personal or team collaborative board
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
