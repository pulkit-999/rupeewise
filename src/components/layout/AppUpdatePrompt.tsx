'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { APP_VERSION } from '@/lib/version';

export function AppUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const applyUpdate = async () => {
    setIsUpdating(true);
    try {
      // 1. Send skip waiting to waiting service worker
      if (registrationRef.current && registrationRef.current.waiting) {
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Clear browser caches to eliminate stale chunks
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // 3. Short delay then reload
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch {
      window.location.reload();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let updateCheckInterval: any = null;

    const checkForServerVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== APP_VERSION) {
            setUpdateAvailable(true);
            window.dispatchEvent(new CustomEvent('rupeewise_update_status', { detail: { available: true } }));
            if (registrationRef.current) {
              registrationRef.current.update().catch(() => {});
            }
          }
        }
      } catch {}
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          registrationRef.current = reg;

          // If a worker is already waiting, trigger update prompt
          if (reg.waiting) {
            setUpdateAvailable(true);
            window.dispatchEvent(new CustomEvent('rupeewise_update_status', { detail: { available: true } }));
          }

          // Listen for a new service worker installing
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                window.dispatchEvent(new CustomEvent('rupeewise_update_status', { detail: { available: true } }));
              }
            });
          });

          // Check on initial load
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });

      // Reload when controller changes
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing && isUpdating) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Check server version right away
    checkForServerVersion();

    // Check periodically every 2 minutes
    updateCheckInterval = setInterval(() => {
      if (registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
      checkForServerVersion();
    }, 120000);

    // Check when user switches back to the app window/tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
        checkForServerVersion();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Listen for manual trigger from Profile or other buttons
    const handleManualCheck = async (e: any) => {
      const callback = e?.detail?.onComplete;
      try {
        let found = false;
        if (registrationRef.current) {
          await registrationRef.current.update();
          if (registrationRef.current.waiting) {
            found = true;
          }
        }
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== APP_VERSION) {
            found = true;
          }
        }
        if (found) {
          setUpdateAvailable(true);
          setDismissed(false);
          if (callback) callback({ status: 'update_found' });
        } else {
          if (callback) callback({ status: 'up_to_date' });
        }
      } catch (err) {
        if (callback) callback({ status: 'error', error: err });
      }
    };

    window.addEventListener('rupeewise_check_update', handleManualCheck);

    return () => {
      if (updateCheckInterval) clearInterval(updateCheckInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('rupeewise_check_update', handleManualCheck);
    };
  }, [isUpdating]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 dark:bg-card/95 text-white dark:text-foreground backdrop-blur-xl border border-emerald-500/40 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
          <Sparkles className="w-5 h-5 animate-pulse text-emerald-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold leading-tight">New Update Ready!</span>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">
              v{APP_VERSION}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 dark:text-muted-foreground leading-tight mt-0.5 truncate">
            Get the newest features and improvements instantly.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={applyUpdate}
          disabled={isUpdating}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 h-8 gap-1.5 shadow-md shadow-emerald-950/30"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white dark:text-muted-foreground dark:hover:text-foreground rounded-lg transition-colors"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

