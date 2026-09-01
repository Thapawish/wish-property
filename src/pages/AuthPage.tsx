import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { refreshMembership } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === 'signup') {
        if (!agencyName.trim()) {
          setError('Please enter your agency name.');
          setBusy(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('Sign-up failed. Please try again.');

        const slug = slugify(agencyName) + '-' + data.user.id.slice(0, 6);

        const { data: agency, error: agencyError } = await supabase
          .from('agencies')
          .insert({ name: agencyName.trim(), slug })
          .select()
          .single();

        if (agencyError) throw agencyError;

        const { error: memberError } = await supabase.from('agency_members').insert({
          agency_id: agency.id,
          user_id: data.user.id,
          role: 'agency_admin',
        });

        if (memberError) throw memberError;

        await seedSampleData(agency.id);

        await supabase.auth.signInWithPassword({ email, password });
        await refreshMembership();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await refreshMembership();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PropertyHub</h1>
          <p className="text-slate-400 text-sm mt-1">Property management for modern agencies</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                mode === 'signin' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                mode === 'signup' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Agency
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Agency Name</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Wish Real Estate Seven Hills"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com.au"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Agency & Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          By continuing you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

async function seedSampleData(agencyId: string) {
  const landlords = [
    { first_name: 'Robert', last_name: 'Chen', email: 'robert.chen@email.com', phone: '0412 345 678' },
    { first_name: 'Maria', last_name: 'Garcia', email: 'maria.garcia@email.com', phone: '0423 456 789' },
  ];

  const tenants = [
    { first_name: 'James', last_name: 'Wilson', email: 'james.wilson@email.com', phone: '0434 567 890' },
    { first_name: 'Sarah', last_name: 'Nguyen', email: 'sarah.nguyen@email.com', phone: '0445 678 901' },
    { first_name: 'David', last_name: 'Kumar', email: 'david.kumar@email.com', phone: '0456 789 012' },
  ];

  const { data: landlordRows } = await supabase
    .from('contacts')
    .insert(landlords.map((l) => ({ ...l, agency_id: agencyId, type: 'landlord' })))
    .select();
  const { data: tenantRows } = await supabase
    .from('contacts')
    .insert(tenants.map((t) => ({ ...t, agency_id: agencyId, type: 'tenant' })))
    .select();

  if (!landlordRows || !tenantRows) return;

  const properties = [
    {
      address: '12 Greystanes Parade',
      suburb: 'Greystanes',
      state: 'NSW',
      postcode: '2145',
      property_type: 'house',
      status: 'leased',
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landlord_id: landlordRows[0].id,
    },
    {
      address: '45 Seven Hills Road',
      suburb: 'Seven Hills',
      state: 'NSW',
      postcode: '2147',
      property_type: 'house',
      status: 'leased',
      bedrooms: 4,
      bathrooms: 2,
      parking: 2,
      landlord_id: landlordRows[0].id,
    },
    {
      address: '8/120 Prospect Highway',
      suburb: 'Prospect',
      state: 'NSW',
      postcode: '2148',
      property_type: 'apartment',
      status: 'vacant',
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      landlord_id: landlordRows[1].id,
    },
    {
      address: '23 Windsor Road',
      suburb: 'Baulkham Hills',
      state: 'NSW',
      postcode: '2153',
      property_type: 'townhouse',
      status: 'pending',
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landlord_id: landlordRows[1].id,
    },
  ];

  const { data: propRows } = await supabase
    .from('properties')
    .insert(properties.map((p) => ({ ...p, agency_id: agencyId })))
    .select();

  if (!propRows) return;

  const today = new Date();
  const leases = [
    {
      property_id: propRows[0].id,
      tenant_id: tenantRows[0].id,
      start_date: new Date(today.getTime() - 180 * 86400000).toISOString().slice(0, 10),
      end_date: new Date(today.getTime() + 185 * 86400000).toISOString().slice(0, 10),
      rent_amount: 620,
      bond_amount: 2480,
      status: 'active',
    },
    {
      property_id: propRows[1].id,
      tenant_id: tenantRows[1].id,
      start_date: new Date(today.getTime() - 300 * 86400000).toISOString().slice(0, 10),
      end_date: new Date(today.getTime() + 25 * 86400000).toISOString().slice(0, 10),
      rent_amount: 780,
      bond_amount: 3120,
      status: 'active',
    },
    {
      property_id: propRows[3].id,
      tenant_id: tenantRows[2].id,
      start_date: new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10),
      end_date: new Date(today.getTime() + 379 * 86400000).toISOString().slice(0, 10),
      rent_amount: 550,
      bond_amount: 2200,
      status: 'pending',
    },
  ];

  const { data: leaseRows } = await supabase
    .from('leases')
    .insert(leases.map((l) => ({ ...l, agency_id: agencyId })))
    .select();

  if (!leaseRows) return;

  const payments: { lease_id: string; amount: number; due_date: string; paid_date: string | null; status: string; method: string | null; reference: string | null }[] = [];
  for (let li = 0; li < leaseRows.length; li++) {
    const lease = leaseRows[li];
    for (let i = 0; i < 6; i++) {
      const due = new Date(today.getTime() - (5 - i) * 30 * 86400000);
      const isOverdue = i < 3 && lease.id === leaseRows[0].id && i < 2;
      const isPaid = !isOverdue || i < 1;
      payments.push({
        lease_id: lease.id,
        amount: Number(lease.rent_amount),
        due_date: due.toISOString().slice(0, 10),
        paid_date: isPaid ? due.toISOString().slice(0, 10) : null,
        status: isPaid ? 'paid' : 'overdue',
        method: isPaid ? 'Bank Transfer' : null,
        reference: isPaid ? `RENT-${lease.id.slice(0, 4)}-${i}` : null,
      });
    }
  }

  await supabase.from('payments').insert(payments.map((p) => ({ ...p, agency_id: agencyId })));

  const rentReviews = [
    {
      lease_id: leaseRows[0].id,
      review_date: new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10),
      current_rent: 620,
      proposed_rent: 660,
      approved_rent: null,
      status: 'pending',
      notes: 'Annual review — market data suggests a modest increase is supportable.',
    },
    {
      lease_id: leaseRows[1].id,
      review_date: new Date(today.getTime() - 10 * 86400000).toISOString().slice(0, 10),
      current_rent: 780,
      proposed_rent: 820,
      approved_rent: 820,
      status: 'approved',
      notes: 'Landlord approved. New rent applies from next cycle.',
    },
  ];

  await supabase.from('rent_reviews').insert(rentReviews.map((r) => ({ ...r, agency_id: agencyId })));
}
