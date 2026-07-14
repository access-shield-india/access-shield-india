/**
 * Auth issuer / JWKS for Keycloak (only supported IdP).
 */

export function getAuthIssuerUrl(secrets: { authIssuerUrl?: string }): string {
  if (!secrets.authIssuerUrl) {
    throw new Error('AUTH_ISSUER_URL is required');
  }
  return secrets.authIssuerUrl.replace(/\/$/, '');
}

export function getAuthJwksUrl(secrets: {
  authIssuerUrl?: string;
  authJwksUrl?: string;
}): string {
  if (secrets.authJwksUrl) {
    return secrets.authJwksUrl;
  }
  const issuer = getAuthIssuerUrl(secrets);
  return `${issuer}/protocol/openid-connect/certs`;
}
