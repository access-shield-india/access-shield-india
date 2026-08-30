import { signIn } from 'next-auth/react';

/** Keycloak identity-provider alias configured in the realm (default: google). */
export function keycloakGoogleIdpAlias(): string {
  return process.env.NEXT_PUBLIC_KEYCLOAK_GOOGLE_IDP_ALIAS ?? 'google';
}

/**
 * Start Google sign-in via Keycloak brokering.
 *
 * The web app does not talk to Google directly — Auth.js opens Keycloak with
 * `kc_idp_hint` so Keycloak skips its username/password form and forwards to
 * the Google IdP. Requires Google to be configured in the Keycloak realm.
 */
export async function signInWithGoogle(callbackUrl: string): Promise<{ error?: string } | undefined> {
  return signIn(
    'keycloak',
    { callbackUrl },
    { kc_idp_hint: keycloakGoogleIdpAlias() },
  );
}
