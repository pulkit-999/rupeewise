'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import { AppProvider, useAppStore } from '@/lib/store';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { SettleModal } from '@/components/settlements/SettleModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { AddFriendModal } from '@/components/friends/AddFriendModal';
import { OnboardingModal } from '@/components/auth/OnboardingModal';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOnboarded, isLoaded } = useAppStore();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  const isJoinRoute = pathname?.startsWith('/join');
  const showOnboarding = isLoaded && !isOnboarded && !isJoinRoute;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20">
      {/* Top Header */}
      <Navbar onOpenAddExpense={() => setIsAddExpenseOpen(true)} />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onOpenSettleModal={() => setIsSettleOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onOpenAddExpense={() => setIsAddExpenseOpen(true)} />

      {/* Global Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />
      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
      />
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
      <OnboardingModal isOpen={showOnboarding} />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>RupeeWise - Indian Expense Sharing & Spending Analytics</title>
        <meta
          name="description"
          content="Production-ready Splitwise clone for India with smart INR splits, min-cash-flow debt simplification, and Recharts spending analytics."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AppProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </AppProvider>
      </body>
    </html>
  );
}
