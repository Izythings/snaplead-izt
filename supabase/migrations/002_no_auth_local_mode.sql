-- Personal MVP mode: allow localhost/no-login usage with a fixed local user id.
-- The authenticated "own" policies from the initial migration remain in place.

ALTER TABLE captures ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid);
ALTER TABLE leads ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid);
ALTER TABLE plans ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid);
ALTER TABLE webhook_configs ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid);
ALTER TABLE webhook_logs ALTER COLUMN user_id SET DEFAULT COALESCE(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid);

DROP POLICY IF EXISTS "anon_local" ON captures;
DROP POLICY IF EXISTS "anon_local" ON leads;
DROP POLICY IF EXISTS "anon_local" ON plans;
DROP POLICY IF EXISTS "anon_local" ON webhook_configs;
DROP POLICY IF EXISTS "anon_local" ON webhook_logs;

CREATE POLICY "anon_local" ON captures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_local" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_local" ON plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_local" ON webhook_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_local" ON webhook_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_local_upload" ON storage.objects;
DROP POLICY IF EXISTS "anon_local_read" ON storage.objects;

CREATE POLICY "anon_local_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'captures');

CREATE POLICY "anon_local_read" ON storage.objects
FOR SELECT USING (bucket_id = 'captures');
