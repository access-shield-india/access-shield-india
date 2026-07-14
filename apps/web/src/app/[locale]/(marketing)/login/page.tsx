import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/marketing/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to your AccessShield India account to manage accessibility scans and compliance.',
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-4 py-24 text-center text-text-secondary">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
