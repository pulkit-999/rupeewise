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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureValidUUID(id?: string): string {
  if (id && UUID_REGEX.test(id)) return id;
  return generateUUID();
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

const USER_STORAGE_KEY = 'rupeewise_device_user_v4';
const STORAGE_KEY = 'rupeewise_app_state_v4';

async function ensureUserInSupabase(supabase: any, user: User): Promise<string> {
  const validId = ensureValidUUID(user.id);
  const cleanEmail = user.email?.trim().toLowerCase();
  const safeEmail = cleanEmail || `user_${validId.replace(/-/g, '').slice(0, 10)}@rupeewise.app`;

  try {
    const { error } = await supabase.from('users').upsert(
      {
        id: validId,
        email: safeEmail,
        full_name: user.full_name || 'Member',
        avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'You')}`,
        default_currency: 'INR',
        upi_id: user.upi_id || null,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('ensureUserInSupabase warning:', error.message);
    }
  } catch (e) {
    console.warn('ensureUserInSupabase error:', e);
  }
  return validId;
}

function getDeviceUser(): User & { isOnboarded?: boolean } {
  if (typeof window === 'undefined') return { ...DEFAULT_USER, isOnboarded: false };
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.email && !parsed.email.includes('rupeewise.app') && parsed.isOnboarded) {
        return { ...parsed, isOnboarded: true };
      }
    }
  } catch {}

  return {
    id: generateUUID(),
    email: '',
    full_name: '',
    avatar_url: '',
    default_currency: 'INR',
    upi_id: '',
    created_at: new Date().toISOString(),
    isOnboarded: false,
  };
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isOnboarded: boolean;
  isLoaded: boolean;
  onboardUser: (data: { full_name: string; email: string; upi_id?: string }) => Promise<User>;
  joinGroupById: (groupId: string, user: User) => Promise<boolean>;
  switchUser: (email: string) => Promise<User>;
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
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
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
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...u, isOnboarded: true }));
    } catch {}
    (async () => {
      try {
        const supabase = createClient();
        await ensureUserInSupabase(supabase, u);
      } catch {}
    })();
  };

  // Cloud sync from Supabase - scoped only to activeUser's groups and data
  const syncWithSupabase = useCallback(async (activeUser: User) => {
    if (!activeUser || !activeUser.email || activeUser.email.includes('rupeewise.app')) {
      return;
    }

    try {
      const supabase = createClient();
      const validUserId = await ensureUserInSupabase(supabase, activeUser);

      // 1. Fetch group IDs where activeUser is a member or creator
      const [membershipsRes, createdGroupsRes] = await Promise.all([
        supabase.from('group_members').select('group_id').eq('user_id', validUserId),
        supabase.from('groups').select('id').eq('created_by', validUserId),
      ]);

      const userGroupIds = Array.from(
        new Set([
          ...(membershipsRes.data || []).map((m: any) => m.group_id),
          ...(createdGroupsRes.data || []).map((g: any) => g.id),
        ])
      );

      // 2. Fetch those groups with their members
      let userGroups: Group[] = [];
      if (userGroupIds.length > 0) {
        const { data: gData } = await supabase
          .from('groups')
          .select('*, members:group_members(*, user:users(*))')
          .in('id', userGroupIds);
        if (gData) userGroups = gData;
      }
      setGroups(userGroups);

      // 3. Fetch user's expenses (groups or direct)
      let userExpenses: Expense[] = [];
      if (userGroupIds.length > 0) {
        const { data: expData } = await supabase
          .from('expenses')
          .select('*, payers:expense_payers(*, user:users(*)), splits:expense_splits(*, user:users(*)), category:categories(*)')
          .or(`group_id.in.(${userGroupIds.join(',')}),created_by.eq.${validUserId}`);
        if (expData) userExpenses = expData;
      } else {
        const { data: expData } = await supabase
          .from('expenses')
          .select('*, payers:expense_payers(*, user:users(*)), splits:expense_splits(*, user:users(*)), category:categories(*)')
          .eq('created_by', validUserId);
        if (expData) userExpenses = expData;
      }
      setExpenses(userExpenses);

      // 4. Fetch user's settlements
      let userSettlements: Settlement[] = [];
      if (userGroupIds.length > 0) {
        const { data: stlData } = await supabase
          .from('settlements')
          .select('*, payer:users!settlements_payer_id_fkey(*), receiver:users!settlements_receiver_id_fkey(*)')
          .or(`group_id.in.(${userGroupIds.join(',')}),payer_id.eq.${validUserId},receiver_id.eq.${validUserId}`);
        if (stlData) userSettlements = stlData;
      } else {
        const { data: stlData } = await supabase
          .from('settlements')
          .select('*, payer:users!settlements_payer_id_fkey(*), receiver:users!settlements_receiver_id_fkey(*)')
          .or(`payer_id.eq.${validUserId},receiver_id.eq.${validUserId}`);
        if (stlData) userSettlements = stlData;
      }
      setSettlements(userSettlements);

      // 5. Fetch friendships
      const { data: frData } = await supabase
        .from('friendships')
        .select('*, friend:users!friendships_friend_id_fkey(*)');
      const userFriendships = (frData || [])
        .filter((f: any) => f.user_id === validUserId || f.friend_id === validUserId)
        .map((f: any) => ({
          ...f,
          friend: f.user_id === validUserId ? f.friend : (f.friend || { id: f.user_id, full_name: 'Friend', email: '' }),
        }));
      setFriendships(userFriendships);

      // 6. Gather all relevant users: activeUser + group members + friends
      const usersMap = new Map<string, User>();
      usersMap.set(validUserId, { ...activeUser, id: validUserId });

      for (const g of userGroups) {
        for (const m of g.members || []) {
          if (m.user) usersMap.set(m.user.id, m.user);
        }
      }
      for (const f of userFriendships) {
        if (f.friend) usersMap.set(f.friend.id, f.friend);
      }
      setUsers(Array.from(usersMap.values()));

      // 7. Activity logs
      let userActivities: ActivityLog[] = [];
      if (userGroupIds.length > 0) {
        const { data: actData } = await supabase
          .from('activity_logs')
          .select('*')
          .or(`group_id.in.(${userGroupIds.join(',')}),user_id.eq.${validUserId}`)
          .order('created_at', { ascending: false })
          .limit(50);
        if (actData) userActivities = actData;
      } else {
        const { data: actData } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', validUserId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (actData) userActivities = actData;
      }
      setActivities(userActivities);
    } catch (err) {
      console.warn('Supabase cloud sync notification:', err);
    }
  }, []);

  const onboardUser = async (data: { full_name: string; email: string; upi_id?: string }): Promise<User> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.full_name.trim();
    const supabase = createClient();

    let matchedUser: User | null = null;
    try {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        matchedUser = existingUsers[0];
      }
    } catch (e) {
      console.warn('Error checking existing user in Supabase:', e);
    }

    let finalUser: User;
    if (matchedUser) {
      finalUser = {
        ...matchedUser,
        full_name: cleanName || matchedUser.full_name,
        upi_id: data.upi_id || matchedUser.upi_id,
      };
      await supabase.from('users').update({
        full_name: finalUser.full_name,
        upi_id: finalUser.upi_id || null,
        updated_at: new Date().toISOString(),
      }).eq('id', finalUser.id);
    } else {
      finalUser = {
        id: generateUUID(),
        email: cleanEmail,
        full_name: cleanName || cleanEmail.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName || cleanEmail)}`,
        default_currency: 'INR',
        upi_id: data.upi_id || '',
        created_at: new Date().toISOString(),
      };
      await ensureUserInSupabase(supabase, finalUser);
    }

    const savedProfile = { ...finalUser, isOnboarded: true };
    setCurrentUserState(finalUser);
    setIsOnboarded(true);
    setUsers([finalUser]);

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(savedProfile));
    } catch {}

    await syncWithSupabase(finalUser);
    return finalUser;
  };

  const switchUser = async (email: string): Promise<User> => {
    return onboardUser({ full_name: '', email });
  };

  const joinGroupById = async (groupId: string, user: User): Promise<boolean> => {
    const supabase = createClient();
    const validUserId = await ensureUserInSupabase(supabase, user);

    const { data: grp } = await supabase.from('groups').select('id, name').eq('id', groupId).single();
    if (!grp) return false;

    const { data: existing } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', validUserId);

    if (!existing || existing.length === 0) {
      const memberId = generateUUID();
      const { error } = await supabase.from('group_members').insert({
        id: memberId,
        group_id: groupId,
        user_id: validUserId,
        role: 'member',
      });
      if (error) {
        console.error('Failed to join group in Supabase:', error);
        return false;
      }

      await supabase.from('activity_logs').insert({
        id: generateUUID(),
        group_id: groupId,
        user_id: validUserId,
        entity_type: 'group',
        entity_id: groupId,
        action: 'created',
        details: {
          title: `${user.full_name} joined the group`,
          description: `${user.full_name} (${user.email}) joined via invite link`,
        },
      });
    }

    await syncWithSupabase(user);
    return true;
  };

  // Initial load
  useEffect(() => {
    const devUser = getDeviceUser();
    setCurrentUserState(devUser);
    const onboarded = !!devUser.isOnboarded && !!devUser.email;
    setIsOnboarded(onboarded);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && onboarded) {
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

    if (onboarded) {
      syncWithSupabase(devUser);
    } else {
      setUsers([devUser]);
      setGroups([]);
      setExpenses([]);
      setSettlements([]);
      setFriendships([]);
      setActivities([]);
    }

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        syncWithSupabase(devUser);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
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

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentUserId: currentUser.id,
          users: [currentUser],
          groups: [],
          expenses: [],
          settlements: [],
          friendships: [],
          activities: [],
        })
      );
    } catch {}

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

        if (currentUser.id) {
          const { error: uErr } = await supabase.from('users').delete().neq('id', currentUser.id);
          if (uErr) console.error('Failed to clear other users from Supabase:', uErr);
        }
      } catch (e) {
        console.error('Error clearing data in Supabase:', e);
      }
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
        const validCreatorId = await ensureUserInSupabase(supabase, currentUser);

        for (const m of members) {
          if (m.user) await ensureUserInSupabase(supabase, m.user);
        }

        const { error: gErr } = await supabase.from('groups').insert({
          id: groupId,
          name: newGroup.name,
          description: newGroup.description || null,
          type: newGroup.type,
          currency: newGroup.currency || 'INR',
          created_by: validCreatorId,
        });
        if (gErr) console.error('Failed to save group in Supabase:', gErr);

        const { error: mErr } = await supabase.from('group_members').insert(
          members.map((m) => ({
            id: m.id,
            group_id: groupId,
            user_id: m.user_id,
            role: m.role,
          }))
        );
        if (mErr) console.error('Failed to save group members in Supabase:', mErr);

        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: groupId,
          user_id: validCreatorId,
          entity_type: 'group',
          entity_id: groupId,
          action: 'created',
          details: activity.details,
        });
      } catch (e) {
        console.error('Error saving group to Supabase:', e);
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
    const cleanEmail = email.trim().toLowerCase();
    let targetUser = users.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      const newUserId = generateUUID();
      const namePart = cleanEmail.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      targetUser = {
        id: newUserId,
        email: cleanEmail,
        full_name: formattedName,
        default_currency: 'INR',
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formattedName)}`,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, targetUser!]);
    } else {
      targetUser = { ...targetUser, id: ensureValidUUID(targetUser.id) };
    }

    const newMemberId = generateUUID();
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const exists = (g.members || []).some((m) => m.user_id === targetUser!.id);
        if (exists) return g;
        const newMember: GroupMember = {
          id: newMemberId,
          group_id: groupId,
          user_id: targetUser!.id,
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
        await ensureUserInSupabase(supabase, targetUser!);
        const { error } = await supabase.from('group_members').insert({
          id: newMemberId,
          group_id: groupId,
          user_id: targetUser!.id,
          role: 'member',
        });
        if (error) console.error('Failed to add group member in Supabase:', error);
      } catch (e) {
        console.error('Error adding member to group in Supabase:', e);
      }
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
      id: ensureValidUUID(p.id),
      expense_id: expenseId,
      user: usersMap.get(p.user_id),
    }));
    const splitsWithIds = (expenseData.splits || []).map((s) => ({
      ...s,
      id: ensureValidUUID(s.id),
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
        const validCreatorId = await ensureUserInSupabase(supabase, currentUser);

        for (const p of payersWithIds) {
          if (p.user) await ensureUserInSupabase(supabase, p.user);
        }
        for (const s of splitsWithIds) {
          if (s.user) await ensureUserInSupabase(supabase, s.user);
        }

        const { error: expErr } = await supabase.from('expenses').insert({
          id: expenseId,
          group_id: expenseData.group_id || null,
          description: expenseData.description,
          amount: expenseData.amount,
          currency: expenseData.currency || 'INR',
          date: expenseData.date || new Date().toISOString(),
          category_id: expenseData.category_id,
          notes: expenseData.notes || null,
          receipt_url: expenseData.receipt_url || null,
          split_type: expenseData.split_type,
          created_by: validCreatorId,
        });
        if (expErr) console.error('Failed to save expense in Supabase:', expErr);

        if (payersWithIds.length > 0) {
          const { error: pErr } = await supabase.from('expense_payers').insert(
            payersWithIds.map((p) => ({
              id: p.id,
              expense_id: expenseId,
              user_id: p.user_id,
              amount_paid: p.amount_paid,
            }))
          );
          if (pErr) console.error('Failed to save expense payers in Supabase:', pErr);
        }

        if (splitsWithIds.length > 0) {
          const { error: sErr } = await supabase.from('expense_splits').insert(
            splitsWithIds.map((s) => ({
              id: s.id,
              expense_id: expenseId,
              user_id: s.user_id,
              amount_owed: s.amount_owed,
              percentage: s.percentage || null,
              shares: s.shares || null,
            }))
          );
          if (sErr) console.error('Failed to save expense splits in Supabase:', sErr);
        }

        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: expenseData.group_id || null,
          user_id: validCreatorId,
          entity_type: 'expense',
          entity_id: expenseId,
          action: 'created',
          details: activity.details,
        });
      } catch (e) {
        console.error('Error saving expense to Supabase:', e);
      }
    })();

    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const payersWithIds = updates.payers
      ? updates.payers.map((p) => ({
          ...p,
          id: ensureValidUUID(p.id),
          expense_id: id,
          user: p.user || usersMap.get(p.user_id),
        }))
      : undefined;

    const splitsWithIds = updates.splits
      ? updates.splits.map((s) => ({
          ...s,
          id: ensureValidUUID(s.id),
          expense_id: id,
          user: s.user || usersMap.get(s.user_id),
        }))
      : undefined;

    const targetGroupId = updates.group_id !== undefined ? updates.group_id : existing.group_id;
    const targetCategoryId = updates.category_id !== undefined ? updates.category_id : existing.category_id;

    const updatedExpense: Expense = {
      ...existing,
      ...updates,
      ...(payersWithIds ? { payers: payersWithIds } : {}),
      ...(splitsWithIds ? { splits: splitsWithIds } : {}),
      category: categories.find((c) => c.id === targetCategoryId) || existing.category,
      group: groups.find((g) => g.id === targetGroupId) || existing.group,
      updated_at: new Date().toISOString(),
    };

    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? updatedExpense : e))
    );

    const activity: ActivityLog = {
      id: generateUUID(),
      group_id: targetGroupId,
      user_id: currentUser.id,
      entity_type: 'expense',
      entity_id: id,
      action: 'updated',
      details: {
        title: `Updated "${updatedExpense.description}"`,
        description: `${currentUser.full_name} updated the expense of ${formatINR(updatedExpense.amount)}`,
        amount: updatedExpense.amount,
        currency: updatedExpense.currency,
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    (async () => {
      try {
        const supabase = createClient();
        await ensureUserInSupabase(supabase, currentUser);

        if (payersWithIds) {
          for (const p of payersWithIds) {
            if (p.user) await ensureUserInSupabase(supabase, p.user);
          }
        }
        if (splitsWithIds) {
          for (const s of splitsWithIds) {
            if (s.user) await ensureUserInSupabase(supabase, s.user);
          }
        }

        const expenseUpdatePayload: any = {
          updated_at: new Date().toISOString(),
        };
        if (updates.description !== undefined) expenseUpdatePayload.description = updates.description;
        if (updates.amount !== undefined) expenseUpdatePayload.amount = updates.amount;
        if (updates.currency !== undefined) expenseUpdatePayload.currency = updates.currency;
        if (updates.date !== undefined) expenseUpdatePayload.date = updates.date;
        if (updates.category_id !== undefined) expenseUpdatePayload.category_id = updates.category_id;
        if (updates.notes !== undefined) expenseUpdatePayload.notes = updates.notes || null;
        if (updates.receipt_url !== undefined) expenseUpdatePayload.receipt_url = updates.receipt_url || null;
        if (updates.split_type !== undefined) expenseUpdatePayload.split_type = updates.split_type;
        if (updates.group_id !== undefined) expenseUpdatePayload.group_id = updates.group_id || null;

        const { error: expErr } = await supabase.from('expenses').update(expenseUpdatePayload).eq('id', id);
        if (expErr) console.error('Failed to update expense in Supabase:', expErr);

        if (payersWithIds) {
          await supabase.from('expense_payers').delete().eq('expense_id', id);
          const { error: pErr } = await supabase.from('expense_payers').insert(
            payersWithIds.map((p) => ({
              id: p.id,
              expense_id: id,
              user_id: p.user_id,
              amount_paid: p.amount_paid,
            }))
          );
          if (pErr) console.error('Failed to update expense payers in Supabase:', pErr);
        }

        if (splitsWithIds) {
          await supabase.from('expense_splits').delete().eq('expense_id', id);
          const { error: sErr } = await supabase.from('expense_splits').insert(
            splitsWithIds.map((s) => ({
              id: s.id,
              expense_id: id,
              user_id: s.user_id,
              amount_owed: s.amount_owed,
              percentage: s.percentage || null,
              shares: s.shares || null,
            }))
          );
          if (sErr) console.error('Failed to update expense splits in Supabase:', sErr);
        }

        await supabase.from('activity_logs').insert({
          id: activity.id,
          group_id: targetGroupId || null,
          user_id: currentUser.id,
          entity_type: 'expense',
          entity_id: id,
          action: 'updated',
          details: activity.details,
        });
      } catch (e) {
        console.error('Error updating expense in Supabase:', e);
      }
    })();
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
        const payerUser = usersMap.get(settlementData.payer_id);
        const receiverUser = usersMap.get(settlementData.receiver_id);
        if (payerUser) await ensureUserInSupabase(supabase, payerUser);
        if (receiverUser) await ensureUserInSupabase(supabase, receiverUser);

        const { error: sErr } = await supabase.from('settlements').insert({
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
        if (sErr) console.error('Failed to save settlement in Supabase:', sErr);

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
        console.error('Error saving settlement to Supabase:', e);
      }
    })();

    return newSettlement;
  };

  // Friends
  const addFriendByEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === currentUser.email?.toLowerCase()) {
      return { success: false, message: "You cannot add yourself as a friend." };
    }

    const existingFriendship = friendships.find(
      (f) =>
        f.friend?.email?.toLowerCase() === cleanEmail ||
        (f.user_id === currentUser.id && usersMap.get(f.friend_id)?.email?.toLowerCase() === cleanEmail)
    );

    if (existingFriendship) {
      return { success: false, message: "This person is already in your friends list." };
    }

    let friendUser = users.find((u) => u.email?.toLowerCase() === cleanEmail);
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
    } else {
      friendUser = { ...friendUser, id: ensureValidUUID(friendUser.id) };
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

    const activity: ActivityLog = {
      id: generateUUID(),
      user_id: currentUser.id,
      entity_type: 'friend',
      entity_id: friendUser.id,
      action: 'created',
      details: {
        title: `Added ${friendUser.full_name}`,
        description: `${currentUser.full_name} added ${friendUser.full_name} (${cleanEmail}) as a friend`,
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    (async () => {
      try {
        const supabase = createClient();
        // 1. Ensure current user exists in public.users
        const validCurrentUserId = await ensureUserInSupabase(supabase, currentUser);

        // 2. Ensure friend user exists in public.users
        const validFriendUserId = await ensureUserInSupabase(supabase, friendUser!);

        // 3. Upsert friendship into public.friendships
        const { error: fErr } = await supabase.from('friendships').upsert(
          {
            id: friendshipId,
            user_id: validCurrentUserId,
            friend_id: validFriendUserId,
            status: 'accepted',
          },
          { onConflict: 'user_id,friend_id' }
        );
        if (fErr) console.error('Failed to save friendship in Supabase:', fErr);

        // 4. Record activity log
        await supabase.from('activity_logs').insert({
          id: activity.id,
          user_id: validCurrentUserId,
          entity_type: 'friend',
          entity_id: validFriendUserId,
          action: 'created',
          details: activity.details,
        });
      } catch (e) {
        console.error('Error saving friend to Supabase:', e);
      }
    })();

    return { success: true, message: `Added ${friendUser.full_name} to your friends!` };
  };

  const removeFriend = (friendshipId: string) => {
    const friendship = friendships.find((f) => f.id === friendshipId);
    setFriendships((prev) => prev.filter((f) => f.id !== friendshipId));

    if (friendship) {
      const friendId = friendship.friend_id;
      const isInGroup = groups.some((g) => (g.members || []).some((m) => m.user_id === friendId));
      const isInExpense = expenses.some(
        (e) => (e.payers || []).some((p) => p.user_id === friendId) || (e.splits || []).some((s) => s.user_id === friendId)
      );
      if (!isInGroup && !isInExpense && friendId !== currentUser.id) {
        setUsers((prev) => prev.filter((u) => u.id !== friendId));
      }
    }

    (async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
        if (error) console.error('Failed to remove friendship in Supabase:', error);

        if (friendship) {
          const friendId = friendship.friend_id;
          const isInGroup = groups.some((g) => (g.members || []).some((m) => m.user_id === friendId));
          const isInExpense = expenses.some(
            (e) => (e.payers || []).some((p) => p.user_id === friendId) || (e.splits || []).some((s) => s.user_id === friendId)
          );
          if (!isInGroup && !isInExpense && friendId !== currentUser.id) {
            await supabase.from('users').delete().eq('id', friendId);
          }
        }
      } catch (e) {
        console.error('Error removing friend in Supabase:', e);
      }
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
        isOnboarded,
        isLoaded,
        onboardUser,
        joinGroupById,
        switchUser,
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
