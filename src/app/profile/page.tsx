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
} from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, setCurrentUser, switchUser } = useAppStore();

  const [fullName, setFullName] = useState(currentUser.full_name);
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const [switchEmail, setSwitchEmail] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(currentUser.full_name);
    setUpiId(currentUser.upi_id || '');
  }, [currentUser]);

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
    </div>
  );
}
