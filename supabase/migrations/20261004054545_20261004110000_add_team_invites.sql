/*
# Add Team Member Invites

1. New Tables
- `team_invites` — stores pending invitations for new team members:
  - `id` (uuid, primary key)
  - `agency_id` (uuid, FK to agencies) — the agency the invite is for.
  - `email` (text, not null) — the invitee's email address.
  - `role` (text, not null, default 'property_manager') — the role to assign on signup.
  - `invited_by` (uuid, FK to auth.users) — the admin who sent the invite.
  - `status` (text, not null, default 'pending') — 'pending' or 'accepted'.
  - `accepted_by` (uuid, FK to auth.users, nullable) — the user who accepted.
  - `accepted_at` (timestamptz, nullable) — when the invite was accepted.
  - `created_at` (timestamptz, default now()).

2. Security
- RLS enabled on `team_invites`.
- Agency admins can view, create, and delete invites for their agency.
- Any authenticated user can view a pending invite matching their own email (so the signup flow can detect a pending invite).
- Inserts are restricted to agency admins (checked via agency_members).
- A unique index on (agency_id, email) where status = 'pending' prevents duplicate pending invites.

3. Modified Policies
- `agency_members` SELECT policy widened: any agency member can now read all members of their own agency (not just their own row), so the Team Members list works for all staff.
- The existing `members_read_own_membership` policy is replaced.

4. Important Notes
- The invite is auto-accepted when a user signs up with the matching email: the AuthPage checks for pending invites after signup and inserts an agency_members row.
- Sensitive data is not stored in the invite table.
- Idempotent: safe to re-run.
*/

CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'property_manager',
  invited_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all invites for their agency
DROP POLICY IF EXISTS "admins_view_team_invites" ON team_invites;
CREATE POLICY "admins_view_team_invites" ON team_invites FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agency_members m
    WHERE m.agency_id = team_invites.agency_id
    AND m.user_id = auth.uid()
    AND m.role = 'agency_admin'
  )
);

-- Any authenticated user can see pending invites matching their own email (for signup flow)
DROP POLICY IF EXISTS "users_view_own_pending_invite" ON team_invites;
CREATE POLICY "users_view_own_pending_invite" ON team_invites FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND lower(email) = lower((auth.jwt() ->> 'email'))
);

-- Admins can create invites for their agency
DROP POLICY IF EXISTS "admins_create_team_invites" ON team_invites;
CREATE POLICY "admins_create_team_invites" ON team_invites FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM agency_members m
    WHERE m.agency_id = team_invites.agency_id
    AND m.user_id = auth.uid()
    AND m.role = 'agency_admin'
  )
);

-- Admins can delete invites for their agency
DROP POLICY IF EXISTS "admins_delete_team_invites" ON team_invites;
CREATE POLICY "admins_delete_team_invites" ON team_invites FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agency_members m
    WHERE m.agency_id = team_invites.agency_id
    AND m.user_id = auth.uid()
    AND m.role = 'agency_admin'
  )
);

-- Admins can update invites (e.g. mark as accepted) for their agency
DROP POLICY IF EXISTS "admins_update_team_invites" ON team_invites;
CREATE POLICY "admins_update_team_invites" ON team_invites FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agency_members m
    WHERE m.agency_id = team_invites.agency_id
    AND m.user_id = auth.uid()
    AND m.role = 'agency_admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM agency_members m
    WHERE m.agency_id = team_invites.agency_id
    AND m.user_id = auth.uid()
    AND m.role = 'agency_admin'
  )
);

-- Prevent duplicate pending invites for the same email in the same agency
CREATE UNIQUE INDEX IF NOT EXISTS team_invites_agency_email_pending_uniq
ON team_invites (agency_id, lower(email))
WHERE status = 'pending';

-- Update agency_members SELECT policy: all members can see their agency's team
DROP POLICY IF EXISTS "members_read_own_membership" ON agency_members;
DROP POLICY IF EXISTS "members_read_agency_members" ON agency_members;
CREATE POLICY "members_read_agency_members" ON agency_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agency_members m
    WHERE m.agency_id = agency_members.agency_id
    AND m.user_id = auth.uid()
  )
);
