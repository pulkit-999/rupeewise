'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { Group, GroupType } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';
import {
  Plane,
  Home,
  Heart,
  Calendar,
  Folder,
  Check,
  Copy,
  CheckCircle2,
  Share2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { currentUser, users, createGroup } = useAppStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType>('trip');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([currentUser.id]);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const groupTypes: { id: GroupType; label: string; icon: any }[] = [
    { id: 'trip', label: 'Trip', icon: Plane },
    { id: 'home', label: 'Home / Flat', icon: Home },
    { id: 'couple', label: 'Couple', icon: Heart },
    { id: 'event', label: 'Event', icon: Calendar },
    { id: 'other', label: 'Other', icon: Folder },
  ];

  const handleToggleMember = (userId: string) => {
    if (userId === currentUser.id) return; // Keep current user
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const handleModalClose = () => {
    setName('');
    setDescription('');
    setCreatedGroup(null);
    setIsCopied(false);
    setSelectedMemberIds([currentUser.id]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup = createGroup(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        currency: 'INR',
      },
      selectedMemberIds
    );

    setCreatedGroup(newGroup);
  };

  const inviteLink =
    createdGroup && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${createdGroup.id}`
      : '';

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    if (!createdGroup || !inviteLink) return;
    const text = `Join my group "${createdGroup.name}" on RupeeWise to split expenses: ${inviteLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenGroup = () => {
    if (createdGroup) {
      const gid = createdGroup.id;
      handleModalClose();
      router.push(`/groups/${gid}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={createdGroup ? 'Group Created! 🎉' : 'Create New Group'}
      maxWidth="md"
    >
      {createdGroup ? (
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{createdGroup.name}</p>
              <p className="text-xs text-muted-foreground">
                Your group is ready! Share the link below with your friends so they can join and split bills.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Shareable Invite Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="bg-muted text-xs select-all font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="flex-shrink-0 min-w-[90px]"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleWhatsAppShare}
              className="w-full text-xs"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Share on WhatsApp
            </Button>
            <Button
              type="button"
              onClick={handleOpenGroup}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
            >
              Open Group
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Goa Trip 2024, Flat 402, Bangalore Dinner"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Group Type</label>
            <div className="grid grid-cols-5 gap-2">
              {groupTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-emerald-600' : ''}`} />
                    <span className="truncate w-full text-center text-[11px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Description (Optional)"
            placeholder="What is this group for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Member selection */}
          {users.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Add Existing Friends ({selectedMemberIds.length} selected)
              </label>
              <div className="rounded-xl border border-border p-2 space-y-1 max-h-40 overflow-y-auto">
                {users.map((u) => {
                  const isSelected = selectedMemberIds.includes(u.id);
                  const isSelf = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleToggleMember(u.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-muted/60 text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                        <span>{u.full_name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                            You
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              Create Group
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
