'use client';

import React, { useState } from 'react';
import { Group, User } from '@/types/database';
import { useAppStore } from '@/lib/store';
import { formatINR } from '@/lib/currency';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Sparkles, Scale, CheckCircle2 } from 'lucide-react';
import { SettleModal } from '@/components/settlements/SettleModal';

interface GroupBalancesProps {
  group: Group;
}

export function GroupBalances({ group }: GroupBalancesProps) {
  const { currentUser, getGroupBalances, getGroupDebts } = useAppStore();
  const [isSimplified, setIsSimplified] = useState(true);

  // Settlement modal state
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settlePayerId, setSettlePayerId] = useState('');
  const [settleReceiverId, setSettleReceiverId] = useState('');
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);

  const balances = getGroupBalances(group.id);
  const debts = getGroupDebts(group.id, isSimplified);

  const handleSettleDebt = (fromId: string, toId: string, amount: number) => {
    setSettlePayerId(fromId);
    setSettleReceiverId(toId);
    setSettleAmount(amount);
    setIsSettleOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Member net balance summary cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Member Balances
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {balances.map(({ user, totalPaid, totalOwed, netBalance }) => {
            const isSelf = user.id === currentUser.id;
            return (
              <div
                key={user.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isSelf
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                      <span>{user.full_name}</span>
                      {isSelf && (
                        <span className="text-[10px] text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid:</span>
                    <span className="font-medium text-foreground">{formatINR(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Share:</span>
                    <span className="font-medium text-foreground">{formatINR(totalOwed)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-border/60">
                    <span className="font-medium">Net:</span>
                    <span
                      className={`font-bold ${
                        netBalance > 0.009
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : netBalance < -0.009
                          ? 'text-rose-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {netBalance > 0 ? `+${formatINR(netBalance)}` : formatINR(netBalance)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Settlements & Simplify Debts Toggle */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Who Owes Whom
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {isSimplified
                ? 'Min-cash-flow algorithm active (fewer transactions needed)'
                : 'Direct pairwise expense calculation'}
            </p>
          </div>

          <button
            onClick={() => setIsSimplified(!isSimplified)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSimplified
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simplify Debts: {isSimplified ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {debts.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h5 className="text-sm font-semibold text-foreground">All Settled Up!</h5>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No one in this group owes any money. All expenses are balanced or settled.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {debts.map((debt, idx) => {
              const isPayerMe = debt.fromUserId === currentUser.id;
              const isReceiverMe = debt.toUserId === currentUser.id;

              return (
                <div
                  key={`${debt.fromUserId}-${debt.toUserId}-${idx}`}
                  className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={debt.fromUser?.avatar_url}
                      name={debt.fromUser?.full_name || 'Member'}
                      size="sm"
                    />

                    <div className="min-w-0 text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <span>{debt.fromUser?.full_name || 'Member'}</span>
                        {isPayerMe && (
                          <span className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950 px-1 rounded">
                            You owe
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>owes</span>
                        <span className="font-medium text-foreground">
                          {debt.toUser?.full_name || 'Member'}
                        </span>
                        {isReceiverMe && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 rounded font-medium">
                            (You)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        {formatINR(debt.amount)}
                      </div>
                      {debt.toUser?.upi_id && (
                        <div className="text-[10px] text-muted-foreground">
                          UPI: {debt.toUser.upi_id}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="emerald"
                      onClick={() => handleSettleDebt(debt.fromUserId, debt.toUserId, debt.amount)}
                      className="text-xs"
                    >
                      <Scale className="w-3.5 h-3.5 mr-1" />
                      Settle
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        defaultPayerId={settlePayerId}
        defaultReceiverId={settleReceiverId}
        defaultAmount={settleAmount}
        groupId={group.id}
      />
    </div>
  );
}
