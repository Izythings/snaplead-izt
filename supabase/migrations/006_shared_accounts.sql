CREATE TABLE IF NOT EXISTS account_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role <> 'owner' OR user_id = account_owner_id)
);

CREATE INDEX IF NOT EXISTS idx_account_members_owner
  ON account_members(account_owner_id);

CREATE TABLE IF NOT EXISTS account_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_invites_pending_email
  ON account_invites(lower(email))
  WHERE status = 'pending';

ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_account_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT account_owner_id
      FROM account_members
      WHERE user_id = auth.uid()
      LIMIT 1
    ),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION has_account_access(target_account_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM account_members
    WHERE user_id = auth.uid()
      AND account_owner_id = target_account_owner_id
  );
$$;

CREATE OR REPLACE FUNCTION has_account_storage_access(target_account_owner_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM account_members
    WHERE user_id = auth.uid()
      AND account_owner_id::text = target_account_owner_id
  );
$$;

REVOKE ALL ON FUNCTION current_account_owner_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION has_account_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION has_account_storage_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_account_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION has_account_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_account_storage_access(TEXT) TO authenticated;

INSERT INTO account_members (user_id, account_owner_id, role)
SELECT id, id, 'owner'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
  local_user_id CONSTANT UUID := '00000000-0000-4000-8000-000000000001';
  auth_user_count INTEGER;
  initial_owner_id UUID;
  local_data_exists BOOLEAN;
BEGIN
  SELECT
    EXISTS (SELECT 1 FROM captures WHERE user_id = local_user_id)
    OR EXISTS (SELECT 1 FROM leads WHERE user_id = local_user_id)
    OR EXISTS (SELECT 1 FROM plans WHERE user_id = local_user_id)
    OR EXISTS (SELECT 1 FROM webhook_configs WHERE user_id = local_user_id)
    OR EXISTS (SELECT 1 FROM webhook_logs WHERE user_id = local_user_id)
  INTO local_data_exists;

  IF NOT local_data_exists THEN
    RETURN;
  END IF;

  SELECT count(*)
  INTO auth_user_count
  FROM auth.users;

  IF auth_user_count <> 1 THEN
    RAISE EXCEPTION
      'Cannot migrate local data automatically: expected exactly one auth user, found %',
      auth_user_count;
  END IF;

  SELECT id
  INTO initial_owner_id
  FROM auth.users
  LIMIT 1;

  UPDATE captures SET user_id = initial_owner_id WHERE user_id = local_user_id;
  UPDATE leads SET user_id = initial_owner_id WHERE user_id = local_user_id;
  UPDATE plans SET user_id = initial_owner_id WHERE user_id = local_user_id;
  UPDATE webhook_configs SET user_id = initial_owner_id WHERE user_id = local_user_id;
  UPDATE webhook_logs SET user_id = initial_owner_id WHERE user_id = local_user_id;

  UPDATE storage.objects
  SET name = initial_owner_id::text || substring(name FROM position('/' IN name))
  WHERE bucket_id = 'captures'
    AND (storage.foldername(name))[1] = local_user_id::text;

  UPDATE captures
  SET photo_path = initial_owner_id::text || substring(photo_path FROM position('/' IN photo_path))
  WHERE photo_path LIKE local_user_id::text || '/%';
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_account_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_invite account_invites%ROWTYPE;
BEGIN
  SELECT *
  INTO pending_invite
  FROM account_invites
  WHERE status = 'pending'
    AND lower(email) = lower(COALESCE(NEW.email, ''))
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF pending_invite.id IS NOT NULL THEN
    INSERT INTO account_members (user_id, account_owner_id, role, invited_by)
    VALUES (NEW.id, pending_invite.account_owner_id, 'member', pending_invite.invited_by)
    ON CONFLICT (user_id) DO UPDATE
      SET account_owner_id = EXCLUDED.account_owner_id,
          role = EXCLUDED.role,
          invited_by = EXCLUDED.invited_by;

    UPDATE account_invites
    SET status = 'accepted',
        accepted_by = NEW.id,
        accepted_at = now()
    WHERE id = pending_invite.id;
  ELSE
    INSERT INTO account_members (user_id, account_owner_id, role)
    VALUES (NEW.id, NEW.id, 'owner')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_add_account ON auth.users;
CREATE TRIGGER on_auth_user_created_add_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_account_user();

