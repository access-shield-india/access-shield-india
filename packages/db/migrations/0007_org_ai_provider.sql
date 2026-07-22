ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "ai_provider" varchar(50) DEFAULT 'anthropic' NOT NULL;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "ai_model" varchar(150) DEFAULT 'claude-sonnet-4-5-20250929' NOT NULL;
