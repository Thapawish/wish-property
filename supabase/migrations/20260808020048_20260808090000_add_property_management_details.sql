/*
# Add detailed property management fields

1. New columns on `properties`
- `management_gained_reason` records why the agency gained management.
- `gained_reason_source` records the source of that instruction.
- `property_category` and `property_aspect` capture the property's classification and orientation.
- Feature flags record air conditioning, garden, built-ins, internal laundry, balcony, gas cooking, electric cooking, dishwasher, stairs, and lift.
- `ownership_type` records personal or company/trust/multi-ownership.
- `split_payments` records whether ownership payments are split.
- `owner_first_name`, `owner_last_name`, `owner_email`, and `owner_mobile` store the primary owner details supplied during property setup.
- `management_fee_percent`, `letting_fee`, `lease_renewal_fee`, `advertising_fee`, `approved_maintenance_spend`, and `admin_fee` store management settings.
- `admin_fee_charge_date` stores when the admin fee is charged.
- `do_not_charge_admin_fee_if_vacant` stores the vacant-property admin fee option.

2. Data safety
- All new fields are nullable or have safe defaults so existing properties remain valid.
- No existing columns or data are removed or changed.

3. Security
- The existing row-level security policies on `properties` continue to protect these fields using the same agency access rules.
*/

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS management_gained_reason text,
  ADD COLUMN IF NOT EXISTS gained_reason_source text,
  ADD COLUMN IF NOT EXISTS property_category text,
  ADD COLUMN IF NOT EXISTS property_aspect text,
  ADD COLUMN IF NOT EXISTS has_aircon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_garden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_built_ins boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_internal_laundry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_balcony boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_gas_cooking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_electric_cooking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_dishwasher boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_stairs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_lift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS split_payments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_first_name text,
  ADD COLUMN IF NOT EXISTS owner_last_name text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS owner_mobile text,
  ADD COLUMN IF NOT EXISTS management_fee_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS letting_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS lease_renewal_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS advertising_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS approved_maintenance_spend numeric(12,2),
  ADD COLUMN IF NOT EXISTS admin_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS admin_fee_charge_date text,
  ADD COLUMN IF NOT EXISTS do_not_charge_admin_fee_if_vacant boolean NOT NULL DEFAULT false;