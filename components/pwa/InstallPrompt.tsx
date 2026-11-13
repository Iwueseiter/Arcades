'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const DISMISS_KEY = 'xurri-install-dismissed';

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < 14 * 86400_000;
  } catch {
    return false;
  }
}

/**
 * Offers to add Xurri to the home screen: a one-tap install where the browser supports it (Android,
 * desktop Chrome), and Share → Add to Home Screen instructions on iPhone and iPad.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || dismissedRecently()) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos) {
      setIos(true);
      setHidden(false);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || (!event && !ios)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode: it just shows again next time
    }
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') setHidden(true);
    setEvent(null);
  };

  return (
    <div className="install-card" role="region" aria-label="Install Xurri">
      <Image src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="install-text">
        <strong>Get the Xurri app</strong>
        {ios ? (
          <span>
            Tap <Share size={13} aria-label="Share" /> then “Add to Home Screen”.
          </span>
        ) : (
          <span>Full screen, one tap from your home screen.</span>
        )}
      </div>
      {!ios && (
        <button type="button" className="btn btn-primary btn-sm" onClick={install}>
          <Download size={15} /> Install
        </button>
      )}
      <button type="button" className="icon-btn install-close" onClick={dismiss} aria-label="Not now">
        <X size={16} />
      </button>
    </div>
  );
}
