import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  FAIL: ${message}`);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n${name}`);
  try {
    await fn();
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const timestamp = Date.now();
const adminEmail = `test-admin-${timestamp}@test.com`;
const managerEmail = `test-manager-${timestamp}@test.com`;
const password = 'PropHub-Test-2026!';

async function signUp(email: string, agencyName?: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`Sign-up failed: ${error.message}`);
  if (!data.user) throw new Error('Sign-up returned no user');

  // signInWithPassword sets the session on the client even with persistSession: false
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.session) throw new Error(`Post-signup sign-in failed: ${signInError?.message ?? 'no session'}`);

  if (agencyName) {
    const slug = `${agencyName.toLowerCase().replace(/\s+/g, '-')}-${data.user.id.slice(0, 6)}`;
    const { data: agency, error: agencyError } = await client
      .from('agencies')
      .insert({ name: agencyName, slug })
      .select()
      .single();
    if (agencyError) throw new Error(`Agency creation failed: ${agencyError.message}`);

    const { error: memberError } = await client.from('agency_members').insert({
      agency_id: agency.id,
      user_id: data.user.id,
      role: 'agency_admin',
    });
    if (memberError) throw new Error(`Membership creation failed: ${memberError.message}`);

    return { client, user: data.user, agencyId: agency.id };
  }

  return { client, user: data.user, agencyId: null };
}

async function signIn(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);
  return { client, user: data.user! };
}

async function addMember(agencyId: string, userId: string, role: string, adminClient: any) {
  const { error } = await adminClient.from('agency_members').insert({
    agency_id: agencyId,
    user_id: userId,
    role,
  });
  if (error) throw new Error(`Failed to add member: ${error.message}`);
}

