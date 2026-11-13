import { redirect } from 'next/navigation';

/** Sign-up and sign-in are the same flow — just connect a wallet or use your email.
 *  Display names are set later on the profile page. */
export default function SignupPage() {
  redirect('/signin?from=signup');
}
