CREATE TABLE IF NOT EXISTS "priority_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
  "user_impact_weight" double precision NOT NULL,
  "regulatory_weight" double precision NOT NULL,
  "at_coverage_weight" double precision NOT NULL,
  "fix_complexity_weight" double precision NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "priority_configs_org_uidx" ON "priority_configs" ("organisation_id");
