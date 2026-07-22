# 11 — Deployment Guide (Dev & Prod)

[← Docker volumes & backup](./10-docker-volumes-and-backup.md) | [Index](./README.md) | [Linux server setup →](./12-linux-server-setup.md)

Step-by-step setup for a **developer machine** and a **production / staging server**. Auth is Keycloak-only; object storage is MinIO (dev) or S3 (prod). See [09](./09-self-hosting-supabase-replacement.md) and [10](./10-docker-volumes-and-backup.md) for design and backup inventory.

For a **single Linux box with Docker already installed**, prefer the copy-paste runbook: [12-linux-server-setup.md](./12-linux-server-setup.md).

---

## Prerequisites

| Tool | Dev | Prod |
| --- | --- | --- |
| Node.js | 20 LTS+ | 20 LTS |
| pnpm | 9.x (`corepack enable && corepack prepare pnpm@9 --activate`) | 9.x |
| Docker + Compose v2 | Required | Required (or ECS/EKS equivalents) |
| Python | 3.11+ (ai-service) | 3.11 |
| Git | Required | Required |
| `curl`, `psql` (or Docker exec) | Recommended | Required for ops |
| Git Bash (Windows only) | For `scripts/*.sh` | N/A on Linux |

---

## Architecture quick map

| Concern | Dev (Compose + host) | Prod (target) |
| --- | --- | --- |
| App DB | Postgres `:5433` DB `accessshield` | RDS Postgres — DB `accessshield` |
| Keycloak DB | **Same instance**, DB `keycloak` | Same RDS instance, DB `keycloak` (separate role) |
| Auth | Keycloak `:8080` | Keycloak on ECS/EC2 behind ALB/HTTPS |
| Cache | Redis `:6379` | ElastiCache Redis |
| Queue | RabbitMQ `:5672` | Amazon MQ / RabbitMQ |
| Objects | MinIO `:9000` | S3 + CloudFront |
| Web | Next.js host `:3000` | Vercel |
| API / workers | Express host `:4000` | ECS/EC2 `ap-south-1` |
| AI | FastAPI host `:8001` | ECS/EC2 private |

**Never** point Keycloak at the `accessshield` database.

---

## Part A — Local / Dev server setup

### A1. Clone and install

```bash
git clone <repo-url> accessshield-india
cd accessshield-india
corepack enable && corepack prepare pnpm@9 --activate
pnpm install
```

### A2. Environment

```bash
cp .env.example .env.local
# Set at least:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/accessshield
#   KEYCLOAK_* , AUTH_ISSUER_URL, AUTH_SECRET, NEXTAUTH_URL
#   SYSADMIN_INITIAL_PASSWORD
#   S3_ENDPOINT=http://localhost:9000 , S3_FORCE_PATH_STYLE=true
#   JWT_SECRET, INTERNAL_AI_SERVICE_KEY

cp apps/ai-service/.env.example apps/ai-service/.env
# ANTHROPIC_API_KEY, INTERNAL_AI_SERVICE_KEY, DATABASE_URL (asyncpg URL)
```

### A3. Start infrastructure

```bash
# Requires Docker Compose v2 plugin (docker compose version)
docker compose up -d postgres redis rabbitmq tika keycloak minio minio-init mailpit
```

Wait until healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
# accessshield-postgres, accessshield-keycloak, accessshield-redis, ...
```

**First empty Postgres volume** runs [`infra/postgres/init/01-keycloak-db.sh`](../../infra/postgres/init/01-keycloak-db.sh) and creates DB `keycloak`.  
If the volume already existed without that script, create the DB once — see [10](./10-docker-volumes-and-backup.md).

### A4. Build packages + migrate + seed

```bash
# Shared packages (required before API/web)
pnpm --filter @accessshield/types build
pnpm --filter @accessshield/db build
# UI (Linux): pnpm --filter @accessshield/ui build
# Windows: remove packages/ui/dist then:
#   pnpm --filter @accessshield/ui exec tsc
#   pnpm --filter @accessshield/ui exec tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify

# Migrations (loads root .env.local via packages/db/drizzle.config.ts)
# Includes scan_page_jobs (0005) + violations.fingerprint (0006) for Scan Pipeline v2
pnpm --filter @accessshield/db exec drizzle-kit migrate

