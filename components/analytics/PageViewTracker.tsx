'use client';

import { useEffect } from 'react';

export function PageViewTracker({ path }: { path: string }) {
  useEffect(() => {
    void fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) console.warn('Page-view tracking failed', response.status);
    }).catch((error: unknown) => {
      console.warn('Page-view tracking failed', error);
    });
  }, [path]);

  return null;
}
