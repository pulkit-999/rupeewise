'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { AddFriendModal } from '@/components/friends/AddFriendModal';
import { SettleModal } from '@/components/settlements/SettleModal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { formatINR } from '@/lib/currency';
import {
  UserCheck,
  UserPlus,
  Scale,
  Trash2,
  ArrowRight,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export default function FriendsPage() {
  const { friendships, currentUser, getFriendBalance, removeFriend } = useAppStore();

  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);

  const handleSettle = (friendId: string, amount: number) => {
    setSelectedFriendId(friendId);
    setSettleAmount(Math.abs(amount));
    setIsSettleOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Friends
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
              {friendships.length}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track direct debts and split individual bills outside of groups.
          </p>
        </div>

        <Button
          onClick={() => setIsAddFriendOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </Button>
      </div>

      {/* Friends Cards Grid */}
      {friendships.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
          <UserCheck className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No friends added yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Add friends using their email address to split lunches, cabs, and quick purchases.
          </p>
          <Button size="sm" onClick={() => setIsAddFriendOpen(true)}>
            Add Your First Friend
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {friendships.map((f) => {
            const friend = f.friend;
            if (!friend) return null;

            const balance = getFriendBalance(friend.id);

            return (
              <div
                key={f.id}
                className="p-5 rounded-xl border border-border/80 bg-card flex flex-col justify-between space-y-4 shadow-2xs hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <Avatar src={friend.avatar_url} name={friend.full_name} size="md" />
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{friend.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{friend.email}</p>
                      {friend.upi_id && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                          <Smartphone className="w-3 h-3 text-emerald-600" />
                          <span>{friend.upi_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${friend.full_name} from friends?`)) {
                        removeFriend(f.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                    title="Remove friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Balance</div>
                    <div className="font-bold text-sm">
                      {balance > 0.009 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Owes you {formatINR(balance)}
                        </span>
                      ) : balance < -0.009 ? (
                        <span className="text-rose-500">
                          You owe {formatINR(Math.abs(balance))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Settled up</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {Math.abs(balance) > 0.009 && (
                    <Button
                      size="sm"
                      variant="emerald"
                      onClick={() => handleSettle(friend.id, balance)}
                      className="text-xs font-semibold"
                    >
                      <Scale className="w-3.5 h-3.5 mr-1" />
                      Settle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        defaultReceiverId={selectedFriendId}
        defaultAmount={settleAmount}
      />
    </div>
  );
}
