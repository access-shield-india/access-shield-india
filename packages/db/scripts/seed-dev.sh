#!/usr/bin/env bash
# Apply migrations + dev seed to Docker Postgres (port 5433).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-accessshield-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_NAME:-accessshield}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Starting Postgres via docker compose..."
  docker compose -f "$ROOT/docker-compose.yml" up -d postgres
  sleep 2
fi

echo "Applying schema migrations..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  < "$ROOT/packages/db/migrations/0000_graceful_trish_tilby.sql"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  < "$ROOT/packages/db/migrations/0001_add_public_scans_and_waitlist.sql"

echo "Seeding dev data..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  < "$ROOT/packages/db/seed/dev.sql"

echo ""
echo "Done. Test data:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 'org' AS type, id::text, name FROM organisations WHERE slug = 'test-org'
  UNION ALL
  SELECT 'user', id::text, email FROM users WHERE email = 'test@accessshield.in'
  UNION ALL
  SELECT 'asset', id::text, name FROM assets WHERE id = '33333333-3333-3333-3333-333333333333';
"

echo ""
echo "Optional — create sysadmin auth user:"
echo "  SYSADMIN_INITIAL_PASSWORD=your-password bash scripts/seed-sysadmin.sh"
echo ""
echo "JWT claims (Keycloak user attributes user_role + org_id, or AUTH_DB_CLAIMS_FALLBACK):"
echo "  bash scripts/set-test-user-claims.sh"
echo '  { "user_role": "customer_admin", "org_id": "11111111-1111-1111-1111-111111111111" }'
echo ""
echo "Keycloak must be running (docker compose up -d keycloak)."
