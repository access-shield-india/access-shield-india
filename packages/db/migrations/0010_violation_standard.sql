-- Store which compliance standard each violation belongs to (WCAG / IS 17802 / GIGW / SEBI).

ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "standard" varchar(20) NOT NULL DEFAULT 'WCAG22';
--> statement-breakpoint
UPDATE "violations"
SET "standard" = CASE
  WHEN "rule_id" LIKE 'IS-%' THEN 'IS17802'
  WHEN "rule_id" LIKE 'SEBI-%' THEN 'SEBI'
  WHEN "rule_id" LIKE 'GIGW-%' THEN 'GIGW3'
  ELSE 'WCAG22'
END;
