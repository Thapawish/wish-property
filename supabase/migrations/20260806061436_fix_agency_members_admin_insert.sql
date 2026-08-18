/*
# Fix agency_members INSERT policy to allow admins to add team members

## Overview
The agency_members INSERT policy only allowed self-insert (auth.uid() = user_id).
But agency admins need to add other users (property managers, landlords, tenants)
to their agency. This migration adds a second INSERT policy allowing agency
admins to insert any user into their agency.

## Tables modified
- agency_members (INSERT policy added)
*/

-- Allow agency admins to add any user to their agency
DROP POLICY IF EXISTS "admins_insert_members" ON agency_members;
CREATE POLICY "admins_insert_members"
  ON agency_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_members m2
      WHERE m2.agency_id = agency_members.agency_id
      AND m2.user_id = auth.uid()
      AND m2.role = 'agency_admin'
    )
  );