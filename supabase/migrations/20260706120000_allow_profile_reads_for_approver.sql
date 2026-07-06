-- Allow approvers and collectors to read profile details needed for request review
DROP POLICY IF EXISTS "select_own_profile" ON profiles;

CREATE POLICY "select_own_profile" ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM profiles AS current_profile
    WHERE current_profile.id = auth.uid()
      AND current_profile.role IN ('approver', 'collector')
  )
);
