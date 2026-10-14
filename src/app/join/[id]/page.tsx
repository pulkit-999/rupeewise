'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Mail, User as UserIcon, QrCode, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;

  const { currentUser, isOnboarded, isLoaded, onboardUser, joinGroupById, groups } = useAppStore();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for non-onboarded user
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;
    async function fetchGroup() {
      try {
        setLoadingGroup(true);
        setError(null);
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from('groups')
          .select('id, name, description, type')
          .eq('id', groupId)
          .single();

        if (fetchErr || !data) {
          if (isMounted) setError('Group not found or the invite link has expired.');
        } else {
          if (isMounted) setGroup(data);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to fetch group details.');
      } finally {
        if (isMounted) setLoadingGroup(false);
      }
    }

    fetchGroup();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // Check if current user is already in this group
  const isAlreadyMember = groups.some((g) => g.id === groupId);

  const handleJoinAsExisting = async () => {
    try {
      setIsSubmitting(true);
      const success = await joinGroupById(groupId, currentUser);
      if (success) {
        router.push(`/groups/${groupId}`);
      } else {
        setFormError('Failed to join group. Please try again.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error joining group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnboardAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!cleanName) {
      setFormError('Please enter your full name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newUser = await onboardUser({
        full_name: cleanName,
        email: cleanEmail,
        upi_id: upiId.trim() || undefined,
      });

      const joined = await joinGroupById(groupId, newUser);
      if (joined) {
        router.push(`/groups/${groupId}`);
      } else {
        setFormError('Created your profile, but could not attach you to the group. Please try again.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'An error occurred during onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || loadingGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading group invite...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-card border border-border text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Invite Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error || 'This invite link is invalid or the group may have been removed.'}
        </p>
        <Link href="/">
          <Button variant="outline" className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-14 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-2xl">
      {/* Group Invite Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
          <Users className="w-8 h-8" />
        </div>
        <p className="text-xs uppercase font-semibold tracking-wider text-emerald-500 mb-1">
          Group Invitation
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{group.name}</h1>
        {group.description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">{group.description}</p>
        )}
      </div>

      {isAlreadyMember ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-medium">You are already a member of this group!</p>
          </div>
          <Button
            onClick={() => router.push(`/groups/${groupId}`)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 font-medium shadow-lg shadow-emerald-600/20"
          >
            Open Group
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      ) : isOnboarded ? (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
            <p className="text-xs text-muted-foreground">Joining as:</p>
            <p className="text-sm font-semibold text-foreground">{currentUser.full_name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
              {formError}
            </div>
          )}

          <Button
            onClick={handleJoinAsExisting}
            isLoading={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 font-medium shadow-lg shadow-emerald-600/20"
          >
            Accept Invite & Join Group
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="text-center">
            <Link
              href="/profile"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Not {currentUser.full_name}? Switch account
            </Link>
          </div>
        </div>
      ) : (
        /* User is not onboarded yet - provide clean Name & Email to join */
        <form onSubmit={handleOnboardAndJoin} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground">
            Enter your details below to create your profile and join <span className="font-semibold text-foreground">{group.name}</span>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Your Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="e.g. Priya Sharma"
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
                placeholder="e.g. priya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Your group members will see this email when splitting expenses.
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
                placeholder="e.g. priya@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              For receiving payments and settlements directly via UPI apps.
            </p>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 font-medium shadow-lg shadow-emerald-600/20"
          >
            Join Group
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      )}
    </div>
  );
}

