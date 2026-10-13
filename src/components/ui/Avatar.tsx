import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg font-semibold',
  };

  const initials = (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Consistent background colors based on name hash
  const colors = [
    'bg-emerald-600',
    'bg-blue-600',
    'bg-amber-600',
    'bg-indigo-600',
    'bg-purple-600',
    'bg-rose-600',
    'bg-teal-600',
  ];
  const charCodeSum = (name || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const bgColor = colors[charCodeSum % colors.length];

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden text-white font-medium flex-shrink-0 select-none shadow-sm',
        sizeClasses[size],
        bgColor,
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // fallback to initials on error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
      <span className={src ? 'hidden' : ''}>{initials}</span>
    </div>
  );
}
