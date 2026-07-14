-- Migration: violation fingerprint for idempotent persist (pipeline v2 Phase 2)
-- @see docs/architecture/v2/01-scan-pipeline-architecture.md

ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "fingerprint" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "violations_scan_fingerprint_uidx"
  ON "violations" USING btree ("scan_id","fingerprint");
