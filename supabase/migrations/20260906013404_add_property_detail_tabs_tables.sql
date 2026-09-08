/*
# Add property detail tabs tables

1. New Tables
- `property_tasks` — Lease-related tasks for a property (Lease Tasks tab)
  - id (uuid PK), agency_id, property_id, title, description, due_date, status, priority, assigned_to, created_at
- `property_inspections` — Inspection records (Inspections tab)
  - id (uuid PK), agency_id, property_id, inspection_date, type, status, inspector, notes, created_at
- `property_forms` — Forms/documents associated with a property (Forms tab)
  - id (uuid PK), agency_id, property_id, form_type, title, status, sent_date, signed_date, created_at

2. Security
- RLS enabled on all three tables.
- Policies scoped to authenticated users via agency membership (matching existing pattern).
*/

CREATE TABLE IF NOT EXISTS property_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  assigned_to text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_property_tasks" ON property_tasks;
CREATE POLICY "select_property_tasks" ON property_tasks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_tasks.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_property_tasks" ON property_tasks;
CREATE POLICY "insert_property_tasks" ON property_tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_tasks.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_property_tasks" ON property_tasks;
CREATE POLICY "update_property_tasks" ON property_tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_tasks.agency_id AND agency_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_tasks.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_property_tasks" ON property_tasks;
CREATE POLICY "delete_property_tasks" ON property_tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_tasks.agency_id AND agency_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_property_tasks_property ON property_tasks(property_id);

-- ---- Inspections ----

CREATE TABLE IF NOT EXISTS property_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  inspection_date date NOT NULL,
  type text NOT NULL DEFAULT 'routine' CHECK (type IN ('routine','entry','exit','special')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  inspector text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_property_inspections" ON property_inspections;
CREATE POLICY "select_property_inspections" ON property_inspections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_inspections.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_property_inspections" ON property_inspections;
CREATE POLICY "insert_property_inspections" ON property_inspections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_inspections.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_property_inspections" ON property_inspections;
CREATE POLICY "update_property_inspections" ON property_inspections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_inspections.agency_id AND agency_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_inspections.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_property_inspections" ON property_inspections;
CREATE POLICY "delete_property_inspections" ON property_inspections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_inspections.agency_id AND agency_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_property_inspections_property ON property_inspections(property_id);

-- ---- Forms ----

CREATE TABLE IF NOT EXISTS property_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  form_type text NOT NULL DEFAULT 'general' CHECK (form_type IN ('lease_agreement','renewal_notice','entry_notice','exit_report','bond_form','general')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','filed','expired')),
  sent_date date,
  signed_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_property_forms" ON property_forms;
CREATE POLICY "select_property_forms" ON property_forms FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_forms.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_property_forms" ON property_forms;
CREATE POLICY "insert_property_forms" ON property_forms FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_forms.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_property_forms" ON property_forms;
CREATE POLICY "update_property_forms" ON property_forms FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_forms.agency_id AND agency_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_forms.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_property_forms" ON property_forms;
CREATE POLICY "delete_property_forms" ON property_forms FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = property_forms.agency_id AND agency_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_property_forms_property ON property_forms(property_id);
