'use client';

import { useRouter } from 'next/navigation';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { Welcome } from '@/components/onboarding/Welcome';
import { Toaster } from '@/components/ui/Toaster';

export default function SignInPage() {
  const router = useRouter();
  return (
    <>
      <PageViewTracker path="/signin" />
      <Welcome standalone onDone={() => router.push('/')} />
      <Toaster />
    </>
  );
}
