'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import styles from './Admin.module.css';

export function AdminLogin({ configured, nextPath }: { configured: boolean; nextPath: '/admin' | '/analytics' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed.');
      router.replace(nextPath);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.loginBrand}><Logo /></div>
        <p className={styles.eyebrow}>ADMIN ACCESS</p>
        <h1>Team sign in</h1>
        <p className={styles.loginIntro}>Sign in to view Xurri analytics and project activity.</p>
        {!configured && (
          <p className={styles.configWarning} role="alert">
            Admin access is not configured. Set <code>XURRI_ADMIN_EMAIL</code> and a 16+ character <code>XURRI_ADMIN_PASSWORD</code> on the server.
          </p>
        )}
        <form className={styles.loginForm} onSubmit={submit}>
          <label>
            Email
            <input autoComplete="username" disabled={!configured || submitting} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label>
            Password
            <input autoComplete="current-password" disabled={!configured || submitting} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error && <p className={styles.loginError} role="alert">{error}</p>}
          <button className={styles.loginButton} disabled={!configured || submitting} type="submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link className={styles.backLink} href="/">Return to Xurri</Link>
      </section>
    </main>
  );
}
