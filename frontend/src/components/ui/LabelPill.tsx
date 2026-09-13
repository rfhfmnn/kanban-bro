import React from 'react';
import { X } from 'lucide-react';
import type { BoardLabel } from '../../types';

interface LabelPillProps {
  label: BoardLabel;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}

export const LabelPill: React.FC<LabelPillProps> = ({
  label,
  size = 'sm',
  onRemove,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-all ${sizeClasses}`}
      style={{
        backgroundColor: `${label.color}20`,
        borderColor: `${label.color}45`,
        color: label.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      <span>{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus:outline-none ml-0.5"
          title={`Remove ${label.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
