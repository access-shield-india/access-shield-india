# Scan Pipeline v2 — Implementation Progress

Track of code changes against [02-scan-pipeline-change-plan.md](./02-scan-pipeline-change-plan.md).

**Last updated:** 2026-07-13

---

## Status overview

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 0 — Prep | **Done** | Types, schema, migrations, Redis keys, Zod |
| Phase 1 — Page scanner | **Done** | Fan-out + `page.scan` consumer |
| Phase 2 — Persister + barrier | **Done** | `findings.persist`, fingerprint, `issues.sync` |
| Phase 3 — Crawler + streaming | **Done** | `scan.jobs` crawler, stream URLs, auto-N |
| Phase 4 — AI workers | **Done** | `ai.enrich` → alt-text / fix + rate limits |
| Phase 5 — Reports + monolith deprecate | **Done** | `report.generate` worker; skip monolith when SCAN_JOBS |
| Phase 6 | Not started | Broker portability (RabbitMQ vs SQS) |

---

## Change log

### 2026-07-13 — Phase 5

**Reports**

- `reporting/generate-report.ts` — shared generate+store (PDF/HTML → S3)
- `report-generate-worker.ts` — consumes `report.generate`
- `SCAN_PIPELINE_V2_AUTO_REPORT=true` — enqueue technical PDF after finalize

**Monolith**

- When `SCAN_PIPELINE_V2_SCAN_JOBS=true`, worker entry **does not** start the v1 `scans` consumer (deprecated for that mode)
- HTTP `POST /reports` remains sync for on-demand UI (unchanged)

**Docs**

- Runbook + deployment guide note v2 flags
- 2026-07-13: Full doc pass — README, 01, 03, 05, 08, 11, v2 README status (flags / prod enablement / failure modes)

---

### Earlier phases

See previous sections in git history / Phase 0–4 entries above in prior commits of this file.

---

## How to try full v2 (Phases 1–5)

```bash
pnpm --filter @accessshield/db db:migrate

# .env.local
SCAN_PIPELINE_V2_SCAN_JOBS=true
# optional auto technical PDF:
# SCAN_PIPELINE_V2_AUTO_REPORT=true

pnpm --filter @accessshield/api dev:worker
pnpm --filter @accessshield/ai-service dev   # for AI enrichment
```

---

## Next up (Phase 6)

1. `QueueAdapter` abstraction
2. Decide RabbitMQ vs SQS for production
3. Load-test publish/consume latency
