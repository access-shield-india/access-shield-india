# 08 — Operational Runbook

[← Deployment Topology](./07-deployment-topology.md) | [Index](./README.md)

## Executive Summary

This runbook covers **first-time setup**, **daily startup**, **port reference**, **health checks**, and **common failures** for local development. Production runbooks should extend this with monitoring, alerting, and on-call procedures.

---

## Prerequisites

| Tool    | Version                                             |
| ------- | --------------------------------------------------- |
| Node.js | 20 LTS (22 recommended before Jan 2027 for AWS SDK) |
| pnpm    | 9.x                                                 |
| Python  | 3.11–3.13 (ai-service)                              |
| Docker  | Latest with Compose v2                              |

```bash
corepack enable && corepack prepare pnpm@9.0.0 --activate
```

---

## First-Time Setup (sequential)

```bash
# 1. Clone and install
cd /path/to/SourceCode
pnpm install

# 2. Environment
cp .env.example .env.local
# Edit: Keycloak, DATABASE_URL (port 5433), REDIS_URL, RABBITMQ_URL, MinIO/S3, SYSADMIN_INITIAL_PASSWORD

cp apps/ai-service/.env.example apps/ai-service/.env
# Edit: ANTHROPIC_API_KEY, INTERNAL_AI_SERVICE_KEY, DATABASE_URL (asyncpg format)

# Optional: mobile-scanner
cp apps/mobile-scanner/.env.example apps/mobile-scanner/.env

# 3. Build shared packages
pnpm build --filter @accessshield/types --filter @accessshield/db --filter @accessshield/ui

# 4. Start infrastructure
docker compose up -d postgres redis rabbitmq tika keycloak minio minio-init mailpit

# 5. Database seed (first time)
pnpm db:seed

# 6. Create sysadmin user in Keycloak + app DB (optional)
bash scripts/seed-sysadmin.sh

# 7. Playwright browsers (if not already from postinstall)
pnpm --filter @accessshield/api install:browsers
```

---

## Daily Startup (sequential)

```bash
# 1. Start Docker services (if stopped)
docker compose up -d postgres redis rabbitmq tika

# 2. Clear stale dev processes
pnpm dev:stop

# 3. Start apps (choose one)

# Option A — all apps via Turbo
pnpm dev

# Option B — web + API only
pnpm dev:stack

# Option C — manual terminals
pnpm dev:web          # Terminal 1 — port 3000
pnpm dev:api          # Terminal 2 — port 4000
pnpm --filter @accessshield/ai-service dev   # Terminal 3 — port 8001
pnpm --filter @accessshield/api dev:worker     # Terminal 4 — web scans
pnpm --filter @accessshield/mobile-scanner dev # Terminal 5 — mobile scans (optional)

# Optional — Scan Pipeline v2 (same worker entry; set on API + worker processes)
# SCAN_PIPELINE_V2_SCAN_JOBS=true
# SCAN_PIPELINE_V2_AUTO_REPORT=true
# See docs/architecture/v2/
```

---

## Port Reference

| Port      | Service                | Process                                      |
| --------- | ---------------------- | -------------------------------------------- |
| **3000**  | Web (Next.js)          | `pnpm dev:web`                               |
| **4000**  | API (Express)          | `pnpm dev:api`                               |
| **8001**  | AI service (FastAPI)   | `pnpm --filter @accessshield/ai-service dev` |
| **5433**  | PostgreSQL             | Docker `postgres`                            |
| **6379**  | Redis                  | Docker `redis`                               |
| **5672**  | RabbitMQ AMQP          | Docker `rabbitmq`                            |
| **15672** | RabbitMQ Management UI | Docker `rabbitmq`                            |
| **9998**  | Apache Tika            | Docker `tika`                                |
| **4723**  | Appium (local mobile)  | External — only if not using BrowserStack    |

**Note:** Root README lists Postgres 5432 and AI 8000 — actual defaults are **5433** and **8001**.

---

## Health Checks

```bash
# API
curl -s http://localhost:4000/health | jq .

# AI service
curl -s http://localhost:8001/health | jq .

# Web (browser)
open http://localhost:3000

# RabbitMQ UI
open http://localhost:15672
# Login: accessshield / accessshield

# Redis
docker exec accessshield-redis redis-cli ping
# Expected: PONG

# Postgres
docker exec accessshield-postgres pg_isready -U postgres
```

### Expected API health response (shape)

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

---

## Feature → Required Processes

