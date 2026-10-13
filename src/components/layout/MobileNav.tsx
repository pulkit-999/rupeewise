'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  PlusCircle,
  BarChart3,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onOpenAddExpense: () => void;
}

export function MobileNav({ onOpenAddExpense }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Groups', href: '/groups', icon: Users2 },
    { label: 'Friends', href: '/friends', icon: UserCheck },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around h-16 px-2 md:hidden">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'
            )}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Floating Center Action */}
      <button
        onClick={onOpenAddExpense}
        className="flex flex-col items-center justify-center -mt-6 bg-emerald-600 text-white w-12 h-12 rounded-full shadow-lg hover:bg-emerald-700 active:scale-95 transition-all border-4 border-background"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'
            )}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
