import type { Metadata } from 'next';
import { SignupForm } from '@/components/marketing/SignupForm';

export const metadata: Metadata = {
  title: 'Start free trial',
  description:
    'Create your AccessShield India account and start scanning for accessibility compliance.',
};

export default function SignupPage() {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Start your free trial
          </h1>
          <p className="mt-4 text-lg leading-normal text-text-secondary">
            No credit card required. 14-day Professional trial — 1 website, 5 scans, then choose a
            plan or continue free on Starter (3 scans/month).
          </p>
        </div>

        <div className="mt-12">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
