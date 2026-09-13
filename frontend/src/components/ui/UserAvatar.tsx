import React from 'react';

interface UserAvatarProps {
  username: string;
  name?: string;
  avatarColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username,
  name,
  avatarColor = '#6366f1',
  size = 'md',
  showName = false,
  className = '',
}) => {
  const displayName = name || username;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base font-semibold',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white shadow-sm ring-1 ring-white/20 shrink-0 select-none`}
        style={{ backgroundColor: avatarColor }}
        title={`${displayName} (@${username})`}
      >
        {initials}
      </div>
      {showName && (
        <span className="text-sm font-medium text-slate-200 truncate">
          {displayName}
        </span>
      )}
    </div>
  );
};
