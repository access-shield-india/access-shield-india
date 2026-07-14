#!/usr/bin/env bash
# Set user_role + org_id Keycloak attributes for test@accessshield.in
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

get_env() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 | sed 's/\r$//' | cut -d= -f2-
}

ORG_ID="11111111-1111-1111-1111-111111111111"
EMAIL="test@accessshield.in"
KEYCLOAK_URL="$(get_env KEYCLOAK_URL)"
KEYCLOAK_REALM="$(get_env KEYCLOAK_REALM)"
CLIENT_ID="$(get_env KEYCLOAK_ADMIN_CLIENT_ID)"
CLIENT_SECRET="$(get_env KEYCLOAK_ADMIN_CLIENT_SECRET)"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-accessshield}"

if [[ -z "$CLIENT_SECRET" ]]; then
  echo "Missing KEYCLOAK_ADMIN_CLIENT_SECRET in .env.local"
  exit 1
fi

TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}" \
  | jq -r '.access_token // empty')

if [[ -z "$TOKEN" ]]; then
  echo "Failed to obtain Keycloak admin token"; exit 1
fi

ADMIN="${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}"
USERS=$(curl -s -G "${ADMIN}/users" --data-urlencode "email=${EMAIL}" --data-urlencode "exact=true" \
  -H "Authorization: Bearer ${TOKEN}")
AUTH_USER_ID=$(echo "$USERS" | jq -r '.[0].id // empty')
if [[ -z "$AUTH_USER_ID" ]]; then
  echo "User $EMAIL not found in Keycloak"; exit 1
fi

USER_JSON=$(curl -s "${ADMIN}/users/${AUTH_USER_ID}" -H "Authorization: Bearer ${TOKEN}")
UPDATED=$(echo "$USER_JSON" | jq --arg org "$ORG_ID" \
  '.attributes.user_role = ["customer_admin"] | .attributes.org_id = [$org]')
curl -s -X PUT "${ADMIN}/users/${AUTH_USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$UPDATED" | jq .

echo "Done. Sign out and sign in again."