| Feature                        | Must be running                                       |
| ------------------------------ | ----------------------------------------------------- |
| Marketing site + dashboard UI  | web                                                   |
| Dashboard API calls            | web + api                                             |
| Login / auth                   | web + Supabase project                                |
| Website scans                  | api + **scan worker** + RabbitMQ + Redis              |
| Website scans (pipeline v2)    | Same + set `SCAN_PIPELINE_V2_SCAN_JOBS=true` (see [v2/](./v2/README.md)) |
| Document scans                 | api + **ai-service** + Redis + Tika                   |
| Mobile scans                   | api + **mobile-scanner** + RabbitMQ + S3/BrowserStack |
| AI fix / alt-text in issues UI | api + ai-service + `ANTHROPIC_API_KEY`                |
| AI fix / alt-text after scan (v2) | scan worker + ai-service (async queues)            |
| Widget on marketing site       | web (widget.js in public/) + api                      |
| Live scan progress             | web + Supabase Realtime                               |

---

## Common Failure Modes

### Port already in use (API 4000)

```
Port already in use — run "pnpm dev:stop"
```

**Fix:**

```bash
pnpm dev:stop
# Or: lsof -ti :4000 | xargs kill -9
pnpm dev:api
```

### Failed to connect to localhost:4000 (curl)

API not running. Start with `pnpm dev:api` or `pnpm dev:stack`.

### Redis connection failed (ai-service / api)

```bash
docker compose up -d redis
docker exec accessshield-redis redis-cli ping
```

### Document scan job fails on download (404)

Job payload `document_url` points to missing file. Use valid S3 presigned URL or real HTTP URL.

### JWT / 401 on API

- Token expired (1 hour) — re-login
- Missing `user_role` / `org_id` — enable Supabase auth hook
- Bearer token split across lines in curl — keep on one line

### Tika manifest not found (Docker)

Use tag `apache/tika:2.9.2.1` (not `2.6.0`) in [`docker-compose.yml`](../../docker-compose.yml).

### Next.js chunk 404 / locale routing issues

```bash
pnpm dev:clean
pnpm dev
# Hard refresh browser: Cmd+Shift+R
```

### AWS SDK Node 22 warning

Informational on Node 20. Upgrade to Node 22 before Jan 2027 for continued AWS SDK updates.

### Web scan stuck in `pending` / `running` (v2)

| Check | Action |
| ----- | ------ |
| Worker running? | `pnpm --filter @accessshield/api dev:worker` |
| Flags match on API + worker? | `SCAN_PIPELINE_V2_SCAN_JOBS=true` must be set for **both** (or both unset for v1) |
| Migrations applied? | `pnpm --filter @accessshield/db db:migrate` (`0005_scan_page_jobs`, `0006_violation_fingerprint`) |
| RabbitMQ queues | Management UI `:15672` — look for `scan.jobs` / `page.scan` / `findings.persist` (v2) or `scans` (v1) |
| Cancel stuck scan | `POST /api/v1/scans/:id/cancel` sets Redis `scan:cancel:{id}` |

### AI columns empty after v2 scan

- Starter/trial plans skip AI remediation (`aiRemediation=false`)
- Need ai-service + `INTERNAL_AI_SERVICE_KEY` + `ANTHROPIC_API_KEY`
- Check worker logs for `ai.enrich` / rate-limit skips

---

## Stopping Services

```bash
# Kill dev servers on 3000, 4000, 8000, 8001
pnpm dev:stop

# Stop Docker (optional)
docker compose down

# Stop Docker but keep data volumes
docker compose stop
```

---

## Useful Commands

```bash
# Type check entire monorepo
pnpm type-check

# API build
pnpm --filter @accessshield/api build

# DB studio (Drizzle)
pnpm --filter @accessshield/db db:studio

# Document scan upload test
curl -X POST http://localhost:4000/api/v1/document-scans/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@/path/to/file.pdf"

# Enqueue document scan test job (Redis)
redis-cli RPUSH document-scan-jobs '{"job_id":"...","organisation_id":"...","document_name":"test.pdf","document_type":"pdf","document_url":"https://www.w3.org/WAI/WCAG21/working-examples/pdf-table/table.pdf","standards":["WCAG_2_1_AA"]}'
```

---

## Monitoring (production outline)

| Signal              | Source                                        |
| ------------------- | --------------------------------------------- |
| API request metrics | Pino logs + `/metrics` (if added)             |
| AI service metrics  | `GET /ai-service:8001/metrics` (Prometheus)   |
| Queue depth         | RabbitMQ management UI / CloudWatch           |
| Error rate          | Centralised log aggregation (not yet in repo) |
| Uptime              | `/health` endpoints on load balancer          |

---

## Source References

- Dev stop script: [`scripts/dev-stop.sh`](../../scripts/dev-stop.sh)
- Root scripts: [`package.json`](../../package.json)
- Env template: [`.env.example`](../../.env.example)
- Testing guide: [`TESTING_GUIDE.md`](../../TESTING_GUIDE.md)
