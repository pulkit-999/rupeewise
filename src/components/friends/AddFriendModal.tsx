'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const { addFriendByEmail } = useAppStore();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const res = addFriendByEmail(email.trim());
    if (res.success) {
      setStatus({ type: 'success', message: res.message });
      setEmail('');
      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1200);
    } else {
      setStatus({ type: 'error', message: res.message });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Friend" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {status && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <Input
          label="Friend's Email Address"
          type="email"
          placeholder="e.g. priya@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          helperText="We'll connect their account so you can split bills 1:1."
        />

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!email.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Friend
          </Button>
        </div>
      </form>
    </Modal>
  );
}
