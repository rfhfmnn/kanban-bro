import React, { useState } from 'react';
import { WelcomeSetup } from './components/auth/WelcomeSetup';
import { BoardView } from './components/board/BoardView';
import { CreateBoardModal } from './components/dashboard/CreateBoardModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { MyTasksView } from './components/dashboard/MyTasksView';
import { Navbar } from './components/layout/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    currentView,
    setCurrentView,
    activeBoardId,
    setActiveBoardId,
    openTaskDetailId,
    setOpenTaskDetailId,
  } = useAuth();

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  if (!currentUser) {
    return <WelcomeSetup />;
  }

  const handleSelectBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    setCurrentView('board');
  };

  const handleSelectTaskFromMyTasks = (boardId: string, taskId: string) => {
    setActiveBoardId(boardId);
    setOpenTaskDetailId(taskId);
    setCurrentView('board');
  };

  const handleBoardCreated = (newBoardId: string) => {
    setActiveBoardId(newBoardId);
    setCurrentView('board');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onCreateBoardClick={() => setIsCreateBoardOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {currentView === 'dashboard' && (
          <DashboardView
            onSelectBoard={handleSelectBoard}
            onCreateBoardClick={() => setIsCreateBoardOpen(true)}
          />
        )}

        {currentView === 'my-tasks' && (
          <MyTasksView onSelectTask={handleSelectTaskFromMyTasks} />
        )}

        {currentView === 'board' && activeBoardId && (
          <BoardView
            boardId={activeBoardId}
            onBackToDashboard={() => {
              setActiveBoardId(null);
              setCurrentView('dashboard');
            }}
            openTaskId={openTaskDetailId}
            onClearOpenTask={() => setOpenTaskDetailId(null)}
          />
        )}

        {currentView === 'board' && !activeBoardId && (
          <div className="py-20 text-center">
            <p className="text-slate-400 mb-4">No board selected.</p>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>
          Kanban Bro &bull; Phase 1 Interactive Frontend &bull; Centralized Mock API Layer
        </p>
      </footer>

      {/* Global Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onBoardCreated={handleBoardCreated}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
