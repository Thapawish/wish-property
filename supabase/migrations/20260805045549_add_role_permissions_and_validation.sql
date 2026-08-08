/*
# Phase 4: Role-Based Permissions & Server-Side Validation

## Overview
This migration tightens security in two ways:

1. **Role-based delete permissions** — Previously, any agency member (including
   property_manager, landlord, tenant roles) could delete any data in their
   agency. Now DELETE on contacts, properties, leases, payments, and
   rent_reviews is restricted to users with the `agency_admin` role only.
   Property managers can still create and update records — they just can't
   destroy them. This matches the Spatie laravel-permission pattern where
   only admins get the `delete` permission.

2. **Server-side data validation (CHECK constraints)** — The equivalent of
   Laravel Form Request validation rules, but enforced at the database level
   so no client (web, mobile, or direct API) can write invalid data:
   - `agency_members.role` must be one of: agency_admin, property_manager, landlord, tenant
   - `contacts.type` must be landlord or tenant
   - `properties.status` must be leased, vacant, or pending
   - `properties.property_type` must be a known type
   - `properties.bedrooms/bathrooms/parking` must be >= 0
   - `leases.status` must be active, expired, or pending
   - `leases.rent_amount/bond_amount` must be >= 0
   - `leases.end_date` must be on or after `start_date`
   - `payments.status` must be pending, paid, or overdue
   - `payments.amount` must be > 0
   - `rent_reviews.status` must be pending, approved, rejected, or applied
   - `rent_reviews.proposed_rent/current_rent` must be >= 0

## Tables modified
- agency_members (DELETE policy unchanged, CHECK added)
- contacts (DELETE policy restricted to admin, CHECK added)
- properties (DELETE policy restricted to admin, CHECK added)
- leases (DELETE policy restricted to admin, CHECK added)
- payments (DELETE policy restricted to admin, CHECK added)
- rent_reviews (DELETE policy restricted to admin, CHECK added)

## Security changes
- DELETE policies on contacts, properties, leases, payments, rent_reviews
  now require the caller's agency_members.role = 'agency_admin'.
*/

-- ============================================================
-- 1. Restrict DELETE to agency_admin on all data tables
-- ============================================================

-- contacts
DROP POLICY IF EXISTS "contacts_delete_agency" ON contacts;
CREATE POLICY "contacts_delete_agency"
  ON contacts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = contacts.agency_id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  );

-- properties
DROP POLICY IF EXISTS "properties_delete_agency" ON properties;
CREATE POLICY "properties_delete_agency"
  ON properties FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = properties.agency_id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  );

-- leases
DROP POLICY IF EXISTS "leases_delete_agency" ON leases;
CREATE POLICY "leases_delete_agency"
  ON leases FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = leases.agency_id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  );

-- payments
DROP POLICY IF EXISTS "payments_delete_agency" ON payments;
CREATE POLICY "payments_delete_agency"
  ON payments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = payments.agency_id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  );

-- rent_reviews
DROP POLICY IF EXISTS "rent_reviews_delete_agency" ON rent_reviews;
CREATE POLICY "rent_reviews_delete_agency"
  ON rent_reviews FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = rent_reviews.agency_id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  );

-- ============================================================
-- 2. Server-side validation: CHECK constraints
-- ============================================================

-- agency_members: valid roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_member_role') THEN
    ALTER TABLE agency_members ADD CONSTRAINT chk_member_role
      CHECK (role IN ('agency_admin', 'property_manager', 'landlord', 'tenant'));
  END IF;
END $$;

-- contacts: valid type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contact_type') THEN
    ALTER TABLE contacts ADD CONSTRAINT chk_contact_type
      CHECK (type IN ('landlord', 'tenant'));
  END IF;
END $$;

-- properties: valid status, type, non-negative counts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_property_status') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_property_status
      CHECK (status IN ('leased', 'vacant', 'pending'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_property_type') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_property_type
      CHECK (property_type IN ('house', 'apartment', 'townhouse', 'unit', 'land'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_property_beds') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_property_beds CHECK (bedrooms >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_property_baths') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_property_baths CHECK (bathrooms >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_property_parking') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_property_parking CHECK (parking >= 0);
  END IF;
END $$;

-- leases: valid status, non-negative amounts, end >= start
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lease_status') THEN
    ALTER TABLE leases ADD CONSTRAINT chk_lease_status
      CHECK (status IN ('active', 'expired', 'pending'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lease_rent') THEN
    ALTER TABLE leases ADD CONSTRAINT chk_lease_rent CHECK (rent_amount >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lease_bond') THEN
    ALTER TABLE leases ADD CONSTRAINT chk_lease_bond CHECK (bond_amount >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lease_dates') THEN
    ALTER TABLE leases ADD CONSTRAINT chk_lease_dates CHECK (end_date >= start_date);
  END IF;
END $$;

-- payments: valid status, positive amount
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_status') THEN
    ALTER TABLE payments ADD CONSTRAINT chk_payment_status
      CHECK (status IN ('pending', 'paid', 'overdue'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_amount') THEN
    ALTER TABLE payments ADD CONSTRAINT chk_payment_amount CHECK (amount > 0);
  END IF;
END $$;

-- rent_reviews: valid status, non-negative rents
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_review_status') THEN
    ALTER TABLE rent_reviews ADD CONSTRAINT chk_review_status
      CHECK (status IN ('pending', 'approved', 'rejected', 'applied'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_review_current') THEN
    ALTER TABLE rent_reviews ADD CONSTRAINT chk_review_current CHECK (current_rent >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_review_proposed') THEN
    ALTER TABLE rent_reviews ADD CONSTRAINT chk_review_proposed CHECK (proposed_rent >= 0);
  END IF;
END $$;