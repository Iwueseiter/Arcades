'use client';

import { useEffect } from 'react';

/** Registers the service worker in production, so the app can be installed and opens offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Not fatal: the site just won't work offline.
    });
  }, []);
  return null;
}
