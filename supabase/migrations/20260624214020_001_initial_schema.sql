-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Locations table (tax collection stations/wards)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ward TEXT NOT NULL,
  region TEXT NOT NULL,
  collector_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business types with tax info
CREATE TABLE business_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  base_tax_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  zone_multiplier DECIMAL(3,2) DEFAULT 1.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles with roles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('taxpayer', 'approver', 'collector')) DEFAULT 'taxpayer',
  location_id UUID REFERENCES locations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add collector_user_id foreign key after profiles exists
ALTER TABLE locations ADD CONSTRAINT fk_collector FOREIGN KEY (collector_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Taxpayer debts/financial records
CREATE TABLE taxpayer_finances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),
  outstanding_debt DECIMAL(12,2) DEFAULT 0.00,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relocation requests (main workflow entity)
CREATE TABLE relocation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id TEXT UNIQUE NOT NULL DEFAULT 'RELOC-' || substr(md5(random()::text), 1, 8),
  taxpayer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_location_id UUID NOT NULL REFERENCES locations(id),
  new_location_id UUID NOT NULL REFERENCES locations(id),
  business_type_id UUID NOT NULL REFERENCES business_types(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'AWAITING_VERIFICATION', 'COMPLETED')),
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relocation_request_id UUID REFERENCES relocation_requests(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxpayer_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE relocation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Locations policies (all authenticated users can read)
CREATE POLICY "select_locations" ON locations FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_locations" ON locations FOR INSERT
  TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('approver', 'collector'));
CREATE POLICY "update_locations" ON locations FOR UPDATE
  TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('approver', 'collector'));

-- Business types policies (all authenticated users can read)
CREATE POLICY "select_business_types" ON business_types FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_business_types" ON business_types FOR INSERT
  TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'approver');

-- Taxpayer finances policies
CREATE POLICY "select_own_finances" ON taxpayer_finances FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "select_finances_as_collector" ON taxpayer_finances FOR SELECT
  TO authenticated USING (
    location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
  );
CREATE POLICY "insert_own_finances" ON taxpayer_finances FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update_finances_as_collector" ON taxpayer_finances FOR UPDATE
  TO authenticated USING (
    location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
  );

-- Relocation requests policies
CREATE POLICY "select_own_requests" ON relocation_requests FOR SELECT
  TO authenticated USING (taxpayer_id = auth.uid());
CREATE POLICY "select_requests_as_approver" ON relocation_requests FOR SELECT
  TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
    OR new_location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "insert_own_requests" ON relocation_requests FOR INSERT
  TO authenticated WITH CHECK (taxpayer_id = auth.uid());
CREATE POLICY "update_requests_as_approver" ON relocation_requests FOR UPDATE
  TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'approver');
CREATE POLICY "update_requests_as_collector" ON relocation_requests FOR UPDATE
  TO authenticated USING (
    new_location_id = (SELECT location_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'approver'
  );

-- Notifications policies
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_relocation_requests_taxpayer ON relocation_requests(taxpayer_id);
CREATE INDEX idx_relocation_requests_status ON relocation_requests(status);
CREATE INDEX idx_relocation_requests_new_location ON relocation_requests(new_location_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);