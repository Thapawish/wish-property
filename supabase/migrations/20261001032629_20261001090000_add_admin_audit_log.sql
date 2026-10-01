/*
# Add protected admin audit logging

1. New Tables
- `admin_audit_log` records important agency administration changes.
- `id` uniquely identifies the event.
- `agency_id` identifies the agency affected.
- `actor_user_id` identifies the signed-in administrator who made the change.
- `action` stores a short event name.
- `entity_type` and `entity_id` identify the affected record when available.
- `details` stores non-sensitive before/after context.
- `created_at` stores the event time.

2. Security
- Row level security is enabled.
- Agency members can view audit events for their own agency.
- Inserts are restricted to agency admins and require the actor to be the current session user.
- Updates and deletes are not permitted through the client API, preserving the audit trail.

3. Important Notes
- The application records successful profile, agency, payment, and preference changes.
- Sensitive payment account values are never written into audit details.
*/

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view agency audit log" ON admin_audit_log;
CREATE POLICY "Members can view agency audit log" ON admin_audit_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = admin_audit_log.agency_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can insert agency audit log" ON admin_audit_log;
CREATE POLICY "Admins can insert agency audit log" ON admin_audit_log FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid() AND EXISTS (SELECT 1 FROM agency_members m WHERE m.agency_id = admin_audit_log.agency_id AND m.user_id = auth.uid() AND m.role = 'agency_admin'));
DROP POLICY IF EXISTS "Audit log updates denied" ON admin_audit_log;
CREATE POLICY "Audit log updates denied" ON admin_audit_log FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Audit log deletes denied" ON admin_audit_log;
CREATE POLICY "Audit log deletes denied" ON admin_audit_log FOR DELETE TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS admin_audit_log_agency_created_idx ON admin_audit_log(agency_id, created_at DESC);
