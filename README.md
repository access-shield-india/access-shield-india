# AccessShield India

AI-powered digital accessibility compliance SaaS platform for Indian organisations. Built for WCAG 2.2 AA, RPwD Act 2016, and GIGW 3.0 compliance.

**Architecture documentation:** [docs/architecture/README.md](docs/architecture/README.md) — system overview, data flows, deployment topology, and operational runbook for architects and TPMs.

## Monorepo Structure

```
apps/
  web/          Next.js 14 App Router — marketing site + admin portal
  widget/       Vanilla JS accessibility widget (CDN bundle)
  api/          Node.js + Express API server
  ai-service/   Python FastAPI AI microservices
packages/
  ui/           Shared accessible React component library
  db/           Drizzle ORM schema + migrations
  config/       Shared ESLint, TypeScript, Tailwind config
  types/        Shared TypeScript types
```

## Prerequisites

- **Node.js** 20 LTS
- **pnpm** 9 (`corepack enable && corepack prepare pnpm@9.0.0 --activate`)
- **Python** 3.11 (for ai-service)
- **Docker** & Docker Compose (for local Postgres, Redis, RabbitMQ)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> accessshield-india
cd accessshield-india
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16** on `localhost:5432`
- **Redis 7** on `localhost:6379`
- **RabbitMQ** on `localhost:5672` (management UI: `http://localhost:15672`)

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase project credentials
```

> **Never commit `.env.local`.** Production loads secrets from AWS Secrets Manager at startup.

### 4. Run database migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start all services

```bash
pnpm dev
```

| Service    | URL                         |
| ---------- | --------------------------- |
| Web        | http://localhost:3000       |
| API        | http://localhost:4000       |
| AI Service | http://localhost:8000       |
| Widget     | Built to `apps/widget/dist` |

## Keycloak Auth Setup

1. Start Keycloak (and MinIO) via Docker Compose:
   ```bash
   docker compose up -d keycloak minio minio-init mailpit postgres redis rabbitmq
   ```
2. Realm `accessshield` is imported from `infra/keycloak/accessshield-realm.json`.
3. Copy `.env.example` → `.env.local` and set `AUTH_ISSUER_URL`, `KEYCLOAK_*`, `AUTH_SECRET`, `NEXT_PUBLIC_AUTH_*`.
4. Seed sysadmin: `bash scripts/seed-sysadmin.sh`
5. Optional test user claims: `bash scripts/set-test-user-claims.sh`

The Next.js middleware (`apps/web/middleware.ts`) protects `/dashboard/*` using Auth.js session tokens and validates `user_role` + `org_id` claims (or DB fallback).

## API

### Health Check

```bash
curl http://localhost:4000/health
```

```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "version": "0.1.0",
  "timestamp": "2026-06-09T10:00:00.000Z"
}
```

### RBAC

Routes declare required roles via `requireRoles()`:

| Role                    | Access                                    |
| ----------------------- | ----------------------------------------- |
| `super_admin`           | Full platform access                      |
| `customer_admin`        | Org management, billing, user invites     |
| `accessibility_officer` | Scans, issues, certificates, reports      |
| `developer`             | Scans, issue remediation                  |
| `auditor`               | Read-only access to scans, reports, certs |

### Error Responses

All API errors follow [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807):

```json
{
  "type": "https://api.accessshield.in/problems/forbidden",
  "title": "Insufficient permissions",
  "status": 403,
  "detail": "Role 'auditor' is not authorised for this resource",
  "timestamp": "2026-06-09T10:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Widget (CDN)

Build the accessibility widget:

```bash
pnpm --filter @accessshield/widget build
```

Embed on any website:

```html
<script src="https://accessiblenow.in/widget/v1/accessshield.min.js"></script>
<script>
  window.accessShieldInit({
    orgId: 'your-org-uuid',
    position: 'bottom-right',
    primaryColor: '#005fcc',
  });
</script>
```

## Development Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages and apps
pnpm lint             # ESLint (includes jsx-a11y WCAG rules)
pnpm type-check       # TypeScript strict mode check
pnpm test             # Run unit tests
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
```

## Pre-commit Hooks

Husky + lint-staged run ESLint and Prettier on staged files:

```bash
pnpm prepare   # Sets up Husky (runs automatically on install)
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR:

1. **Lint** — ESLint with jsx-a11y WCAG enforcement
2. **Type Check** — TypeScript strict mode
3. **Unit Tests** — Vitest across all packages
4. **Accessibility** — axe-core checks via vitest-axe
5. **Python** — ruff, mypy, pytest for ai-service

## Standards

| Standard      | Implementation                                  |
| ------------- | ----------------------------------------------- |
| WCAG 2.2 AA   | jsx-a11y lint rules, axe-core CI, accessible UI |
| RFC 7807      | All API error responses                         |
| ISO 8601      | All timestamps in UTC with timezone             |
| INR in paise  | Integer amounts in `invoices` table             |
| Secrets       | AWS Secrets Manager (prod), `.env.local` (dev)  |
| Multi-tenancy | `organisation_id` on every table                |

## Production Deployment

Production secrets are loaded from **AWS Secrets Manager** at API startup. Set:

```bash
NODE_ENV=production
AWS_SECRET_ID=accessshield/prod
AWS_REGION=ap-south-1
```

The secret JSON must contain: `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `AUTH_ISSUER_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_ADMIN_CLIENT_ID`, `KEYCLOAK_ADMIN_CLIENT_SECRET`.

Infrastructure mapping:

- **PostgreSQL** — AWS RDS (prod) / Docker (dev)
- **Auth** — Keycloak (self-hosted)
- **Object storage** — MinIO (dev) / AWS S3 (prod)
- **Redis** — Upstash (dev) / AWS ElastiCache (prod)
- **RabbitMQ** — CloudAMQP (dev) / AWS MQ (prod)

## License

Proprietary — AccessShield India Pvt. Ltd.
