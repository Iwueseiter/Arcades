'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production.
 * The SW URL includes the build ID as a query param — this forces the browser to
 * re-fetch and re-evaluate the SW on every new deploy, so updates are never stuck.
 * The actual sw.js content is identical; the query param just busts the browser's
 * "is this SW different?" byte-comparison check.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    // NEXT_PUBLIC_BUILD_ID is set by next.config.mjs via generateBuildId.
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? Date.now().toString(36);
    const swUrl = `/sw.js?v=${buildId}`;

    navigator.serviceWorker.register(swUrl, { scope: '/', updateViaCache: 'none' }).then((reg) => {
      // Check for a waiting worker and prompt to reload when one is found.
      const checkUpdate = () => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', () => {
          if (reg.installing?.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed — reload to activate it.
            window.location.reload();
          }
        });
      });
      checkUpdate();
    }).catch(() => {
      // Not fatal: the site just won't work offline.
    });
  }, []);
  return null;
}
