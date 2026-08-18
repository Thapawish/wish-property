import { useEffect, useState } from 'react';
import { TrendingUp, Plus, Pencil, Trash2, ArrowUpRight, Check, X as XIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { Badge, EmptyState, Modal, PageHeader, Spinner, statusColor } from '@/components/ui';
import type { RentReview, Lease, Property } from '@/lib/supabase';

export function RentReviewsPage() {
  const { membership, isAdmin } = useAuth();
  const agencyId = membership?.agency_id;
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<RentReview[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RentReview | null>(null);

  async function loadData() {
    if (!agencyId) return;
    const [{ data: reviewData }, { data: leaseData }, { data: props }] = await Promise.all([
      supabase.from('rent_reviews').select('*').eq('agency_id', agencyId).order('review_date', { ascending: false }),
      supabase.from('leases').select('*').eq('agency_id', agencyId),
      supabase.from('properties').select('*').eq('agency_id', agencyId),
    ]);
    setReviews(reviewData ?? []);
    setLeases(leaseData ?? []);
    setProperties(props ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [agencyId]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this rent review?')) return;
    await supabase.from('rent_reviews').delete().eq('id', id);
    loadData();
  }

  async function updateStatus(review: RentReview, status: 'approved' | 'rejected' | 'applied', approvedRent?: number) {
    const payload: Partial<RentReview> = { status };
    if (approvedRent !== undefined) payload.approved_rent = approvedRent;
    await supabase.from('rent_reviews').update(payload).eq('id', review.id);
    loadData();
  }

  if (loading) return <Spinner />;

  const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const upcomingCount = reviews.filter((r) => r.status === 'pending' && daysUntil(r.review_date) >= 0).length;

  return (
    <div>
      <PageHeader
        title="Rent Reviews"
        description={`${reviews.length} reviews · ${pendingCount} pending${upcomingCount > 0 ? ` · ${upcomingCount} upcoming` : ''}`}
        action={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">
            <Plus className="w-4 h-4" /> Schedule Review
          </button>
        }
      />

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {['all', 'pending', 'approved', 'rejected', 'applied'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition ${filter === f ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-7 h-7" />}
          title="No rent reviews scheduled"
          description="Schedule rent reviews for leases to track proposed rent changes and approvals."
          action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">Schedule Review</button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => {
            const lease = leases.find((l) => l.id === review.lease_id);
            const prop = lease ? properties.find((p) => p.id === lease.property_id) : null;
            const increase = review.current_rent > 0 ? ((Number(review.proposed_rent) - Number(review.current_rent)) / Number(review.current_rent)) * 100 : 0;
            const days = daysUntil(review.review_date);
            return (
              <div key={review.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={statusColor(review.status)}>{review.status}</Badge>
                      {review.status === 'pending' && (
                        <span className="text-slate-500 text-xs">
                          {days >= 0 ? `in ${days} days` : `${Math.abs(days)} days ago`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-sm">{prop?.address ?? 'Unknown property'}</h3>
                    <p className="text-slate-500 text-xs">Review date: {formatDate(review.review_date)}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Current</p>
                      <p className="text-slate-300 text-sm font-medium">{formatCurrency(Number(review.current_rent))}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-600" />
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Proposed</p>
                      <p className="text-white text-sm font-bold">{formatCurrency(Number(review.proposed_rent))}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Change</p>
                      <p className={`text-sm font-bold ${increase > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        +{increase.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {review.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(review, 'approved', Number(review.proposed_rent))} className="p-2 text-slate-500 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateStatus(review, 'rejected')} className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition" title="Reject">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {review.status === 'approved' && (
                      <button onClick={() => updateStatus(review, 'applied')} className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-medium rounded-lg transition">
                        Mark Applied
                      </button>
                    )}
                    <button onClick={() => { setEditing(review); setShowForm(true); }} className="p-2 text-slate-500 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition opacity-0 group-hover:opacity-100">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                    <button onClick={() => handleDelete(review.id)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </div>
                </div>
                {review.notes && <p className="text-slate-500 text-sm mt-3 pt-3 border-t border-slate-800/50">{review.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ReviewForm
          review={editing}
          leases={leases}
          properties={properties}
          agencyId={agencyId!}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function ReviewForm({ review, leases, properties, agencyId, onClose, onSaved }: { review: RentReview | null; leases: Lease[]; properties: Property[]; agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    lease_id: review?.lease_id ?? '',
    review_date: review?.review_date ?? new Date().toISOString().slice(0, 10),
    current_rent: review?.current_rent ?? 0,
    proposed_rent: review?.proposed_rent ?? 0,
    approved_rent: review?.approved_rent ?? '',
    status: review?.status ?? 'pending',
    notes: review?.notes ?? '',
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
      review_date: form.review_date,
      current_rent: Number(form.current_rent),
      proposed_rent: Number(form.proposed_rent),
      approved_rent: form.approved_rent ? Number(form.approved_rent) : null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error: err } = review ? await supabase.from('rent_reviews').update(payload).eq('id', review.id) : await supabase.from('rent_reviews').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <Modal title={review ? 'Edit Rent Review' : 'Schedule Rent Review'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Lease / Property</label>
          <select required value={form.lease_id} onChange={(e) => {
            const lease = leases.find((l) => l.id === e.target.value);
            setForm({ ...form, lease_id: e.target.value, current_rent: lease ? Number(lease.rent_amount) : 0 });
          }} className={inputCls}>
            <option value="">Select lease</option>
            {leases.map((l) => {
              const prop = properties.find((p) => p.id === l.property_id);
              return <option key={l.id} value={l.id}>{prop?.address ?? 'Unknown'} — {formatCurrency(Number(l.rent_amount))}/mo</option>;
            })}
          </select>
        </div>
        <div>
          <label className={labelCls}>Review Date</label>
          <input type="date" required value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Current Rent ($)</label>
            <input type="number" min="0" step="0.01" required value={form.current_rent} onChange={(e) => setForm({ ...form, current_rent: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Proposed Rent ($)</label>
            <input type="number" min="0" step="0.01" required value={form.proposed_rent} onChange={(e) => setForm({ ...form, proposed_rent: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Approved Rent ($)</label>
            <input type="number" min="0" step="0.01" value={form.approved_rent} onChange={(e) => setForm({ ...form, approved_rent: e.target.value })} className={inputCls} placeholder="Not yet approved" />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="applied">Applied</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} placeholder="Optional notes about the review" />
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {review ? 'Save Changes' : 'Schedule Review'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
