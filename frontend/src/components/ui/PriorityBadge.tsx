import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const configs = {
    Low: {
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: ArrowDown,
      label: 'Low',
    },
    Medium: {
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: Minus,
      label: 'Medium',
    },
    High: {
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icon: ArrowUp,
      label: 'High',
    },
  };

  const config = configs[priority] || configs.Medium;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md border ${config.color} ${sizeClasses}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
};
