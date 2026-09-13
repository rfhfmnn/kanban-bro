import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Mail,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { BoardWithCounts } from '../../services/api';
import { UserAvatar } from '../ui/UserAvatar';
import { UserSwitcherModal } from './UserSwitcherModal';

interface NavbarProps {
  onCreateBoardClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCreateBoardClick }) => {
  const {
    currentUser,
    currentView,
    setCurrentView,
    activeBoardId,
    setActiveBoardId,
  } = useAuth();

  const [userBoards, setUserBoards] = useState<BoardWithCounts[]>([]);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const user = currentUser;
    async function loadData() {
      try {
        const [boards, invites] = await Promise.all([
          api.boards.list(user.username),
          api.invites.list(user.username),
        ]);
        setUserBoards(boards);
        setPendingInvitesCount(invites.length);
      } catch (e) {
        console.error('Navbar failed to load boards/invites', e);
      }
    }
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [currentUser?.username, activeBoardId]);

  if (!currentUser) return null;

  const activeBoard = userBoards.find((b) => b.id === activeBoardId);

  const handleSelectBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    setCurrentView('board');
    setIsBoardDropdownOpen(false);
  };

  const handleNavDashboard = () => {
    setActiveBoardId(null);
    setCurrentView('dashboard');
  };

  const handleNavMyTasks = () => {
    setCurrentView('my-tasks');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleNavDashboard}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Kanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight text-lg">
                  Kanban<span className="text-indigo-400">Bro</span>
                </span>
                <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  Preview
                </span>
              </div>
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-800">
              <button
                onClick={handleNavDashboard}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                onClick={handleNavMyTasks}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentView === 'my-tasks'
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                My Tasks
              </button>
            </nav>

            {/* Board Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 transition-colors shadow-sm"
              >
                <span className="text-slate-400">Board:</span>
                <span className="font-semibold max-w-[140px] truncate text-indigo-300">
                  {activeBoard ? activeBoard.name : 'Select Board'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isBoardDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsBoardDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-30 space-y-1">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Your Boards
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {userBoards.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleSelectBoard(b.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            b.id === activeBoardId
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{b.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              b.id === activeBoardId
                                ? 'bg-indigo-800 text-indigo-100'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {b.counts.total}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setIsBoardDropdownOpen(false);
                          onCreateBoardClick();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-indigo-400 hover:bg-indigo-600/10 font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Board
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Side: Invites Pill + Mock User Switcher */}
          <div className="flex items-center gap-3">
            {pendingInvitesCount > 0 && (
              <button
                onClick={handleNavDashboard}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors"
                title={`${pendingInvitesCount} pending invitation(s)`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{pendingInvitesCount} Invites</span>
              </button>
            )}

            {/* Mock User Pill */}
            <button
              onClick={() => setIsSwitcherOpen(true)}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80 transition-all shadow-sm group"
              title="Click to switch or create mock user profile"
            >
              <UserAvatar
                username={currentUser.username}
                name={currentUser.name}
                avatarColor={currentUser.avatar_color}
                size="sm"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 leading-none">
                  @{currentUser.username}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
            </button>
          </div>
        </div>
      </header>

      <UserSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
      />
    </>
  );
};
