import React from 'react';
import { UserProfile } from '../../types';

interface UserAvatarProps {
  user: UserProfile;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showOnlineStatus?: boolean;
  onClick?: () => void;
}

// Generate consistent background color based on name string
function getAvatarBgColor(name: string): string {
  const colors = [
    'bg-indigo-600 text-white',
    'bg-blue-600 text-white',
    'bg-violet-600 text-white',
    'bg-purple-600 text-white',
    'bg-emerald-600 text-white',
    'bg-teal-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Extract clean 1-2 letter initials
function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  onClick,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm font-bold',
  }[size];

  const initials = getInitials(user.name);
  const colorClass = getAvatarBgColor(user.name);

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''} ${className}`}
      onClick={onClick}
      title={`${user.name} (${user.role})`}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className={`${sizeClasses} rounded-full object-cover ring-2 ring-white shadow-xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} ${colorClass} rounded-full flex items-center justify-center font-bold tracking-tight shadow-xs ring-2 ring-white select-none`}
        >
          {initials}
        </div>
      )}

      {showOnlineStatus && (
        <span 
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"
          title="Online"
        />
      )}
    </div>
  );
};
