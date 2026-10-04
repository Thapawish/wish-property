/*
# Add Service Provider support to contacts

1. Modified Tables
- `contacts` — add columns to support service providers (tradespeople):
  - `type` CHECK constraint expanded to include 'service_provider'.
  - `specialty` (text, nullable) — trade specialty such as Electrician, Plumber, etc.
  - `business_name` (text, nullable) — optional business / company name for service providers.
  - `bank_account_name` (text, nullable) — bank account holder name.
  - `bank_bsb` (text, nullable) — BSB / routing number.
  - `bank_account_number` (text, nullable) — bank account number.
  - `bank_name` (text, nullable) — name of the bank / financial institution.

2. Security
- No RLS policy changes. The contacts table already has agency-scoped CRUD policies.
- Bank account details are visible to agency members only (existing SELECT policy).
- The CHECK constraint on `type` is replaced to allow the new value.

3. Important Notes
- All new columns are nullable so existing landlord and tenant rows are unaffected.
- The migration is idempotent — safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'specialty') THEN
    ALTER TABLE contacts ADD COLUMN specialty text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'business_name') THEN
    ALTER TABLE contacts ADD COLUMN business_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'bank_account_name') THEN
    ALTER TABLE contacts ADD COLUMN bank_account_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'bank_bsb') THEN
    ALTER TABLE contacts ADD COLUMN bank_bsb text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'bank_account_number') THEN
    ALTER TABLE contacts ADD COLUMN bank_account_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'bank_name') THEN
    ALTER TABLE contacts ADD COLUMN bank_name text;
  END IF;
END $$;

-- Replace the CHECK constraint on type to include service_provider
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_type_check') THEN
    ALTER TABLE contacts DROP CONSTRAINT contacts_type_check;
  END IF;
  ALTER TABLE contacts ADD CONSTRAINT contacts_type_check CHECK (type IN ('landlord', 'tenant', 'service_provider'));
END $$;
