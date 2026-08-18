import { useEffect, useState } from 'react';
import { DollarSign, Plus, Check, Clock, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { SearchToolbar, type FilterOption } from '@/components/SearchToolbar';
import { exportToCsv } from '@/lib/csv';
import { formatCurrency, formatDate, daysSince } from '@/lib/format';
import { Badge, EmptyState, Modal, PageHeader, Spinner, statusColor } from '@/components/ui';
import type { Payment, Lease, Property } from '@/lib/supabase';

export function PaymentsPage() {
  const { membership } = useAuth();
  const agencyId = membership?.agency_id;
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { toast } = useToast();

  async function loadData() {
    if (!agencyId) return;
    const [{ data: payData, error: payErr }, { data: leaseData }, { data: props }] = await Promise.all([
      supabase.from('payments').select('*').eq('agency_id', agencyId).order('due_date', { ascending: false }),
      supabase.from('leases').select('*').eq('agency_id', agencyId),
      supabase.from('properties').select('*').eq('agency_id', agencyId),
    ]);
    if (payErr) toast('Could not load payments. Check your connection and try again.', 'error');
    setPayments(payData ?? []);
    setLeases(leaseData ?? []);
    setProperties(props ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [agencyId]);

  async function markPaid(payment: Payment) {
    const { error } = await supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', payment.id);
    if (error) {
      toast('Could not mark payment as paid. Please try again.', 'error');
    } else {
      toast('Payment marked as paid.', 'success');
      loadData();
    }
  }

  if (loading) return <Spinner />;

  const statusOptions: FilterOption[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Pending', value: 'pending' },
    { label: 'Overdue', value: 'overdue' },
  ];

  const filtered = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (dateFrom && p.due_date < dateFrom) return false;
    if (dateTo && p.due_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      const lease = leases.find((l) => l.id === p.lease_id);
      const prop = lease ? properties.find((pr) => pr.id === lease.property_id) : null;
      const haystack = [prop?.address, prop?.suburb, p.reference, p.method].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);

  function clearFilters() {
    setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo('');
  }

  const stats = [
    { label: 'Collected', value: formatCurrency(totalCollected), icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Pending', value: formatCurrency(totalPending), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Overdue', value: formatCurrency(totalOverdue), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div>
      <PageHeader
        title="Payments & Arrears"
        description="Track rent payments and outstanding arrears"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCsv('payments.csv', [
                { header: 'Property', value: (p) => { const lease = leases.find((l) => l.id === p.lease_id); const prop = lease ? properties.find((pr) => pr.id === lease.property_id) : null; return prop?.address ?? ''; } },
                { header: 'Suburb', value: (p) => { const lease = leases.find((l) => l.id === p.lease_id); const prop = lease ? properties.find((pr) => pr.id === lease.property_id) : null; return prop?.suburb ?? ''; } },
                { header: 'Due Date', value: (p) => p.due_date },
                { header: 'Amount', value: (p) => p.amount },
                { header: 'Status', value: (p) => p.status },
                { header: 'Paid Date', value: (p) => p.paid_date },
                { header: 'Method', value: (p) => p.method },
                { header: 'Reference', value: (p) => p.reference },
              ], filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-slate-400 text-xs">{s.label}</p>
              <p className="text-white text-lg font-bold">{s.value}</p>
            </div>
          );
        })}
      </div>

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search property, reference, method..."
        statusFilters={statusOptions}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateLabel="Due date"
        resultCount={filtered.length}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-7 h-7" />} title="No payments recorded" description="Record rent payments to track what's been collected and what's overdue." action={<button onClick={() => setShowForm(true)} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">Record Payment</button>} />
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Property</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Due Date</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Paid</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => {
                  const lease = leases.find((l) => l.id === payment.lease_id);
                  const prop = lease ? properties.find((p) => p.id === lease.property_id) : null;
                  const overdueDays = payment.status === 'overdue' ? daysSince(payment.due_date) : 0;
                  return (
                    <tr key={payment.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition group">
                      <td className="px-5 py-4">
                        <p className="text-slate-200 text-sm font-medium">{prop?.address ?? 'Unknown'}</p>
                        {payment.reference && <p className="text-slate-500 text-xs">{payment.reference}</p>}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">{formatDate(payment.due_date)}</td>
                      <td className="px-5 py-4 text-slate-200 text-sm font-medium">{formatCurrency(Number(payment.amount))}</td>
                      <td className="px-5 py-4">
                        <Badge color={statusColor(payment.status)}>
                          {payment.status === 'overdue' ? `${overdueDays}d overdue` : payment.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">{formatDate(payment.paid_date)}</td>
                      <td className="px-5 py-4 text-right">
                        {payment.status !== 'paid' && (
                          <button onClick={() => markPaid(payment)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg transition opacity-0 group-hover:opacity-100">
                            Mark Paid
                          </button>
                        )}
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
        <PaymentForm leases={leases} properties={properties} agencyId={agencyId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadData(); }} />
      )}
    </div>
  );
}

function PaymentForm({ leases, properties, agencyId, onClose, onSaved }: { leases: Lease[]; properties: Property[]; agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    lease_id: '',
    amount: 0,
    due_date: new Date().toISOString().slice(0, 10),
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    method: 'Bank Transfer',
    reference: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      agency_id: agencyId,
      lease_id: form.lease_id,
      amount: Number(form.amount),
      due_date: form.due_date,
      paid_date: form.status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
      status: form.status,
      method: form.method || null,
      reference: form.reference || null,
    };
    const { error: err } = await supabase.from('payments').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Lease / Property</label>
          <select required value={form.lease_id} onChange={(e) => {
            const lease = leases.find((l) => l.id === e.target.value);
            setForm({ ...form, lease_id: e.target.value, amount: lease ? Number(lease.rent_amount) : 0 });
          }} className={inputCls}>
            <option value="">Select lease</option>
            {leases.map((l) => {
              const prop = properties.find((p) => p.id === l.property_id);
              return <option key={l.id} value={l.id}>{prop?.address ?? 'Unknown'} — {formatCurrency(Number(l.rent_amount))}/mo</option>;
            })}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount ($)</label>
            <input type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'pending' | 'paid' | 'overdue' })} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Method</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inputCls}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Direct Debit">Direct Debit</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Reference</label>
          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} placeholder="Optional reference" />
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-medium rounded-lg transition">Record Payment</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
