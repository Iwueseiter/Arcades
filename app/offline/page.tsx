import type { Metadata } from 'next';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Offline · Xurri' };

/** Shown by the service worker when the app is opened without a connection. */
export default function OfflinePage() {
  return (
    <main className="offline">
      <Logo />
      <h1>You’re offline</h1>
      <p>Xurri needs the internet to save your scores and claims. Check your connection, then try again.</p>
      {/* A full page load, not client navigation: it retries the network. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn btn-primary">
        Try again
      </a>
    </main>
  );
}
