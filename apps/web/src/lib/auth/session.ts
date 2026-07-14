import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

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
  return session.accessToken;
}
