-- SeedLocations
INSERT INTO locations (id, name, ward, region) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Ilala Tax Office', 'Ilala', 'Dar es Salaam'),
  ('11111111-1111-1111-1111-111111111002', 'Kinondoni Tax Office', 'Kinondoni', 'Dar es Salaam'),
  ('11111111-1111-1111-1111-111111111003', 'Temeke Tax Office', 'Temeke', 'Dar es Salaam'),
  ('11111111-1111-1111-1111-111111111004', 'Kariakoo Tax Station', 'Kariakoo', 'Dar es Salaam'),
  ('11111111-1111-1111-1111-111111111005', 'Mwanza Central', 'Nyamagana', 'Mwanza'),
  ('11111111-1111-1111-1111-111111111006', 'Arusha City Office', 'Arusha', 'Arusha');

-- Seed Business Types
INSERT INTO business_types (id, name, base_tax_rate, zone_multiplier) VALUES
  ('22222222-2222-2222-2222-222222222001', 'Retail Shop', 150000.00, 1.00),
  ('22222222-2222-2222-2222-222222222002', 'Restaurant/Cafe', 200000.00, 1.20),
  ('22222222-2222-2222-2222-222222222003', 'Hardware Store', 300000.00, 1.50),
  ('22222222-2222-2222-2222-222222222004', 'Wholesale Business', 500000.00, 2.00),
  ('22222222-2222-2222-2222-222222222005', 'Service Business', 100000.00, 0.80),
  ('22222222-2222-2222-2222-222222222006', 'Transport Business', 250000.00, 1.30),
  ('22222222-2222-2222-2222-222222222007', 'Market Vendor', 50000.00, 0.50),
  ('22222222-2222-2222-2222-222222222008', 'Professional Services', 350000.00, 1.60);