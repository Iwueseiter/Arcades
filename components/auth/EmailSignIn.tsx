'use client';

import { useState, type FormEvent } from 'react';
import { Mail, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast-store';

/** Sign in with a link sent by email: no wallet or password needed, and progress follows you to any device. */
export function EmailSignIn({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.emailLink(email.trim());
      setSentTo(email.trim());
    } catch (error) {
      toast.error('Couldn’t send the link', error instanceof Error ? error.message : undefined);
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <div className="email-sent" role="status">
        <MailCheck size={22} />
        <div>
          <strong>Check your inbox</strong>
          <p>
            We sent a sign-in link to {sentTo}. It works once, for 15 minutes.{' '}
            <button type="button" className="link-btn" onClick={() => setSentTo(null)}>
              Use another email
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="email-signin" onSubmit={send}>
      {!compact && (
        <label htmlFor="signin-email" className="welcome-label">
          Sign in with email
        </label>
      )}
      <div className="email-row">
        <input
          id="signin-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" className="btn btn-dark" disabled={sending || !email.includes('@')} aria-label="Email me a sign-in link">
          {sending ? <span className="spinner" /> : <Mail size={18} />}
        </button>
      </div>
      <p className="email-hint">We’ll email you a link. No password needed.</p>
    </form>
  );
}
