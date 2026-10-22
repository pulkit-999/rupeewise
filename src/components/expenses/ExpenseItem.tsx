'use client';

import React from 'react';
import { Expense } from '@/types/database';
import { useAppStore } from '@/lib/store';
import { formatINR } from '@/lib/currency';
import { format } from 'date-fns';
import {
  Utensils,
  ShoppingBag,
  Plane,
  Home,
  Film,
  Car,
  Tag,
  Receipt,
} from 'lucide-react';

interface ExpenseItemProps {
  expense: Expense;
  onClick: () => void;
}

const iconMap: Record<string, any> = {
  Utensils,
  ShoppingBag,
  Plane,
  Home,
  Film,
  Car,
  Tag,
  Receipt,
};

export function ExpenseItem({ expense, onClick }: ExpenseItemProps) {
  const { currentUser } = useAppStore();

  const CategoryIcon = (expense.category?.icon && iconMap[expense.category.icon]) || Receipt;
  const categoryColor = expense.category?.color || '#10b981';

  // Calculate user's involvement in this expense
  const userPaid = expense.payers
    .filter((p) => p.user_id === currentUser.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);

  const userOwed = expense.splits
    .filter((s) => s.user_id === currentUser.id)
    .reduce((sum, s) => sum + s.amount_owed, 0);

  const netImpact = userPaid - userOwed;

  // Single payer vs multiple payers label
  const primaryPayer = expense.payers[0];
  const isSelfPayer = primaryPayer?.user_id === currentUser.id;
  const payerLabel =
    expense.payers.length > 1
      ? `${expense.payers.length} people paid`
      : isSelfPayer
      ? 'You paid'
      : `${primaryPayer?.user?.full_name || 'Someone'} paid`;

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 transition-all cursor-pointer group shadow-2xs"
    >
      {/* Left: Category Icon & Details */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{
            backgroundColor: `${categoryColor}18`,
            color: categoryColor,
          }}
        >
          <CategoryIcon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-emerald-600 transition-colors">
              {expense.description}
            </h4>
            {expense.receipt_url && (
              <span title="Receipt attached" className="shrink-0 text-emerald-600 dark:text-emerald-400">
                <Receipt className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span>{expense.date ? format(new Date(expense.date), 'dd MMM') : ''}</span>
            <span>•</span>
            <span className="truncate">
              {payerLabel} {formatINR(expense.amount)}
            </span>
            {expense.group && (
              <>
                <span>•</span>
                <span className="truncate max-w-[100px] text-foreground/80 font-medium">
                  {expense.group.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: User's Net Impact in INR */}
      <div className="text-right flex-shrink-0 ml-3">
        {netImpact > 0.009 ? (
          <div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">you lent</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              +{formatINR(netImpact)}
            </div>
          </div>
        ) : netImpact < -0.009 ? (
          <div>
            <div className="text-[10px] text-rose-500 font-medium">you borrowed</div>
            <div className="text-sm font-bold text-rose-500">
              {formatINR(Math.abs(netImpact))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] text-muted-foreground font-medium">not involved</div>
            <div className="text-sm font-medium text-muted-foreground">₹0.00</div>
          </div>
        )}
      </div>
    </div>
  );
}
