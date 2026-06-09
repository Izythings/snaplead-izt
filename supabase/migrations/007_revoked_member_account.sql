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

  IF FOUND THEN
    INSERT INTO account_members (user_id, account_owner_id, role)
    VALUES (target_user_id, target_user_id, 'owner')
    ON CONFLICT (user_id) DO UPDATE
      SET account_owner_id = EXCLUDED.account_owner_id,
          role = EXCLUDED.role,
          invited_by = NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION remove_account_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_account_member(UUID) TO authenticated;
