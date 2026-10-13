'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  IndianRupee,
  Plus,
  Moon,
  Sun,
  RotateCcw,
  Users,
  ChevronDown,
  Check,
  Receipt,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface NavbarProps {
  onOpenAddExpense: () => void;
}

export function Navbar({ onOpenAddExpense }: NavbarProps) {
  const { currentUser, setCurrentUser, users, resetDemoData, getUserNetBalance } = useAppStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const isDark = !isDarkMode;
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const netBalance = getUserNetBalance(currentUser.id);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-xl">₹</span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-foreground flex items-center gap-1.5">
                RupeeWise
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  INR
                </span>
              </span>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Smart Splitwise for India</p>
            </div>
          </Link>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Add Expense Action */}
          <Button
            onClick={onOpenAddExpense}
            size="sm"
            className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-muted-foreground"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* Reset Demo Data */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('Reset demo state to initial seed data?')) {
                resetDemoData();
              }
            }}
            title="Reset demo data"
            className="text-muted-foreground hidden md:inline-flex"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-muted/60 transition-colors border border-border/60"
            >
              <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
              <div className="text-left hidden lg:block pr-1">
                <div className="text-xs font-semibold text-foreground leading-tight">
                  {currentUser.full_name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {netBalance >= 0 ? (
                    <span className="text-emerald-600 font-medium">+{formatINR(netBalance)}</span>
                  ) : (
                    <span className="text-rose-500 font-medium">{formatINR(netBalance)}</span>
                  )}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {/* User switch modal dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-xl z-40 p-2 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-1">
                    Switch Persona (Demo View)
                  </div>
                  <div className="space-y-1">
                    {users.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      const bal = getUserNetBalance(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            setCurrentUser(u);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                            <div>
                              <div>{u.full_name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {bal >= 0 ? `+${formatINR(bal)}` : formatINR(bal)}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/50 px-2 flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>UPI: {currentUser.upi_id || 'Not set'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
