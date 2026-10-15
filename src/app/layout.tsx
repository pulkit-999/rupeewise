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
import { InstallPwaPrompt } from '@/components/layout/InstallPwaPrompt';
import { AppUpdatePrompt } from '@/components/layout/AppUpdatePrompt';

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
      <InstallPwaPrompt />
      <AppUpdatePrompt />
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RupeeWise" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('rupeewise_theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </AppProvider>
      </body>
    </html>
  );
}
