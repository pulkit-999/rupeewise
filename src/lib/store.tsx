'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Group,
  Expense,
  Settlement,
  Category,
  ActivityLog,
  Friendship,
  GroupMember,
  MemberRole,
} from '@/types/database';
import {
  MOCK_USERS,
  MOCK_CATEGORIES,
  MOCK_GROUPS,
  MOCK_FRIENDSHIPS,
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
  MOCK_ACTIVITIES,
} from './mock-data';
import { calculateNetBalances, simplifyDebts, calculateDirectDebts } from './debt-simplification';
import { formatINR } from './currency';
import { createClient } from './supabase/client';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DEFAULT_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'you@example.com',
  full_name: 'You',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  default_currency: 'INR',
  upi_id: '',
  created_at: '2024-01-01T00:00:00.000Z',
};

const USER_STORAGE_KEY = 'rupeewise_device_user_v2';
const STORAGE_KEY = 'rupeewise_app_state_v2';

function getDeviceUser(): User {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}

  const id = generateUUID();
  const newUser: User = {
    id,
    email: `user_${id.slice(0, 8)}@rupeewise.app`,
    full_name: 'You',
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=You`,
    default_currency: 'INR',
    upi_id: '',
    created_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  } catch {}
  return newUser;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  categories: Category[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  friendships: Friendship[];
  activities: ActivityLog[];

  // Group actions
  createGroup: (group: Omit<Group, 'id' | 'created_at' | 'created_by' | 'is_archived'>, memberUserIds: string[]) => Group;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  archiveGroup: (id: string) => void;
  leaveGroup: (groupId: string, userId: string) => void;
  addMemberToGroup: (groupId: string, email: string) => boolean;
  transferOwnership: (groupId: string, newOwnerId: string) => void;

  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addComment: (expenseId: string, comment: string) => void;

  // Settlement actions
  recordSettlement: (settlement: Omit<Settlement, 'id' | 'created_at'>) => Settlement;

  // Friends actions
  addFriendByEmail: (email: string) => { success: boolean; message: string };
  removeFriend: (friendshipId: string) => void;

  // Calculations
  getUserNetBalance: (userId?: string) => number;
  getUserOwedAmount: (userId?: string) => number;
  getUserOwingAmount: (userId?: string) => number;
  getGroupBalances: (groupId: string) => { user: User; totalPaid: number; totalOwed: number; netBalance: number }[];
  getGroupDebts: (groupId: string, simplified?: boolean) => ReturnType<typeof simplifyDebts>;
  getFriendBalance: (friendId: string) => number;

  // Reset and Data Management
  clearAllData: () => void;
  loadDemoData: () => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User>(DEFAULT_USER);
  const [users, setUsers] = useState<User[]>([DEFAULT_USER]);
  const [categories] = useState<Category[]>(MOCK_CATEGORIES);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const setCurrentUser = (u: User) => {
    setCurrentUserState(u);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } catch {}
    // Background upsert user in Supabase
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('users').upsert({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          default_currency: u.default_currency || 'INR',
          upi_id: u.upi_id || null,
        });
      } catch {}
    })();
  };

  // Cloud sync from Supabase
  const syncWithSupabase = useCallback(async (activeUser: User) => {
    try {
      const supabase = createClient();

      // Upsert current device user into Supabase so foreign keys never fail
      await supabase.from('users').upsert({
        id: activeUser.id,
        email: activeUser.email,
        full_name: activeUser.full_name,
        avatar_url: activeUser.avatar_url,
        default_currency: activeUser.default_currency || 'INR',
        upi_id: activeUser.upi_id || null,
      });

      // Parallel fetch of all shared records from Cloud PostgreSQL
      const [
        usersRes,
        groupsRes,
        expensesRes,
        settlementsRes,
        activitiesRes,
        friendshipsRes,
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('groups').select('*, members:group_members(*, user:users(*))'),
        supabase.from('expenses').select('*, payers:expense_payers(*, user:users(*)), splits:expense_splits(*, user:users(*)), category:categories(*)'),
        supabase.from('settlements').select('*, payer:users!settlements_payer_id_fkey(*), receiver:users!settlements_receiver_id_fkey(*)'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('friendships').select('*, friend:users!friendships_friend_id_fkey(*)'),
      ]);

      if (usersRes.data && usersRes.data.length > 0) {
        const fetchedUsers = [...usersRes.data];
        if (!fetchedUsers.some((u) => u.id === activeUser.id)) {
          fetchedUsers.push(activeUser);
        }
        setUsers(fetchedUsers);
      }

      if (groupsRes.data) setGroups(groupsRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (settlementsRes.data) setSettlements(settlementsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
      if (friendshipsRes.data) setFriendships(friendshipsRes.data);
    } catch (err) {
      console.warn('Supabase cloud sync notification:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const devUser = getDeviceUser();
    setCurrentUserState(devUser);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.groups) setGroups(parsed.groups);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.settlements) setSettlements(parsed.settlements);
        if (parsed.friendships) setFriendships(parsed.friendships);
        if (parsed.activities) setActivities(parsed.activities);
      }
    } catch (e) {
      console.warn('Could not load local storage:', e);
    } finally {
      setIsLoaded(true);
    }

    // Trigger cloud synchronization
    syncWithSupabase(devUser);

    // Setup Supabase Realtime channel so any updates from friends sync live
    const supabase = createClient();
    const channel = supabase
      .channel('shared_ledger_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        syncWithSupabase(devUser);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        syncWithSupabase(devUser);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
        syncWithSupabase(devUser);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncWithSupabase]);

  // Save to local storage cache
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const state = {
        currentUserId: currentUser.id,
        users,
        groups,
        expenses,
        settlements,
        friendships,
        activities,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to local storage:', e);
    }
  }, [currentUser, users, groups, expenses, settlements, friendships, activities, isLoaded]);

  const clearAllData = () => {
    setGroups([]);
    setExpenses([]);
    setSettlements([]);
    setFriendships([]);
    setActivities([]);
    setUsers([currentUser]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('rupeewise_app_state_v1');

    // Also remove from Supabase
    (async () => {
      try {
        const supabase = createClient();
        await Promise.all([
          supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('friendships').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        ]);
      } catch {}
    })();
  };

  const loadDemoData = () => {
    setCurrentUser(MOCK_USERS[0]);
    setUsers(MOCK_USERS);
    setGroups(MOCK_GROUPS);
    setExpenses(MOCK_EXPENSES);
    setSettlements(MOCK_SETTLEMENTS);
    setFriendships(MOCK_FRIENDSHIPS);
    setActivities(MOCK_ACTIVITIES);
  };

  const resetDemoData = clearAllData;

  // Helper map for fast user lookups
  const usersMap = new Map<string, User>(users.map((u) => [u.id, u]));

  // Groups
  const createGroup = (
    groupData: Omit<Group, 'id' | 'created_at' | 'created_by' | 'is_archived'>,
    memberUserIds: string[]
  ): Group => {
    const groupId = generateUUID();
    const allMembers = Array.from(new Set([currentUser.id, ...memberUserIds]));

    const members: GroupMember[] = allMembers.map((userId) => ({
      id: generateUUID(),
      group_id: groupId,
      user_id: userId,
      role: userId === currentUser.id ? 'owner' : 'member',
      joined_at: new Date().toISOString(),
      user: usersMap.get(userId),
    }));

    const newGroup: Group = {
      ...groupData,
      id: groupId,
      is_archived: false,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      members,
    };

    setGroups((prev) => [newGroup, ...prev]);

    // Activity log
    const activity: ActivityLog = {
      id: generateUUID(),
      group_id: groupId,
      user_id: currentUser.id,
      entity_type: 'group',
      entity_id: groupId,
      action: 'created',
      details: {
        title: `Created group "${newGroup.name}"`,
        description: `${currentUser.full_name} created the group with ${members.length} members`,
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    // Cloud insert
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('groups').insert({
          id: groupId,
          name: newGroup.name,
          description: newGroup.description || null,
          type: newGroup.type,
          currency: newGroup.currency || 'INR',
          created_by: currentUser.id,
        });
        await supabase.from('group_members').insert(
          members.map((m) => ({
            id: m.id,
            group_id: groupId,
            user_id: m.user_id,
            role: m.role,
          }))
        );
        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: groupId,
          user_id: currentUser.id,
          entity_type: 'group',
          entity_id: groupId,
          action: 'created',
          details: activity.details,
        });
      } catch (e) {
        console.warn('Error saving group to Supabase:', e);
      }
    })();

    return newGroup;
  };

  const updateGroup = (id: string, updates: Partial<Group>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('groups').update(updates).eq('id', id);
      } catch {}
    })();
  };

  const archiveGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const newArchived = !g.is_archived;
        (async () => {
          try {
            const supabase = createClient();
            await supabase.from('groups').update({ is_archived: newArchived }).eq('id', id);
          } catch {}
        })();
        return { ...g, is_archived: newArchived };
      })
    );
  };

  const leaveGroup = (groupId: string, userId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          members: (g.members || []).filter((m) => m.user_id !== userId),
        };
      })
    );
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('group_members').delete().match({ group_id: groupId, user_id: userId });
      } catch {}
    })();
  };

  const addMemberToGroup = (groupId: string, email: string): boolean => {
    const targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) return false;

    const newMemberId = generateUUID();
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const exists = (g.members || []).some((m) => m.user_id === targetUser.id);
        if (exists) return g;
        const newMember: GroupMember = {
          id: newMemberId,
          group_id: groupId,
          user_id: targetUser.id,
          role: 'member',
          joined_at: new Date().toISOString(),
          user: targetUser,
        };
        return {
          ...g,
          members: [...(g.members || []), newMember],
        };
      })
    );

    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('group_members').insert({
          id: newMemberId,
          group_id: groupId,
          user_id: targetUser.id,
          role: 'member',
        });
      } catch {}
    })();

    return true;
  };

  const transferOwnership = (groupId: string, newOwnerId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          created_by: newOwnerId,
          members: (g.members || []).map((m) => ({
            ...m,
            role: m.user_id === newOwnerId ? 'owner' : m.role === 'owner' ? 'admin' : m.role,
          })),
        };
      })
    );
  };

  // Expenses
  const addExpense = (
    expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Expense => {
    const expenseId = generateUUID();
    const payersWithIds = (expenseData.payers || []).map((p) => ({
      ...p,
      id: p.id || generateUUID(),
      expense_id: expenseId,
      user: usersMap.get(p.user_id),
    }));
    const splitsWithIds = (expenseData.splits || []).map((s) => ({
      ...s,
      id: s.id || generateUUID(),
      expense_id: expenseId,
      user: usersMap.get(s.user_id),
    }));

    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      payers: payersWithIds,
      splits: splitsWithIds,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: categories.find((c) => c.id === expenseData.category_id),
      group: groups.find((g) => g.id === expenseData.group_id),
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Activity log
    const activity: ActivityLog = {
      id: generateUUID(),
      group_id: expenseData.group_id,
      user_id: currentUser.id,
      entity_type: 'expense',
      entity_id: expenseId,
      action: 'created',
      details: {
        title: `Added "${newExpense.description}"`,
        description: `${currentUser.full_name} added an expense of ${formatINR(newExpense.amount)}`,
        amount: newExpense.amount,
        currency: newExpense.currency,
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    // Cloud insert to Supabase
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('expenses').insert({
          id: expenseId,
          group_id: expenseData.group_id || null,
          description: expenseData.description,
          amount: expenseData.amount,
          currency: expenseData.currency || 'INR',
          date: expenseData.date || new Date().toISOString(),
          category_id: expenseData.category_id,
          notes: expenseData.notes || null,
          split_type: expenseData.split_type,
          created_by: currentUser.id,
        });

        if (payersWithIds.length > 0) {
          await supabase.from('expense_payers').insert(
            payersWithIds.map((p) => ({
              id: p.id,
              expense_id: expenseId,
              user_id: p.user_id,
              amount_paid: p.amount_paid,
            }))
          );
        }

        if (splitsWithIds.length > 0) {
          await supabase.from('expense_splits').insert(
            splitsWithIds.map((s) => ({
              id: s.id,
              expense_id: expenseId,
              user_id: s.user_id,
              amount_owed: s.amount_owed,
              percentage: s.percentage || null,
              shares: s.shares || null,
            }))
          );
        }

        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: expenseData.group_id || null,
          user_id: currentUser.id,
          entity_type: 'expense',
          entity_id: expenseId,
          action: 'created',
          details: activity.details,
        });
      } catch (e) {
        console.warn('Error saving expense to Supabase:', e);
      }
    })();

    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
      )
    );
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    setExpenses((prev) => prev.filter((e) => e.id !== id));

    const activity: ActivityLog = {
      id: generateUUID(),
      group_id: exp.group_id,
      user_id: currentUser.id,
      entity_type: 'expense',
      entity_id: id,
      action: 'deleted',
      details: {
        title: `Deleted "${exp.description}"`,
        description: `${currentUser.full_name} deleted the expense of ${formatINR(exp.amount)}`,
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('expenses').delete().eq('id', id);
        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: exp.group_id || null,
          user_id: currentUser.id,
          entity_type: 'expense',
          entity_id: id,
          action: 'deleted',
          details: activity.details,
        });
      } catch (e) {
        console.warn('Error deleting expense in Supabase:', e);
      }
    })();
  };

  const addComment = (expenseId: string, commentText: string) => {
    const comment = {
      id: generateUUID(),
      expense_id: expenseId,
      user_id: currentUser.id,
      comment: commentText,
      created_at: new Date().toISOString(),
      user: currentUser,
    };

    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        return {
          ...e,
          comments: [...(e.comments || []), comment],
        };
      })
    );

    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('expense_comments').insert({
          id: comment.id,
          expense_id: expenseId,
          user_id: currentUser.id,
          comment: commentText,
        });
      } catch {}
    })();
  };

  // Settlements
  const recordSettlement = (
    settlementData: Omit<Settlement, 'id' | 'created_at'>
  ): Settlement => {
    const settlementId = generateUUID();
    const newSettlement: Settlement = {
      ...settlementData,
      id: settlementId,
      created_at: new Date().toISOString(),
      payer: usersMap.get(settlementData.payer_id),
      receiver: usersMap.get(settlementData.receiver_id),
      group: groups.find((g) => g.id === settlementData.group_id),
    };

    setSettlements((prev) => [newSettlement, ...prev]);

    const payer = usersMap.get(settlementData.payer_id);
    const receiver = usersMap.get(settlementData.receiver_id);
    const activity: ActivityLog = {
      id: generateUUID(),
      group_id: settlementData.group_id,
      user_id: currentUser.id,
      entity_type: 'settlement',
      entity_id: settlementId,
      action: 'created',
      details: {
        title: `Payment settled`,
        description: `${payer?.full_name || 'Someone'} paid ${receiver?.full_name || 'someone'} ${formatINR(settlementData.amount)} via ${settlementData.payment_method.toUpperCase()}`,
        amount: settlementData.amount,
        currency: settlementData.currency,
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('settlements').insert({
          id: settlementId,
          group_id: settlementData.group_id || null,
          payer_id: settlementData.payer_id,
          receiver_id: settlementData.receiver_id,
          amount: settlementData.amount,
          currency: settlementData.currency || 'INR',
          payment_method: settlementData.payment_method,
          reference_note: settlementData.reference_note || null,
          settled_at: settlementData.settled_at || new Date().toISOString(),
        });
        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: settlementData.group_id || null,
          user_id: currentUser.id,
          entity_type: 'settlement',
          entity_id: settlementId,
          action: 'created',
          details: activity.details,
        });
      } catch (e) {
        console.warn('Error saving settlement to Supabase:', e);
      }
    })();

    return newSettlement;
  };

  // Friends
  const addFriendByEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === currentUser.email.toLowerCase()) {
      return { success: false, message: "You cannot add yourself as a friend." };
    }

    const existingFriendship = friendships.find(
      (f) =>
        f.friend?.email.toLowerCase() === cleanEmail ||
        (f.user_id === currentUser.id && usersMap.get(f.friend_id)?.email.toLowerCase() === cleanEmail)
    );

    if (existingFriendship) {
      return { success: false, message: "This person is already in your friends list." };
    }

    let friendUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!friendUser) {
      const newUserId = generateUUID();
      const namePart = cleanEmail.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      friendUser = {
        id: newUserId,
        email: cleanEmail,
        full_name: formattedName,
        default_currency: 'INR',
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formattedName)}`,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, friendUser!]);

      (async () => {
        try {
          const supabase = createClient();
          await supabase.from('users').upsert({
            id: friendUser!.id,
            email: friendUser!.email,
            full_name: friendUser!.full_name,
            avatar_url: friendUser!.avatar_url,
            default_currency: 'INR',
          });
        } catch {}
      })();
    }

    const friendshipId = generateUUID();
    const newFriendship: Friendship = {
      id: friendshipId,
      user_id: currentUser.id,
      friend_id: friendUser.id,
      status: 'accepted',
      created_at: new Date().toISOString(),
      friend: friendUser,
    };

    setFriendships((prev) => [newFriendship, ...prev]);

    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('friendships').insert({
          id: friendshipId,
          user_id: currentUser.id,
          friend_id: friendUser!.id,
          status: 'accepted',
        });
      } catch {}
    })();

    return { success: true, message: `Added ${friendUser.full_name} to your friends!` };
  };

  const removeFriend = (friendshipId: string) => {
    setFriendships((prev) => prev.filter((f) => f.id !== friendshipId));
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('friendships').delete().eq('id', friendshipId);
      } catch {}
    })();
  };

  // Calculations
  const getUserNetBalance = (userId: string = currentUser.id): number => {
    const netBalances = calculateNetBalances(expenses, settlements);
    return netBalances.get(userId) || 0;
  };

  const getUserOwedAmount = (userId: string = currentUser.id): number => {
    // Total debts where toUserId === userId
    const directDebts = calculateDirectDebts(expenses, settlements, usersMap);
    return directDebts
      .filter((d) => d.toUserId === userId)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getUserOwingAmount = (userId: string = currentUser.id): number => {
    // Total debts where fromUserId === userId
    const directDebts = calculateDirectDebts(expenses, settlements, usersMap);
    return directDebts
      .filter((d) => d.fromUserId === userId)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getGroupBalances = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return [];

    const groupExpenses = expenses.filter((e) => e.group_id === groupId);
    const groupSettlements = settlements.filter((s) => s.group_id === groupId);
    const memberIds = (group.members || []).map((m) => m.user_id);

    return memberIds.map((userId) => {
      const user = usersMap.get(userId) || {
        id: userId,
        email: 'unknown@example.com',
        full_name: 'Unknown Member',
        default_currency: 'INR',
        created_at: new Date().toISOString(),
      };

      // Sum paid
      const totalPaid = groupExpenses.reduce((sum, exp) => {
        const payer = exp.payers.find((p) => p.user_id === userId);
        return sum + (payer ? payer.amount_paid : 0);
      }, 0);

      // Sum owed
      const totalOwed = groupExpenses.reduce((sum, exp) => {
        const split = exp.splits.find((s) => s.user_id === userId);
        return sum + (split ? split.amount_owed : 0);
      }, 0);

      // Settlements sent and received
      const sent = groupSettlements
        .filter((s) => s.payer_id === userId)
        .reduce((sum, s) => sum + s.amount, 0);

      const got = groupSettlements
        .filter((s) => s.receiver_id === userId)
        .reduce((sum, s) => sum + s.amount, 0);

      const netBalance = totalPaid - totalOwed + sent - got;

      return {
        user,
        totalPaid,
        totalOwed,
        netBalance,
      };
    });
  };

  const getGroupDebts = (groupId: string, simplified: boolean = true) => {
    const groupExpenses = expenses.filter((e) => e.group_id === groupId);
    const groupSettlements = settlements.filter((s) => s.group_id === groupId);

    return simplified
      ? simplifyDebts(groupExpenses, groupSettlements, usersMap)
      : calculateDirectDebts(groupExpenses, groupSettlements, usersMap);
  };

  const getFriendBalance = (friendId: string): number => {
    const directDebts = calculateDirectDebts(expenses, settlements, usersMap);
    const theyOweMe = directDebts.find((d) => d.fromUserId === friendId && d.toUserId === currentUser.id)?.amount || 0;
    const iOweThem = directDebts.find((d) => d.fromUserId === currentUser.id && d.toUserId === friendId)?.amount || 0;
    return theyOweMe - iOweThem;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        categories,
        groups,
        expenses,
        settlements,
        friendships,
        activities,
        createGroup,
        updateGroup,
        archiveGroup,
        leaveGroup,
        addMemberToGroup,
        transferOwnership,
        addExpense,
        updateExpense,
        deleteExpense,
        addComment,
        recordSettlement,
        addFriendByEmail,
        removeFriend,
        getUserNetBalance,
        getUserOwedAmount,
        getUserOwingAmount,
        getGroupBalances,
        getGroupDebts,
        getFriendBalance,
        clearAllData,
        loadDemoData,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
