'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { Welcome } from '@/components/onboarding/Welcome';
import { Toaster } from '@/components/ui/Toaster';
import { toast } from '@/lib/toast-store';

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('link') === 'expired') {
      toast.error('That link has expired', 'Sign-in links work once and last 15 minutes. Request a new one below.');
      window.history.replaceState(null, '', '/signin');
    }
    // Arrived via /signup redirect — show a soft hint.
    if (params.get('from') === 'signup') {
      toast.info('Create your account below', 'Pick email or wallet — you can set your display name in your profile after.');
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
