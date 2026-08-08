/**
 * PropertyHub Integration Test Suite
 *
 * Tests the full loop: mobile app → API → database → response back to app.
 * Covers token expiry handling, offline state simulation, and error surfacing.
 *
 * Run: npx tsx --env-file=.env tests/integration-test.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
const adminEmail = `integ-admin-${timestamp}@test.com`;
const password = 'PropHub-Test-2026!';

async function signUpWithAgency(email: string, agencyName: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`Sign-up failed: ${error.message}`);
  if (!data.user) throw new Error('Sign-up returned no user');

  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.session) throw new Error(`Post-signup sign-in failed: ${signInError?.message ?? 'no session'}`);

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

function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'object' && 'message' in error) return String((error as any).message);
  return String(error);
}

async function main() {
  console.log('========================================');
  console.log('  PropertyHub Integration Test Suite');
  console.log('  Full loop: App → API → DB → Response');
  console.log('========================================');

  let adminClient: SupabaseClient;
  let agencyId: string;
  let propertyId: string;
  let contactId: string;
  let leaseId: string;
  let paymentId: string;

  // ─── 1. Full CRUD Loop: Create → Read → Verify ───
  await test('Loop: Sign up → agency → session established', async () => {
    const result = await signUpWithAgency(adminEmail, 'Integration Test Agency');
    adminClient = result.client;
    agencyId = result.agencyId;
    assert(!!adminClient, 'Client created with active session');
    assert(!!agencyId, 'Agency ID returned');
  });

  await test('Loop: Create property → DB stores it → read back matches', async () => {
    const { data, error } = await adminClient!
      .from('properties')
      .insert({
        agency_id: agencyId!,
        address: '42 Integration Way',
        suburb: 'Testville',
        state: 'NSW',
        postcode: '2000',
        property_type: 'house',
        status: 'vacant',
        bedrooms: 4,
        bathrooms: 2,
        parking: 2,
      })
      .select()
      .single();
    assert(!error, `Insert succeeded${error ? ': ' + error.message : ''}`);
    assert(!!data, 'Property row returned from DB');
    assert(data.address === '42 Integration Way', 'Address matches what was sent');
    assert(data.bedrooms === 4, 'Bedrooms count matches');
    assert(data.status === 'vacant', 'Status matches');
    propertyId = data.id;
  });

  await test('Loop: Create contact → link to property via lease → verify join', async () => {
    const { data: contact, error: contactErr } = await adminClient!
      .from('contacts')
      .insert({
        agency_id: agencyId!,
        type: 'tenant',
        first_name: 'Integration',
        last_name: 'Tester',
        email: 'tester@integ.com',
        phone: '0411 222 333',
      })
      .select()
      .single();
    assert(!contactErr, `Contact created${contactErr ? ': ' + contactErr.message : ''}`);
    contactId = contact.id;

    const { data: lease, error: leaseErr } = await adminClient!
      .from('leases')
      .insert({
        agency_id: agencyId!,
        property_id: propertyId!,
        tenant_id: contactId!,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        rent_amount: 750,
        bond_amount: 3000,
        status: 'active',
      })
      .select()
      .single();
    assert(!leaseErr, `Lease created${leaseErr ? ': ' + leaseErr.message : ''}`);
    assert(!!lease, 'Lease row returned');
    leaseId = lease.id;

    // Read back with the relationship: lease → property → verify address
    const { data: leaseWithProp } = await adminClient!
      .from('leases')
      .select('*, properties(*)')
      .eq('id', leaseId!)
      .single();
    assert(!!leaseWithProp, 'Lease read back with joined property');
    assert(leaseWithProp.properties.address === '42 Integration Way', 'Joined property address matches');
  });

  await test('Loop: Record payment → read back → verify totals', async () => {
    const { data: payment, error } = await adminClient!
      .from('payments')
      .insert({
        agency_id: agencyId!,
        lease_id: leaseId!,
        amount: 750,
        due_date: '2026-01-01',
        paid_date: '2026-01-01',
        status: 'paid',
        method: 'Bank Transfer',
        reference: 'INT-001',
      })
      .select()
      .single();
    assert(!error, `Payment created${error ? ': ' + error.message : ''}`);
    assert(!!payment, 'Payment row returned');
    assert(Number(payment.amount) === 750, 'Amount matches');
    paymentId = payment.id;

    // Read all payments for agency and verify total
    const { data: allPayments } = await adminClient!
      .from('payments')
      .select('*')
      .eq('agency_id', agencyId!);
    const total = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    assert(total === 750, `Total of payments matches (${total} expected 750)`);
  });

  await test('Loop: Update property status → verify change persisted', async () => {
    const { error } = await adminClient!
      .from('properties')
      .update({ status: 'leased' })
      .eq('id', propertyId!);
    assert(!error, `Update succeeded${error ? ': ' + error.message : ''}`);

    const { data: updated } = await adminClient!
      .from('properties')
      .select('status')
      .eq('id', propertyId!)
      .single();
    assert(updated.status === 'leased', 'Status change persisted in DB');
  });

  // ─── 2. Token Expiry Handling ───
  await test('Token: Valid token can access data', async () => {
    const { data: sessionData } = await adminClient!.auth.getSession();
    const token = sessionData.session?.access_token;
    assert(!!token, 'Access token available');

    const { data, error } = await adminClient!
      .from('properties')
      .select('*')
      .eq('agency_id', agencyId!);
    assert(!error, 'Query with valid token succeeds');
    assert(!!data && data.length > 0, 'Data returned with valid token');
  });

  await test('Token: Expired/invalid token is rejected by API', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjIsInN1YiI6ImludmFsaWQifQ.invalid-signature';
    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(response.status === 401, `Expired token rejected (got ${response.status})`);
  });

  await test('Token: Missing Authorization header is rejected', async () => {
    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
    });
    assert(response.status === 401, `Missing token rejected (got ${response.status})`);
  });

  await test('Token: Malformed token (not JWT) is rejected', async () => {
    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: 'Bearer not-a-jwt-token',
        'Content-Type': 'application/json',
      },
    });
    assert(response.status === 401, `Malformed token rejected (got ${response.status})`);
  });

  await test('Token: Token with wrong API key is rejected', async () => {
    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: 'Bearer valid-but-wrong-key',
        'Content-Type': 'application/json',
        apikey: 'wrong-api-key',
      },
    });
    assert(!response.ok, `Wrong API key rejected (status ${response.status})`);
  });

  // ─── 3. Offline State Simulation ───
  await test('Offline: Client with no network returns error (not silent success)', async () => {
    // Simulate offline by using a client pointed at an unreachable URL
    const offlineClient = createClient('https://offline.invalid.supabase.co', 'fake-key', {
      auth: { persistSession: false },
    });
    const { data, error } = await offlineClient.from('properties').select('*').limit(1);
    assert(!!error, 'Offline request returns an error (not silent success)');
    assert(!data || data.length === 0, 'No data returned when offline');
    const msg = extractErrorMessage(error);
    assert(msg.length > 0, `Error message is non-empty: "${msg.slice(0, 60)}..."`);
  });

  await test('Offline: Dashboard API unreachable returns network error', async () => {
    const apiUrl = 'https://offline.invalid.supabase.co/functions/v1/api-v1-dashboard';
    try {
      await fetch(apiUrl, { headers: { Authorization: 'Bearer test' } });
      assert(false, 'Should have thrown a network error');
    } catch (err) {
      const msg = extractErrorMessage(err);
      assert(msg.length > 0, `Network error surfaced: "${msg.slice(0, 60)}..."`);
    }
  });

  // ─── 4. Error Message Surfacing ───
  await test('Errors: RLS violation surfaces as error (not silent)', async () => {
    // Unauthenticated client tries to insert
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await anonClient
      .from('properties')
      .insert({
        agency_id: agencyId!,
        address: 'Hacker Street',
        property_type: 'house',
        status: 'vacant',
        bedrooms: 1,
        bathrooms: 1,
        parking: 0,
      });
    assert(!!error, 'RLS violation returns an error to client');
    assert(!data, 'No data returned for RLS-blocked insert');
    const msg = extractErrorMessage(error);
    assert(msg.length > 0, `Error message is user-visible: "${msg.slice(0, 60)}..."`);
  });

  await test('Errors: CHECK constraint violation surfaces with message', async () => {
    const { error } = await adminClient!
      .from('leases')
      .insert({
        agency_id: agencyId!,
        property_id: propertyId!,
        tenant_id: contactId!,
        start_date: '2026-12-31',
        end_date: '2026-01-01',
        rent_amount: 500,
        bond_amount: 2000,
        status: 'pending',
      });
    assert(!!error, 'CHECK constraint returns error');
    const msg = extractErrorMessage(error);
    assert(msg.length > 0, `Constraint error message surfaced: "${msg.slice(0, 60)}..."`);
  });

  await test('Errors: Missing required field surfaces as error', async () => {
    const { error } = await adminClient!
      .from('properties')
      .insert({
        agency_id: agencyId!,
        // address is required — omitting it
        property_type: 'house',
        status: 'vacant',
        bedrooms: 1,
        bathrooms: 1,
        parking: 0,
      });
    assert(!!error, 'Missing required field returns error');
    const msg = extractErrorMessage(error);
    assert(msg.length > 0, `Validation error message surfaced: "${msg.slice(0, 60)}..."`);
  });

  await test('Errors: Cross-agency write is blocked with error', async () => {
    // Create a second agency
    const otherEmail = `integ-other-${timestamp}@test.com`;
    const otherResult = await signUpWithAgency(otherEmail, 'Other Integration Agency');
    const otherAgencyId = otherResult.agencyId;

    // Admin from agency A tries to insert into agency B's scope
    const { error } = await adminClient!
      .from('properties')
      .insert({
        agency_id: otherAgencyId,
        address: 'Cross Agency St',
        property_type: 'house',
        status: 'vacant',
        bedrooms: 1,
        bathrooms: 1,
        parking: 0,
      });
    assert(!!error, 'Cross-agency write blocked by RLS');
    const msg = extractErrorMessage(error);
    assert(msg.length > 0, `RLS error message surfaced: "${msg.slice(0, 60)}..."`);
  });

  // ─── 5. Dashboard API Full Loop ───
  await test('API Loop: Dashboard endpoint returns complete summary', async () => {
    const { data: sessionData } = await adminClient!.auth.getSession();
    const token = sessionData.session?.access_token;
    assert(!!token, 'Token available for API call');

    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    assert(response.ok, `Response OK (status ${response.status})`);

    const body = await response.json();
    assert(!!body.stats, 'Stats object in response');
    assert(typeof body.stats.total_properties === 'number', 'total_properties is numeric');
    assert(typeof body.stats.active_leases === 'number', 'active_leases is numeric');
    assert(typeof body.stats.total_collected === 'number', 'total_collected is numeric');
    assert(typeof body.stats.total_arrears === 'number', 'total_arrears is numeric');
    assert(body.agency.name === 'Integration Test Agency', 'Agency name in response');
    assert(Array.isArray(body.arrears_trend), 'arrears_trend is an array');
    assert(Array.isArray(body.expiring_leases), 'expiring_leases is an array');
  });

  await test('API Loop: Dashboard data matches direct DB query', async () => {
    // Query DB directly
    const { data: props } = await adminClient!.from('properties').select('*').eq('agency_id', agencyId!);
    const directCount = props?.length ?? 0;

    // Query via API
    const { data: sessionData } = await adminClient!.auth.getSession();
    const token = sessionData.session?.access_token;
    const apiUrl = `${SUPABASE_URL}/functions/v1/api-v1-dashboard`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const body = await response.json();
    const apiCount = body.stats.total_properties;

    assert(apiCount === directCount, `API property count (${apiCount}) matches DB count (${directCount})`);
  });

  // ─── 6. Session Refresh ───
  await test('Session: Token can be refreshed after initial sign-in', async () => {
    const { data: initialSession } = await adminClient!.auth.getSession();
    const initialToken = initialSession.session?.access_token;

    const { data: refreshed, error } = await adminClient!.auth.refreshSession();
    assert(!error, `Token refresh succeeded${error ? ': ' + error.message : ''}`);
    assert(!!refreshed.session, 'New session returned after refresh');
    assert(refreshed.session?.access_token !== initialToken, 'New token differs from initial token');
  });

  // ─── Cleanup ───
  await test('Cleanup: Delete all test data', async () => {
    await adminClient!.from('payments').delete().eq('id', paymentId!);
    await adminClient!.from('leases').delete().eq('id', leaseId!);
    await adminClient!.from('properties').delete().eq('id', propertyId!);
    await adminClient!.from('contacts').delete().eq('id', contactId!);

    const { data } = await adminClient!.from('properties').select('id').eq('id', propertyId!);
    assert(!data || data.length === 0, 'Property deleted successfully');
  });

  // ─── Summary ───
  console.log('\n========================================');
  console.log('  INTEGRATION TEST SUMMARY');
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
