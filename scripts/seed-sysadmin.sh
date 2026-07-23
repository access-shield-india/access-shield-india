#!/usr/bin/env bash
# Create or update sysadmin@accessshield.in in Keycloak with super_admin attributes,
# then sync users.auth_user_id in Postgres.
#
# Required (environment or .env.local / .env):
#   KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET
#   SYSADMIN_INITIAL_PASSWORD
# Optional:
#   DATABASE_URL                 — sync auth_user_id when set
#   NEXT_PUBLIC_AUTH_CLIENT_ID   — password-grant smoke test client (default accessshield-web)
#   AS_ENV_FILE                  — override path to env file
#
# Dependencies: curl, node; psql only when DATABASE_URL is set
#   Linux: apt install curl postgresql-client   (node from the monorepo toolchain)
#
# Usage:
#   ./scripts/seed-sysadmin.sh
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
  # Strip CR (Windows-edited .env.local) and take last definition
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 | sed 's/\r$//' | cut -d= -f2- || true
}

# Exported env wins; file fills gaps (prod often injects secrets via environment only)
: "${KEYCLOAK_URL:=$(get_env KEYCLOAK_URL)}"
: "${KEYCLOAK_REALM:=$(get_env KEYCLOAK_REALM)}"
: "${KEYCLOAK_ADMIN_CLIENT_ID:=$(get_env KEYCLOAK_ADMIN_CLIENT_ID)}"
: "${KEYCLOAK_ADMIN_CLIENT_SECRET:=$(get_env KEYCLOAK_ADMIN_CLIENT_SECRET)}"
: "${SYSADMIN_INITIAL_PASSWORD:=$(get_env SYSADMIN_INITIAL_PASSWORD)}"
: "${DATABASE_URL:=$(get_env DATABASE_URL)}"
: "${NEXT_PUBLIC_AUTH_CLIENT_ID:=$(get_env NEXT_PUBLIC_AUTH_CLIENT_ID)}"

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-accessshield}"
CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-accessshield-api}"
CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-}"
PASSWORD="${SYSADMIN_INITIAL_PASSWORD:-}"
WEB_CLIENT_ID="${NEXT_PUBLIC_AUTH_CLIENT_ID:-accessshield-web}"
EMAIL="sysadmin@accessshield.in"
FIRST_NAME="Sys"
LAST_NAME="Admin"
PLATFORM_ORG_ID="44444444-4444-4444-4444-444444444444"
APP_USER_ID="55555555-5555-5555-5555-555555555555"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd curl
need_cmd node

if [[ -z "$CLIENT_SECRET" ]]; then
  echo "Missing KEYCLOAK_ADMIN_CLIENT_SECRET (environment or ${ENV_FILE:-.env.local})" >&2
  exit 1
fi

if [[ -z "$PASSWORD" ]]; then
  echo "Missing SYSADMIN_INITIAL_PASSWORD (environment or ${ENV_FILE:-.env.local})" >&2
  exit 1
fi

# Build Keycloak user JSON.
# firstName/lastName + empty requiredActions are required so password grant does not
# fail with: invalid_grant / "Account is not fully set up" (VERIFY_PROFILE).
user_payload() {
  local with_credentials="${1:-false}"
  WITH_CREDS="$with_credentials" EMAIL="$EMAIL" PASSWORD="$PASSWORD" \
  ORG="$PLATFORM_ORG_ID" FN="$FIRST_NAME" LN="$LAST_NAME" node <<'NODE'
const withCreds = process.env.WITH_CREDS === 'true';
const body = {
  email: process.env.EMAIL,
  username: process.env.EMAIL,
  firstName: process.env.FN,
  lastName: process.env.LN,
  enabled: true,
  emailVerified: true,
  requiredActions: [],
  attributes: {
    user_role: ['super_admin'],
    org_id: [process.env.ORG],
  },
};
if (withCreds) {
  body.credentials = [{ type: 'password', value: process.env.PASSWORD, temporary: false }];
}
process.stdout.write(JSON.stringify(body));
NODE
}

password_payload() {
  PASSWORD="$PASSWORD" node -e "process.stdout.write(JSON.stringify({type:'password',value:process.env.PASSWORD,temporary:false}))"
}

json_field() {
  local field="$1"
  FIELD="$field" node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(0, "utf8") || "null");
    const v = data && data[process.env.FIELD];
    process.stdout.write(v == null ? "" : String(v));
  '
}

