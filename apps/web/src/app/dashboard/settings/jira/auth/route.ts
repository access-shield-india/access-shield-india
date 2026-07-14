import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';

const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize';

/**
 * GET /dashboard/settings/jira/auth
 * Initiates the Jira OAuth flow by redirecting to Atlassian
 */
export async function GET(_request: NextRequest) {
  const session = await getAppSession();

  if (!session.userId || !session.accessToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/jira/callback`;

  if (!clientId) {
    return new NextResponse('Jira integration not configured', { status: 500 });
  }

  const state = Buffer.from(
    JSON.stringify({
      userId: session.userId,
      timestamp: Date.now(),
    }),
  ).toString('base64');

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: 'read:jira-work write:jira-work offline_access',
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  return NextResponse.redirect(`${ATLASSIAN_AUTH_URL}?${params.toString()}`);
}
