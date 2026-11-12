'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import styles from './Admin.module.css';

export function AdminFrame({ children, protectedPage = false }: { children: ReactNode; protectedPage?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    setError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      router.replace('/admin');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out. Please try again.');
      setSigningOut(false);
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Logo />
        <div className={styles.topActions}>
          <Link className={styles.backLink} href="/">Back to app</Link>
          {protectedPage && (
            <button className={styles.signOut} disabled={signingOut} onClick={signOut} type="button">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          )}
        </div>
      </header>
      {error && <p className={styles.topError} role="alert">{error}</p>}
      {children}
    </div>
  );
}
