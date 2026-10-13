'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAppStore } from '@/lib/store';
import { Expense } from '@/types/database';
import { formatINR } from '@/lib/currency';
import { format } from 'date-fns';
import {
  Calendar,
  Trash2,
  MessageSquare,
  Send,
  Receipt,
  Tag,
  ExternalLink,
} from 'lucide-react';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseDetailModal({ expense, isOpen, onClose }: ExpenseDetailModalProps) {
  const { currentUser, deleteExpense, addComment, users } = useAppStore();
  const [newComment, setNewComment] = useState('');

  if (!expense) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(expense.id, newComment.trim());
    setNewComment('');
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${expense.description}"?`)) {
      deleteExpense(expense.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={expense.description} maxWidth="lg">
      <div className="space-y-5">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {formatINR(expense.amount)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {expense.date ? format(new Date(expense.date), 'dd MMMM yyyy') : 'No date'}
              </span>
              {expense.group && (
                <Badge variant="outline" className="text-[11px]">
                  {expense.group.name}
                </Badge>
              )}
            </div>
          </div>

          {expense.category && (
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border"
              style={{
                backgroundColor: `${expense.category.color}15`,
                borderColor: `${expense.category.color}40`,
                color: expense.category.color,
              }}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{expense.category.name}</span>
            </div>
          )}
        </div>

        {/* Notes if any */}
        {expense.notes && (
          <div className="text-xs p-3 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground">
            <span className="font-semibold text-foreground">Note: </span>
            {expense.notes}
          </div>
        )}

        {/* Payers & Splits Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Who Paid */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paid by ({expense.payers.length})
            </div>
            <div className="space-y-2">
              {expense.payers.map((payer) => {
                const u = payer.user || users.find((x) => x.id === payer.user_id);
                return (
                  <div key={payer.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar src={u?.avatar_url} name={u?.full_name || 'Member'} size="sm" />
                      <span className="font-medium text-foreground">{u?.full_name || 'Member'}</span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatINR(payer.amount_paid)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Who Owes */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Split between ({expense.splits.length})
            </div>
            <div className="space-y-2">
              {expense.splits.map((split) => {
                const u = split.user || users.find((x) => x.id === split.user_id);
                return (
                  <div key={split.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar src={u?.avatar_url} name={u?.full_name || 'Member'} size="sm" />
                      <span className="font-medium text-foreground">{u?.full_name || 'Member'}</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatINR(split.amount_owed)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Receipt Attachment Preview if present */}
        {expense.receipt_url && (
          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Receipt Attached
              </span>
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                View Full <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <img
              src={expense.receipt_url}
              alt="Receipt"
              className="w-full max-h-48 object-cover rounded-lg border border-border"
            />
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span>Comments ({(expense.comments || []).length})</span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(expense.comments || []).map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.user?.full_name || 'Member'}</span>
                  <span>{c.created_at ? format(new Date(c.created_at), 'dd MMM, HH:mm') : ''}</span>
                </div>
                <p className="text-foreground">{c.comment}</p>
              </div>
            ))}
          </div>

          {/* Add comment input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm" disabled={!newComment.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete Expense
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
