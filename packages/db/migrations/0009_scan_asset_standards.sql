-- Persist which compliance standards were selected on assets and scans.
-- SEBI reports are allowed only when the scan included SEBI.

ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "standards" text[] NOT NULL DEFAULT ARRAY['WCAG22','IS17802']::text[];
--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "standards" text[] NOT NULL DEFAULT ARRAY['WCAG22','IS17802']::text[];
