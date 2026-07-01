-- 1. Fix the update policy for relocation_requests (Solves the 403 on Dashboard)
DROP POLICY IF EXISTS "update_requests_as_approver" ON relocation_requests;

CREATE POLICY "update_requests_as_approver" ON relocation_requests
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
);

-- 2. Allow system-generated inserts for notifications
DROP POLICY IF EXISTS "allow_system_insert_notifications" ON notifications;

CREATE POLICY "allow_system_insert_notifications" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);