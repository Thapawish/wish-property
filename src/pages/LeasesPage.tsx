import { useEffect, useState } from 'react';
import { FileText, Plus, Pencil, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { SearchToolbar, type FilterOption } from '@/components/SearchToolbar';
import { exportToCsv } from '@/lib/csv';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { Badge, EmptyState, Modal, PageHeader, Spinner, statusColor } from '@/components/ui';
import type { Lease, Property, Contact } from '@/lib/supabase';

export function LeasesPage() {
  const { membership, isAdmin } = useAuth();
  const agencyId = membership?.agency_id;
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Contact[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lease | null>(null);

  async function loadData() {
    if (!agencyId) return;
    const [{ data: leaseData }, { data: props }, { data: tenantContacts }] = await Promise.all([
      supabase.from('leases').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
      supabase.from('properties').select('*').eq('agency_id', agencyId),
      supabase.from('contacts').select('*').eq('agency_id', agencyId).eq('type', 'tenant'),
    ]);
    setLeases(leaseData ?? []);
    setProperties(props ?? []);
    setTenants(tenantContacts ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [agencyId]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this lease? Related payments will also be removed.')) return;
    await supabase.from('leases').delete().eq('id', id);
    loadData();
  }

  if (loading) return <Spinner />;

  const statusOptions: FilterOption[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Expired', value: 'expired' },
  ];

  const filtered = leases.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (dateFrom && l.end_date < dateFrom) return false;
    if (dateTo && l.start_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      const prop = properties.find((p) => p.id === l.property_id);
      const tenant = tenants.find((t) => t.id === l.tenant_id);
      const haystack = [prop?.address, prop?.suburb, tenant ? `${tenant.first_name} ${tenant.last_name}` : '']
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  function clearFilters() {
    setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo('');
  }

  return (
    <div>
      <PageHeader
        title="Leases"
        description={`${leases.length} leases total`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCsv('leases.csv', [
                { header: 'Property', value: (l) => properties.find((p) => p.id === l.property_id)?.address ?? '' },
                { header: 'Suburb', value: (l) => properties.find((p) => p.id === l.property_id)?.suburb ?? '' },
                { header: 'Tenant', value: (l) => { const t = tenants.find((x) => x.id === l.tenant_id); return t ? `${t.first_name} ${t.last_name}` : ''; } },
                { header: 'Start Date', value: (l) => l.start_date },
                { header: 'End Date', value: (l) => l.end_date },
                { header: 'Rent Amount', value: (l) => l.rent_amount },
                { header: 'Payment Frequency', value: (l) => l.payment_frequency },
                { header: 'First Payment Date', value: (l) => l.first_payment_date },
                { header: 'Paid Until', value: (l) => l.paid_until },
                { header: 'Bond', value: (l) => l.bond_amount },
                { header: 'Status', value: (l) => l.status },
                { header: 'Periodic', value: (l) => (l.is_periodic ? 'Yes' : 'No') },
                { header: 'GST Included', value: (l) => (l.gst_included ? 'Yes' : 'No') },
                { header: 'Tenant Pays Water', value: (l) => (l.tenant_pays_water ? 'Yes' : 'No') },
                { header: 'Next Inspection (months)', value: (l) => l.next_inspection_months },
                { header: 'Next Rent Review (months)', value: (l) => l.next_rent_review_months },
                { header: 'Internal Notes', value: (l) => l.internal_notes },
              ], filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Lease
            </button>
          </div>
        }
      />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search property, tenant..."
        statusFilters={statusOptions}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateLabel="End date"
        resultCount={filtered.length}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText className="w-7 h-7" />} title="No leases yet" description="Create a lease to link a property with a tenant and start tracking rent." action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">Add Lease</button>} />
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Property</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Tenant</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Term</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Rent</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lease) => {
                  const prop = properties.find((p) => p.id === lease.property_id);
                  const tenant = tenants.find((t) => t.id === lease.tenant_id);
                  const days = daysUntil(lease.end_date);
                  return (
                    <tr key={lease.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition group">
                      <td className="px-5 py-4">
                        <p className="text-slate-200 text-sm font-medium">{prop?.address ?? 'Unknown'}</p>
                        <p className="text-slate-500 text-xs">{prop?.suburb}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-300 text-sm">{tenant ? `${tenant.first_name} ${tenant.last_name}` : '—'}</td>
                      <td className="px-5 py-4 text-slate-400 text-sm">
                        <p>{formatDate(lease.start_date)} → {formatDate(lease.end_date)}</p>
                        {lease.status === 'active' && (
                          <p className="text-xs mt-0.5">{days > 0 ? `${days} days left` : `Expired ${Math.abs(days)} days ago`}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-200 text-sm font-medium">{formatCurrency(Number(lease.rent_amount))}<span className="text-slate-500 text-xs"> /mo</span></td>
                      <td className="px-5 py-4"><Badge color={statusColor(lease.status)}>{lease.status}</Badge></td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                          <button onClick={() => { setEditing(lease); setShowForm(true); }} className="p-1.5 text-slate-500 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition"><Pencil className="w-4 h-4" /></button>
                          {isAdmin && (
                          <button onClick={() => handleDelete(lease.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <LeaseForm lease={editing} properties={properties} tenants={tenants} agencyId={agencyId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadData(); }} />
      )}
    </div>
  );
}

function LeaseForm({ lease, properties, tenants, agencyId, onClose, onSaved }: { lease: Lease | null; properties: Property[]; tenants: Contact[]; agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    property_id: lease?.property_id ?? '',
    tenant_id: lease?.tenant_id ?? '',
    start_date: lease?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: lease?.end_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    rent_amount: lease?.rent_amount ?? 0,
    bond_amount: lease?.bond_amount ?? 0,
    status: lease?.status ?? 'pending',
    payment_frequency: lease?.payment_frequency ?? 'monthly',
    first_payment_date: lease?.first_payment_date ?? '',
    paid_until: lease?.paid_until ?? '',
    next_inspection_months: lease?.next_inspection_months ?? '',
    next_rent_review_months: lease?.next_rent_review_months ?? '',
    gst_included: lease?.gst_included ?? false,
    tenant_pays_water: lease?.tenant_pays_water ?? false,
    is_periodic: lease?.is_periodic ?? false,
    internal_notes: lease?.internal_notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      agency_id: agencyId,
      property_id: form.property_id,
      tenant_id: form.tenant_id || null,
      start_date: form.start_date,
      end_date: form.end_date,
      rent_amount: Number(form.rent_amount),
      bond_amount: Number(form.bond_amount),
      status: form.status,
      payment_frequency: form.payment_frequency,
      first_payment_date: form.first_payment_date || null,
      paid_until: form.paid_until || null,
      next_inspection_months: form.next_inspection_months === '' ? null : Number(form.next_inspection_months),
      next_rent_review_months: form.next_rent_review_months === '' ? null : Number(form.next_rent_review_months),
      gst_included: form.gst_included,
      tenant_pays_water: form.tenant_pays_water,
      is_periodic: form.is_periodic,
      internal_notes: form.internal_notes || null,
    };
    const { error: err } = lease ? await supabase.from('leases').update(payload).eq('id', lease.id) : await supabase.from('leases').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';
  const sectionCls = 'border-t border-slate-800 pt-4 mt-4';
  const sectionTitleCls = 'text-sm font-semibold text-teal-400 mb-3';

  return (
    <Modal title={lease ? 'Edit Lease' : 'Add Lease'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lease Details */}
        <div>
          <label className={labelCls}>Property</label>
          <select required value={form.property_id} onChange={(e) => set('property_id', e.target.value)} className={inputCls}>
            <option value="">Select property</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}, {p.suburb}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tenant</label>
          <select value={form.tenant_id} onChange={(e) => set('tenant_id', e.target.value)} className={inputCls}>
            <option value="">Select tenant</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" required value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="date" required value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Rent Amount ($)</label>
            <input type="number" min="0" step="0.01" required value={form.rent_amount} onChange={(e) => set('rent_amount', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Bond ($)</label>
            <input type="number" min="0" step="0.01" value={form.bond_amount} onChange={(e) => set('bond_amount', Number(e.target.value))} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Payment Frequency</label>
            <select value={form.payment_frequency} onChange={(e) => set('payment_frequency', e.target.value)} className={inputCls}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Payment & Schedule */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Payment & Schedule</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Payment Date</label>
              <input type="date" value={form.first_payment_date} onChange={(e) => set('first_payment_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Paid Until</label>
              <input type="date" value={form.paid_until} onChange={(e) => set('paid_until', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelCls}>Next Inspection (months)</label>
              <input type="number" min="0" value={form.next_inspection_months} onChange={(e) => set('next_inspection_months', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="3" />
            </div>
            <div>
              <label className={labelCls}>Next Rent Review (months)</label>
              <input type="number" min="0" value={form.next_rent_review_months} onChange={(e) => set('next_rent_review_months', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="6" />
            </div>
          </div>
        </div>

        {/* Lease Flags */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Lease Terms</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition">
              <input type="checkbox" checked={form.is_periodic} onChange={(e) => set('is_periodic', e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
              <span className="text-sm text-slate-300">Periodic (continuing) agreement</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition">
              <input type="checkbox" checked={form.gst_included} onChange={(e) => set('gst_included', e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
              <span className="text-sm text-slate-300">GST included in rent</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition">
              <input type="checkbox" checked={form.tenant_pays_water} onChange={(e) => set('tenant_pays_water', e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
              <span className="text-sm text-slate-300">Tenant pays water charges</span>
            </label>
          </div>
        </div>

        {/* Internal Notes */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Internal Notes</p>
          <textarea value={form.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} rows={3} className={inputCls} placeholder="Private agency notes about this lease…" />
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-medium rounded-lg transition">{busy ? 'Saving…' : lease ? 'Save Changes' : 'Add Lease'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
