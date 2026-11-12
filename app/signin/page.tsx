'use client';

import { useRouter } from 'next/navigation';
import { Welcome } from '@/components/onboarding/Welcome';
import { Toaster } from '@/components/ui/Toaster';

export default function SignInPage() {
  const router = useRouter();
  return (
    <>
      <Welcome standalone onDone={() => router.push('/')} />
      <Toaster />
    </>
  );
}