# App seed data (test org/user + sysadmin app row)
# Linux:
pnpm db:seed
# Windows (avoid broken WSL bash):
#   & "C:\Program Files\Git\bin\bash.exe" packages/db/scripts/seed-dev.sh

# Keycloak sysadmin (creates login user + syncs auth_user_id)
# Linux:
./scripts/seed-sysadmin.sh
# Windows:
#   & "C:\Program Files\Git\bin\bash.exe" scripts/seed-sysadmin.sh
```

Expect: `Done. Sign in as sysadmin@accessshield.in (password grant OK).`

### A5. Start apps (host processes)

Prefer filter commands if Turbo crashes on Windows:

```bash
# Terminal 1 — API
pnpm --filter @accessshield/api dev

# Terminal 2 — Web (loads ../../.env.local)
cd apps/web
node --env-file="../../.env.local" ./node_modules/next/dist/bin/next dev --port 3000

# Optional
pnpm --filter @accessshield/ai-service dev
pnpm --filter @accessshield/api dev:worker

# Scan Pipeline v2 — put these in `.env.local` (API + worker read the same file)
# Default is v1 monolith. For full v2:
#   SCAN_PIPELINE_V2_SCAN_JOBS=true
# Optional after finalize:
#   SCAN_PIPELINE_V2_AUTO_REPORT=true
# Then: pnpm --filter @accessshield/db db:migrate
# Docs: docs/architecture/v2/
```

Or on Linux with working Turbo: `pnpm dev` / `pnpm dev:stack`.

### A6. Verify

| Check | URL / command |
| --- | --- |
| Web | http://localhost:3000 |
| Login | http://localhost:3000/login — `sysadmin@accessshield.in` + `SYSADMIN_INITIAL_PASSWORD` |
| API | http://localhost:4000 (health route if exposed) |
| Keycloak | http://localhost:8080 — admin / admin |
| MinIO console | http://localhost:9001 — minioadmin / minioadmin |
| RabbitMQ UI | http://localhost:15672 — accessshield / accessshield |
| Mailpit | http://localhost:8025 |

### A7. Dev volumes to back up (optional)

Named volumes (see [10](./10-docker-volumes-and-backup.md)):

- `accessshield_postgres_data` (P0)
- `accessshield_minio_data` (P0)
- `accessshield_rabbitmq_data` (P1)
- `accessshield_redis_data` (P2)

```bash
docker volume ls | grep accessshield_
```

---

## Part B — Production / staging server setup

Assumes AWS `ap-south-1`, Linux hosts or ECS, Secrets Manager, and HTTPS on public endpoints.

### B1. Provision data plane

1. **RDS PostgreSQL 16**
   - Create databases: `accessshield`, `keycloak`
   - Create roles: app user for `accessshield`; `keycloak` role for Keycloak DB only
   - Security group: API/workers/Keycloak only
2. **ElastiCache Redis 7**
3. **Amazon MQ (RabbitMQ)** or self-hosted RabbitMQ with durable storage
4. **S3 bucket** (e.g. `accessshield-data-prod`) + CloudFront
5. **Secrets Manager** secret JSON (example keys):

```json
{
  "DATABASE_URL": "postgresql://app_user:...@rds:5432/accessshield",
  "REDIS_URL": "redis://...",
  "RABBITMQ_URL": "amqps://...",
  "AUTH_ISSUER_URL": "https://auth.example.com/realms/accessshield",
  "KEYCLOAK_URL": "https://auth.example.com",
  "KEYCLOAK_REALM": "accessshield",
  "KEYCLOAK_ADMIN_CLIENT_ID": "accessshield-api",
  "KEYCLOAK_ADMIN_CLIENT_SECRET": "...",
  "AUTH_SECRET": "...",
  "JWT_SECRET": "...",
  "INTERNAL_AI_SERVICE_KEY": "...",
  "AI_SERVICE_URL": "http://ai-service:8001",
  "AWS_REGION": "ap-south-1",
  "S3_BUCKET_NAME": "accessshield-data-prod",
  "ANTHROPIC_API_KEY": "...",
  "SCAN_PIPELINE_V2_SCAN_JOBS": "false",
  "SCAN_PIPELINE_V2_AUTO_REPORT": "false"
}
```

**Scan pipeline flags (API + worker must match):**

| Variable | Default | Meaning |
| --- | --- | --- |
| *(unset / false)* | v1 | Monolith consumer on queue `scans` |
| `SCAN_PIPELINE_V2_SCAN_JOBS=true` | — | API publishes `scan.jobs`; worker runs crawler + page/persist/AI/report consumers; **disables** monolith `scans` consumer |
| `SCAN_PIPELINE_V2_PAGE_WORKER=true` | — | Page pipeline only (fan-out from monolith crawl) without dedicated crawler |
| `SCAN_PIPELINE_V2_AUTO_REPORT=true` | — | After finalize, enqueue technical PDF via `report.generate` |
| `SCAN_CONCURRENT_PAGES` | auto (2–10) | Override Playwright concurrency; else CPU/RAM auto-tune |

Do **not** set `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE` in prod (real AWS S3).

### B2. Deploy Keycloak

1. Run Keycloak **production** mode (`start`, not `start-dev`) behind HTTPS.
2. Env:

```bash
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://<rds-host>:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<secret>
KC_HOSTNAME=auth.example.com
KC_PROXY_HEADERS=xforwarded
# bootstrap admin only once, then disable / rotate
```

3. Import realm from [`infra/keycloak/accessshield-realm.json`](../../infra/keycloak/accessshield-realm.json) (or manage via Keycloak Operator / Terraform).
4. Update clients:
   - `accessshield-web`: valid redirect URIs → `https://app.example.com/*`, web origins
   - `accessshield-api`: rotate client secret → Secrets Manager
