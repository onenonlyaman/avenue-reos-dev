ALTER TABLE master_unit
  ADD COLUMN IF NOT EXISTS typology VARCHAR(100) DEFAULT '2 BHK Luxury Apartment',
  ADD COLUMN IF NOT EXISTS balcony_sqft NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS floor_rise_charge NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS facing_direction VARCHAR(100) DEFAULT 'East (Garden)',
  ADD COLUMN IF NOT EXISTS parking_bays VARCHAR(100) DEFAULT '1 Covered Bay',
  ADD COLUMN IF NOT EXISTS rera_details TEXT DEFAULT 'Includes statutory structural warranty, fire safety compliance certification, and EV charging slot allocation.';
