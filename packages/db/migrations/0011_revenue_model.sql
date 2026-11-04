-- India revenue model: engagements, funnel events, enterprise quotes

CREATE TABLE IF NOT EXISTS "service_engagements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
  "type" varchar(64) NOT NULL,
  "title" varchar(255) NOT NULL,
  "status" varchar(32) DEFAULT 'requested' NOT NULL,
  "due_at" timestamp with time zone,
  "asset_id" uuid REFERENCES "assets"("id") ON DELETE set null,
  "scan_id" uuid REFERENCES "scans"("id") ON DELETE set null,
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_engagements_org_idx" ON "service_engagements" ("organisation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_engagements_status_idx" ON "service_engagements" ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "funnel_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event" varchar(64) NOT NULL,
  "path" varchar(255),
  "meta" jsonb,
  "organisation_id" uuid REFERENCES "organisations"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_event_idx" ON "funnel_events" ("event");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_created_idx" ON "funnel_events" ("created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "enterprise_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid REFERENCES "organisations"("id") ON DELETE set null,
  "contact_name" varchar(255) NOT NULL,
  "contact_email" varchar(255) NOT NULL,
  "company" varchar(255) NOT NULL,
  "domains_count" integer DEFAULT 1 NOT NULL,
  "apps_count" integer DEFAULT 0 NOT NULL,
  "docs_volume" varchar(64),
  "sebi_required" boolean DEFAULT false NOT NULL,
  "training_seats" integer DEFAULT 0 NOT NULL,
  "sla_hours" integer DEFAULT 72 NOT NULL,
  "notes" text,
  "status" varchar(32) DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enterprise_quotes_email_idx" ON "enterprise_quotes" ("contact_email");
