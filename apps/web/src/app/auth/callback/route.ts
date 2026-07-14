import { type NextRequest, NextResponse } from 'next/server';

/**
 * Legacy Supabase OAuth callback — Auth.js handles OIDC at /api/auth/callback/keycloak.
 * Keep this route as a redirect so old bookmarks do not 404.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
