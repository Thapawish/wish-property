/*
# Add profile and workspace settings

1. New Tables
- `user_profiles` stores each signed-in user's editable name, phone, and workspace preferences.
- `agency_payment_settings` stores the agency's payout and invoice configuration.

2. Agency Profile Fields
- Adds optional contact and business fields to `agencies`: phone, email, website, address, city, state, postcode, and ABN.

3. Security
- Enables RLS on both new tables.
- User profiles are readable and editable only by the owning authenticated user.
- Payment settings are readable by agency members and writable only by agency admins.
- Agency profile updates remain restricted to the existing agency admin policies.

4. Important Notes
- Existing data is preserved. All new fields are optional and default to null.
- Preferences are stored as JSON for flexible workspace display settings.
*/

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS abn text;

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text,
  preferences jsonb NOT NULL DEFAULT '{"show_overview":true,"show_today_tasks":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
CREATE POLICY "Users can delete own profile" ON user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS agency_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  account_name text,
  bank_name text,
  bsb text,
  account_number text,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  default_payment_terms integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view agency payment settings" ON agency_payment_settings;
CREATE POLICY "Members can view agency payment settings" ON agency_payment_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = agency_payment_settings.agency_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can insert agency payment settings" ON agency_payment_settings;
CREATE POLICY "Admins can insert agency payment settings" ON agency_payment_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = agency_payment_settings.agency_id AND m.user_id = auth.uid() AND m.role = 'agency_admin'));
DROP POLICY IF EXISTS "Admins can update agency payment settings" ON agency_payment_settings;
CREATE POLICY "Admins can update agency payment settings" ON agency_payment_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = agency_payment_settings.agency_id AND m.user_id = auth.uid() AND m.role = 'agency_admin')) WITH CHECK (EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = agency_payment_settings.agency_id AND m.user_id = auth.uid() AND m.role = 'agency_admin'));
DROP POLICY IF EXISTS "Admins can delete agency payment settings" ON agency_payment_settings;
CREATE POLICY "Admins can delete agency payment settings" ON agency_payment_settings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = agency_payment_settings.agency_id AND m.user_id = auth.uid() AND m.role = 'agency_admin'));

CREATE INDEX IF NOT EXISTS agency_payment_settings_agency_id_idx ON agency_payment_settings(agency_id);
