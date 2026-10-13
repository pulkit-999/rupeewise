'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

const STORAGE_KEY = 'rupeewise_app_state_v2';

export const DEFAULT_USER: User = {
  id: 'usr_me',
  email: 'user@example.com',
  full_name: 'You',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  default_currency: 'INR',
  upi_id: '',
  created_at: '2024-01-01T00:00:00.000Z',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [users, setUsers] = useState<User[]>([DEFAULT_USER]);
  const [categories] = useState<Category[]>(MOCK_CATEGORIES);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
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
        if (parsed.currentUserId) {
          const user = (parsed.users || [DEFAULT_USER]).find((u: User) => u.id === parsed.currentUserId);
          if (user) setCurrentUser(user);
        }
      }
    } catch (e) {
      console.warn('Could not load local storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage
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
    const groupId = 'grp_' + Date.now();
    const allMembers = Array.from(new Set([currentUser.id, ...memberUserIds]));

    const members: GroupMember[] = allMembers.map((userId) => ({
      id: 'gm_' + Math.random().toString(36).substr(2, 9),
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
      id: 'act_' + Date.now(),
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

    return newGroup;
  };

  const updateGroup = (id: string, updates: Partial<Group>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  const archiveGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_archived: !g.is_archived } : g))
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
  };

  const addMemberToGroup = (groupId: string, email: string): boolean => {
    const targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) return false;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const exists = (g.members || []).some((m) => m.user_id === targetUser.id);
        if (exists) return g;
        const newMember: GroupMember = {
          id: 'gm_' + Date.now(),
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
    const expenseId = 'exp_' + Date.now();
    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: categories.find((c) => c.id === expenseData.category_id),
      group: groups.find((g) => g.id === expenseData.group_id),
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Activity log
    const activity: ActivityLog = {
      id: 'act_' + Date.now(),
      group_id: newExpense.group_id,
      user_id: currentUser.id,
      entity_type: 'expense',
      entity_id: expenseId,
      action: 'created',
      details: {
        title: `Added "${newExpense.description}"`,
        description: `${currentUser.full_name} added an expense for ${formatINR(newExpense.amount)}`,
        amount: newExpense.amount,
        currency: 'INR',
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = {
          ...e,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updated;
      })
    );
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    setExpenses((prev) => prev.filter((e) => e.id !== id));

    const activity: ActivityLog = {
      id: 'act_' + Date.now(),
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
  };

  const addComment = (expenseId: string, commentText: string) => {
    const comment = {
      id: 'c_' + Date.now(),
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
  };

  // Settlements
  const recordSettlement = (
    settlementData: Omit<Settlement, 'id' | 'created_at'>
  ): Settlement => {
    const settlementId = 'stl_' + Date.now();
    const newSettlement: Settlement = {
      ...settlementData,
      id: settlementId,
      created_at: new Date().toISOString(),
      payer: usersMap.get(settlementData.payer_id),
      receiver: usersMap.get(settlementData.receiver_id),
      group: groups.find((g) => g.id === settlementData.group_id),
    };

    setSettlements((prev) => [newSettlement, ...prev]);

    // Activity log
    const payerName = newSettlement.payer?.full_name || 'Someone';
    const receiverName = newSettlement.receiver?.full_name || 'someone';
    const activity: ActivityLog = {
      id: 'act_' + Date.now(),
      group_id: newSettlement.group_id,
      user_id: currentUser.id,
      entity_type: 'settlement',
      entity_id: settlementId,
      action: 'created',
      details: {
        title: `Settlement recorded`,
        description: `${payerName} paid ${receiverName} ${formatINR(newSettlement.amount)} via ${newSettlement.payment_method.toUpperCase()}`,
        amount: newSettlement.amount,
        currency: 'INR',
      },
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    setActivities((prev) => [activity, ...prev]);

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
      // Create a guest contact
      const newUserId = 'usr_' + Date.now();
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
    }

    const newFriendship: Friendship = {
      id: 'fr_' + Date.now(),
      user_id: currentUser.id,
      friend_id: friendUser.id,
      status: 'accepted',
      created_at: new Date().toISOString(),
      friend: friendUser,
    };

    setFriendships((prev) => [newFriendship, ...prev]);
    return { success: true, message: `Added ${friendUser.full_name} to your friends!` };
  };

  const removeFriend = (friendshipId: string) => {
    setFriendships((prev) => prev.filter((f) => f.id !== friendshipId));
  };

  // Balance Calculations
  const getUserNetBalance = (userId: string = currentUser.id): number => {
    const balances = calculateNetBalances(expenses, settlements);
    return balances.get(userId) || 0;
  };

  const getUserOwedAmount = (userId: string = currentUser.id): number => {
    // Total amount others owe to this user across pairwise debts
    const debts = calculateDirectDebts(expenses, settlements, usersMap);
    return debts
      .filter((d) => d.toUserId === userId)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getUserOwingAmount = (userId: string = currentUser.id): number => {
    // Total amount this user owes others across pairwise debts
    const debts = calculateDirectDebts(expenses, settlements, usersMap);
    return debts
      .filter((d) => d.fromUserId === userId)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getGroupBalances = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return [];

    const groupExpenses = expenses.filter((e) => e.group_id === groupId);
    const groupSettlements = settlements.filter((s) => s.group_id === groupId);
    const netBalances = calculateNetBalances(groupExpenses, groupSettlements);

    const memberList = group.members || [];
    return memberList.map((m) => {
      const u = usersMap.get(m.user_id) || m.user || {
        id: m.user_id,
        email: '',
        full_name: 'Member',
        default_currency: 'INR',
        created_at: '',
      };

      const totalPaid = groupExpenses.reduce((sum, e) => {
        const payer = e.payers.find((p) => p.user_id === m.user_id);
        return sum + (payer?.amount_paid || 0);
      }, 0);

      const totalOwed = groupExpenses.reduce((sum, e) => {
        const split = e.splits.find((s) => s.user_id === m.user_id);
        return sum + (split?.amount_owed || 0);
      }, 0);

      return {
        user: u,
        totalPaid,
        totalOwed,
        netBalance: netBalances.get(m.user_id) || 0,
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
    // Direct net balance between currentUser and friend
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