CREATE OR REPLACE FUNCTION invite_account_member(invitee_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  normalized_email TEXT := lower(btrim(invitee_email));
  caller_membership account_members%ROWTYPE;
  target_user auth.users%ROWTYPE;
  target_membership account_members%ROWTYPE;
  invite_row account_invites%ROWTYPE;
  target_has_data BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF normalized_email = '' OR normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT *
  INTO caller_membership
  FROM account_members
  WHERE user_id = auth.uid();

  IF caller_membership.user_id IS NULL OR caller_membership.role <> 'owner' THEN
    RAISE EXCEPTION 'Only the account owner can manage access';
  END IF;

  SELECT *
  INTO target_user
  FROM auth.users
  WHERE lower(email) = normalized_email
  LIMIT 1;

  IF target_user.id IS NOT NULL THEN
    IF target_user.id = caller_membership.account_owner_id THEN
      RAISE EXCEPTION 'This email already owns the account';
    END IF;

    SELECT *
    INTO target_membership
    FROM account_members
    WHERE user_id = target_user.id;

    IF target_membership.account_owner_id = caller_membership.account_owner_id THEN
      RETURN jsonb_build_object('status', 'accepted', 'email', normalized_email);
    END IF;

    SELECT
      EXISTS (SELECT 1 FROM captures WHERE user_id = target_user.id)
      OR EXISTS (SELECT 1 FROM leads WHERE user_id = target_user.id)
      OR EXISTS (SELECT 1 FROM plans WHERE user_id = target_user.id)
      OR EXISTS (SELECT 1 FROM webhook_configs WHERE user_id = target_user.id)
      OR EXISTS (SELECT 1 FROM webhook_logs WHERE user_id = target_user.id)
      OR EXISTS (
        SELECT 1
        FROM account_members
        WHERE account_owner_id = target_user.id
          AND user_id <> target_user.id
      )
      OR EXISTS (
        SELECT 1
        FROM storage.objects
        WHERE bucket_id = 'captures'
          AND (storage.foldername(name))[1] = target_user.id::text
      )
    INTO target_has_data;

    IF target_has_data THEN
      RAISE EXCEPTION 'This user already owns data and cannot be moved automatically';
    END IF;

    DELETE FROM account_members WHERE user_id = target_user.id;
    INSERT INTO account_members (user_id, account_owner_id, role, invited_by)
    VALUES (target_user.id, caller_membership.account_owner_id, 'member', auth.uid());

    RETURN jsonb_build_object('status', 'accepted', 'email', normalized_email);
  END IF;

  INSERT INTO account_invites (account_owner_id, email, invited_by)
  VALUES (caller_membership.account_owner_id, normalized_email, auth.uid())
  ON CONFLICT (lower(email)) WHERE status = 'pending'
  DO UPDATE SET
    account_owner_id = EXCLUDED.account_owner_id,
    invited_by = EXCLUDED.invited_by,
    created_at = now()
  RETURNING * INTO invite_row;

  RETURN jsonb_build_object(
    'status', invite_row.status,
    'email', invite_row.email,
    'invite_id', invite_row.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_account_access()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_membership account_members%ROWTYPE;
BEGIN
  SELECT *
  INTO caller_membership
  FROM account_members
  WHERE user_id = auth.uid();

  IF caller_membership.user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN jsonb_build_object(
    'account_owner_id', caller_membership.account_owner_id,
    'current_user_role', caller_membership.role,
    'members', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', member.user_id,
            'email', user_row.email,
            'role', member.role,
            'created_at', member.created_at
          )
          ORDER BY member.created_at
        )
        FROM account_members member
        JOIN auth.users user_row ON user_row.id = member.user_id
        WHERE member.account_owner_id = caller_membership.account_owner_id
      ),
      '[]'::jsonb
    ),
    'invites', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', invite.id,
            'email', invite.email,
            'status', invite.status,
            'created_at', invite.created_at
          )
          ORDER BY invite.created_at DESC
        )
        FROM account_invites invite
        WHERE invite.account_owner_id = caller_membership.account_owner_id
          AND invite.status = 'pending'
      ),
      '[]'::jsonb
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION remove_account_member(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_membership account_members%ROWTYPE;
BEGIN
  SELECT *
  INTO caller_membership
  FROM account_members
  WHERE user_id = auth.uid();

  IF caller_membership.user_id IS NULL OR caller_membership.role <> 'owner' THEN
    RAISE EXCEPTION 'Only the account owner can manage access';
  END IF;
  IF target_user_id = caller_membership.account_owner_id THEN
    RAISE EXCEPTION 'The account owner cannot be removed';
  END IF;

  DELETE FROM account_members
  WHERE user_id = target_user_id
    AND account_owner_id = caller_membership.account_owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_account_invite(target_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_membership account_members%ROWTYPE;
BEGIN
  SELECT *
  INTO caller_membership
  FROM account_members
  WHERE user_id = auth.uid();

  IF caller_membership.user_id IS NULL OR caller_membership.role <> 'owner' THEN
    RAISE EXCEPTION 'Only the account owner can manage access';
  END IF;

  UPDATE account_invites
  SET status = 'revoked'
  WHERE id = target_invite_id
    AND account_owner_id = caller_membership.account_owner_id
    AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION invite_account_member(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_account_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION remove_account_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION revoke_account_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION invite_account_member(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_access() TO authenticated;
GRANT EXECUTE ON FUNCTION remove_account_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_account_invite(UUID) TO authenticated;

DROP POLICY IF EXISTS "account_members_read" ON account_members;
CREATE POLICY "account_members_read" ON account_members
FOR SELECT TO authenticated
USING (has_account_access(account_owner_id));

DROP POLICY IF EXISTS "account_invites_read" ON account_invites;
CREATE POLICY "account_invites_read" ON account_invites
FOR SELECT TO authenticated
USING (has_account_access(account_owner_id));

DROP POLICY IF EXISTS "own" ON captures;
DROP POLICY IF EXISTS "own" ON leads;
DROP POLICY IF EXISTS "own" ON plans;
DROP POLICY IF EXISTS "own" ON webhook_configs;
DROP POLICY IF EXISTS "own" ON webhook_logs;
DROP POLICY IF EXISTS "anon_local" ON captures;
DROP POLICY IF EXISTS "anon_local" ON leads;
DROP POLICY IF EXISTS "anon_local" ON plans;
DROP POLICY IF EXISTS "anon_local" ON webhook_configs;
DROP POLICY IF EXISTS "anon_local" ON webhook_logs;

CREATE POLICY "account_access" ON captures
FOR ALL TO authenticated
USING (has_account_access(user_id))
WITH CHECK (has_account_access(user_id));

CREATE POLICY "account_access" ON leads
FOR ALL TO authenticated
USING (has_account_access(user_id))
WITH CHECK (has_account_access(user_id));

CREATE POLICY "account_access" ON plans
FOR ALL TO authenticated
USING (has_account_access(user_id))
WITH CHECK (has_account_access(user_id));

CREATE POLICY "account_access" ON webhook_configs
FOR ALL TO authenticated
USING (has_account_access(user_id))
WITH CHECK (has_account_access(user_id));

CREATE POLICY "account_access" ON webhook_logs
FOR ALL TO authenticated
USING (has_account_access(user_id))
WITH CHECK (has_account_access(user_id));

ALTER TABLE captures ALTER COLUMN user_id SET DEFAULT current_account_owner_id();
ALTER TABLE leads ALTER COLUMN user_id SET DEFAULT current_account_owner_id();
ALTER TABLE plans ALTER COLUMN user_id SET DEFAULT current_account_owner_id();
ALTER TABLE webhook_configs ALTER COLUMN user_id SET DEFAULT current_account_owner_id();
ALTER TABLE webhook_logs ALTER COLUMN user_id SET DEFAULT current_account_owner_id();

DROP POLICY IF EXISTS "upload" ON storage.objects;
DROP POLICY IF EXISTS "read" ON storage.objects;
DROP POLICY IF EXISTS "update" ON storage.objects;
DROP POLICY IF EXISTS "delete" ON storage.objects;
DROP POLICY IF EXISTS "anon_local_upload" ON storage.objects;
DROP POLICY IF EXISTS "anon_local_read" ON storage.objects;

CREATE POLICY "account_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'captures'
  AND has_account_storage_access((storage.foldername(name))[1])
);

CREATE POLICY "account_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'captures'
  AND has_account_storage_access((storage.foldername(name))[1])
);

CREATE POLICY "account_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'captures'
  AND has_account_storage_access((storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'captures'
  AND has_account_storage_access((storage.foldername(name))[1])
);

CREATE POLICY "account_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'captures'
  AND has_account_storage_access((storage.foldername(name))[1])
);
