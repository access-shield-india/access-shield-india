-- Map document_scan_jobs.user_id from IdP auth UUID → public.users.id
-- and add FK. Drops Supabase-style RLS if present (API org filter is authoritative).

UPDATE document_scan_jobs j
SET user_id = u.id
FROM users u
WHERE j.user_id = u.auth_user_id;
--> statement-breakpoint

-- Orphan rows that cannot be mapped: remove (dev/seed only expected)
DELETE FROM document_scan_jobs
WHERE user_id NOT IN (SELECT id FROM users);
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'document_scan_jobs'
  ) THEN
    DROP POLICY IF EXISTS org_isolation_document_scan_jobs ON document_scan_jobs;
    DROP POLICY IF EXISTS org_isolation_document_scan_results ON document_scan_results;
    DROP POLICY IF EXISTS org_isolation_document_violations ON document_violations;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE document_scan_jobs DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE document_scan_results DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE document_violations DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE document_scan_jobs
  DROP CONSTRAINT IF EXISTS document_scan_jobs_user_id_auth_users_fkey;
--> statement-breakpoint

ALTER TABLE document_scan_jobs
  ADD CONSTRAINT document_scan_jobs_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
