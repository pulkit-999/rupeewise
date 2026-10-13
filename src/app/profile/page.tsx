'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Check, Smartphone, IndianRupee, Trash2, Database, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, setCurrentUser, users, clearAllData, loadDemoData } = useAppStore();

  const [fullName, setFullName] = useState(currentUser.full_name);
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const [savedMessage, setSavedMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      ...currentUser,
      full_name: fullName,
      upi_id: upiId.trim(),
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all expenses, groups, and settlements? This will leave your app completely clean.')) {
      clearAllData();
      setStatusMessage('All demo data and expenses have been cleared.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleLoadDemo = () => {
    if (confirm('Load sample Indian spending demo data (Goa trip, Flat 402, Bangalore bills)?')) {
      loadDemoData();
      setStatusMessage('Sample demo data loaded successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Profile & Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal details, default settlement UPI ID, and application data.
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
          <Database className="w-4 h-4" />
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
                <h3 className="font-bold text-sm text-foreground">{currentUser.full_name}</h3>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
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

      {/* Data Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Data Management & Clean Slate</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Start fresh with a clean slate for real group expenses, or reload sample demo data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5">
            <div>
              <h4 className="text-xs font-bold text-destructive">Clear All App Data</h4>
              <p className="text-[11px] text-muted-foreground">
                Completely removes all mock and stored expenses, groups, and settlements to start 100% fresh.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white text-xs gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card">
            <div>
              <h4 className="text-xs font-bold text-foreground">Load Sample Indian Demo Data</h4>
              <p className="text-[11px] text-muted-foreground">
                Populates realistic INR transactions (Goa villa trip, Indiranagar flat share, Coorg road trip) for testing analytics.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDemo}
              className="text-xs gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Switch Persona (if multiple users exist) */}
      {users.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Switch Active User ({users.length})</CardTitle>
            <CardDescription className="text-xs">
              Switch between available user profiles to test balances and settlement requests from their viewpoint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((u) => {
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setFullName(u.full_name);
                      setUpiId(u.upi_id || '');
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-foreground font-semibold'
                        : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-foreground">{u.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
