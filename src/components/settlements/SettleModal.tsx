'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { PaymentMethod, User } from '@/types/database';
import { formatINR } from '@/lib/currency';
import { Avatar } from '@/components/ui/Avatar';
import {
  QrCode,
  ArrowRight,
  CheckCircle,
  Building2,
  Banknote,
  Smartphone,
  CreditCard,
  Copy,
} from 'lucide-react';

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReceiverId?: string;
  defaultPayerId?: string;
  defaultAmount?: number;
  groupId?: string;
}

export function SettleModal({
  isOpen,
  onClose,
  defaultReceiverId,
  defaultPayerId,
  defaultAmount,
  groupId,
}: SettleModalProps) {
  const { currentUser, users, groups, recordSettlement, getGroupDebts, getUserNetBalance } =
    useAppStore();

  const [payerId, setPayerId] = useState(defaultPayerId || currentUser.id);
  const [receiverId, setReceiverId] = useState(defaultReceiverId || '');
  const [amountStr, setAmountStr] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [referenceNote, setReferenceNote] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || '');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Set default receiver if none provided
  useEffect(() => {
    if (!receiverId) {
      const otherUser = users.find((u) => u.id !== currentUser.id);
      if (otherUser) setReceiverId(otherUser.id);
    }
  }, [users, currentUser, receiverId]);

  useEffect(() => {
    if (defaultAmount) {
      setAmountStr(defaultAmount.toString());
    }
  }, [defaultAmount]);

  useEffect(() => {
    if (defaultReceiverId) setReceiverId(defaultReceiverId);
    if (defaultPayerId) setPayerId(defaultPayerId);
    if (groupId) setSelectedGroupId(groupId);
  }, [defaultReceiverId, defaultPayerId, groupId, isOpen]);

  const payer = users.find((u) => u.id === payerId) || currentUser;
  const receiver = users.find((u) => u.id === receiverId);
  const numAmount = parseFloat(amountStr) || 0;

  const handleCopyUpi = () => {
    if (receiver?.upi_id) {
      navigator.clipboard.writeText(receiver.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || numAmount <= 0) return;

    recordSettlement({
      group_id: selectedGroupId || null,
      payer_id: payerId,
      receiver_id: receiverId,
      amount: numAmount,
      currency: 'INR',
      payment_method: paymentMethod,
      reference_note: referenceNote.trim() || undefined,
      settled_at: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Settlement" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payer and Receiver Flow */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[11px] text-muted-foreground mb-1 font-medium">Payer</span>
            <Avatar src={payer.avatar_url} name={payer.full_name} size="md" />
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="mt-1.5 text-xs font-semibold bg-transparent border-0 text-center focus:ring-0 cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} {u.id === currentUser.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-center px-2">
            <ArrowRight className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span className="text-[10px] text-muted-foreground mt-0.5">pays</span>
          </div>

          <div className="flex flex-col items-center flex-1">
            <span className="text-[11px] text-muted-foreground mb-1 font-medium">Receiver</span>
            <Avatar src={receiver?.avatar_url} name={receiver?.full_name || 'Select'} size="md" />
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="mt-1.5 text-xs font-semibold bg-transparent border-0 text-center focus:ring-0 cursor-pointer"
            >
              {users
                .filter((u) => u.id !== payerId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} {u.id === currentUser.id ? '(You)' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
            <span>Settlement Amount</span>
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
              min="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
        </div>

        {/* Group Link (Optional) */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Group Association</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">General / Direct Debt</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'upi', label: 'UPI', icon: Smartphone },
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'bank_transfer', label: 'Bank', icon: Building2 },
              { id: 'other', label: 'Other', icon: CreditCard },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-emerald-600' : ''}`} />
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* UPI Details Card (Indian context) */}
        {paymentMethod === 'upi' && receiver?.upi_id && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">Receiver's UPI ID:</span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
              >
                {copiedUpi ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy UPI</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono bg-background/80 p-1.5 rounded border border-border text-foreground font-semibold flex items-center justify-between">
              <span>{receiver.upi_id}</span>
              <span className="text-[10px] text-muted-foreground">Google Pay / PhonePe / Paytm</span>
            </div>
          </div>
        )}

        {/* Reference note */}
        <Input
          label="Transaction Note / Reference ID"
          placeholder="e.g. UPI Ref #40812938, Paid via GPay, Cash handed over"
          value={referenceNote}
          onChange={(e) => setReferenceNote(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={numAmount <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
          >
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