5. Confirm JWKS: `https://auth.example.com/realms/accessshield/protocol/openid-connect/certs`

### B3. Deploy API + workers

1. Build/push images (API, worker, mobile-scanner, ai-service).
2. Task/service env: load from Secrets Manager (`AWS_SECRET_ID`, `NODE_ENV=production`).
3. Set:
   - `AUTH_ISSUER_URL` = Keycloak realm issuer
   - `CORS_ORIGIN` = `https://app.example.com`
   - `AI_SERVICE_URL` = internal URL
   - Scan flags: leave **v1** (`SCAN_PIPELINE_V2_*=false`) until soak; see table above
4. Run migrations **once** against RDS before traffic (includes `scan_page_jobs` + `violations.fingerprint` for v2):

```bash
export DATABASE_URL=postgresql://...@rds:5432/accessshield
pnpm --filter @accessshield/db exec drizzle-kit migrate
```

5. Seed sysadmin **once** (from a bastion with network to Keycloak + RDS):

```bash
export KEYCLOAK_URL=https://auth.example.com
export KEYCLOAK_REALM=accessshield
export KEYCLOAK_ADMIN_CLIENT_ID=accessshield-api
export KEYCLOAK_ADMIN_CLIENT_SECRET=...
export SYSADMIN_INITIAL_PASSWORD='...'   # strong; rotate after first login
export DATABASE_URL=postgresql://...@rds:5432/accessshield
./scripts/seed-sysadmin.sh
```

6. Scale:
   - API replicas
   - **At least one web-scan worker** (same image, entry `worker-entry` / `dev:worker`)
   - Worker sizing: Playwright needs RAM (roughly ~400MB × concurrency). Prefer beefier task for scanners than for API.
   - mobile-scanner as needed
   - ai-service required for post-scan AI enrichment (v2) and issues UI AI

7. **Enabling Scan Pipeline v2 in prod (after soak):**
   - Migrate DB first
   - Set `SCAN_PIPELINE_V2_SCAN_JOBS=true` on **API and worker** together; roll workers
   - Confirm RabbitMQ has `scan.jobs` / `page.scan` / `findings.persist` consumers
   - Rollback: set flag false on API + worker → back to `scans` monolith path
   - Details: [v2/PROGRESS.md](./v2/PROGRESS.md)

### B4. Deploy web (Vercel)

1. Project env:

| Variable | Example |
| --- | --- |
| `NEXTAUTH_URL` | `https://app.example.com` |
| `AUTH_SECRET` | strong secret |
| `AUTH_ISSUER_URL` | `https://auth.example.com/realms/accessshield` |
| `NEXT_PUBLIC_AUTH_URL` | `https://auth.example.com` |
| `NEXT_PUBLIC_AUTH_CLIENT_ID` | `accessshield-web` |
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` |
| `NEXT_PUBLIC_APP_URL` | `https://app.example.com` |
| `NEXT_PUBLIC_CDN_URL` | CloudFront URL for widget |

