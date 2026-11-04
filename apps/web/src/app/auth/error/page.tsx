import Link from 'next/link';
import { Alert } from '@accessshield/ui';

const MESSAGES: Record<string, { title: string; detail: string }> = {
  missing_claims: {
    title: 'Account not fully set up',
    detail:
      'Your login is missing organisation or role information in the access token. An admin must set Keycloak user attributes (user_role and org_id), then you must sign out and sign in again.',
  },
  missing_code: {
    title: 'Sign-in could not be completed',
    detail:
      'The authentication callback did not include a valid code. Please try signing in again.',
  },
  OAuthSignin: {
    title: 'Google sign-in failed to start',
    detail:
      'Keycloak could not begin the Google login flow. Confirm Google is configured as an identity provider in Keycloak and that NEXTAUTH_URL matches your site URL.',
  },
  OAuthCallback: {
    title: 'Google sign-in was rejected',
    detail:
      'Google or Keycloak returned an error during sign-in. Check that the Google OAuth redirect URI matches your Keycloak broker endpoint, then try again.',
  },
  AccessDenied: {
    title: 'Sign-in was cancelled',
    detail:
      'You cancelled Google sign-in or do not have access to this application yet. Sign up first if you are a new customer.',
  },
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string; error?: string };
}) {
  const reason = searchParams.reason ?? searchParams.error ?? 'unknown';
  const message = MESSAGES[reason] ?? {
    title: 'Authentication error',
    detail: 'Something went wrong during sign-in. Please try again or contact support.',
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12"
    >
      <h1 className="text-2xl font-bold text-text-primary">{message.title}</h1>
      <Alert variant="warning" title="What to do next" className="mt-6">
        {message.detail}
      </Alert>
      {reason === 'missing_claims' && (
        <pre className="mt-4 overflow-x-auto rounded-md bg-gray-100 p-4 text-xs text-text-secondary">
          {`App Metadata example:\n{\n  "user_role": "customer_admin",\n  "org_id": "11111111-1111-1111-1111-111111111111"\n}`}
        </pre>
      )}
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-md bg-primary-600 px-4 py-2 text-base font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
