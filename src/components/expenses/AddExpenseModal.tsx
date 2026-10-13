'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { SplitType, User } from '@/types/database';
import { formatINR, toRupees, toPaise } from '@/lib/currency';
import {
  calculateEqualSplit,
  validateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  validatePayers,
} from '@/lib/splits';
import { Avatar } from '@/components/ui/Avatar';
import {
  Calendar,
  Receipt,
  Upload,
  AlertCircle,
  CheckCircle2,
  Users,
  Layers,
  Percent,
  Split,
  FileText,
} from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string | null;
}

export function AddExpenseModal({ isOpen, onClose, defaultGroupId }: AddExpenseModalProps) {
  const { currentUser, groups, categories, users, addExpense } = useAppStore();

  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [groupId, setGroupId] = useState<string>(defaultGroupId || '');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || 'cat_food');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  // Payer state
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState(currentUser.id);
  const [multiPayers, setMultiPayers] = useState<{ userId: string; amount: string }[]>([]);

  // Split state
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);

  // Available participants for selected group
  const activeGroup = groups.find((g) => g.id === groupId);
  const availableMembers: User[] = activeGroup?.members
    ? (activeGroup.members.map((m) => m.user || users.find((u) => u.id === m.user_id)).filter(Boolean) as User[])
    : users;

  // Initialize participants on group change
  useEffect(() => {
    if (availableMembers.length > 0) {
      const ids = availableMembers.map((m) => m.id);
      setSelectedUserIds(ids);
      setMultiPayers(availableMembers.map((m) => ({ userId: m.id, amount: '' })));
      
      const initExact: Record<string, string> = {};
      const initPerc: Record<string, string> = {};
      const initShares: Record<string, string> = {};
      ids.forEach((id) => {
        initExact[id] = '';
        initPerc[id] = (100 / ids.length).toFixed(1);
        initShares[id] = '1';
      });
      setExactAmounts(initExact);
      setPercentages(initPerc);
      setShares(initShares);
    }
  }, [groupId, isOpen]);

  const numAmount = parseFloat(amountStr) || 0;

  // Validation logic
  let splitValidationMessage: string | null = null;
  let isSplitValid = true;

  if (numAmount > 0) {
    if (splitType === 'exact') {
      const parts = selectedUserIds.map((uid) => ({
        userId: uid,
        amount: parseFloat(exactAmounts[uid] || '0') || 0,
      }));
      const check = validateExactSplit(numAmount, parts);
      if (!check.isValid) {
        isSplitValid = false;
        splitValidationMessage = check.difference > 0
          ? `Missing ${formatINR(check.difference)} to reach ${formatINR(numAmount)}`
          : `Over by ${formatINR(-check.difference)}`;
      }
    } else if (splitType === 'percentage') {
      const parts = selectedUserIds.map((uid) => ({
        userId: uid,
        percentage: parseFloat(percentages[uid] || '0') || 0,
      }));
      const check = calculatePercentageSplit(numAmount, parts);
      if (!check.isValid) {
        isSplitValid = false;
        splitValidationMessage = `Percentages sum to ${check.totalPercentage.toFixed(1)}% (must be 100%)`;
      }
    }
  }

  // Payers validation
  let payerValidationMessage: string | null = null;
  let isPayerValid = true;
  if (isMultiPayer && numAmount > 0) {
    const payersList = multiPayers.map((p) => ({
      userId: p.userId,
      amount: parseFloat(p.amount || '0') || 0,
    }));
    const check = validatePayers(numAmount, payersList);
    if (!check.isValid) {
      isPayerValid = false;
      payerValidationMessage = check.difference > 0
        ? `Paid amount is short by ${formatINR(check.difference)}`
        : `Paid amount exceeds bill by ${formatINR(-check.difference)}`;
    }
  }

  const handleToggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length <= 1) return; // Keep at least one
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }

    if (numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!isPayerValid) {
      setError(payerValidationMessage || 'Invalid payer configuration.');
      return;
    }

    if (!isSplitValid) {
      setError(splitValidationMessage || 'Invalid split configuration.');
      return;
    }

    // Prepare payers
    let payersPayload = [];
    if (isMultiPayer) {
      payersPayload = multiPayers
        .filter((p) => parseFloat(p.amount || '0') > 0)
        .map((p) => ({
          id: 'p_' + Math.random().toString(36).substr(2, 9),
          expense_id: '',
          user_id: p.userId,
          amount_paid: parseFloat(p.amount || '0'),
          user: users.find((u) => u.id === p.userId),
        }));
    } else {
      payersPayload = [
        {
          id: 'p_' + Math.random().toString(36).substr(2, 9),
          expense_id: '',
          user_id: singlePayerId,
          amount_paid: numAmount,
          user: users.find((u) => u.id === singlePayerId),
        },
      ];
    }

    // Prepare splits
    let splitsPayload: any[] = [];
    if (splitType === 'equal') {
      const eq = calculateEqualSplit(numAmount, selectedUserIds);
      splitsPayload = eq.map((s) => ({
        id: 's_' + Math.random().toString(36).substr(2, 9),
        expense_id: '',
        user_id: s.userId,
        amount_owed: s.amount,
        user: users.find((u) => u.id === s.userId),
      }));
    } else if (splitType === 'exact') {
      splitsPayload = selectedUserIds.map((uid) => ({
        id: 's_' + Math.random().toString(36).substr(2, 9),
        expense_id: '',
        user_id: uid,
        amount_owed: parseFloat(exactAmounts[uid] || '0'),
        user: users.find((u) => u.id === uid),
      }));
    } else if (splitType === 'percentage') {
      const parts = selectedUserIds.map((uid) => ({
        userId: uid,
        percentage: parseFloat(percentages[uid] || '0') || 0,
      }));
      const calc = calculatePercentageSplit(numAmount, parts);
      splitsPayload = calc.splits.map((s) => ({
        id: 's_' + Math.random().toString(36).substr(2, 9),
        expense_id: '',
        user_id: s.userId,
        amount_owed: s.amount,
        percentage: parseFloat(percentages[s.userId] || '0'),
        user: users.find((u) => u.id === s.userId),
      }));
    } else if (splitType === 'shares') {
      const parts = selectedUserIds.map((uid) => ({
        userId: uid,
        shares: parseFloat(shares[uid] || '1') || 1,
      }));
      const calc = calculateSharesSplit(numAmount, parts);
      splitsPayload = calc.splits.map((s) => ({
        id: 's_' + Math.random().toString(36).substr(2, 9),
        expense_id: '',
        user_id: s.userId,
        amount_owed: s.amount,
        shares: parseFloat(shares[s.userId] || '1'),
        user: users.find((u) => u.id === s.userId),
      }));
    }

    addExpense({
      group_id: groupId || null,
      description: description.trim(),
      amount: numAmount,
      currency: 'INR',
      date: new Date(date).toISOString(),
      category_id: categoryId,
      notes: notes.trim(),
      receipt_url: receiptUrl || undefined,
      split_type: splitType,
      payers: payersPayload,
      splits: splitsPayload,
    });

    // Reset form
    setDescription('');
    setAmountStr('');
    setNotes('');
    setReceiptUrl('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Shared Expense" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Group & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Group / Context</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Individual / Non-group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description & Amount */}
        <div className="space-y-3">
          <Input
            label="Description"
            placeholder="e.g. Fisherman's Wharf Dinner, Uber to Airport"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
              <span>Amount (in INR)</span>
              {numAmount > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatINR(numAmount)}
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-base">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </div>
        </div>

        {/* Payers Section */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Who paid?</span>
            <button
              type="button"
              onClick={() => setIsMultiPayer(!isMultiPayer)}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              {isMultiPayer ? 'Switch to Single Payer' : 'Multiple people paid?'}
            </button>
          </div>

          {!isMultiPayer ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Paid by</span>
              <select
                value={singlePayerId}
                onChange={(e) => setSinglePayerId(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} {m.id === currentUser.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground">Enter amounts paid by each person:</div>
              {availableMembers.map((m) => {
                const currentPaid = multiPayers.find((p) => p.userId === m.id)?.amount || '';
                return (
                  <div key={m.id} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                      <span>{m.full_name}</span>
                    </div>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={currentPaid}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMultiPayers((prev) =>
                            prev.map((p) => (p.userId === m.id ? { ...p, amount: val } : p))
                          );
                        }}
                        className="h-8 w-full rounded-md border border-input bg-background pl-6 pr-2 text-xs font-medium"
                      />
                    </div>
                  </div>
                );
              })}
              {payerValidationMessage && (
                <div className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{payerValidationMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Split Method & Participants */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Split Method</label>
            <div className="flex rounded-lg border border-border p-0.5 bg-muted/30 text-xs">
              {(
                [
                  { type: 'equal', label: 'Equal (=)' },
                  { type: 'exact', label: 'Exact (₹)' },
                  { type: 'percentage', label: 'Percent (%)' },
                  { type: 'shares', label: 'Shares (⚖️)' },
                ] as const
              ).map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setSplitType(m.type)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    splitType === m.type
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants list */}
          <div className="rounded-xl border border-border p-3 space-y-2 max-h-48 overflow-y-auto">
            {availableMembers.map((m) => {
              const isSelected = selectedUserIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    isSelected ? 'bg-muted/40' : 'opacity-50'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleUser(m.id)}
                      className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                    />
                    <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                    <span>{m.full_name}</span>
                  </label>

                  {/* Split specific input */}
                  {isSelected && (
                    <div className="text-right">
                      {splitType === 'equal' && (
                        <span className="text-xs font-semibold text-foreground">
                          {numAmount > 0
                            ? formatINR(numAmount / Math.max(1, selectedUserIds.length))
                            : '₹0.00'}
                        </span>
                      )}

                      {splitType === 'exact' && (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={exactAmounts[m.id] || ''}
                            onChange={(e) =>
                              setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })
                            }
                            className="h-7 w-full rounded-md border border-input bg-background pl-6 pr-2 text-xs font-medium"
                          />
                        </div>
                      )}

                      {splitType === 'percentage' && (
                        <div className="relative w-24">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={percentages[m.id] || ''}
                            onChange={(e) =>
                              setPercentages({ ...percentages, [m.id]: e.target.value })
                            }
                            className="h-7 w-full rounded-md border border-input bg-background px-2 pr-6 text-xs font-medium"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            %
                          </span>
                        </div>
                      )}

                      {splitType === 'shares' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={shares[m.id] || '1'}
                            onChange={(e) =>
                              setShares({ ...shares, [m.id]: e.target.value })
                            }
                            className="h-7 w-16 rounded-md border border-input bg-background px-2 text-xs font-medium text-center"
                          />
                          <span className="text-[11px] text-muted-foreground">shares</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {splitValidationMessage && (
            <div className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{splitValidationMessage}</span>
            </div>
          )}
        </div>

        {/* Date, Notes & Receipt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Expense Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Receipt Attachment</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setReceiptUrl(
                    'https://images.unsplash.com/photo-1554415707-9e49667ff0d7?w=400&auto=format&fit=crop&q=80'
                  );
                }}
                className="h-10 flex-1 px-3 rounded-lg border border-dashed border-border hover:bg-muted/40 text-xs text-muted-foreground flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{receiptUrl ? 'Receipt Attached ✓' : 'Upload Receipt'}</span>
              </button>
              {receiptUrl && (
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="h-10 px-2 rounded-lg text-rose-500 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Notes / Tags</label>
          <input
            type="text"
            placeholder="Add additional context or reference info..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isSplitValid || !isPayerValid || numAmount <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
          >
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
