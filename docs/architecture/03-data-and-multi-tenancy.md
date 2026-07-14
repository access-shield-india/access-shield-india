# 03 — Data and Multi-Tenancy

[← Monorepo](./02-monorepo-and-packages.md) | [Index](./README.md) | [Next: Auth & Security →](./04-auth-and-security.md)

## Executive Summary

All tenant data lives in **PostgreSQL 16**, accessed via **Drizzle ORM**. Every tenant-scoped table includes `organisation_id`. The API enforces isolation using JWT `org_id`; document scanner tables additionally use Supabase **Row Level Security (RLS)**.

---

## Entity Relationship (logical)

```mermaid
erDiagram
  organisations ||--o{ users : has
  organisations ||--o{ assets : owns
  organisations ||--o{ scans : runs
  organisations ||--o{ issues : tracks
  organisations ||--o{ reports : generates
  organisations ||--o{ certificates : holds
  organisations ||--o{ invoices : bills
  organisations ||--o{ widget_preferences : configures
  organisations ||--o{ document_scan_jobs : queues

  assets ||--o{ scans : scanned_by
  scans ||--o{ violations : produces
  scans ||--o{ scan_page_jobs : tracks_pages
  scans ||--o{ issues : may_create

  document_scan_jobs ||--o| document_scan_results : yields
  document_scan_jobs ||--o{ document_violations : contains

  users {
    uuid id PK
    uuid organisation_id FK
    uuid auth_user_id UK
    user_role role
  }

  organisations {
    uuid id PK
    string slug UK
    string plan_tier
  }

  assets {
    uuid id PK
    uuid organisation_id FK
    asset_type type
    string url
  }

  scans {
    uuid id PK
    uuid organisation_id FK
    uuid asset_id FK
    scan_status status
    int score
  }
```

**Interpretation:** `organisations` is the tenant root. `users` link Supabase Auth IDs to orgs and roles. `assets` are scan targets; `scans` and `violations` hold web/mobile results. Document scanning uses a parallel `document_scan_*` model.

---

## Core Tables

Source: [`packages/db/src/schema.ts`](../../packages/db/src/schema.ts)

| Table                   | Tenant-scoped | Purpose                             |
| ----------------------- | ------------- | ----------------------------------- |
| `organisations`         | Root          | Tenant identity, plan tier, GSTIN   |
| `users`                 | Yes           | Maps `auth_user_id` → org + role    |
| `assets`                | Yes           | Websites, apps, documents to audit  |
| `scans`                 | Yes           | Web/mobile scan jobs and scores     |
| `scan_page_jobs`        | Yes           | Per-URL jobs for web scan pipeline v2 |
| `violations`            | Yes           | Per-scan rule failures (+ optional `fingerprint`) |
| `issues`                | Yes           | Remediation workflow                |
| `reports`               | Yes           | Generated compliance reports        |
| `certificates`          | Yes           | Accessibility certification records |
| `invoices`              | Yes           | Billing (amounts in paise)          |
| `widget_preferences`    | Yes           | Widget config per org/asset         |
| `audit_logs`            | Yes           | Audit trail                         |
| `waitlist_signups`      | No            | Marketing waitlist                  |
| `document_scan_jobs`    | Yes           | Document scan queue state           |
| `document_scan_results` | Yes           | Aggregated doc scan output          |
| `document_violations`   | Yes           | Normalized doc violations           |

---

## Key Enums

| Enum                 | Values                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| `user_role`          | super_admin, customer_admin, accessibility_officer, developer, auditor |
| `asset_type`         | website, web_app, mobile_app, document, pdf                            |
| `scan_status`        | pending, running, completed, failed                                    |
| `issue_status`       | open, in_progress, resolved, wont_fix, duplicate                       |
| `issue_severity`     | critical, serious, moderate, minor                                     |
| `invoice_status`     | draft, sent, paid, overdue, cancelled                                  |
| `certificate_status` | active, expired, revoked                                               |

---

## Multi-Tenancy Layers

