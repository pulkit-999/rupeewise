export type GroupType = 'trip' | 'home' | 'couple' | 'event' | 'other';
export type MemberRole = 'owner' | 'admin' | 'member';
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';
export type PaymentMethod = 'upi' | 'cash' | 'bank_transfer' | 'other';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  default_currency: string;
  upi_id?: string;
  phone?: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  friend?: User;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  currency: string;
  avatar_url?: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  user?: User;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ExpensePayer {
  id: string;
  expense_id: string;
  user_id: string;
  amount_paid: number; // Stored in INR (exact decimal / paise)
  user?: User;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number; // Stored in INR (exact decimal / paise)
  percentage?: number;
  shares?: number;
  user?: User;
}

export interface ExpenseComment {
  id: string;
  expense_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: User;
}

export interface Expense {
  id: string;
  group_id?: string | null;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category_id: string;
  notes?: string;
  receipt_url?: string;
  split_type: SplitType;
  created_by: string;
  created_at: string;
  updated_at: string;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
  comments?: ExpenseComment[];
  category?: Category;
  group?: Group;
}

export interface Settlement {
  id: string;
  group_id?: string | null;
  payer_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  reference_note?: string;
  settled_at: string;
  created_at: string;
  payer?: User;
  receiver?: User;
  group?: Group;
}

export interface ActivityLog {
  id: string;
  group_id?: string | null;
  user_id: string;
  entity_type: 'expense' | 'settlement' | 'group' | 'friend';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted';
  details: {
    title: string;
    description: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
  };
  created_at: string;
  user?: User;
}

export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUser?: User;
  toUser?: User;
}

export interface MemberBalance {
  userId: string;
  user: User;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // >0 means owed money, <0 means owes money
}
