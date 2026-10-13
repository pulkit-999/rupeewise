'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { GroupType } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Plane, Home, Heart, Calendar, Folder, Check } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { currentUser, users, createGroup } = useAppStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType>('trip');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([currentUser.id]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        currency: 'INR',
      },
      selectedMemberIds
    );

    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Goa Trip 2024, Flat 402, Bangalore Dinner"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
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
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Add Members ({selectedMemberIds.length} selected)
          </label>
          <div className="rounded-xl border border-border p-2 space-y-1 max-h-44 overflow-y-auto">
            {users.map((u) => {
              const isSelected = selectedMemberIds.includes(u.id);
              const isSelf = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleToggleMember(u.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                    isSelected ? 'bg-muted/60 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/30'
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

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
