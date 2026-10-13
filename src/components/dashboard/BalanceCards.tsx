'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatINR } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowUpRight, ArrowDownRight, Scale, CheckCircle2 } from 'lucide-react';

export function BalanceCards() {
  const { currentUser, getUserNetBalance, getUserOwedAmount, getUserOwingAmount } = useAppStore();

  const netBalance = getUserNetBalance(currentUser.id);
  const totalOwedToMe = getUserOwedAmount(currentUser.id);
  const totalIOwe = getUserOwingAmount(currentUser.id);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Net Balance */}
      <Card className="relative overflow-hidden border-border/80">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Scale className="w-20 h-20" />
        </div>
        <CardContent className="p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Total Net Balance
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {netBalance > 0.009 ? (
              <span className="text-emerald-600 dark:text-emerald-400">+{formatINR(netBalance)}</span>
            ) : netBalance < -0.009 ? (
              <span className="text-rose-500">{formatINR(netBalance)}</span>
            ) : (
              <span className="text-foreground">₹0.00</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            {netBalance > 0.009 ? (
              <>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>You are owed money overall</span>
              </>
            ) : netBalance < -0.009 ? (
              <>
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                <span>You owe money to your group & friends</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>You are settled up with everyone</span>
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* 2. You are owed */}
      <Card className="border-border/80">
        <CardContent className="p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            You Are Owed
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            +{formatINR(totalOwedToMe)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Total pending debt receivables from friends
          </p>
        </CardContent>
      </Card>

      {/* 3. You owe */}
      <Card className="border-border/80">
        <CardContent className="p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            You Owe
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-500 tracking-tight">
            {formatINR(totalIOwe)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Pending dues you need to settle
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
