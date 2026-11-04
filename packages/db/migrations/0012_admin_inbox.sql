-- Admin inquiries inbox: waitlist status + notes

ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "status" varchar(32) DEFAULT 'new' NOT NULL;
--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "admin_notes" text;
--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_signups_status_idx" ON "waitlist_signups" ("status");
