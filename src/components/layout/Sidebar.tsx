'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  UserCheck,
  History,
  BarChart3,
  User,
  PlusCircle,
  Receipt,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { formatINR } from '@/lib/currency';

interface SidebarProps {
  onOpenAddExpense: () => void;
  onOpenSettleModal: () => void;
}

export function Sidebar({ onOpenAddExpense, onOpenSettleModal }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, getUserNetBalance } = useAppStore();
  const netBalance = getUserNetBalance(currentUser.id);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Groups', href: '/groups', icon: Users2 },
    { label: 'Friends', href: '/friends', icon: UserCheck },
    { label: 'Activity', href: '/activity', icon: History },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 border-r border-border min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex bg-card/40">
      <div className="space-y-6">
        {/* Quick balance overview card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-background to-muted/50 border border-border/80 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium mb-1">Your Net Balance</div>
          <div className="text-xl font-bold tracking-tight">
            {netBalance > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">+{formatINR(netBalance)}</span>
            ) : netBalance < 0 ? (
              <span className="text-rose-500">{formatINR(netBalance)}</span>
            ) : (
              <span className="text-muted-foreground">₹0.00 (Settled)</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {netBalance > 0
              ? 'You are owed money overall'
              : netBalance < 0
              ? 'You owe money to others'
              : 'You are all settled up!'}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60">
            <button
              onClick={onOpenAddExpense}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              onClick={onOpenSettleModal}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-all"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>Settle Up</span>
            </button>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground space-y-1">
        <div className="font-semibold text-foreground flex items-center justify-between">
          <span>RupeeWise Pro</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-1 rounded">v1.0</span>
        </div>
        <p>Realtime INR splits, min-cash-flow algorithm & charts.</p>
      </div>
    </aside>
  );
}
