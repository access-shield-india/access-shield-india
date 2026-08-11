# 02 — Artifacts & scripts

[← Architecture](./01-architecture-and-components.md) | [Index](./README.md) | [Next: Network →](./03-network-and-edge.md)

## 1. Deployment artifacts in the repo

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js marketing + dashboard (build/start or `dev`) |
| `apps/api` | Express API + web scan worker entrypoints |
| `apps/ai-service` | FastAPI AI + document Redis consumer |
| `apps/mobile-scanner` | Mobile RabbitMQ worker |
| `packages/db` | Drizzle schema, migrations, `seed/dev.sql` |
| `docker-compose.yml` | Infra only (Postgres, Redis, RMQ, Keycloak, MinIO, Tika, …) |
| `infra/keycloak/` | Realm import JSON |
| `deploy/` | Edge + host nginx templates and setup scripts |
| `scripts/deploy.sh` | Pull/build/migrate/restart host apps on machine3 |
| `scripts/setup-host-tools.sh` | Android / Playwright / local LLM (once per box) |
| `scripts/seed-sysadmin.sh` | Keycloak + DB sysadmin link |
| `.env.local` | Root secrets for API/web/workers (gitignored) |
| `apps/ai-service/.env` | AI service secrets (gitignored) |
| `deploy/env.sh` | Nginx render vars (gitignored; from `env.example`) |

## 2. Script map (standard paths)

| Script | Run on | When | Does | Does **not** |
| --- | --- | --- | --- | --- |
| `scripts/deploy.sh` | machine3 | Routine app update | git pull*, pnpm, packages build, migrate, restart api/web/worker/ai/mobile | nginx, DNS, host-tools, firewall |
| `scripts/deploy.sh --bootstrap` | machine3 | First box | Above + `db:seed` + `seed-sysadmin.sh` | TLS |
| `scripts/deploy.sh --migrate-only` | machine3 | Schema only | Drizzle migrate | Restart apps |
| `scripts/setup-host-tools.sh` | machine3 | Once / version bump | JDK, Android SDK+AVD, Appium, Playwright, LLM download+warmup | Start AVD as daemon forever |
| `scripts/setup-host-tools.sh doctor` | machine3 | Verify | Smoke Java/adb/AVD/Appium/Chromium/LLM | Fix BIOS |
| `scripts/seed-sysadmin.sh` | machine3 | First auth / repair | Keycloak platform admin + DB `auth_user_id` sync | Realm import |
| `scripts/dev-stop.sh` | machine3 | Local stop | Kill host app ports/pids | Docker infra |
| `deploy/scripts/setup-machine3-nginx.sh` | machine3 | First / nginx change | Install nginx site → web/api/keycloak | Apps, certs |
| `deploy/scripts/setup-machine1-proxy.sh` | machine1 | First / nginx change | Edge proxy + certbot for accessiblenow hosts | App code |
| `deploy/scripts/check-connectivity.sh` | machine1 (prefer) | After edge | LAN + Host header + HTTPS smoke | |
| `deploy/scripts/render-template.sh` | either | Called by setups | `{{VAR}}` substitution | |

\* `deploy.sh` refuses dirty git trees unless `--no-pull`.

## 3. Process → log / PID (machine3)

Managed by `scripts/deploy.sh` under `.deploy/` (gitignored):

| Name | Log | PID |
| --- | --- | --- |
| api | `.deploy/logs/api.log` | `.deploy/pids/api.pid` |
| web | `.deploy/logs/web.log` | `.deploy/pids/web.pid` |
| worker | `.deploy/logs/worker.log` | `.deploy/pids/worker.pid` |
| ai | `.deploy/logs/ai.log` | `.deploy/pids/ai.pid` |
| mobile | `.deploy/logs/mobile.log` | `.deploy/pids/mobile.pid` |

Skip flags: `--skip-api`, `--skip-web`, `--skip-worker`, `--skip-ai`, `--skip-mobile`.

## 4. Env files (who reads what)

| File | Consumers |
| --- | --- |
| `.env.local` | API, web, workers, mobile-scanner (via env loader), deploy.sh |
| `apps/ai-service/.env` | uvicorn / start.sh |
| `deploy/env.sh` | nginx setup scripts only |

Production public URLs (set in `.env.local` on machine3) must match HTTPS hostnames — see [03](./03-network-and-edge.md) and [04](./04-machine3-platform.md).