```mermaid
flowchart TB
  subgraph layer1 [Layer_1_Schema]
    OrgCol[organisation_id_on_every_tenant_table]
  end

  subgraph layer2 [Layer_2_API]
    JWT[JWT_org_id_from_app_metadata]
    Filter[Every_query_filters_by_org_id]
  end

  subgraph layer3 [Layer_3_RLS]
    RLS[Supabase_RLS_document_scanner_tables]
  end

  subgraph layer4 [Layer_4_Auth_Hook]
    Hook[custom_access_token_hook_injects_claims]
  end

  Hook --> JWT
  JWT --> Filter
  OrgCol --> Filter
  OrgCol --> RLS
```

### Layer 1 — Schema

Reusable helper in schema:

```typescript
const orgId = () =>
  uuid('organisation_id')
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' });
```

### Layer 2 — API middleware

[`apps/api/src/middleware/auth.ts`](../../apps/api/src/middleware/auth.ts) verifies Keycloak JWTs (JWKS) and sets `req.user.org_id`. All protected routes must filter by this value — never trust `organisation_id` from the request body.

Claims resolution: [`apps/api/src/lib/resolve-claims.ts`](../../apps/api/src/lib/resolve-claims.ts)  
DB fallback (dev): [`packages/db/src/user-claims.ts`](../../packages/db/src/user-claims.ts)

### Layer 3 — Row Level Security

Core tenant tables rely on API-layer filtering today; RLS extension to all tables is a future hardening step. Document-scan FKs use `public.users.id` (see migration `0004_document_scan_user_fk.sql`).

### Layer 4 — JWT claim injection

Keycloak protocol mappers / user attributes set `user_role` and `org_id` on tokens. Scripts: [`scripts/set-test-user-claims.sh`](../../scripts/set-test-user-claims.sh). Optional DB fallback when claims are missing.

---

## Plan Tier Feature Gating

| Tier             | Typical limits (from `.cursorrules`)                      |
| ---------------- | --------------------------------------------------------- |
| **starter**      | 1 asset, 3 scans/month, no AI remediation, no SEBI report |
| **professional** | 10 assets, unlimited scans, AI remediation                |
| **enterprise**   | Unlimited assets/scans, AI, SEBI report                   |
| **government**   | Same as enterprise                                        |

Enforced in API middleware and route handlers (e.g. document scan limits in [`apps/api/src/routes/document-scans.ts`](../../apps/api/src/routes/document-scans.ts)).

---

## Data Stores Beyond PostgreSQL

| Store                      | Role                         | Key patterns                                                                 |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| **Redis**                  | Cache, rate limits, progress | `scan:progress:{id}`, `scan:cancel:{id}`, `scan:barrier:{id}`, `scan:lock:finalize:{id}`, `ai:ratelimit:{orgId}`, `mobile-scan:progress:{id}`, `document-scan-jobs` list |
| **S3** (or local fallback) | Artifacts                    | Screenshots, reports, mobile APKs, document uploads                          |
| **RabbitMQ**               | Job queues                   | **v1:** `scans`, `scan_cancellations`, `mobile-scan-jobs`. **v2:** `scan.jobs`, `page.scan`, `page.scan.auth`, `findings.persist`, `issues.sync`, `ai.enrich`, `ai.alt-text`, `ai.fix`, `report.generate` (+ legacy `ai-alt-text` / `ai-fix`) |

### S3 key conventions (examples)

- Documents: `document-scans/{orgId}/{jobId}/{filename}` — [`apps/api/src/services/document-storage.ts`](../../apps/api/src/services/document-storage.ts)
- Mobile apps: uploaded via [`apps/api/src/services/s3-upload.ts`](../../apps/api/src/services/s3-upload.ts)

**Dev fallback:** When `S3_BUCKET_NAME` is unset or `*_STORAGE_LOCAL=true`, API writes to local filesystem.

---

## Migrations

| Path                      | Tool        | Notes                    |
| ------------------------- | ----------- | ------------------------ |
| `packages/db/migrations/` | Drizzle Kit | Sole schema evolution path |

Notable recent migrations for web scan v2: `0005_scan_page_jobs.sql`, `0006_violation_fingerprint.sql`.

### Seed data

- Dev seed: [`packages/db/seed/dev.sql`](../../packages/db/seed/dev.sql) via `pnpm db:seed`

---

## Source References

- Schema: [`packages/db/src/schema.ts`](../../packages/db/src/schema.ts)
- DB factory: [`packages/db/src/index.ts`](../../packages/db/src/index.ts)
- Local Postgres: [`docker-compose.yml`](../../docker-compose.yml) (port **5433**)
