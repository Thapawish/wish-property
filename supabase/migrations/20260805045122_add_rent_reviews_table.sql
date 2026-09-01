/*
# Add rent_reviews table

## Overview
A rent review is a scheduled review of the rent on a lease — common in Australian
property management where leases include periodic rent review clauses. This table
tracks each review event: when it's due, the proposed new rent, the outcome, and notes.

## New Table
- `rent_reviews`
  - `id` (uuid, primary key)
  - `agency_id` (uuid, FK → agencies, cascade delete) — tenant isolation key
  - `lease_id` (uuid, FK → leases, cascade delete) — the lease being reviewed
  - `review_date` (date, not null) — when the review takes effect or is assessed
  - `current_rent` (numeric) — rent at time of review
  - `proposed_rent` (numeric) — new rent proposed
  - `approved_rent` (numeric, nullable) — final agreed rent (null until decided)
  - `status` (text) — pending | approved | rejected | applied
  - `notes` (text, nullable) — agency notes
  - `created_at` (timestamptz)

## Relationships
- A lease has many rent reviews (lease_id FK).
- A rent review belongs to one lease.
- Scoped to agency via agency_id, same as all other tables.

## Security
- RLS enabled.
- CRUD scoped to agency members (same pattern as leases/payments).
*/

CREATE TABLE IF NOT EXISTS rent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  current_rent numeric(12,2) NOT NULL DEFAULT 0,
  proposed_rent numeric(12,2) NOT NULL DEFAULT 0,
  approved_rent numeric(12,2),
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rent_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rent_reviews_select_agency" ON rent_reviews;
CREATE POLICY "rent_reviews_select_agency"
  ON rent_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = rent_reviews.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rent_reviews_insert_agency" ON rent_reviews;
CREATE POLICY "rent_reviews_insert_agency"
  ON rent_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = rent_reviews.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rent_reviews_update_agency" ON rent_reviews;
CREATE POLICY "rent_reviews_update_agency"
  ON rent_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = rent_reviews.agency_id AND agency_members.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = rent_reviews.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rent_reviews_delete_agency" ON rent_reviews;
CREATE POLICY "rent_reviews_delete_agency"
  ON rent_reviews FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = rent_reviews.agency_id AND agency_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_rent_reviews_agency ON rent_reviews(agency_id);
CREATE INDEX IF NOT EXISTS idx_rent_reviews_lease ON rent_reviews(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_reviews_status ON rent_reviews(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_rent_reviews_date ON rent_reviews(agency_id, review_date);