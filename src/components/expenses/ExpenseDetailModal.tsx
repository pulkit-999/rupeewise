'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAppStore } from '@/lib/store';
import { Expense } from '@/types/database';
import { formatINR } from '@/lib/currency';
import { uploadReceiptFile } from '@/lib/receipt-upload';
import { format } from 'date-fns';
import {
  Calendar,
  Trash2,
  MessageSquare,
  Send,
  Receipt,
  Tag,
  ExternalLink,
  Pencil,
  Upload,
  Loader2,
  Eye,
  Download,
  X,
} from 'lucide-react';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
}

export function ExpenseDetailModal({ expense, isOpen, onClose, onEdit }: ExpenseDetailModalProps) {
  const { currentUser, deleteExpense, updateExpense, addComment, users } = useAppStore();
  const [newComment, setNewComment] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!expense) return null;

  const handleAttachReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const result = await uploadReceiptFile(file);
      updateExpense(expense.id, { receipt_url: result.url });
    } catch (err: any) {
      console.error('Error attaching receipt:', err);
      setUploadError(err?.message || 'Failed to attach receipt');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveReceipt = () => {
    if (confirm('Are you sure you want to remove the receipt attachment?')) {
      updateExpense(expense.id, { receipt_url: '' });
    }
  };

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

        {/* Receipt Attachment Section */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleAttachReceipt}
          className="hidden"
        />

        {expense.receipt_url ? (
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Receipt className="w-4 h-4" />
                <span>Receipt Attached</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Expand</span>
                </button>
                <a
                  href={expense.receipt_url}
                  download={`receipt-${expense.description.replace(/\s+/g, '-').toLowerCase()}.jpg`}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                  title="Download receipt image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium ml-1"
                  title="Remove receipt attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            <div
              className="relative group cursor-pointer overflow-hidden rounded-lg border border-border bg-black/5 dark:bg-black/20"
              onClick={() => setIsLightboxOpen(true)}
              title="Click to view full screen"
            >
              <img
                src={expense.receipt_url}
                alt={`Receipt for ${expense.description}`}
                className="w-full max-h-52 object-contain rounded-lg group-hover:scale-[1.01] transition-transform"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="bg-black/75 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium shadow-md">
                  <Eye className="w-3.5 h-3.5" /> Click to Zoom
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-dashed border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="font-semibold text-foreground block">No Receipt Attached</span>
                <span className="text-[11px]">Add a photo of the bill or invoice for your records.</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs h-8.5 gap-1.5 shrink-0 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Compressing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attach Receipt</span>
                </>
              )}
            </Button>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-rose-500 font-medium">{uploadError}</p>
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
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(expense);
                }}
                className="text-foreground hover:bg-muted"
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit Expense
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Expense
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Lightbox Modal for Full View */}
      {isLightboxOpen && expense.receipt_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-3xl w-full bg-card rounded-2xl p-4 border border-border shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-foreground truncate max-w-sm">
                  {expense.description} - Receipt
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={expense.receipt_url}
                  download={`receipt-${expense.description.replace(/\s+/g, '-').toLowerCase()}.jpg`}
                  className="px-2.5 py-1 text-xs border border-border rounded-lg hover:bg-muted text-foreground flex items-center gap-1 font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-4 w-full flex items-center justify-center max-h-[72vh] overflow-auto">
              <img
                src={expense.receipt_url}
                alt={`Full Receipt for ${expense.description}`}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="w-full flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Amount: <strong className="text-foreground">{formatINR(expense.amount)}</strong></span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLightboxOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
