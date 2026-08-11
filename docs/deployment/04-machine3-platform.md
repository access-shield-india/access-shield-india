# 04 — Machine3 platform (OS, Compose, apps)

[← Network](./03-network-and-edge.md) | [Index](./README.md) | [Next: Host tools →](./05-host-tools.md)

**machine3** (`$MACHINE3_IP`) runs **all** AccessibleNow application and scan tooling. Docker is assumed installed.

## 1. Base OS packages

```bash
# Node 20 + pnpm 9
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git curl
sudo corepack enable
sudo corepack prepare pnpm@9 --activate

# Python 3.11–3.13 for ai-service
sudo apt-get install -y python3.11 python3.11-venv python3-pip || true

node -v && pnpm -v && docker compose version
```

## 2. Clone & install

```bash
git clone <REPO_URL> <checkout-dir>
cd <checkout-dir>
pnpm install
```

## 3. Environment files

### Root `.env.local` (minimum + prod HTTPS)

Use your public domain from `deploy/env.sh` (`$DOMAIN`, `$AUTH_DOMAIN`):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/accessshield
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://accessshield:accessshield@localhost:5672

AUTH_SECRET=…          # openssl rand -base64 32
JWT_SECRET=…           # openssl rand -hex 32
INTERNAL_AI_SERVICE_KEY=…  # same value in ai-service/.env
SYSADMIN_INITIAL_PASSWORD='…'

# Public HTTPS (behind machine1)
NEXTAUTH_URL=https://$DOMAIN
NEXT_PUBLIC_APP_URL=https://$DOMAIN
NEXT_PUBLIC_API_URL=                 # empty = same-origin /api/v1
CORS_ORIGIN=https://$DOMAIN
AUTH_ISSUER_URL=https://$AUTH_DOMAIN/realms/accessshield
NEXT_PUBLIC_AUTH_URL=https://$AUTH_DOMAIN
NEXT_PUBLIC_AUTH_CLIENT_ID=accessshield-web
KEYCLOAK_URL=https://$AUTH_DOMAIN
KEYCLOAK_REALM=accessshield
KEYCLOAK_ADMIN_CLIENT_ID=accessshield-api
KEYCLOAK_ADMIN_CLIENT_SECRET=…       # match realm client

# Object storage (Compose MinIO example)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
S3_BUCKET_NAME=…
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

PORT=4000
LOG_LEVEL=info
```

Android / Appium keys are written by `setup-host-tools` (see [05](./05-host-tools.md)).

### `apps/ai-service/.env`

```bash
cp apps/ai-service/.env.example apps/ai-service/.env
# INTERNAL_AI_SERVICE_KEY = same as root
# DATABASE_URL=postgresql+asyncpg://…@localhost:5433/accessshield
# REDIS_URL, TIKA_SERVER_URL, LOCAL_MODEL, LOCAL_LLM_WARMUP=true
```

### Keycloak Compose / hostname

For production hostnames set Keycloak proxy hostname to `$AUTH_DOMAIN` (`KC_HOSTNAME`, `KC_PROXY_HEADERS=xforwarded` or equivalent in Compose). Update realm client redirect URIs to `https://$DOMAIN/*`.

## 4. Start Compose infra

```bash
docker compose up -d postgres redis rabbitmq tika keycloak minio minio-init mailpit
docker compose exec -T postgres pg_isready -U postgres
```

Typical host ports: Postgres **5433**, Redis 6379, RabbitMQ 5672/15672, Keycloak 8080, MinIO 9000, Tika 9998.

Volumes / backup: [../architecture/10-docker-volumes-and-backup.md](../architecture/10-docker-volumes-and-backup.md).

## 5. First-time data + apps

```bash
chmod +x scripts/deploy.sh apps/ai-service/scripts/start.sh
./scripts/deploy.sh --bootstrap
# or: ./scripts/deploy.sh --no-pull   # if already cloned/configured
```

`--bootstrap` runs migrations, `pnpm db:seed`, and `scripts/seed-sysadmin.sh`.

Routine later:

```bash
./scripts/deploy.sh                 # pull + migrate + restart
./scripts/deploy.sh --mode=prod     # build + start (no reload)
./scripts/deploy.sh --with-local-llm
./scripts/deploy.sh --skip-mobile   # optional
```

Smoke:

```bash
curl -s http://127.0.0.1:4000/health
curl -s http://127.0.0.1:8001/health
tail -f .deploy/logs/{api,web,worker,ai,mobile}.log
```

## 6. Then wire nginx

After apps are healthy → [03 — Network](./03-network-and-edge.md) machine3 nginx, then machine1.
