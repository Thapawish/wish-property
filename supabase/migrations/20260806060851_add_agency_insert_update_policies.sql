/*
# Add INSERT and UPDATE policies to agencies table

## Overview
The agencies table had only a SELECT policy. New agency creation during sign-up
was failing because there was no INSERT policy allowing authenticated users to
create a new agency. This migration adds:

1. INSERT policy — any authenticated user can create a new agency (they then
   add themselves as an agency_admin member in the same transaction flow).
2. UPDATE policy — agency admins can update their own agency's details.

## Tables modified
- agencies (INSERT, UPDATE policies added)
*/

-- INSERT: any authenticated user can create a new agency
DROP POLICY IF EXISTS "members_can_insert_agency" ON agencies;
CREATE POLICY "members_can_insert_agency"
  ON agencies FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: only agency admins can update their agency
DROP POLICY IF EXISTS "members_can_update_agency" ON agencies;
CREATE POLICY "members_can_update_agency"
  ON agencies FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = agencies.id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = agencies.id
      AND agency_members.user_id = auth.uid()
      AND agency_members.role = 'agency_admin'
    )
  );