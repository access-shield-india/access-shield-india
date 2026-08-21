import { getToken } from 'next-auth/jwt';
import { type NextRequest, NextResponse } from 'next/server';
import { isAccessTokenExpired, parseAccessShieldClaims } from './src/lib/auth/claims';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_QUERY,
} from './src/lib/i18n/config';
import type { Locale } from './src/lib/i18n/config';
import { isLocaleAgnosticPath, pathnameHasHiPrefix, stripLocalePrefix } from './src/lib/i18n/paths';

const PROTECTED_PREFIXES = ['/dashboard'];
const AUTH_ROUTES = ['/login', '/signup', '/auth'];
const DOCUMENT_SCANNER_MARKETING_PATH = '/document-scanner';

function isDocumentScannerMarketingPath(path: string): boolean {
  return path === DOCUMENT_SCANNER_MARKETING_PATH;
}

function resolveLocale(pathname: string): Locale {
  if (pathnameHasHiPrefix(pathname)) return 'hi';
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  return defaultLocale;
}

function forwardRequestHeaders(request: NextRequest, extra: Record<string, string>): Headers {
  const requestHeaders = new Headers(request.headers);
  for (const [key, value] of Object.entries(extra)) {
    requestHeaders.set(key, value);
  }
  return requestHeaders;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value, cookie);
  }
}

function localizedAuthPath(path: string, _locale: Locale): string {
  return path;
}

function buildLocaleResponse(
  request: NextRequest,
  locale: Locale,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  const pathname = request.nextUrl.pathname;

  const requestHeaders = forwardRequestHeaders(request, {
    [LOCALE_HEADER]: locale,
    'x-as-pathname': pathname,
    ...extraHeaders,
  });

  request.cookies.set(LOCALE_COOKIE, locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const setLocaleParam = request.nextUrl.searchParams.get(LOCALE_QUERY);

  if (setLocaleParam && isLocale(setLocaleParam)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(LOCALE_QUERY);
    const response = NextResponse.redirect(clean);
    response.cookies.set(LOCALE_COOKIE, setLocaleParam, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  if (pathnameHasHiPrefix(pathname) && isLocaleAgnosticPath(stripLocalePrefix(pathname))) {
    const clean = request.nextUrl.clone();
    clean.pathname = stripLocalePrefix(pathname);
    const response = NextResponse.redirect(clean);
    response.cookies.set(LOCALE_COOKIE, 'hi', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  // English marketing URLs are unprefixed in the browser (`/about`).
  // next.config beforeFiles rewrites to `/en` are skipped after middleware in
  // Next 14.2. Leave `/` alone — apps/web/src/app/page.tsx serves it.
  const needsEnRewrite =
    pathname !== '/' &&
    !pathnameHasHiPrefix(pathname) &&
    pathname !== '/en' &&
    !pathname.startsWith('/en/') &&
    !isLocaleAgnosticPath(pathname) &&
    !pathname.startsWith('/api/');

  if (needsEnRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? '/en' : `/en${pathname}`;
    const requestHeaders = forwardRequestHeaders(request, {
      [LOCALE_HEADER]: 'en',
      'x-as-pathname': pathname,
    });
    const rewriteResponse = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    rewriteResponse.cookies.set(LOCALE_COOKIE, 'en', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return rewriteResponse;
  }

  const locale = resolveLocale(pathname);
  const internalPath = pathnameHasHiPrefix(pathname)
    ? stripLocalePrefix(pathname)
    : pathname === '/en'
      ? '/'
      : pathname.startsWith('/en/')
        ? pathname.slice(3) || '/'
        : pathname;

  const response = buildLocaleResponse(request, locale);

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  const accessToken = typeof token?.accessToken === 'string' ? token.accessToken : null;
  const isAuthenticated =
    Boolean(accessToken) &&
    token?.error !== 'RefreshAccessTokenError' &&
    !isAccessTokenExpired(accessToken);
  const appMetadata = {
    user_role: token?.user_role,
    org_id: token?.org_id,
  };

  const isProtected = PROTECTED_PREFIXES.some((prefix) => internalPath.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => internalPath.startsWith(route));

  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = localizedAuthPath('/login', locale);
    loginUrl.searchParams.set('redirectTo', internalPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = localizedAuthPath('/dashboard', locale);
    return NextResponse.redirect(dashboardUrl);
  }

  if (isAuthenticated && isDocumentScannerMarketingPath(internalPath)) {
    const scannerUrl = request.nextUrl.clone();
    scannerUrl.pathname = '/dashboard/document-scanner';
    scannerUrl.search = '';
    return NextResponse.redirect(scannerUrl);
  }

  if (isAuthenticated && isProtected) {
    const { user_role: userRole, org_id: orgId } = parseAccessShieldClaims(accessToken, appMetadata);

    const extra: Record<string, string> = {};
    if (userRole) extra['x-user-role'] = userRole;
    if (orgId) extra['x-org-id'] = orgId;

    const nextResponse = buildLocaleResponse(request, locale, extra);
    copyCookies(response, nextResponse);

    if (userRole) nextResponse.headers.set('x-user-role', userRole);
    if (orgId) nextResponse.headers.set('x-org-id', orgId);

    return nextResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|widget\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
