'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Check, Smartphone, IndianRupee, RotateCcw, User, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, setCurrentUser, users, resetDemoData } = useAppStore();

  const [fullName, setFullName] = useState(currentUser.full_name);
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const [savedMessage, setSavedMessage] = useState(false);

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Profile & Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal details, default settlement UPI ID, and demo account personas.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Profile changes saved successfully!</span>
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
                  Default Currency: INR (₹)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Primary UPI ID (Google Pay / PhonePe)"
                placeholder="e.g. yourname@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                helperText="Used so friends can settle debts with 1-click."
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

      {/* Demo Persona Switcher */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Demo Persona Switcher</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Reset demo state to initial seed data?')) {
                  resetDemoData();
                }
              }}
              className="text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Demo
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            Switch between different users to test how balances, debts, and settlements look from each person's perspective.
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
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-foreground shadow-2xs font-semibold'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-foreground">{u.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      {u.upi_id && (
                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                          {u.upi_id}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
