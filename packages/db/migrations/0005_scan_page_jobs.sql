-- Migration: scan_page_jobs for Architecture v2 staged scan pipeline
-- @see docs/architecture/v2/01-scan-pipeline-architecture.md

CREATE TYPE "public"."scan_page_job_status" AS ENUM(
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'skipped'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_page_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL,
  "scan_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "url" text NOT NULL,
  "url_normalized" text NOT NULL,
  "auth_required" boolean DEFAULT false NOT NULL,
  "status" "scan_page_job_status" DEFAULT 'pending' NOT NULL,
  "attempt" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_page_jobs"
  ADD CONSTRAINT "scan_page_jobs_organisation_id_organisations_id_fk"
  FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scan_page_jobs"
  ADD CONSTRAINT "scan_page_jobs_scan_id_scans_id_fk"
  FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scan_page_jobs"
  ADD CONSTRAINT "scan_page_jobs_asset_id_assets_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_page_jobs_org_idx" ON "scan_page_jobs" USING btree ("organisation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_page_jobs_scan_idx" ON "scan_page_jobs" USING btree ("scan_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_page_jobs_scan_status_idx" ON "scan_page_jobs" USING btree ("scan_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scan_page_jobs_scan_url_uidx" ON "scan_page_jobs" USING btree ("scan_id","url_normalized");
