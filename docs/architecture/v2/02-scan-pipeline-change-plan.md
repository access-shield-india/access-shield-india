# 02 — Scan Pipeline v2 Change Plan

[← Architecture v2](./01-scan-pipeline-architecture.md) | [v2 Index](./README.md)

## Purpose

Step-by-step plan to move from the monolithic web-scan worker to Architecture v2 (staged task queues, Redis + MQ, multi-scan safe).

**Status (2026-07-13):** Phases **0–5 implemented** behind flags (prod default still v1). Phase **6** (broker adapter) not started. Soak/stress tests and prod flag flip still open — see [PROGRESS.md](./PROGRESS.md).

**Constraint:** Broker choice RabbitMQ vs SQS can be deferred; keep queue **names and payloads** portable.

---

## Principles

1. Ship in phases; each phase is production-safe.
2. Postgres is truth; Redis is coordination; MQ is work.
3. Idempotent consumers; `scanId` on every message.
4. Do not block `completed` on AI or PDF.
5. Measure before/after (single-scan latency + scans/hour).

---

## Phase 0 — Prep (no behavior change)

**Work**

- [x] Link Architecture v2 from [architecture README](../README.md) and [05-scan-pipelines.md](../05-scan-pipelines.md)
- [x] Define TS message schemas in `packages/types` (`scan-pipeline-v2.ts`) + Zod in `apps/api/src/scanner/v2/message-schemas.ts`
- [x] Design `scan_page_jobs` table + Drizzle schema + migration `0005_scan_page_jobs.sql`
- [x] Standardize Redis key layout: `scan:progress|cancel|lock:*:{scanId}` (`scanner/v2/redis-keys.ts`)
- [x] List current queues vs v2 queues (`SCAN_PIPELINE_V2_QUEUES`, includes `SCANS_V1` compat)
- [x] Track progress in [PROGRESS.md](./PROGRESS.md)

**Exit:** Schemas and migration reviewed; monolith behavior unchanged aside from optional `scan_page_jobs` dual-write (see Phase 1 start).

---

## Phase 1 — Page scanner extraction

**Work**

- [x] Dual-write `scan_page_jobs` from monolith after URL discovery (best-effort)
- [x] Shared `analyzePageUrl` + `publishPageScanJob`
- [x] New consumer on `page.scan` / `page.scan.auth` (`page-scan-worker.ts`)
- [x] Persist violations inline in page worker (OK for this phase)
- [x] Cancel check via Redis `scan:cancel:{scanId}` (+ orchestrator sets key)
- [x] Feature flag: `SCAN_PIPELINE_V2_PAGE_WORKER=true`
- [x] When flag on: monolith fans out page jobs and skips inline page loop
- [ ] Unit/integration tests for two concurrent scans (still open)

**Exit:** One scan completes via page queue; 2 parallel scans do not mix violations. *(Manual verify pending)*


**Tests**

- [ ] Unit: idempotent page_job insert
- [ ] Integration: two orgs, two scans concurrent
- [ ] Cancel scan A while B runs

---

## Phase 2 — Persister + finalize barrier

**Work**

- [x] Scanners publish `findings.persist` instead of writing violations directly
- [x] Persister: batch insert + unique `(scan_id, fingerprint)` (`0006_violation_fingerprint.sql`)
- [x] Barrier: finalize when all `scan_page_jobs` terminal (`tryFinalizeScanFromPageJobs` + Redis NX lock)
- [x] Finalizer: score, `scans.completed`, `assets.lastScannedAt`, clear Redis progress
- [x] Enqueue `issues.sync` after successful finalize
- [ ] Crash/redeliver stress tests (manual / upcoming)

**Exit:** Exactly-once finalize under redelivery; multi-scan stress passes. *(Soak / stress still open)*


**Tests**

- [ ] Crash/redeliver persister → no duplicate violations
- [ ] Double finalize attempt → one wins
- [ ] Partial page failures → completed with note

---

## Phase 3 — Crawler worker + streaming

**Work**

- [x] Dedicated crawler on `scan.jobs`
- [x] Stream URLs into `page.scan` / `page.scan.auth` as discovered
- [x] Deep crawl streaming helper (`discoverUrlsStreaming` — sitemap or homepage links; multi-level BFS still optional later)
- [x] Auto `SCAN_CONCURRENT_PAGES` from CPU/RAM (`auto-concurrency.ts`)
- [x] Auth queue: `page.scan.auth` prefetch 1; public prefetch = auto-N
- [x] Redis `crawlDone` barrier before finalize
- [ ] Multi-level deep BFS crawl (future enhancement)

**Exit:** Crawl∥scan overlap on discovery; auth path sequential. *(Soak pending)*

