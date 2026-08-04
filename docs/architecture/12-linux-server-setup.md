# 12 — Linux Server Setup (Docker already installed)

[← Deployment guide](./11-deployment-guide.md) | [Index](./README.md) | [Docker volumes & backup →](./10-docker-volumes-and-backup.md)

Step-by-step commands to bring up AccessShield India on a **single Linux machine** (dev / staging).

**Assumptions**

- Docker + Docker Compose v2 are already installed (`docker compose version` works)
- You have sudo for installing Node / Python / firewall rules
- This is **not** full AWS production (RDS / Secrets Manager / HTTPS ALB). For that, use [11-deployment-guide.md](./11-deployment-guide.md) Part B.

**Model**

| Layer | Runs as |
| --- | --- |
| Postgres, Redis, RabbitMQ, Keycloak, MinIO, Tika, Mailpit | Docker Compose |
| API, Web, scan worker, AI service | Host processes (Node / Python) |

---

## 0. Install Node, pnpm, and Python

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git curl

# pnpm 9
sudo corepack enable
sudo corepack prepare pnpm@9 --activate

# Python 3.11 — only required if you run ai-service
sudo apt-get install -y python3.11 python3.11-venv python3-pip
```

Verify:

```bash
node -v          # v20.x
pnpm -v          # 9.x
docker compose version
```

---

## 1. Clone and install dependencies

```bash
git clone <YOUR_REPO_URL> accessshield-india
cd accessshield-india
pnpm install
```

---

## 2. Create environment files

Root `.env.example` / `.env.local` are **not committed** (gitignored). Create `.env.local` on the server from a secure source or by hand.

```bash
nano .env.local
```

### Minimum `.env.local`

Replace `YOUR_SERVER_IP` with the machine’s public or LAN IP (or hostname).

```bash
# Database / cache / queue (Compose ports)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/accessshield
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://accessshield:accessshield@localhost:5672

# Auth.js / Keycloak
AUTH_ISSUER_URL=http://localhost:8080/realms/accessshield
AUTH_SECRET=REPLACE_WITH_openssl_rand_base64_32
NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_AUTH_CLIENT_ID=accessshield-web
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000

KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=accessshield
KEYCLOAK_ADMIN_CLIENT_ID=accessshield-api
KEYCLOAK_ADMIN_CLIENT_SECRET=accessshield-api-dev-secret
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=keycloak

# Object storage — MinIO (local Compose)
S3_BUCKET_NAME=accessshield-data-dev
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=ap-south-1
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# App secrets
JWT_SECRET=REPLACE_WITH_openssl_rand_hex_32
INTERNAL_AI_SERVICE_KEY=REPLACE_WITH_openssl_rand_hex_32
SYSADMIN_INITIAL_PASSWORD='ChangeMeStrong!123'
CORS_ORIGIN=http://YOUR_SERVER_IP:3000
PORT=4000
LOG_LEVEL=info
```

Generate strong values:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # JWT_SECRET / INTERNAL_AI_SERVICE_KEY
```

> **Never** use these MinIO / Keycloak / Postgres defaults on a public production host without TLS and rotated secrets.

### Optional — AI service env

```bash
mkdir -p apps/ai-service
nano apps/ai-service/.env
```

```bash
ANTHROPIC_API_KEY=sk-ant-...
INTERNAL_AI_SERVICE_KEY=<same value as root .env.local>
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/accessshield
REDIS_URL=redis://localhost:6379
ENVIRONMENT=development
TIKA_SERVER_URL=http://localhost:9998
DEFAULT_AI_PROVIDER=anthropic
CLAUDE_MODEL=claude-sonnet-4-20250514
# Optional local LLM (Settings → AI Configuration → Local)
# LOCAL_MODEL=Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF
# LOCAL_LLM_WARMUP=true   # preload GGUF at startup (also auto if DEFAULT_AI_PROVIDER=local)
# Then: cd apps/ai-service && pip install '.[local]'
```

