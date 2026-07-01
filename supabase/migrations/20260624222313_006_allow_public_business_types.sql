-- Allow anonymous users to read business types (needed for taxpayer signup)
CREATE POLICY "select_business_types_public" ON business_types FOR SELECT
  TO anon USING (true);