---

## Phase 4 — AI workers

**Work**

- [x] ai-service (api workers) consumers for `ai.alt-text`, `ai.fix`
- [x] `ai.enrich` after finalize
- [x] Per-org Redis rate limit + plan tier gates (`aiRemediation`)
- [x] Keep HTTP endpoints for on-demand UI (existing `ai-client` / issues routes)
- [ ] Soak with live Anthropic key on professional plan

**Exit:** Queues consumed; scan completes before AI fills columns. *(Live soak pending)*

---

## Phase 5 — Reports + retire monolith

**Work**

- [x] `report.generate` async worker
- [x] Shared `generateAndStoreReport` service
- [x] Optional auto-report after finalize (`SCAN_PIPELINE_V2_AUTO_REPORT`)
- [x] Skip monolith `scans` consumer when `SCAN_PIPELINE_V2_SCAN_JOBS=true`
- [x] Update runbooks / deployment guide
- [ ] Refactor HTTP `POST /reports` to call shared service (optional cleanup)
- [ ] Default production flag flip after soak

**Exit:** Reports async; monolith disabled under full v2 flag. *(Prod default still v1)*

---

## Phase 6 — Broker portability (optional)

**Work**

- [ ] Abstract publish/consume interface (`QueueAdapter`)
- [ ] Decide RabbitMQ stay vs SQS in AWS
- [ ] Load test publish/consume latency

**Exit:** Documented decision in [deployment guide](../../deployment/README.md).

---

## Schema & code touch list

| Area | Likely paths |
| ---- | ------------ |
| DB | `packages/db` — `scan_page_jobs`, fingerprint unique, migrations `0005`/`0006` |
| Types | `packages/types` — `scan-pipeline-v2.ts` queue message schemas |
| Orchestrator | `apps/api/src/scanner/orchestrator.ts` — enqueue `scan.jobs` when flag on |
| Workers | `apps/api/src/scanner/v2/*` (crawler, page-scan, persist, finalize, AI, report) |
| Queue | `apps/api/src/scanner/queue.ts` → Phase 6 adapter |
| Issue sync | `apps/api/src/scanner/v2/issues-sync-worker.ts` + services |
| AI | API workers call ai-service HTTP; queues `ai.enrich` / `ai.alt-text` / `ai.fix` |
| Docs | `05`, `08`, `11`, this `v2/` folder |
| Web | Progress UI may show page_job counts (optional) |

---

## Consistency checklist (every phase)

- [ ] Message includes `scanId` + `orgId`
- [ ] DB writes filter by org + scan
- [ ] Idempotency key documented
- [ ] Cancel checked
- [ ] No cross-scan browser/cookie reuse
- [ ] Finalize CAS / lock
- [ ] Plan-limit create race considered

---

## Performance measurement plan

**Baseline (v1)** on fixed fixtures:

1. Marketing site with sitemap (~50 pages)
2. SPA-like site without sitemap (~20 pages)
3. Three concurrent scans (different orgs)

**Metrics**

- Wall-clock scan duration (p50/p95)
- Pages/minute
- Scans completed/hour under concurrency
- CPU/RAM of worker host
- Anthropic wait/errors (phase 4+)

**Targets (guidance, not SLOs yet)**

- Typical single-scan: **10–25%** faster after phases 1–3
- Throughput: **≥1.5×** with 2+ page-scan workers on same class of machine

---

## Risks & mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Finalize races | DB barrier + Redis NX lock |
| Duplicate violations | Unique `(scan_id, fingerprint)` |
| Starvation of small scans | Per-scan in-flight caps |
| More moving parts | Phased flags; keep monolith until phase 5 |
| AI cost spikes | Rate governor + plan gates |
| MQ vs Redis confusion | Docs: MQ = jobs, Redis = coord only |

---

## Rollout / rollback

- Feature flags per phase
- Rollback = disable flag → v1 worker consumes `scans` (keep alias during migration)
- Do not drop v1 queue until phase 5 soak ≥1 release cycle

---

## Open decisions

1. RabbitMQ vs SQS for production MQ
2. Whether intermediate scan statuses are new DB enums or UI-only mapping
3. Issue upsert rule when same asset is scanned twice (update open issue vs new issue)
4. Deep crawl default on/off for starter vs pro

---

## Done definition (v2 complete)

- [ ] Multiple specialized workers documented and runnable
- [ ] ≥3 concurrent website scans with correct isolation
- [ ] AI queues consumed; DLP + rate limits on
- [ ] Reports async
- [ ] Monolith worker deprecated
- [ ] Architecture v2 linked from docs index and v1 scan pipelines doc
