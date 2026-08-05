import type { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Auth.js (next-auth v4) config for Keycloak.
 * Access tokens are stored in the session JWT for API Bearer calls.
 * AccessShield never mints user JWTs — Keycloak does.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? 'accessshield-web',
      clientSecret: process.env.KEYCLOAK_WEB_CLIENT_SECRET ?? '',
      issuer: process.env.AUTH_ISSUER_URL ?? 'http://localhost:8080/realms/accessshield',
    }),
    // Direct username/password against Keycloak (Resource Owner Password Grant)
    // for the existing email/password login form UX.
    CredentialsProvider({
      id: 'keycloak-credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const issuer =
          process.env.AUTH_ISSUER_URL ?? 'http://localhost:8080/realms/accessshield';
        const clientId = process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? 'accessshield-web';
        const tokenUrl = `${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;

        const body = new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          username: credentials.email,
          password: credentials.password,
          scope: 'openid profile email',
        });

        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });

        if (!response.ok) {
          return null;
        }

        const tokens = (await response.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          id_token?: string;
        };

        const userinfoUrl = `${issuer.replace(/\/$/, '')}/protocol/openid-connect/userinfo`;
        const userinfoRes = await fetch(userinfoUrl, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userinfoRes.ok) {
          return null;
        }

        const profile = (await userinfoRes.json()) as {
          sub: string;
          email?: string;
          name?: string;
          preferred_username?: string;
          user_role?: string;
          org_id?: string;
        };

        return {
          id: profile.sub,
          email: profile.email ?? credentials.email,
          name: profile.name ?? profile.preferred_username ?? credentials.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpires: Date.now() + tokens.expires_in * 1000,
          user_role: profile.user_role,
          org_id: profile.org_id,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        const u = user as {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpires?: number;
          user_role?: string;
          org_id?: string;
        };
        return {
          ...token,
          accessToken: u.accessToken ?? account.access_token,
          refreshToken: u.refreshToken ?? account.refresh_token,
          accessTokenExpires: u.accessTokenExpires ?? (account.expires_at ? account.expires_at * 1000 : Date.now() + 3600_000),
          user_role: u.user_role,
          org_id: u.org_id,
        };
      }

      const expires = typeof token.accessTokenExpires === 'number' ? token.accessTokenExpires : 0;
      if (Date.now() < expires - 60_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token.error === 'RefreshAccessTokenError' || typeof token.accessToken !== 'string') {
        session.accessToken = undefined;
        session.error = typeof token.error === 'string' ? token.error : 'NotAuthenticated';
        return session;
      }

      session.accessToken = token.accessToken;
      session.error = undefined;
      session.user = {
        ...session.user,
        id: token.sub,
        user_role: typeof token.user_role === 'string' ? token.user_role : undefined,
        org_id: typeof token.org_id === 'string' ? token.org_id : undefined,
      };
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
};

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const issuer = process.env.AUTH_ISSUER_URL ?? 'http://localhost:8080/realms/accessshield';
    const clientId = process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? 'accessshield-web';
    const refreshToken = token.refreshToken;
    if (typeof refreshToken !== 'string') {
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        error: 'RefreshAccessTokenError',
      };
    }

    const response = await fetch(`${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });

    const refreshed = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!response.ok || !refreshed.access_token) {
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        error: 'RefreshAccessTokenError',
      };
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? refreshToken,
      accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      error: undefined,
    };
  } catch {
    return {
      ...token,
      accessToken: undefined,
      refreshToken: undefined,
      error: 'RefreshAccessTokenError',
    };
  }
}
