import React from 'react';
import { Check, Mail, X } from 'lucide-react';
import type { Invite } from '../../types';

interface PendingInvitesProps {
  invites: Invite[];
  onRespond: (inviteId: string, accept: boolean) => Promise<void>;
}

export const PendingInvites: React.FC<PendingInvitesProps> = ({ invites, onRespond }) => {
  if (invites.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 mb-8">
      <div className="flex items-center gap-2 mb-3 text-amber-400 font-semibold text-sm">
        <Mail className="w-4 h-4" />
        <span>Pending Board Invitations ({invites.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md"
          >
            <div className="min-w-0 pr-3">
              <h4 className="text-sm font-semibold text-slate-100 truncate">
                {inv.board_name}
              </h4>
              <p className="text-xs text-slate-400 truncate">
                Invited by <span className="text-indigo-400">@{inv.inviter}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onRespond(inv.id, true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                title="Accept invitation and join board"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept</span>
              </button>
              <button
                onClick={() => onRespond(inv.id, false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Decline invitation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
