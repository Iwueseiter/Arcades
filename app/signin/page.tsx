'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { Welcome } from '@/components/onboarding/Welcome';
import { Toaster } from '@/components/ui/Toaster';
import { toast } from '@/lib/toast-store';

export default function SignInPage() {
  const router = useRouter();

  // Sent here when a sign-in link was already used or has expired.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('link') === 'expired') {
      toast.error('That link has expired', 'Sign-in links work once, for 15 minutes. Ask for a new one below.');
      window.history.replaceState(null, '', '/signin');
    }
  }, []);

  return (
    <>
      <PageViewTracker path="/signin" />
      <Welcome standalone onDone={() => router.push('/')} />
      <Toaster />
    </>
  );
}
