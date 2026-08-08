/*
# Property Management SaaS — RLS Policies

Enables Row Level Security on every table and adds ownership/membership-scoped policies.

## Security Model
- Every table is scoped by `agency_id`.
- A user can access a row only if they are a member of that row's agency
  (checked via `EXISTS (SELECT 1 FROM agency_members WHERE agency_id = <table>.agency_id AND user_id = auth.uid())`).
- `agency_members` itself: a user can read their own membership row;
  insert a membership for themselves (sign-up flow); agency admins can update/delete members.
- `agencies`: a user can read an agency they are a member of.

## Tables affected
- agencies (SELECT)
- agency_members (SELECT, INSERT, UPDATE, DELETE)
- contacts (SELECT, INSERT, UPDATE, DELETE)
- properties (SELECT, INSERT, UPDATE, DELETE)
- leases (SELECT, INSERT, UPDATE, DELETE)
- payments (SELECT, INSERT, UPDATE, DELETE)
*/

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- agencies: SELECT for members
-- ============================================================
DROP POLICY IF EXISTS "members_can_read_own_agency" ON agencies;
CREATE POLICY "members_can_read_own_agency"
  ON agencies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE agency_members.agency_id = agencies.id
      AND agency_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- agency_members
-- ============================================================
DROP POLICY IF EXISTS "members_read_own_membership" ON agency_members;
CREATE POLICY "members_read_own_membership"
  ON agency_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_insert_self" ON agency_members;
CREATE POLICY "members_insert_self"
  ON agency_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_update_members" ON agency_members;
CREATE POLICY "admins_update_members"
  ON agency_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members m2
      WHERE m2.agency_id = agency_members.agency_id
      AND m2.user_id = auth.uid()
      AND m2.role = 'agency_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_members m2
      WHERE m2.agency_id = agency_members.agency_id
      AND m2.user_id = auth.uid()
      AND m2.role = 'agency_admin'
    )
  );

DROP POLICY IF EXISTS "admins_delete_members" ON agency_members;
CREATE POLICY "admins_delete_members"
  ON agency_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members m2
      WHERE m2.agency_id = agency_members.agency_id
      AND m2.user_id = auth.uid()
      AND m2.role = 'agency_admin'
    )
  );

-- ============================================================
-- contacts
-- ============================================================
DROP POLICY IF EXISTS "contacts_select_agency" ON contacts;
CREATE POLICY "contacts_select_agency"
  ON contacts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = contacts.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "contacts_insert_agency" ON contacts;
CREATE POLICY "contacts_insert_agency"
  ON contacts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = contacts.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "contacts_update_agency" ON contacts;
CREATE POLICY "contacts_update_agency"
  ON contacts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = contacts.agency_id AND agency_members.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = contacts.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "contacts_delete_agency" ON contacts;
CREATE POLICY "contacts_delete_agency"
  ON contacts FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = contacts.agency_id AND agency_members.user_id = auth.uid())
  );

-- ============================================================
-- properties
-- ============================================================
DROP POLICY IF EXISTS "properties_select_agency" ON properties;
CREATE POLICY "properties_select_agency"
  ON properties FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = properties.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "properties_insert_agency" ON properties;
CREATE POLICY "properties_insert_agency"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = properties.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "properties_update_agency" ON properties;
CREATE POLICY "properties_update_agency"
  ON properties FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = properties.agency_id AND agency_members.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = properties.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "properties_delete_agency" ON properties;
CREATE POLICY "properties_delete_agency"
  ON properties FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = properties.agency_id AND agency_members.user_id = auth.uid())
  );

-- ============================================================
-- leases
-- ============================================================
DROP POLICY IF EXISTS "leases_select_agency" ON leases;
CREATE POLICY "leases_select_agency"
  ON leases FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = leases.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "leases_insert_agency" ON leases;
CREATE POLICY "leases_insert_agency"
  ON leases FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = leases.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "leases_update_agency" ON leases;
CREATE POLICY "leases_update_agency"
  ON leases FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = leases.agency_id AND agency_members.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = leases.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "leases_delete_agency" ON leases;
CREATE POLICY "leases_delete_agency"
  ON leases FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = leases.agency_id AND agency_members.user_id = auth.uid())
  );

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "payments_select_agency" ON payments;
CREATE POLICY "payments_select_agency"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = payments.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_insert_agency" ON payments;
CREATE POLICY "payments_insert_agency"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = payments.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_update_agency" ON payments;
CREATE POLICY "payments_update_agency"
  ON payments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = payments.agency_id AND agency_members.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = payments.agency_id AND agency_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_delete_agency" ON payments;
CREATE POLICY "payments_delete_agency"
  ON payments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_members WHERE agency_members.agency_id = payments.agency_id AND agency_members.user_id = auth.uid())
  );