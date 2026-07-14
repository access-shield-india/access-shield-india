ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "ai_fix" text;
ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "ai_explanation" text;
ALTER TABLE "violations" ADD COLUMN IF NOT EXISTS "ai_alt_text" text;
