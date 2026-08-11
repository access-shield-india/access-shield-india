# Docker volumes & databases (backup inventory)

[← Self-hosting design](./09-self-hosting-supabase-replacement.md) | [Index](./README.md) | [Next: Deployment →](../deployment/README.md)

Local Compose and the intended prod backup surface. Full setup steps: [../deployment/README.md](../deployment/README.md).

## Rule

| Store | Same host OK? | Share schema with app? |
| --- | --- | --- |
| Keycloak | Yes — same Postgres **instance** | **No** — dedicated database `keycloak` + role |
| AccessShield app | Postgres DB `accessshield` | N/A |

Never point Keycloak `KC_DB_URL` at the `accessshield` database.

## Local Compose volumes

Defined in [`docker-compose.yml`](../../docker-compose.yml) with **explicit names**:

| Volume name | Service path | Contents | Backup |
| --- | --- | --- | --- |
| `accessshield_postgres_data` | `/var/lib/postgresql/data` | DBs: `accessshield`, `keycloak` | **P0** — `pg_dump` both DBs (or volume snapshot) |
| `accessshield_minio_data` | `/data` | Dev object storage | **P0** (prod: prefer S3, not this volume) |
| `accessshield_rabbitmq_data` | `/var/lib/rabbitmq` | Durable queues | **P1** |
| `accessshield_redis_data` | `/data` | AOF cache | **P2** — rebuildable |

No volume (ephemeral): `tika`, `mailpit`, Keycloak container FS (state lives in Postgres `keycloak`).

Realm import file (not a volume): `infra/keycloak/accessshield-realm.json` (git-backed).

## Databases on Postgres (`localhost:5433`)

| Database | Owner / user | Used by |
| --- | --- | --- |
| `accessshield` | `postgres` (dev) | API, workers, Drizzle |
| `keycloak` | `keycloak` / `keycloak` | Keycloak only |

Init script (first empty volume only): [`infra/postgres/init/01-keycloak-db.sh`](../../infra/postgres/init/01-keycloak-db.sh)

If the Postgres volume already existed before this script was added, create the Keycloak DB once:

```bash
docker exec -i accessshield-postgres psql -U postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keycloak') THEN
    CREATE ROLE keycloak LOGIN PASSWORD 'keycloak';
  END IF;
END
$$;
SELECT 'CREATE DATABASE keycloak OWNER keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;
SQL
docker compose up -d keycloak
# Re-seed login user after Keycloak first migration:
./scripts/seed-sysadmin.sh
```

## Prod backup sketch

1. **Postgres (P0):** `pg_dump -Fc accessshield` and `pg_dump -Fc keycloak` (or RDS snapshot covering both DBs on the instance).
2. **Object storage (P0):** S3 bucket versioning / replication (not MinIO volume).
3. **RabbitMQ (P1):** definitions export + volume/EFS snapshot if used.
4. **Redis (P2):** optional; treat as disposable unless you store non-reproducible locks.

Keycloak container recreate is safe once `keycloak` DB is on Postgres: users/sessions survive; re-run realm import only if clients/mappers must be refreshed from JSON.