Org admins can switch **Anthropic** vs **Local LLM** under Dashboard → Settings → AI Configuration. Local uses llama-cpp GGUF on the AI service host (first request downloads the model unless warmup is enabled).

---

## 3. Start Docker infrastructure

```bash
docker compose up -d postgres redis rabbitmq tika keycloak minio minio-init mailpit
```

Check containers:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Wait until `accessshield-postgres` and `accessshield-keycloak` are healthy.

**First empty Postgres volume** runs [`infra/postgres/init/01-keycloak-db.sh`](../../infra/postgres/init/01-keycloak-db.sh) and creates the `keycloak` database.  
If the volume already existed without that script, create the DB once — see [10-docker-volumes-and-backup.md](./10-docker-volumes-and-backup.md).

Useful:

```bash
docker compose logs -f keycloak
docker compose restart keycloak
docker volume ls | grep accessshield_
```

---

## 4. Build packages, migrate, and seed

```bash
pnpm --filter @accessshield/types build
pnpm --filter @accessshield/db build
pnpm --filter @accessshield/ui build

# Migrations (loads root .env.local via packages/db/drizzle.config.ts)
pnpm --filter @accessshield/db exec drizzle-kit migrate

# App seed data
pnpm db:seed

# Keycloak sysadmin user + DB sync
chmod +x scripts/seed-sysadmin.sh
./scripts/seed-sysadmin.sh
```

Expect:

```text
Done. Sign in as sysadmin@accessshield.in (password grant OK).
```

Optional test-user claims:

```bash
chmod +x scripts/set-test-user-claims.sh
./scripts/set-test-user-claims.sh
```

---

## 5. Start application processes

### Option A — one-shot deploy script (recommended on a Linux box)

After first-time env + infra (sections 2–3), routine updates:

```bash
chmod +x scripts/deploy.sh apps/ai-service/scripts/start.sh

# Pull, install, build packages, migrate, restart API / web / worker / AI
./scripts/deploy.sh

# Same with production-style processes (build + start, no reload)
./scripts/deploy.sh --mode=prod

# Local LLM extras + warmup path
./scripts/deploy.sh --with-local-llm

# First box only (seed + sysadmin)
./scripts/deploy.sh --bootstrap

# Escape hatch — migrations only
./scripts/deploy.sh --migrate-only
# or: pnpm deploy:migrate
```

Logs/PIDs live under `.deploy/` (gitignored). Smoke: API `:4000/health`, AI `:8001/health`.

**Dev vs prod on this script:** `--mode=dev|prod` only changes *how host apps run* (reload vs built). It is **not** full AWS production (RDS / Secrets Manager / Vercel) — that remains [11-deployment-guide.md](./11-deployment-guide.md) Part B. Use one script; don’t maintain two checklists for the Compose box.

### Option B — manual terminals (or tmux / systemd)

```bash
# Terminal 1 — API (:4000)
pnpm --filter @accessshield/api dev

# Terminal 2 — Web (:3000)
cd apps/web
node --env-file="../../.env.local" ./node_modules/next/dist/bin/next dev --port 3000

# Terminal 3 — web scan worker (required for scans)
pnpm --filter @accessshield/api dev:worker

# Terminal 4 — AI service (:8001, optional)
pnpm --filter @accessshield/ai-service dev
```

Or start web + API together:

```bash
pnpm dev:stack
```

> For long-running servers, prefer `./scripts/deploy.sh` or wrap units in `systemd` / `pm2`. Dev scripts alone are not a production process supervisor.

---

## 6. Firewall (optional)

```bash
sudo ufw allow 3000/tcp   # Web
sudo ufw allow 4000/tcp   # API

# Only if you need direct operator access (prefer SSH tunnel / VPN in staging):
# sudo ufw allow 8080/tcp   # Keycloak
# sudo ufw allow 9001/tcp   # MinIO console
# sudo ufw allow 15672/tcp  # RabbitMQ management
# sudo ufw allow 8025/tcp   # Mailpit

sudo ufw status
```

---

## 7. Smoke checks

