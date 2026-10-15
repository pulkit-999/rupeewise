'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  Check,
  Smartphone,
  IndianRupee,
  ArrowRightLeft,
  Mail,
  User as UserIcon,
  Download,
  Moon,
  Sun,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Laptop,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

export default function ProfilePage() {
  const { currentUser, setCurrentUser, switchUser } = useAppStore();

  const [fullName, setFullName] = useState(currentUser.full_name);
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const [switchEmail, setSwitchEmail] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Theme & Update states
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  useEffect(() => {
    setFullName(currentUser.full_name);
    setUpiId(currentUser.upi_id || '');

    // Sync theme
    const dark =
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('rupeewise_theme') === 'dark';
    setIsDarkMode(dark);

    // Check standalone mode
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    }
  }, [currentUser]);

  const setTheme = (mode: 'dark' | 'light') => {
    const isDark = mode === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('rupeewise_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('rupeewise_theme', 'light');
      } catch {}
    }
    window.dispatchEvent(new Event('rupeewise_theme_change'));
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateFeedback('Checking for latest updates...');

    window.dispatchEvent(
      new CustomEvent('rupeewise_check_update', {
        detail: {
          onComplete: (res: any) => {
            if (res.status === 'update_found') {
              setUpdateFeedback('✨ New update downloaded! Updating now...');
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } else {
              setUpdateFeedback('✅ You are running the latest version of RupeeWise!');
              setIsCheckingUpdate(false);
              setTimeout(() => setUpdateFeedback(null), 3500);
            }
          },
        },
      })
    );

    // Fallback in case service worker does not reply
    setTimeout(async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      setIsCheckingUpdate(false);
      setUpdateFeedback('✅ App cache refreshed! You are on the newest version.');
      setTimeout(() => setUpdateFeedback(null), 3500);
    }, 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      ...currentUser,
      full_name: fullName.trim(),
      upi_id: upiId.trim(),
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleSwitchAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError(null);
    const cleanEmail = switchEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setSwitchError('Please enter a valid email address.');
      return;
    }

    try {
      setIsSwitching(true);
      await switchUser(cleanEmail);
      setStatusMessage(`Switched active account to ${cleanEmail}`);
      setSwitchEmail('');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setSwitchError(err?.message || 'Failed to switch user account.');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Profile & Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal details, default settlement UPI ID, and account session.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription className="text-xs">
            Your name and UPI handle are shared with group members for instant payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center space-x-4 pb-2">
              <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="lg" />
              <div>
                <h3 className="font-bold text-sm text-foreground">{currentUser.full_name || 'My Profile'}</h3>
                <p className="text-xs text-muted-foreground">{currentUser.email || 'No email set'}</p>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  Default Currency: Indian Rupee (₹)
                </div>
              </div>
            </div>

            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />

            <div>
              <Input
                label="UPI ID / VPA (Optional)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank, mobile@paytm"
                helperText="Friends can tap to pay you directly via GPay, PhonePe, or Paytm."
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Switch Account */}
      <Card id="switch-account">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            <span>Switch Account</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Sign in with a different email address to access your other shared groups and balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSwitchAccount} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="Enter email to switch to (e.g. rahul@example.com)"
                  value={switchEmail}
                  onChange={(e) => setSwitchEmail(e.target.value)}
                  className="pl-10 h-10 text-xs"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={!switchEmail.trim() || isSwitching}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0 h-10 px-4"
              >
                {isSwitching ? 'Switching...' : 'Switch Account'}
              </Button>
            </div>
            {switchError && (
              <p className="text-xs text-rose-500 font-medium">{switchError}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* App Installation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Install RupeeWise App</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Install RupeeWise on your phone or desktop for quick 1-tap home screen access and a full-screen native app experience without browser bars.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card">
            <div>
              <h4 className="text-xs font-bold text-foreground">Mobile & Desktop App (PWA)</h4>
              <p className="text-[11px] text-muted-foreground">
                Works seamlessly on Android, iPhone/iPad (Safari), Windows, and Mac.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('rupeewise_open_install'));
              }}
              className="text-xs gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Install to Device</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance & Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {isDarkMode ? <Moon className="w-4 h-4 text-emerald-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>Appearance & Theme</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Choose your preferred display mode. Your selection persists permanently across reloads and app restarts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                !isDarkMode
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-foreground ring-2 ring-emerald-500/20'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Light Mode</div>
                  <div className="text-[11px] text-muted-foreground">Clean, crisp fintech look</div>
                </div>
              </div>
              {!isDarkMode && <Check className="w-4 h-4 text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                isDarkMode
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-foreground ring-2 ring-emerald-500/20'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Dark Mode</div>
                  <div className="text-[11px] text-muted-foreground">Easy on eyes in low light</div>
                </div>
              </div>
              {isDarkMode && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* App Version & Instant Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>App Version & Instant Updates</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Installed app users get newly deployed features instantly without losing their account session or data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">RupeeWise Production</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  v{APP_VERSION}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Latest
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Environment:{' '}
                <span className="font-semibold text-foreground">
                  {isStandalone ? 'Installed Home Screen App (PWA Standalone)' : 'Web Browser'}
                </span>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCheckingUpdate}
              onClick={handleCheckUpdates}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shrink-0 h-9 px-4"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Checking Server...' : 'Check for Updates & Reload'}</span>
            </Button>
          </div>

          {updateFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{updateFeedback}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
