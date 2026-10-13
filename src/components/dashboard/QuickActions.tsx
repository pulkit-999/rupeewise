'use client';

import React from 'react';
import { PlusCircle, Scale, Users, UserPlus } from 'lucide-react';

interface QuickActionsProps {
  onOpenAddExpense: () => void;
  onOpenSettleModal: () => void;
  onOpenCreateGroup: () => void;
  onOpenAddFriend: () => void;
}

export function QuickActions({
  onOpenAddExpense,
  onOpenSettleModal,
  onOpenCreateGroup,
  onOpenAddFriend,
}: QuickActionsProps) {
  const actions = [
    {
      label: 'Add Expense',
      description: 'Split a new bill or receipt',
      icon: PlusCircle,
      onClick: onOpenAddExpense,
      color: 'bg-emerald-600 text-white hover:bg-emerald-700',
    },
    {
      label: 'Settle Up',
      description: 'Pay via UPI, Bank or Cash',
      icon: Scale,
      onClick: onOpenSettleModal,
      color: 'bg-card text-foreground border border-border hover:bg-muted',
    },
    {
      label: 'New Group',
      description: 'Trip, flat, or couple group',
      icon: Users,
      onClick: onOpenCreateGroup,
      color: 'bg-card text-foreground border border-border hover:bg-muted',
    },
    {
      label: 'Add Friend',
      description: 'Invite friend by email',
      icon: UserPlus,
      onClick: onOpenAddFriend,
      color: 'bg-card text-foreground border border-border hover:bg-muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.label}
            onClick={act.onClick}
            className={`p-3.5 rounded-xl text-left transition-all shadow-2xs group flex flex-col justify-between h-24 ${act.color}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold">{act.label}</span>
              <Icon className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] opacity-75 leading-tight">{act.description}</p>
          </button>
        );
      })}
    </div>
  );
}