2. Deploy App Router build; confirm `/api/auth/*` (Auth.js) works over HTTPS.
3. Keycloak redirect URIs must match `NEXTAUTH_URL`.

### B5. Deploy AI service

- Private network only; authenticate with `INTERNAL_AI_SERVICE_KEY` / `X-Internal-Key`.
- DLP scrub before Anthropic calls (mandatory per project rules).

### B6. Prod backup (minimum)

| Asset | Method | Cadence |
| --- | --- | --- |
| RDS `accessshield` + `keycloak` | Automated snapshots + optional `pg_dump -Fc` | Daily + before releases |
| S3 | Versioning + cross-region replication | Continuous |
| RabbitMQ | Definitions export / durable store snapshot | Daily |
| Redis | Optional; treat rebuildable unless required | — |
| Secrets | ASM replication / documented rotation | On rotate |

Detail: [10-docker-volumes-and-backup.md](./10-docker-volumes-and-backup.md).

### B7. Prod smoke checklist

- [ ] `GET` JWKS from Keycloak issuer returns keys  
- [ ] `./scripts/seed-sysadmin.sh` password-grant step OK (or equivalent login)  
- [ ] Web login → dashboard session cookie set  
- [ ] API call with Bearer access token returns 200 on a protected route  
- [ ] Upload/report hits S3 (no MinIO endpoint)  
- [ ] Migrations applied (incl. `scan_page_jobs` if using v2)  
- [ ] Scan job enqueues on RabbitMQ and worker completes  
  - v1: message on `scans`  
  - v2: message on `scan.jobs` → `page.scan` → scan reaches `completed`  
- [ ] (v2 optional) AI columns / `issues.sync` after complete when plan allows  
- [ ] `pg_dump` of both DBs succeeds from backup role  

---

## Part C — Common failure modes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Login 401 | No Keycloak user / profile incomplete | `./scripts/seed-sysadmin.sh` (sets first/last name) |
| `bash scripts/...` silent fail (Windows) | WSL `bash` broken | Use Git Bash: `& "C:\Program Files\Git\bin\bash.exe" scripts/seed-sysadmin.sh` |
| `drizzle-kit` auth failed | Hitting wrong Postgres (`:5432` vs `:5433`) | Ensure `.env.local` `DATABASE_URL` port **5433** |
| Keycloak users gone after recreate | Old H2-only Keycloak | Must use `KC_DB=postgres` + DB `keycloak` (already in Compose) |
| Empty app DB after volume rename | New named volume | Restore from previous volume or re-migrate + seed |
| Turbo `3221226505` (Windows) | Turbo crash | Bypass: `pnpm --filter <pkg> …` |
| Scan stuck `pending` with v2 flags | Worker old / flag mismatch / missing migration | Align API+worker env; migrate; check RabbitMQ queues — [08](./08-operational-runbook.md) |
| v2 enabled but jobs on `scans` | API still v1 | Set `SCAN_PIPELINE_V2_SCAN_JOBS=true` on API too |

---

## Part D — Port reference (dev)

| Port | Service |
| --- | --- |
| 3000 | Web |
| 4000 | API |
| 8001 | AI service |
| 5433 | Postgres (`accessshield` + `keycloak`) |
| 6379 | Redis |
| 5672 / 15672 | RabbitMQ / UI |
| 8080 | Keycloak |
| 9000 / 9001 | MinIO API / console |
| 8025 / 1025 | Mailpit UI / SMTP |
| 9998 | Tika |

---

## Related docs

- [07-deployment-topology.md](./07-deployment-topology.md) — diagrams  
- [08-operational-runbook.md](./08-operational-runbook.md) — daily local ops  
- [09-self-hosting-supabase-replacement.md](./09-self-hosting-supabase-replacement.md) — auth cutover design  
- [10-docker-volumes-and-backup.md](./10-docker-volumes-and-backup.md) — volume names & DB split  
- [12-linux-server-setup.md](./12-linux-server-setup.md) — Linux server copy-paste runbook  
- [`scripts/seed-sysadmin.sh`](../../scripts/seed-sysadmin.sh) — Keycloak + DB link  
- [`docker-compose.yml`](../../docker-compose.yml) — local infra  