| Check | URL / command |
| --- | --- |
| Web | `http://YOUR_SERVER_IP:3000` |
| Login | `sysadmin@accessshield.in` + `SYSADMIN_INITIAL_PASSWORD` |
| API health | `curl http://YOUR_SERVER_IP:4000/health` |
| Keycloak admin | `http://YOUR_SERVER_IP:8080` — `admin` / `admin` |
| MinIO console | `http://YOUR_SERVER_IP:9001` — `minioadmin` / `minioadmin` |
| RabbitMQ UI | `http://YOUR_SERVER_IP:15672` — `accessshield` / `accessshield` |
| Mailpit | `http://YOUR_SERVER_IP:8025` |

API health example:

```bash
curl -s http://localhost:4000/health | jq .
```

---

## Ports reference

| Service | Host port | Notes |
| --- | --- | --- |
| Web (Next.js) | 3000 | Host process |
| API | 4000 | Host process |
| AI service | 8001 | Host process (optional) |
| Postgres | **5433** → 5432 | Compose maps host 5433 |
| Redis | 6379 | |
| RabbitMQ AMQP | 5672 | |
| RabbitMQ UI | 15672 | |
| Keycloak | 8080 | Realm import: `infra/keycloak/` |
| MinIO S3 API | 9000 | |
| MinIO console | 9001 | |
| Tika | 9998 | Document text extraction |
| Mailpit | 8025 | Dev mail UI |

---

## Named volumes to back up

| Volume | Priority |
| --- | --- |
| `accessshield_postgres_data` | P0 — app DB + Keycloak DB |
| `accessshield_minio_data` | P0 — object storage |
| `accessshield_rabbitmq_data` | P1 |
| `accessshield_redis_data` | P2 — usually rebuildable |

Details: [10-docker-volumes-and-backup.md](./10-docker-volumes-and-backup.md).

---

## Common failures

| Symptom | Fix |
| --- | --- |
| `Missing required environment variables` | Ensure `.env.local` exists at repo root; restart API after edits |
| Keycloak 503 / realm missing | `docker compose logs keycloak`; wait for healthy; confirm `infra/keycloak/accessshield-realm.json` is mounted |
| Migrate can’t connect | Use port **5433**, not 5432: `postgresql://postgres:postgres@localhost:5433/accessshield` |
| `seed-sysadmin.sh` password grant fails | Check `KEYCLOAK_ADMIN_CLIENT_SECRET` matches realm (`accessshield-api-dev-secret` for local import) and Keycloak is up |
| Web login redirect wrong host | Align `NEXTAUTH_URL`, `CORS_ORIGIN`, and Keycloak client redirect URIs with `YOUR_SERVER_IP` |
| Scans stuck queued | Start the worker: `pnpm --filter @accessshield/api dev:worker` |
| AI calls 401/503 | Match `INTERNAL_AI_SERVICE_KEY` in root `.env.local` and `apps/ai-service/.env`; set `ANTHROPIC_API_KEY` or use local LLM |
| Local LLM slow first request | Set `LOCAL_LLM_WARMUP=true` (or `DEFAULT_AI_PROVIDER=local`); deploy with `--with-local-llm`; check `/health` → `local_llm_warmup` |
| Deploy script won’t pull | Working tree dirty — commit/stash or `./scripts/deploy.sh --no-pull` |

More ops detail: [08-operational-runbook.md](./08-operational-runbook.md).

---

## Stop / tear down

```bash
# Stop host apps (Ctrl+C in each terminal), then:

# Stop containers (keep volumes)
docker compose stop

# Stop and remove containers (keep volumes)
docker compose down

# DANGER — wipe all local data volumes
# docker compose down -v
```

---

## Related docs

- [11-deployment-guide.md](./11-deployment-guide.md) — full dev + production checklist  
- [10-docker-volumes-and-backup.md](./10-docker-volumes-and-backup.md) — volumes and Keycloak DB  
- [08-operational-runbook.md](./08-operational-runbook.md) — ports, health, troubleshooting  
- [04-auth-and-security.md](./04-auth-and-security.md) — Keycloak / Auth.js flow  
