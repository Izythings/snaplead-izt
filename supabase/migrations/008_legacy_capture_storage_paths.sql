DO $$
DECLARE
  local_user_id CONSTANT UUID := '00000000-0000-4000-8000-000000000001';
  account_owner_id UUID;
BEGIN
  SELECT user_id
  INTO account_owner_id
  FROM account_members
  WHERE role = 'owner'
  ORDER BY created_at
  LIMIT 1;

  IF account_owner_id IS NULL THEN
    RAISE EXCEPTION 'Cannot restore legacy capture paths without an account owner';
  END IF;

  UPDATE storage.objects
  SET name = local_user_id::text || substring(name FROM position('/' IN name))
  WHERE bucket_id = 'captures'
    AND (storage.foldername(name))[1] = account_owner_id::text;

  UPDATE captures
  SET photo_path = local_user_id::text || substring(photo_path FROM position('/' IN photo_path))
  WHERE user_id = account_owner_id
    AND photo_path LIKE account_owner_id::text || '/%';
END;
$$;

CREATE OR REPLACE FUNCTION has_capture_storage_access(target_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM captures
    WHERE photo_path = target_object_name
      AND has_account_access(user_id)
  );
$$;

REVOKE ALL ON FUNCTION has_capture_storage_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_capture_storage_access(TEXT) TO authenticated;

DROP POLICY IF EXISTS "account_read" ON storage.objects;
DROP POLICY IF EXISTS "account_update" ON storage.objects;
DROP POLICY IF EXISTS "account_delete" ON storage.objects;

CREATE POLICY "account_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'captures'
  AND (
    has_account_storage_access((storage.foldername(name))[1])
    OR has_capture_storage_access(name)
  )
);

CREATE POLICY "account_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'captures'
  AND (
    has_account_storage_access((storage.foldername(name))[1])
    OR has_capture_storage_access(name)
  )
)
WITH CHECK (
  bucket_id = 'captures'
  AND (
    has_account_storage_access((storage.foldername(name))[1])
    OR has_capture_storage_access(name)
  )
);

CREATE POLICY "account_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'captures'
  AND (
    has_account_storage_access((storage.foldername(name))[1])
    OR has_capture_storage_access(name)
  )
);
