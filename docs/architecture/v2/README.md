# Architecture v2

Target architecture for **staged web-scan task queues** (specialized workers, Redis coordination, MQ job handoff). This is the planned evolution of the v1 monolith worker described in [05 — Scan Pipelines](../05-scan-pipelines.md).

**Status:** Implemented behind feature flags (default off = v1 monolith). Phases 0–5 done; Phase 6 (SQS adapter) open. See [PROGRESS.md](./PROGRESS.md).  
**Last updated:** July 2026

---

## Documents in this folder

| Document | Purpose |
| -------- | ------- |
| [01-scan-pipeline-architecture.md](./01-scan-pipeline-architecture.md) | v2 architecture, worker catalog, consistency model, architecture + job pipeline diagrams |
| [02-scan-pipeline-change-plan.md](./02-scan-pipeline-change-plan.md) | Phased migration plan, tests, risks, rollback |
| [PROGRESS.md](./PROGRESS.md) | Implementation change log — what landed, what's next |

---

## Quick summary

| Topic | Decision |
| ----- | -------- |
| Pattern | **Staged task queues** (pipeline of jobs) — not Kafka-style event streaming |
| Coordination | **Redis** (progress, cancel, barriers, locks, AI cache, rate limits) |
| Job transport | **MQ** — RabbitMQ now; SQS later if needed (portable queue names/payloads) |
| Truth | **PostgreSQL** (`scans`, `scan_page_jobs`, `violations`, `issues`) |
| AI | Async Anthropic workers (`ai.alt-text`, `ai.fix`); do not block scan completion |

---

## Related

- [← Architecture index](../README.md)
- [05 — Scan Pipelines (v1)](../05-scan-pipelines.md)
- [06 — AI and Integrations](../06-ai-and-integrations.md)
- [11 — Deployment Guide](../11-deployment-guide.md)
