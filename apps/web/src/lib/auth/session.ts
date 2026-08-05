import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { isAccessTokenExpired } from '@/lib/auth/claims';

export interface AppSession {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  user_role?: string;
  org_id?: string;
}

/**
 * Server session from Auth.js (Keycloak). Access token is used as API Bearer.
 */
export async function getAppSession(): Promise<AppSession> {
  const session = await getServerSession(authOptions);
  return {
    accessToken: session?.accessToken ?? null,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    user_role: session?.user?.user_role,
    org_id: session?.user?.org_id,
  };
}

export async function getServerAccessToken(): Promise<string | null> {
  const session = await getAppSession();
  if (!session.accessToken || isAccessTokenExpired(session.accessToken)) {
    return null;
  }
  return session.accessToken;
}

function loginRedirectTarget(): string {
  const pathname = headers().get('x-as-pathname') ?? '/dashboard';
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/dashboard';
  }
  return pathname;
}

/** Dashboard RSC gate — send expired/missing sessions to login instead of throwing. */
export async function requireServerAccessToken(): Promise<string> {
  const token = await getServerAccessToken();
  if (token) {
    return token;
  }
  redirect(`/login?redirectTo=${encodeURIComponent(loginRedirectTarget())}`);
}
