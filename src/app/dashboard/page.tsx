'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { BalanceCards } from '@/components/dashboard/BalanceCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ExpenseItem } from '@/components/expenses/ExpenseItem';
import { ExpenseDetailModal } from '@/components/expenses/ExpenseDetailModal';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { SettleModal } from '@/components/settlements/SettleModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { AddFriendModal } from '@/components/friends/AddFriendModal';
import { Expense } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { PlusCircle, Search, Sparkles, Scale, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';

export default function DashboardPage() {
  const { expenses, groups, currentUser } = useAppStore();

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  // Filtered expenses
  const filteredExpenses = expenses
    .filter((e) => {
      if (filterGroup !== 'all' && e.group_id !== filterGroup) return false;
      if (
        searchTerm &&
        !e.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !e.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Namaste, {currentUser.full_name?.trim() ? currentUser.full_name.trim().split(' ')[0] : 'Friend'} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here is your financial balance across shared trips, flat expenses, and friends.
          </p>
        </div>

        <Button
          onClick={() => setIsAddExpenseOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm sm:w-auto w-full"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Expense</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <BalanceCards />

      {/* Quick Action Buttons */}
      <QuickActions
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenSettleModal={() => setIsSettleOpen(true)}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenAddFriend={() => setIsAddFriendOpen(true)}
      />

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Expenses Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">Recent Expenses</h2>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-2.5 rounded-lg border border-input bg-card text-xs w-36 sm:w-44 focus:ring-1 focus:ring-ring"
                />
              </div>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-medium focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/50 space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No expenses found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchTerm
                  ? 'Try searching with different keywords or clearing your group filter.'
                  : 'Start tracking shared bills by clicking "Add New Expense" above.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddExpenseOpen(true)}
              >
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  onClick={() => setSelectedExpense(expense)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 col): Quick Settlements & Activity */}
        <div className="space-y-6">
          {/* Recent Activity Trail */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Audit Activity</h2>
              <Link
                href="/activity"
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                View all
              </Link>
            </div>
            <RecentActivity />
          </div>

          {/* Quick Group Shortcuts */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Your Groups ({groups.length})
              </h3>
              <Link
                href="/groups"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                Manage
              </Link>
            </div>
            <div className="space-y-2">
              {groups.slice(0, 3).map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-xs font-medium"
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>{g.members?.length || 0} members</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={(exp) => {
          setSelectedExpense(null);
          setEditingExpense(exp);
          setIsAddExpenseOpen(true);
        }}
      />

      {/* Page-level modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        expenseToEdit={editingExpense}
      />
      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
      />
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
    </div>
  );
}
