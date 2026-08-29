#!/usr/bin/env bash
# Configure (or update) the Google identity provider in Keycloak for "Continue with Google".
#
# Required env (from .env.local or shell):
#   KEYCLOAK_URL, KEYCLOAK_REALM
#   KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET
#   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
#
# Optional:
#   KEYCLOAK_GOOGLE_IDP_ALIAS (default: google)
#
# Google Cloud Console — Authorized redirect URI (exact):
#   ${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/broker/google/endpoint
#
# Usage:
#   ./scripts/configure-keycloak-google-idp.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${AS_ENV_FILE:-}"
if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$ROOT/.env.local" ]]; then
    ENV_FILE="$ROOT/.env.local"
  elif [[ -f "$ROOT/.env" ]]; then
    ENV_FILE="$ROOT/.env"
  fi
fi

get_env() {
  local key="$1"
  if [[ -z "${ENV_FILE:-}" || ! -f "$ENV_FILE" ]]; then
    return 0
  fi
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 | sed 's/\r$//' | cut -d= -f2- || true
}

: "${KEYCLOAK_URL:=$(get_env KEYCLOAK_URL)}"
: "${KEYCLOAK_REALM:=$(get_env KEYCLOAK_REALM)}"
: "${KEYCLOAK_ADMIN_CLIENT_ID:=$(get_env KEYCLOAK_ADMIN_CLIENT_ID)}"
: "${KEYCLOAK_ADMIN_CLIENT_SECRET:=$(get_env KEYCLOAK_ADMIN_CLIENT_SECRET)}"
: "${GOOGLE_OAUTH_CLIENT_ID:=$(get_env GOOGLE_OAUTH_CLIENT_ID)}"
: "${GOOGLE_OAUTH_CLIENT_SECRET:=$(get_env GOOGLE_OAUTH_CLIENT_SECRET)}"

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-accessshield}"
CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-accessshield-api}"
CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-}"
GOOGLE_ID="${GOOGLE_OAUTH_CLIENT_ID:-}"
GOOGLE_SECRET="${GOOGLE_OAUTH_CLIENT_SECRET:-}"
IDP_ALIAS="${KEYCLOAK_GOOGLE_IDP_ALIAS:-google}"

if [[ -z "$CLIENT_SECRET" || -z "$GOOGLE_ID" || -z "$GOOGLE_SECRET" ]]; then
  echo "Missing KEYCLOAK_ADMIN_CLIENT_SECRET, GOOGLE_OAUTH_CLIENT_ID, or GOOGLE_OAUTH_CLIENT_SECRET." >&2
  echo "Add them to .env.local, then re-run this script." >&2
  exit 1
fi

TOKEN="$(
  curl -sf -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d "grant_type=client_credentials" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))"
)"

ADMIN="${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/identity-provider/instances"

PAYLOAD="$(
  IDP_ALIAS="$IDP_ALIAS" GOOGLE_ID="$GOOGLE_ID" GOOGLE_SECRET="$GOOGLE_SECRET" node <<'NODE'
console.log(
  JSON.stringify({
    alias: process.env.IDP_ALIAS,
    providerId: 'google',
    enabled: true,
    trustEmail: true,
    storeToken: false,
    linkOnly: false,
    firstBrokerLoginFlowAlias: 'first broker login',
    config: {
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      defaultScope: 'openid profile email',
      syncMode: 'IMPORT',
      useJwksUrl: 'true',
    },
  }),
);
NODE
)"

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${TOKEN}" \
  "${ADMIN}/${IDP_ALIAS}")"

if [[ "$HTTP_CODE" == "200" ]]; then
  curl -sf -X PUT "${ADMIN}/${IDP_ALIAS}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD" >/dev/null
  echo "Updated Google IdP alias \"${IDP_ALIAS}\" in realm ${KEYCLOAK_REALM}."
else
  curl -sf -X POST "${ADMIN}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD" >/dev/null
  echo "Created Google IdP alias \"${IDP_ALIAS}\" in realm ${KEYCLOAK_REALM}."
fi

echo ""
echo "Google Cloud Console redirect URI:"
echo "  ${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/broker/${IDP_ALIAS}/endpoint"