find_user_id() {
  EMAIL_LC="$(echo "$EMAIL" | tr '[:upper:]' '[:lower:]')" node -e '
    const fs = require("fs");
    const email = process.env.EMAIL_LC;
    const data = JSON.parse(fs.readFileSync(0, "utf8") || "[]");
    const list = Array.isArray(data) ? data : [];
    const hit = list.find((u) => String(u.email || "").toLowerCase() === email);
    process.stdout.write(hit && hit.id ? hit.id : "");
  '
}

echo "Requesting Keycloak admin token (${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM})..."
TOKEN_JSON=$(curl -sS -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=${CLIENT_ID}" \
  --data-urlencode "client_secret=${CLIENT_SECRET}")
TOKEN=$(printf '%s' "$TOKEN_JSON" | json_field access_token)

if [[ -z "$TOKEN" ]]; then
  echo "Failed to obtain Keycloak admin token — check KEYCLOAK_* and that Keycloak is up." >&2
  echo "$TOKEN_JSON" >&2
  exit 1
fi

ADMIN="${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}"
EXISTING=$(curl -sS -G "${ADMIN}/users" \
  --data-urlencode "email=${EMAIL}" \
  --data-urlencode "exact=true" \
  -H "Authorization: Bearer ${TOKEN}")
AUTH_USER_ID=$(printf '%s' "$EXISTING" | find_user_id)

TMP_BODY=$(mktemp)
trap 'rm -f "$TMP_BODY"' EXIT

if [[ -n "$AUTH_USER_ID" ]]; then
  echo "Updating Keycloak user $AUTH_USER_ID..."
  HTTP=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X PUT "${ADMIN}/users/${AUTH_USER_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(user_payload false)")
  if [[ "$HTTP" != "204" && "$HTTP" != "200" ]]; then
    echo "Failed to update user (HTTP $HTTP):"; cat "$TMP_BODY"; exit 1
  fi
  HTTP=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X PUT "${ADMIN}/users/${AUTH_USER_ID}/reset-password" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(password_payload)")
  if [[ "$HTTP" != "204" && "$HTTP" != "200" ]]; then
    echo "Failed to reset password (HTTP $HTTP):"; cat "$TMP_BODY"; exit 1
  fi
else
  echo "Creating Keycloak user $EMAIL..."
  HDR=$(mktemp)
  HTTP=$(curl -sS -D "$HDR" -o "$TMP_BODY" -w "%{http_code}" -X POST "${ADMIN}/users" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(user_payload true)")
  AUTH_USER_ID=$(grep -i '^Location:' "$HDR" | tr -d '\r' | sed 's|.*/||')
  rm -f "$HDR"
  if [[ -z "$AUTH_USER_ID" || ( "$HTTP" != "201" && "$HTTP" != "204" ) ]]; then
    echo "Failed to create Keycloak user (HTTP $HTTP):"; cat "$TMP_BODY"; exit 1
  fi
  echo "Created Keycloak user id=$AUTH_USER_ID"
fi

SQL_SYNC="
UPDATE users SET auth_user_id = '00000000-0000-0000-0000-000000000099', updated_at = now()
WHERE auth_user_id = '${AUTH_USER_ID}' AND id <> '${APP_USER_ID}';
UPDATE users SET auth_user_id = '${AUTH_USER_ID}', role = 'super_admin',
  organisation_id = '${PLATFORM_ORG_ID}', is_active = true, updated_at = now()
WHERE id = '${APP_USER_ID}';
"

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Syncing auth_user_id in Postgres..."
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$SQL_SYNC"
  elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'accessshield-postgres'; then
    # Local Compose fallback when host psql is not installed (common on Windows)
    docker exec -i accessshield-postgres psql -U postgres -d accessshield -v ON_ERROR_STOP=1 -c "$SQL_SYNC"
  else
    echo "Neither psql nor accessshield-postgres container available — cannot sync DB." >&2
    echo "Install postgresql-client or set DATABASE_URL and ensure Postgres is reachable." >&2
    exit 1
  fi
else
  echo "DATABASE_URL not set — skipping Postgres auth_user_id sync."
fi

echo "Verifying password grant (client=${WEB_CLIENT_ID})..."
GRANT=$(curl -sS -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=${WEB_CLIENT_ID}" \
  --data-urlencode "username=${EMAIL}" \
  --data-urlencode "password=${PASSWORD}" \
  --data-urlencode "scope=openid profile email")
GRANT_TOKEN=$(printf '%s' "$GRANT" | json_field access_token)
if [[ -z "$GRANT_TOKEN" ]]; then
  echo "Password grant failed — web login will 401 until this works:" >&2
  echo "$GRANT" >&2
  exit 1
fi

echo "Done. Sign in as $EMAIL (password grant OK)."
