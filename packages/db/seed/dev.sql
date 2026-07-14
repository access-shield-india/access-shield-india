-- Dev seed: test@accessshield.in scanner playground
-- Auth UID: f378b2fc-5b9c-4103-8fde-b35c91aa518c
-- Re-run safe: uses fixed UUIDs with ON CONFLICT

INSERT INTO organisations (id, name, slug, plan_tier, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Public Scans',
  'public-scans-system',
  'starter',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organisations (id, name, slug, plan_tier, billing_email, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'AccessShield Test Org',
  'test-org',
  'professional',
  'test@accessshield.in',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  plan_tier = EXCLUDED.plan_tier,
  billing_email = EXCLUDED.billing_email,
  updated_at = now();

INSERT INTO users (
  id,
  organisation_id,
  auth_user_id,
  email,
  full_name,
  role,
  is_active
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'f378b2fc-5b9c-4103-8fde-b35c91aa518c',
  'test@accessshield.in',
  'Test User',
  'customer_admin',
  true
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  organisation_id = EXCLUDED.organisation_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO assets (
  id,
  organisation_id,
  name,
  url,
  type,
  description,
  is_active
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Deque Mars Demo',
  'https://dequeuniversity.com/demo/mars/',
  'website',
  'Known accessibility issues — good for scanner smoke tests',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Platform org + sysadmin application user (auth user created via scripts/seed-sysadmin.sh)
INSERT INTO organisations (id, name, slug, plan_tier, billing_email, is_active)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'AccessShield Platform',
  'platform',
  'enterprise',
  'sysadmin@accessshield.in',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  plan_tier = EXCLUDED.plan_tier,
  billing_email = EXCLUDED.billing_email,
  updated_at = now();

-- auth_user_id placeholder — updated by seed-sysadmin.sh after Supabase user is created
INSERT INTO users (
  id,
  organisation_id,
  auth_user_id,
  email,
  full_name,
  role,
  is_active
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000099',
  'sysadmin@accessshield.in',
  'System Administrator',
  'super_admin',
  true
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  organisation_id = EXCLUDED.organisation_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Platform org widget preferences (marketing site dogfood)
INSERT INTO widget_preferences (id, organisation_id, asset_id, position, primary_color, language, is_enabled)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '44444444-4444-4444-4444-444444444444',
  NULL,
  'bottom-right',
  '#1A56A0',
  'en',
  true
)
ON CONFLICT (id) DO UPDATE SET
  position = EXCLUDED.position,
  primary_color = EXCLUDED.primary_color,
  language = EXCLUDED.language,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();
