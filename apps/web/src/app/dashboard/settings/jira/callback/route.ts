import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';

const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';

/**
 * GET /dashboard/settings/jira/callback
 * Handles the OAuth callback from Atlassian
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body><script>window.opener.postMessage('jira-error', '*'); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  }

  if (!code || !state) {
    return new NextResponse('Invalid callback', { status: 400 });
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString()) as {
      userId: string;
      timestamp: number;
    };
    if (Date.now() - stateData.timestamp > 600000) {
      throw new Error('State expired');
    }

    const session = await getAppSession();

    if (!session.userId || !session.accessToken || session.userId !== stateData.userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const tokenResponse = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/jira/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const [userResponse, resourcesResponse] = await Promise.all([
      fetch('https://api.atlassian.com/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
      fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
    ]);

    if (!userResponse.ok || !resourcesResponse.ok) {
      throw new Error('Failed to fetch user info or resources');
    }

    const user = (await userResponse.json()) as { email?: string };
    const resources = (await resourcesResponse.json()) as Array<{ url: string; id: string }>;

    if (!resources || resources.length === 0) {
      throw new Error('No accessible Jira sites found');
    }

    const site = resources[0]!;

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/jira`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        instanceUrl: site.url,
        siteId: site.id,
        connectedEmail: user.email,
      }),
    });

    return new NextResponse(
      `<html><body><script>window.opener.postMessage('jira-connected', '*'); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  } catch (err) {
    console.error('Jira OAuth error:', err);
    return new NextResponse(
      `<html><body><script>window.opener.postMessage('jira-error', '*'); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  }
}
