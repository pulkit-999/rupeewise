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
  User as UserIcon,
  ArrowRightLeft,
  Download,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface NavbarProps {
  onOpenAddExpense: () => void;
}

export function Navbar({ onOpenAddExpense }: NavbarProps) {
  const { currentUser, clearAllData, getUserNetBalance } = useAppStore();
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

          {/* Clear / Start Fresh Data */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('Clear all local and cloud data to start with a completely clean slate?')) {
                clearAllData();
              }
            }}
            title="Clear all data & start fresh"
            className="text-muted-foreground hidden md:inline-flex"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* User Account Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-muted/60 transition-colors border border-border/60"
            >
              <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />
              <div className="text-left hidden lg:block pr-1">
                <div className="text-xs font-semibold text-foreground leading-tight">
                  {currentUser.full_name || 'My Account'}
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

            {/* Account Menu Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border shadow-2xl z-40 p-3 animate-in fade-in zoom-in-95">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/40 border border-border/50 mb-2">
                    <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {currentUser.full_name || 'My Profile'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {currentUser.email || 'No email set'}
                      </div>
                    </div>
                  </div>

                  {/* Net Balance & UPI Overview */}
                  <div className="px-2.5 py-2 rounded-lg bg-secondary/30 space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Net Balance:</span>
                      <span
                        className={`font-semibold ${
                          netBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {netBalance >= 0 ? `+${formatINR(netBalance)}` : formatINR(netBalance)}
                      </span>
                    </div>
                    {currentUser.upi_id && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>UPI ID:</span>
                        <span className="font-mono">{currentUser.upi_id}</span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors font-medium"
                    >
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span>Profile & Settings</span>
                    </Link>
                    <Link
                      href="/friends"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors font-medium"
                    >
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>My Friends</span>
                    </Link>
                    <Link
                      href="/profile#switch-account"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors font-medium"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      <span>Switch Account</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('rupeewise_open_install'));
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors font-medium text-left"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Install App on Device</span>
                    </button>
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
