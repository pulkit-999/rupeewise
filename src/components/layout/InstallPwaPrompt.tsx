'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  X,
  Share,
  Smartphone,
  Monitor,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed in this session
    if (sessionStorage.getItem('rupeewise_pwa_dismissed')) {
      setDismissed(true);
    }

    // Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
      setActiveTab('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
      setActiveTab('android');
    } else {
      setPlatform('desktop');
      setActiveTab('desktop');
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    }

    // Capture Android/Desktop beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
      setTimeout(() => setInstalled(false), 3000);
    };

    const handleTriggerInstall = () => {
      setDismissed(false);
      triggerInstall();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('rupeewise_open_install', handleTriggerInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('rupeewise_open_install', handleTriggerInstall);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.warn('Error during native install prompt:', err);
      }
    }
    // If deferredPrompt was null or rejected, open the step-by-step guide modal
    setShowGuideModal(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('rupeewise_pwa_dismissed', 'true');
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.origin;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleWhatsAppShare = () => {
    const url = window.location.origin;
    const text = `Install RupeeWise to split bills and settle directly via UPI: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // If already running inside installed standalone app, don't show prompt
  if (isStandalone) return null;

  return (
    <>
      {/* Floating Bottom App Install Banner */}
      {!dismissed && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 animate-in slide-in-from-bottom-5">
          <div className="p-4 rounded-2xl bg-card border-2 border-emerald-500/40 shadow-2xl backdrop-blur-lg bg-card/95 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/20">
                <span className="font-extrabold text-xl">₹</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                  <span>Install RupeeWise App</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.2 rounded">
                    Free
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Add to home screen for 1-tap launch & no browser bar!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={triggerInstall}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 h-8 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Install
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Step-by-Step Installation Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">How to Install RupeeWise</h3>
                  <p className="text-[11px] text-muted-foreground">Add to home screen in 2 simple steps</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('android')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'android'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                <span>Android</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'ios'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Share className="w-3.5 h-3.5 text-blue-500" />
                <span>iPhone</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'desktop'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-purple-500" />
                <span>Laptop</span>
              </button>
            </div>

            {/* Step-by-Step Instructions by Tab */}
            {activeTab === 'android' && (
              <div className="space-y-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/70">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Open Chrome or your browser menu</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tap the three dots menu (<strong className="text-foreground">⋮</strong>) at the top right of your screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Tap "Install app" or "Add to Home screen"</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      RupeeWise will download and appear on your phone screen with the ₹ icon.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/70">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Tap the Share button in Safari</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Look at the bottom toolbar in Safari and tap the Share icon (<Share className="w-3.5 h-3.5 inline text-blue-500" />).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Scroll down & tap "Add to Home Screen"</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Then tap <strong className="text-foreground">"Add"</strong> in the top-right corner.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/70">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Look at your browser's address bar</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      At the top right of the URL bar, look for the <strong className="text-foreground">Install icon</strong> (a small computer monitor or download arrow ⬇️).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">Click "Install"</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Or click Menu (<strong className="text-foreground">⋮</strong>) → <strong className="text-foreground">"Install RupeeWise"</strong> to run it in its own window.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Share to Phone Buttons */}
            <div className="pt-1 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground mb-2">
                Want to open this directly on your phone?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full text-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppShare}
                  className="w-full text-xs text-emerald-600 dark:text-emerald-400"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />
                  Send on WhatsApp
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2"
              onClick={() => setShowGuideModal(false)}
            >
              Done / Got It
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
