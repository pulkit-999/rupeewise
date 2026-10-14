'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { ExpenseItem } from '@/components/expenses/ExpenseItem';
import { ExpenseDetailModal } from '@/components/expenses/ExpenseDetailModal';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { SettleModal } from '@/components/settlements/SettleModal';
import { GroupBalances } from '@/components/groups/GroupBalances';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Expense } from '@/types/database';
import { formatINR } from '@/lib/currency';
import { format } from 'date-fns';
import {
  Users,
  PlusCircle,
  Scale,
  Receipt,
  History,
  Settings,
  UserPlus,
  ArrowLeft,
  Archive,
  LogOut,
  Crown,
  Share2,
  Copy,
  Check,
  Trash2,
  UserMinus,
} from 'lucide-react';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const {
    groups,
    expenses,
    activities,
    currentUser,
    users,
    archiveGroup,
    deleteGroup,
    leaveGroup,
    removeMemberFromGroup,
    addMemberToGroup,
    transferOwnership,
  } = useAppStore();

  const group = groups.find((g) => g.id === groupId);

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'activity' | 'settings'>('expenses');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${group?.id || ''}`
      : '';

  const handleShareInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (!group) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-lg font-bold">Group Not Found</h2>
        <p className="text-xs text-muted-foreground">This group may have been removed or does not exist.</p>
        <Button onClick={() => router.push('/groups')}>Back to Groups</Button>
      </div>
    );
  }

  const groupExpenses = expenses
    .filter((e) => e.group_id === group.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpend = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

  const groupActivities = activities.filter((a) => a.group_id === group.id);

  const currentMember = group.members?.find((m) => m.user_id === currentUser.id);
  const isOwner = group.created_by === currentUser.id || currentMember?.role === 'owner';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const success = addMemberToGroup(group.id, inviteEmail.trim());
    if (success) {
      setInviteMessage(`Member added to ${group.name}!`);
      setInviteEmail('');
    } else {
      setInviteMessage('Could not add member. Share the invite link directly with your friend.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button */}
      <button
        onClick={() => router.push('/groups')}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Groups</span>
      </button>

      {/* Group Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{group.name}</h1>
            <Badge variant="outline" className="capitalize text-xs">
              {group.type}
            </Badge>
            {group.is_archived && <Badge variant="warning">Archived</Badge>}
          </div>

          {group.description && (
            <p className="text-xs text-muted-foreground max-w-xl">{group.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs pt-1">
            <div>
              <span className="text-muted-foreground">Total Group Spend: </span>
              <span className="font-bold text-foreground">{formatINR(totalSpend)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Members ({group.members?.length || 0}):</span>
              <div className="flex -space-x-1">
                {(group.members || []).map((m) => (
                  <Avatar
                    key={m.id}
                    src={m.user?.avatar_url}
                    name={m.user?.full_name || 'Member'}
                    size="sm"
                    className="border-2 border-card"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            onClick={handleShareInvite}
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
          >
            {copiedInvite ? (
              <>
                <Check className="w-4 h-4 mr-1 text-emerald-600" />
                Invite Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-1 text-emerald-600" />
                Share Invite Link
              </>
            )}
          </Button>

          <Button
            onClick={() => setIsSettleOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
          >
            <Scale className="w-4 h-4 mr-1 text-emerald-600" />
            Settle Up
          </Button>

          <Button
            onClick={() => setIsAddExpenseOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/80 space-x-6 text-xs font-semibold">
        {[
          { id: 'expenses', label: `Expenses (${groupExpenses.length})`, icon: Receipt },
          { id: 'balances', label: 'Balances & Settle', icon: Scale },
          { id: 'activity', label: 'Activity', icon: History },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 pt-1 border-b-2 transition-all ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {groupExpenses.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-3">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No expenses in this group yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add your first hotel booking, dinner, taxi bill, or groceries for this group.
              </p>
              <Button size="sm" onClick={() => setIsAddExpenseOpen(true)}>
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {groupExpenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  onClick={() => setSelectedExpense(expense)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Balances & Settle */}
      {activeTab === 'balances' && <GroupBalances group={group} />}

      {/* Tab 3: Activity */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          {groupActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No recent activity recorded for this group.
            </div>
          ) : (
            <div className="space-y-2">
              {groupActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-border bg-card flex items-start gap-3 text-xs"
                >
                  <Avatar src={act.user?.avatar_url} name={act.user?.full_name || 'U'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">{act.details.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {act.created_at ? format(new Date(act.created_at), 'dd MMM yyyy, HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{act.details.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          {/* Shareable Group Invite Link */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              Shareable Group Invite Link
            </h3>
            <p className="text-xs text-muted-foreground">
              Send this link to your friends. They can join the group with their email and start adding/splitting expenses right away.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="h-9 text-xs bg-muted font-mono select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShareInvite}
                className="flex-shrink-0 min-w-[90px]"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = `Join my group "${group.name}" on RupeeWise to split expenses: ${inviteLink}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Share on WhatsApp
              </Button>
            </div>
          </div>

          {/* Invite Member */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Add Member by Email
            </h3>
            <p className="text-xs text-muted-foreground">
              Directly add a friend or roommate if they already have an account.
            </p>
            {inviteMessage && (
              <div className="text-xs p-2 rounded-lg bg-muted text-foreground font-medium">
                {inviteMessage}
              </div>
            )}
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                placeholder="e.g. rohan@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9 text-xs"
              />
              <Button type="submit" size="sm" disabled={!inviteEmail.trim()}>
                Invite
              </Button>
            </form>
          </div>

          {/* Members & Ownership */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Group Members</h3>
            <div className="divide-y divide-border/60">
              {(group.members || []).map((m) => {
                const u = m.user || users.find((x) => x.id === m.user_id);
                const isGroupOwner = group.created_by === m.user_id;

                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u?.avatar_url} name={u?.full_name || 'Member'} size="sm" />
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{u?.full_name || 'Member'}</span>
                          {isGroupOwner && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> Owner
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{u?.email}</span>
                      </div>
                    </div>

                    {isOwner && !isGroupOwner && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Transfer group ownership to ${u?.full_name}?`)) {
                              transferOwnership(group.id, m.user_id);
                            }
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
                        >
                          Make Owner
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove ${u?.full_name || 'this member'} from "${group.name}"?`)) {
                              removeMemberFromGroup(group.id, m.user_id);
                            }
                          }}
                          className="text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7 px-2 font-medium"
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20 space-y-3">
            <h3 className="text-sm font-bold text-rose-600">Danger Zone</h3>
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-xs font-semibold text-foreground">Archive Group</div>
                <div className="text-[11px] text-muted-foreground">
                  Hides the group from the main view while preserving balances.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveGroup(group.id)}
                className="text-xs"
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                {group.is_archived ? 'Unarchive' : 'Archive'}
              </Button>
            </div>

            {/* Delete Group permanently */}
            {isOwner && (
              <div className="flex items-center justify-between pt-3 border-t border-rose-200/50">
                <div>
                  <div className="text-xs font-semibold text-rose-600">Delete Group Permanently</div>
                  <div className="text-[11px] text-muted-foreground">
                    Completely deletes this group, all its expenses, and settlements from RupeeWise and Supabase.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        `Are you sure you want to permanently delete "${group.name}"? All expenses, splits, and settlements for this group will be deleted. This cannot be undone.`
                      )
                    ) {
                      deleteGroup(group.id);
                      router.push('/groups');
                    }
                  }}
                  className="text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Group
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-rose-200/50">
              <div>
                <div className="text-xs font-semibold text-foreground">Leave Group</div>
                <div className="text-[11px] text-muted-foreground">
                  Remove yourself from this group.
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to leave this group?')) {
                    leaveGroup(group.id, currentUser.id);
                    router.push('/groups');
                  }
                }}
                className="text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Leave Group
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        defaultGroupId={group.id}
        expenseToEdit={editingExpense}
      />
      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        groupId={group.id}
      />
    </div>
  );
}
