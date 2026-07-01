-- Add assigned collector to relocation requests
ALTER TABLE relocation_requests 
ADD COLUMN assigned_collector_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster lookup
CREATE INDEX idx_relocation_requests_assigned_collector ON relocation_requests(assigned_collector_id);

-- Update the policy for collectors to see requests assigned to them or to their location
DROP POLICY IF EXISTS "select_requests_as_approver" ON relocation_requests;

CREATE POLICY "select_requests_as_approver" ON relocation_requests FOR SELECT
  TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
    OR new_location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    OR assigned_collector_id = auth.uid()
  );