CREATE TABLE IF NOT EXISTS "document_scan_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "document_name" text NOT NULL,
  "document_type" text NOT NULL,
  "document_size_bytes" bigint,
  "page_count" integer,
  "s3_key" text NOT NULL,
  "s3_bucket" text DEFAULT 'accessshield-uploads-prod' NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "progress_percent" integer DEFAULT 0,
  "standards" text[] DEFAULT ARRAY['WCAG_2_1_AA', 'GIGW_3_0', 'PDF_UA', 'IS_17802'] NOT NULL,
  "error_message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "started_at" timestamptz,
  "completed_at" timestamptz
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_scan_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL UNIQUE REFERENCES "document_scan_jobs"("id") ON DELETE CASCADE,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
  "document_name" text NOT NULL,
  "document_type" text NOT NULL,
  "total_violations" integer DEFAULT 0 NOT NULL,
  "critical_count" integer DEFAULT 0 NOT NULL,
  "serious_count" integer DEFAULT 0 NOT NULL,
  "moderate_count" integer DEFAULT 0 NOT NULL,
  "minor_count" integer DEFAULT 0 NOT NULL,
  "compliance_score" integer DEFAULT 0 NOT NULL,
  "violations" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "gigw_checkpoint_results" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ai_summary" text,
  "scan_duration_seconds" double precision,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_violations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "document_scan_jobs"("id") ON DELETE CASCADE,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
  "violation_id" text NOT NULL,
  "checkpoint_id" text NOT NULL,
  "standard" text NOT NULL,
  "severity" text NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "location" text,
  "wcag_criterion" text,
  "impact" text,
  "remediation" text,
  "auto_fixable" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "document_violations_job_id_violation_id_unique" UNIQUE("job_id", "violation_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_jobs_org_id" ON "document_scan_jobs" ("organisation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_jobs_status" ON "document_scan_jobs" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_jobs_created" ON "document_scan_jobs" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_results_job_id" ON "document_scan_results" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_results_org_id" ON "document_scan_results" ("organisation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_violations_job_id" ON "document_violations" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_violations_severity" ON "document_violations" ("job_id", "severity");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_violations_category" ON "document_violations" ("job_id", "category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doc_violations_checkpoint" ON "document_violations" ("checkpoint_id");