async function main() {
  console.log('========================================');
  console.log('  PropertyHub API Test Suite');
  console.log('========================================');

  let adminClient: any;
  let agencyId: string;
  let managerClient: any;
  let propertyId: string;
  let leaseId: string;
  let paymentId: string;
  let tenantId: string;

  // ─── 1. Authentication ───
  await test('Auth: Sign up new agency admin', async () => {
    const result = await signUp(adminEmail, 'Test Agency');
    adminClient = result.client;
    agencyId = result.agencyId!;
    assert(!!adminClient, 'Admin client created');
    assert(!!agencyId, 'Agency ID returned');
  });

  await test('Auth: Sign in with valid credentials', async () => {
    const result = await signIn(adminEmail);
    assert(!!result.user, 'User returned after sign-in');
    assert(result.user.email === adminEmail, 'Email matches');
  });

  await test('Auth: Reject invalid credentials', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error } = await client.auth.signInWithPassword({ email: adminEmail, password: 'wrongpassword' });
    assert(!!error, 'Error returned for invalid password');
  });

  await test('Auth: Unauthenticated user cannot read data', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await client.from('properties').select('*').eq('agency_id', agencyId);
    assert(!data || data.length === 0, 'No properties visible to unauthenticated user (RLS filters silently)');
  });

  // ─── 2. Create Property ───
  await test('CRUD: Admin can create a property', async () => {
    const { data, error } = await adminClient
      .from('properties')
      .insert({
        agency_id: agencyId,
        address: '100 Test Street',
        suburb: 'Testville',
        state: 'NSW',
        postcode: '2000',
        property_type: 'house',
        status: 'vacant',
        bedrooms: 3,
        bathrooms: 2,
        parking: 1,
      })
      .select()
      .single();
    assert(!error, `No error${error ? ': ' + error.message : ''}`);
    assert(!!data, 'Property created');
    propertyId = data.id;
  });

  await test('CRUD: Admin can create a tenant contact', async () => {
    const { data, error } = await adminClient
      .from('contacts')
      .insert({
        agency_id: agencyId,
        type: 'tenant',
        first_name: 'Test',
        last_name: 'Tenant',
        email: 'tenant@test.com',
        phone: '0400 000 000',
      })
      .select()
      .single();
    assert(!error, `No error${error ? ': ' + error.message : ''}`);
    tenantId = data.id;
  });

  // ─── 3. Create Lease ───
  await test('CRUD: Admin can create a lease', async () => {
    const { data, error } = await adminClient
      .from('leases')
      .insert({
        agency_id: agencyId,
        property_id: propertyId,
        tenant_id: tenantId,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        rent_amount: 650,
        bond_amount: 2600,
        status: 'active',
      })
      .select()
      .single();
    assert(!error, `No error${error ? ': ' + error.message : ''}`);
    assert(!!data, 'Lease created');
    leaseId = data.id;
  });

  // ─── 4. Record Payment ───
  await test('CRUD: Admin can record a payment', async () => {
    const { data, error } = await adminClient
      .from('payments')
      .insert({
        agency_id: agencyId,
        lease_id: leaseId,
        amount: 650,
        due_date: '2026-01-01',
        paid_date: '2026-01-01',
        status: 'paid',
        method: 'Bank Transfer',
        reference: 'TEST-001',
      })
      .select()
      .single();
    assert(!error, `No error${error ? ': ' + error.message : ''}`);
    assert(!!data, 'Payment recorded');
    paymentId = data.id;
  });

  await test('CRUD: Admin can read payments for their agency', async () => {
    const { data, error } = await adminClient
      .from('payments')
      .select('*')
      .eq('agency_id', agencyId);
    assert(!error, 'No error');
    assert(data && data.length > 0, 'Payments returned');
  });

  // ─── 5. Role-Based Permissions ───
  await test('Roles: Property manager can sign up and be added to agency', async () => {
    const result = await signUp(managerEmail);
    assert(!!result.user, 'Manager user created');
    await addMember(agencyId, result.user.id, 'property_manager', adminClient);
    assert(true, 'Manager added as agency member');
  });

  await test('Roles: Property manager can read agency data', async () => {
    const result = await signIn(managerEmail);
    managerClient = result.client;
    const { data, error } = await managerClient
      .from('properties')
      .select('*')
      .eq('agency_id', agencyId);
    assert(!error, 'No error');
    assert(data && data.length > 0, 'Manager can see properties');
  });

  await test('Roles: Property manager can create a lease', async () => {
    const { data, error } = await managerClient
      .from('leases')
      .insert({
        agency_id: agencyId,
        property_id: propertyId,
        tenant_id: tenantId,
        start_date: '2026-06-01',
        end_date: '2027-05-31',
        rent_amount: 700,
        bond_amount: 2800,
        status: 'pending',
      })
      .select()
      .single();
    assert(!error, `No error${error ? ': ' + error.message : ''}`);
    assert(!!data, 'Manager created lease');
  });

  await test('Roles: Property manager CANNOT delete a property', async () => {
    await managerClient.from('properties').delete().eq('id', propertyId);
    const { data } = await adminClient.from('properties').select('id').eq('id', propertyId).single();
    assert(!!data, 'Property still exists after non-admin delete attempt (RLS enforced)');
  });

  await test('Roles: Property manager CANNOT delete a payment', async () => {
    await managerClient.from('payments').delete().eq('id', paymentId);
    const { data } = await adminClient.from('payments').select('id').eq('id', paymentId).single();
    assert(!!data, 'Payment still exists after non-admin delete attempt (RLS enforced)');
  });

  await test('Roles: Admin CAN delete a payment', async () => {
    const { error } = await adminClient
      .from('payments')
      .delete()
      .eq('id', paymentId);
    assert(!error, `Admin can delete${error ? ': ' + error.message : ''}`);
  });

  // ─── 6. Data Validation (CHECK constraints) ───
  await test('Validation: Reject negative rent amount', async () => {
    const { error } = await adminClient
      .from('leases')
      .insert({
        agency_id: agencyId,
        property_id: propertyId,
        tenant_id: tenantId,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        rent_amount: -100,
        bond_amount: 0,
        status: 'pending',
      });
    assert(!!error, 'Negative rent rejected by CHECK constraint');
  });

  await test('Validation: Reject end_date before start_date', async () => {
    const { error } = await adminClient
      .from('leases')
      .insert({
        agency_id: agencyId,
        property_id: propertyId,
        tenant_id: tenantId,
        start_date: '2026-12-31',
        end_date: '2026-01-01',
        rent_amount: 500,
        bond_amount: 2000,
        status: 'pending',
      });
    assert(!!error, 'Invalid date range rejected by CHECK constraint');
  });

  await test('Validation: Reject invalid property status', async () => {
    const { error } = await adminClient
      .from('properties')
      .insert({
        agency_id: agencyId,
        address: '99 Invalid St',
        property_type: 'house',
        status: 'demolished',
        bedrooms: 1,
        bathrooms: 1,
        parking: 0,
      });
    assert(!!error, 'Invalid status rejected by CHECK constraint');
  });

  await test('Validation: Reject invalid member role', async () => {
    const { error } = await adminClient
      .from('agency_members')
      .insert({
        agency_id: agencyId,
        user_id: crypto.randomUUID(),
        role: 'super_admin',
      });
    assert(!!error, 'Invalid role rejected by CHECK constraint');
  });

  await test('Validation: Reject zero payment amount', async () => {
    const { error } = await adminClient
      .from('payments')
      .insert({
        agency_id: agencyId,
        lease_id: leaseId,
        amount: 0,
        due_date: '2026-02-01',
        status: 'pending',
      });
    assert(!!error, 'Zero amount rejected by CHECK constraint');
  });

  await test('Validation: Reject invalid contact type', async () => {
    const { error } = await adminClient
      .from('contacts')
      .insert({
        agency_id: agencyId,
        type: 'contractor',
        first_name: 'Bad',
        last_name: 'Type',
      });
    assert(!!error, 'Invalid contact type rejected by CHECK constraint');
  });

  // ─── 7. Cross-Agency Isolation ───
  await test('Isolation: User from Agency A cannot see Agency B data', async () => {
    const otherEmail = `test-other-${timestamp}@test.com`;
    const result = await signUp(otherEmail, 'Other Agency');
    const otherClient = result.client;
    const otherAgencyId = result.agencyId!;

    const { data, error } = await otherClient
      .from('properties')
      .select('*')
      .eq('agency_id', otherAgencyId);
    assert(!error, 'No error');
    assert(!data || data.length === 0, 'Other agency sees no properties from first agency');

    const { data: crossQuery, error: crossError } = await otherClient
      .from('properties')
      .select('*')
      .eq('agency_id', agencyId);
    assert(!crossError, 'No error on cross-agency query');
    assert(!crossQuery || crossQuery.length === 0, 'Cannot read other agency properties via RLS');
  });

  // ─── 8. Dashboard API Endpoint ───
  await test('API: Dashboard endpoint returns summary with valid JWT', async () => {
    const { data: sessionData } = await adminClient.auth.getSession();
    const token = sessionData.session?.access_token;
    assert(!!token, 'Session token available');

    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    assert(response.ok, `Response OK (status ${response.status})`);
    const body = await response.json();
    assert(!!body.stats, 'Stats object returned');
    assert(body.stats.total_properties >= 1, 'Property count in summary');
    assert(body.agency.name === 'Test Agency', 'Agency name in response');
  });

  await test('API: Dashboard endpoint rejects unauthenticated request', async () => {
    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
    });
    assert(response.status === 401, `Returns 401 (got ${response.status})`);
  });

  // ─── Cleanup ───
  await test('Cleanup: Admin can delete lease', async () => {
    const { error } = await adminClient.from('leases').delete().eq('id', leaseId);
    assert(!error, 'Lease deleted');
  });

  await test('Cleanup: Admin can delete property', async () => {
    const { error } = await adminClient.from('properties').delete().eq('id', propertyId);
    assert(!error, 'Property deleted');
  });

  // ─── Summary ───
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.forEach((f) => console.log(`    - ${f}`));
  }
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
