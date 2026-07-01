-- Allow anonymous users to read locations (needed for signup)
CREATE POLICY "select_locations_public" ON locations FOR SELECT
  TO anon USING (true);