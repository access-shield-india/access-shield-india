-- Anonymous widget usage: daily aggregates rolled up from Redis (DPDP — no PII).

CREATE TABLE IF NOT EXISTS "widget_analytics_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "event_type" varchar(40) NOT NULL,
  "feature" varchar(60) NOT NULL DEFAULT '',
  "count" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widget_analytics_daily_org_idx" ON "widget_analytics_daily" USING btree ("organisation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widget_analytics_daily_date_idx" ON "widget_analytics_daily" USING btree ("date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "widget_analytics_daily_uidx"
  ON "widget_analytics_daily" USING btree ("organisation_id","date","event_type","feature");
