-- Violation review status + structured metadata for richer findings
DO $$ BEGIN
  CREATE TYPE "public"."violation_review_status" AS ENUM('confirmed', 'potential', 'needs_manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "review_status" "violation_review_status" DEFAULT 'confirmed' NOT NULL;
--> statement-breakpoint
ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
