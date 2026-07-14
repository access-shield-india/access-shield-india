-- Create waitlist_signups table for marketing site signups
CREATE TABLE IF NOT EXISTS "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"company_size" varchar(50) NOT NULL,
	"phone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS "waitlist_signups_email_idx" ON "waitlist_signups" USING btree ("email");
--> statement-breakpoint

-- Create index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS "waitlist_signups_created_idx" ON "waitlist_signups" USING btree ("created_at");
--> statement-breakpoint

-- Insert system organisation for public scans
-- This organisation is used for unauthenticated free scans from the marketing site
INSERT INTO "organisations" (
	"id",
	"name",
	"slug",
	"is_active",
	"plan_tier",
	"created_at",
	"updated_at"
) VALUES (
	'00000000-0000-0000-0000-000000000001'::uuid,
	'Public Scans',
	'public-scans-system',
	false,
	'starter',
	now(),
	now()
)
ON CONFLICT (id) DO NOTHING;
