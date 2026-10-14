'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatINR } from '@/lib/currency';
import Link from 'next/link';
import {
  Users2,
  PlusCircle,
  Plane,
  Home,
  Heart,
  Calendar,
  Folder,
  ArrowRight,
  Archive,
  Trash2,
} from 'lucide-react';

export default function GroupsPage() {
  const { groups, expenses, currentUser, getGroupBalances, deleteGroup } = useAppStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const typeIconMap: Record<string, any> = {
    trip: Plane,
    home: Home,
    couple: Heart,
    event: Calendar,
    other: Folder,
  };

  const filteredGroups = groups.filter((g) => {
    if (!showArchived && g.is_archived) return false;
    if (showArchived && !g.is_archived) return false;
    if (filterType !== 'all' && g.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Groups
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
              {groups.length}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize trips, apartment expenses, couples, and shared events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs"
          >
            <Archive className="w-3.5 h-3.5 mr-1" />
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Group</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', 'trip', 'home', 'couple', 'event', 'other'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap capitalize transition-all ${
              filterType === t
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t === 'all' ? 'All Groups' : t}
          </button>
        ))}
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
          <Users2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No groups found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {showArchived
              ? 'No archived groups.'
              : 'Create a group for a trip, roommate rent, or weekend plan.'}
          </p>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            Create New Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const Icon = typeIconMap[group.type] || Folder;
            const groupExps = expenses.filter((e) => e.group_id === group.id);
            const totalGroupSpend = groupExps.reduce((sum, e) => sum + e.amount, 0);

            // User's balance in this group
            const balances = getGroupBalances(group.id);
            const myBalance = balances.find((b) => b.user.id === currentUser.id)?.netBalance || 0;

            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="group p-5 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                          {group.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="capitalize">{group.type}</span>
                          <span>•</span>
                          <span>{group.members?.length || 0} members</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {group.is_archived && <Badge variant="outline">Archived</Badge>}
                      {group.created_by === currentUser.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (
                              confirm(
                                `Are you sure you want to permanently delete "${group.name}"? This cannot be undone.`
                              )
                            ) {
                              deleteGroup(group.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Member avatars & financial stats */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {(group.members || []).slice(0, 4).map((m) => (
                      <Avatar
                        key={m.id}
                        src={m.user?.avatar_url}
                        name={m.user?.full_name || 'M'}
                        size="sm"
                        className="border-2 border-card"
                      />
                    ))}
                    {(group.members || []).length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center border-2 border-card">
                        +{(group.members || []).length - 4}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Your Balance</div>
                    <div className="font-bold text-xs">
                      {myBalance > 0.009 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{formatINR(myBalance)}
                        </span>
                      ) : myBalance < -0.009 ? (
                        <span className="text-rose-500">{formatINR(myBalance)}</span>
                      ) : (
                        <span className="text-muted-foreground">₹0.00 (Settled)</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
