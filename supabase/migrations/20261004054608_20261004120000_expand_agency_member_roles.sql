/*
# Expand agency_members role constraint

1. Modified Tables
- `agency_members` — the CHECK constraint on `role` is expanded to include
  'leasing_consultant' and 'accounts_admin' alongside the existing
  'agency_admin', 'property_manager', 'landlord', and 'tenant'.

2. Security
- No RLS policy changes. Existing policies already scope by membership.

3. Important Notes
- The old constraint is dropped and replaced. Safe to re-run.
- Existing rows with any of the old role values remain valid.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_members_role_check') THEN
    ALTER TABLE agency_members DROP CONSTRAINT agency_members_role_check;
  END IF;
  ALTER TABLE agency_members ADD CONSTRAINT agency_members_role_check
    CHECK (role IN ('agency_admin', 'property_manager', 'leasing_consultant', 'accounts_admin', 'landlord', 'tenant'));
END $$;
