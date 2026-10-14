'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IndianRupee, Mail, User as UserIcon, Sparkles, QrCode } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
}

export function OnboardingModal({ isOpen }: OnboardingModalProps) {
  const { onboardUser } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail) {
      setError('Please provide your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanName) {
      setError('Please provide your name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onboardUser({
        full_name: cleanName,
        email: cleanEmail,
        upi_id: upiId.trim() || undefined,
      });
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError(err?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred Backdrop - Non-dismissible */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl z-10 animate-in zoom-in-95 my-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3 shadow-inner">
            <IndianRupee className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome to RupeeWise</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
            Split expenses with friends, track balances, and settle instantly with Indian UPI.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Your Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Used to join groups, share links with friends, and restore your balance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              UPI ID <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </label>
            <div className="relative">
              <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="e.g. rahul@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Allows friends to pay you directly via GPay, PhonePe, or Paytm.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 shadow-lg shadow-emerald-600/20"
              isLoading={isSubmitting}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </div>

          <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Returning user? Simply enter your existing email and RupeeWise will load all your groups automatically.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

