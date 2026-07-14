import { redirect } from 'next/navigation';

/** Legacy waitlist URL — self-service signup replaces the waitlist flow. */
export default function WaitlistRedirectPage() {
  redirect('/signup');
}
