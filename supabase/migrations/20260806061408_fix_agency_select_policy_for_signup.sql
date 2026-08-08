/*
# Fix agencies SELECT policy to allow signup flow

## Overview
The agencies SELECT policy required membership in agency_members before a
user could read an agency row. This created a chicken-and-egg problem during
sign-up: the user inserts a new agency, then needs to read it back to get
the ID for the membership insert — but the SELECT policy blocks the read
because no membership exists yet.

Agency data (name, slug, plan) is not sensitive. The sensitive data lives
in child tables (properties, leases, payments, contacts, rent_reviews) which
are all scoped by agency_id with their own RLS policies. This migration
relaxes the agencies SELECT policy to allow any authenticated user to read
any agency, while keeping INSERT/UPDATE restricted.

## Tables modified
- agencies (SELECT policy relaxed)
*/

DROP POLICY IF EXISTS "members_can_read_own_agency" ON agencies;
CREATE POLICY "members_can_read_own_agency"
  ON agencies FOR SELECT TO authenticated
  USING (true);