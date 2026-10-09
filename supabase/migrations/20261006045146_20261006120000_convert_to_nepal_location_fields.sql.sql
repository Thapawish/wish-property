/*
# Convert location fields to Nepal format (city, district, tole)

## Summary
This migration adds Nepal-specific location columns to the `properties` and `agencies` tables.
Existing data is preserved by copying from old columns where applicable.

## Changes

### properties table
- Added `city` (text, nullable) — replaces suburb (e.g. "Kathmandu")
- Added `district` (text, nullable) — replaces state (e.g. "Kathmandu district")
- Added `tole` (text, nullable) — replaces postcode (local neighborhood area)

### agencies table
- Added `district` (text, nullable) — replaces state
- Added `tole` (text, nullable) — replaces postcode
- (city already exists on agencies)

### Data migration
- Copies existing suburb→city, state→district, postcode→tole on both tables.

### Security
- No RLS changes. Existing policies remain.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'city') THEN
    ALTER TABLE properties ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'district') THEN
    ALTER TABLE properties ADD COLUMN district text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'tole') THEN
    ALTER TABLE properties ADD COLUMN tole text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agencies' AND column_name = 'district') THEN
    ALTER TABLE agencies ADD COLUMN district text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agencies' AND column_name = 'tole') THEN
    ALTER TABLE agencies ADD COLUMN tole text;
  END IF;
END $$;

-- Migrate existing data from old columns to new ones
UPDATE properties SET city = suburb WHERE city IS NULL AND suburb IS NOT NULL;
UPDATE properties SET district = state WHERE district IS NULL AND state IS NOT NULL;
UPDATE properties SET tole = postcode WHERE tole IS NULL AND postcode IS NOT NULL;

UPDATE agencies SET district = state WHERE district IS NULL AND state IS NOT NULL;
UPDATE agencies SET tole = postcode WHERE tole IS NULL AND postcode IS NOT NULL;
