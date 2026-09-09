import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  FileWarning,
  ClipboardList,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Circle,
  Clock3,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { Spinner } from '@/components/ui';
import type { Lease, Payment, Property, PropertyForm, PropertyInspection, PropertyTask, RentReview } from '@/lib/supabase';

type Priority = 'high' | 'medium' | 'low';

type ActionItem = {
  id: string;
  type: 'overdue_payment' | 'expiring_lease' | 'pending_review' | 'pending_task' | 'in_progress_task' | 'scheduled_inspection' | 'pending_form' | 'expiring_form';
  title: string;
  subtitle: string;
  due: string | null;
  amount: number | null;
  priority: Priority;
  status: string;
  property_id: string;
  lease_id: string | null;
};

const TYPE_META: Record<ActionItem['type'], { label: string; icon: typeof AlertTriangle; color: string; bg: string }> = {
  overdue_payment: { label: 'Overdue Payment', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  expiring_lease: { label: 'Expiring Lease', icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
  pending_review: { label: 'Rent Review', icon: FileWarning, color: 'text-blue-600', bg: 'bg-blue-50' },
  pending_task: { label: 'Task', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50' },
  in_progress_task: { label: 'Task In Progress', icon: Clock3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  scheduled_inspection: { label: 'Inspection', icon: ClipboardCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
  pending_form: { label: 'Form', icon: FileWarning, color: 'text-purple-600', bg: 'bg-purple-50' },
  expiring_form: { label: 'Form Expiring', icon: FileWarning, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export function ActionCenterPage() {
  const { membership } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentReviews, setRentReviews] = useState<RentReview[]>([]);
  const [tasks, setTasks] = useState<PropertyTask[]>([]);
  const [inspections, setInspections] = useState<PropertyInspection[]>([]);
  const [forms, setForms] = useState<PropertyForm[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!membership?.agency_id) return;
    const agencyId = membership.agency_id;

    (async () => {
      const [propsResult, leasesResult, paymentsResult, reviewsResult, tasksResult, inspectionsResult, formsResult] = await Promise.all([
        supabase.from('properties').select('*').eq('agency_id', agencyId),
        supabase.from('leases').select('*').eq('agency_id', agencyId),
        supabase.from('payments').select('*').eq('agency_id', agencyId),
        supabase.from('rent_reviews').select('*').eq('agency_id', agencyId),
        supabase.from('property_tasks').select('*').eq('agency_id', agencyId),
        supabase.from('property_inspections').select('*').eq('agency_id', agencyId),
        supabase.from('property_forms').select('*').eq('agency_id', agencyId),
      ]);

      setProperties(propsResult.data ?? []);
      setLeases(leasesResult.data ?? []);
      setPayments(paymentsResult.data ?? []);
      setRentReviews(reviewsResult.data ?? []);
      setTasks(tasksResult.data ?? []);
      setInspections(inspectionsResult.data ?? []);
      setForms(formsResult.data ?? []);
      setLoading(false);
    })();
  }, [membership?.agency_id]);

  const propertyMap = useMemo(() => new Map(properties.map((property) => [property.id, property])), [properties]);
  const leaseMap = useMemo(() => new Map(leases.map((lease) => [lease.id, lease])), [leases]);

  const actionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    payments.filter((payment) => payment.status === 'overdue').forEach((payment) => {
      const lease = leaseMap.get(payment.lease_id);
      const property = lease ? propertyMap.get(lease.property_id) : null;
      items.push({
        id: `payment-${payment.id}`,
        type: 'overdue_payment',
        title: property?.address ?? 'Unknown property',
        subtitle: `Overdue by ${Math.abs(daysUntil(payment.due_date))} days — was due ${formatDate(payment.due_date)}`,
        due: payment.due_date,
        amount: Number(payment.amount),
        priority: 'high',
        status: 'overdue',
        property_id: lease?.property_id ?? '',
        lease_id: payment.lease_id,
      });
    });

    leases.filter((lease) => lease.status === 'active').forEach((lease) => {
      const days = daysUntil(lease.end_date);
      if (days >= 0 && days <= 60) {
        const property = propertyMap.get(lease.property_id);
        items.push({
          id: `lease-${lease.id}`,
          type: 'expiring_lease',
          title: property?.address ?? 'Unknown property',
          subtitle: `Lease ends ${formatDate(lease.end_date)}`,
          due: lease.end_date,
          amount: Number(lease.rent_amount),
          priority: days <= 14 ? 'high' : days <= 30 ? 'medium' : 'low',
          status: 'active',
          property_id: lease.property_id,
          lease_id: lease.id,
        });
      }
    });

    rentReviews.filter((review) => review.status === 'pending').forEach((review) => {
      const lease = leaseMap.get(review.lease_id);
      const property = lease ? propertyMap.get(lease.property_id) : null;
      const days = daysUntil(review.review_date);
      items.push({
        id: `review-${review.id}`,
        type: 'pending_review',
        title: property?.address ?? 'Unknown property',
        subtitle: `Rent review ${formatDate(review.review_date)} — proposed ${formatCurrency(Number(review.proposed_rent))}`,
        due: review.review_date,
        amount: Number(review.proposed_rent),
        priority: days < 0 ? 'high' : days <= 14 ? 'medium' : 'low',
        status: 'pending',
        property_id: lease?.property_id ?? '',
        lease_id: review.lease_id,
      });
    });

    tasks.forEach((task) => {
      if (task.status === 'completed') return;
      const property = propertyMap.get(task.property_id);
      const isOverdue = task.due_date ? daysUntil(task.due_date) < 0 : false;
      items.push({
        id: `task-${task.id}`,
        type: task.status === 'in_progress' ? 'in_progress_task' : 'pending_task',
        title: property?.address ?? 'Unknown property',
        subtitle: task.title + (task.assigned_to ? ` — ${task.assigned_to}` : ''),
        due: task.due_date,
        amount: null,
        priority: task.priority === 'high' || isOverdue ? 'high' : task.priority === 'medium' ? 'medium' : 'low',
        status: task.status,
        property_id: task.property_id,
        lease_id: null,
      });
    });

    inspections.filter((inspection) => inspection.status === 'scheduled').forEach((inspection) => {
      const property = propertyMap.get(inspection.property_id);
      const days = daysUntil(inspection.inspection_date);
      items.push({
        id: `inspection-${inspection.id}`,
        type: 'scheduled_inspection',
        title: property?.address ?? 'Unknown property',
        subtitle: `${inspection.type} inspection ${formatDate(inspection.inspection_date)}${inspection.inspector ? ` — ${inspection.inspector}` : ''}`,
        due: inspection.inspection_date,
        amount: null,
        priority: days < 0 ? 'high' : days <= 7 ? 'medium' : 'low',
        status: 'scheduled',
        property_id: inspection.property_id,
        lease_id: null,
      });
    });

    forms.forEach((form) => {
      if (form.status === 'filed' || form.status === 'signed') return;
      const property = propertyMap.get(form.property_id);
      items.push({
        id: `form-${form.id}`,
        type: form.status === 'expired' ? 'expiring_form' : 'pending_form',
        title: property?.address ?? 'Unknown property',
        subtitle: `${form.title} — ${form.status}`,
        due: form.sent_date,
        amount: null,
        priority: form.status === 'expired' ? 'high' : 'medium',
        status: form.status,
        property_id: form.property_id,
        lease_id: null,
      });
    });

    return items.sort((a, b) => {
      const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (a.due && b.due) return new Date(a.due).getTime() - new Date(b.due).getTime();
      return 0;
    });
  }, [payments, leases, rentReviews, tasks, inspections, forms, propertyMap, leaseMap]);

  const filteredItems = useMemo(() => {
    return actionItems.filter((item) => {
      if (dismissed.has(item.id)) return false;
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query);
      }
      return true;
    });
  }, [actionItems, filterType, filterPriority, search, dismissed]);

  const counts = useMemo(() => {
    const countMap = new Map<string, number>();
    actionItems.forEach((item) => {
      if (dismissed.has(item.id)) return;
      countMap.set(item.type, (countMap.get(item.type) ?? 0) + 1);
    });
    return countMap;
  }, [actionItems, dismissed]);

  const totalHigh = actionItems.filter((item) => !dismissed.has(item.id) && item.priority === 'high').length;
  const totalMedium = actionItems.filter((item) => !dismissed.has(item.id) && item.priority === 'medium').length;
  const totalLow = actionItems.filter((item) => !dismissed.has(item.id) && item.priority === 'low').length;

  function dismissItem(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  async function completeTask(taskId: string) {
    const { error } = await supabase.from('property_tasks').update({ status: 'completed' }).eq('id', taskId);
    if (!error) {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task)));
    }
  }

  async function markPaymentPaid(paymentId: string) {
    const { error } = await supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', paymentId);
    if (!error) {
      setPayments((prev) => prev.map((payment) => (payment.id === paymentId ? { ...payment, status: 'paid' } : payment)));
    }
  }

  async function completeInspection(inspectionId: string) {
    const { error } = await supabase.from('property_inspections').update({ status: 'completed' }).eq('id', inspectionId);
    if (!error) {
      setInspections((prev) => prev.map((inspection) => (inspection.id === inspectionId ? { ...inspection, status: 'completed' } : inspection)));
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="min-h-full bg-[#f4f5f7] -m-4 p-4 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Action Centre</h1>
            <p className="mt-0.5 text-xs text-slate-500">All pending items across your portfolio in one place</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actions" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:w-56" />
            </label>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <SummaryCard label="High Priority" count={totalHigh} color="text-red-600" bg="bg-red-50" border="border-red-100" />
          <SummaryCard label="Medium Priority" count={totalMedium} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
          <SummaryCard label="Low Priority" count={totalLow} color="text-slate-600" bg="bg-slate-50" border="border-slate-100" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</button>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none">
            <option value="all">All Types</option>
            <option value="overdue_payment">Overdue Payments</option>
            <option value="expiring_lease">Expiring Leases</option>
            <option value="pending_review">Rent Reviews</option>
            <option value="pending_task">Pending Tasks</option>
            <option value="in_progress_task">In-Progress Tasks</option>
            <option value="scheduled_inspection">Inspections</option>
            <option value="pending_form">Forms</option>
            <option value="expiring_form">Expiring Forms</option>
          </select>
          <select value={filterPriority} onChange={(event) => setFilterPriority(event.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none">
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
            Show completed
          </label>
          {(filterType !== 'all' || filterPriority !== 'all' || search) && (
            <button onClick={() => { setFilterType('all'); setFilterPriority('all'); setSearch(''); }} className="text-xs font-medium text-blue-600 hover:text-blue-700">Clear filters</button>
          )}
          <span className="ml-auto text-xs text-slate-500">{filteredItems.length} action{filteredItems.length === 1 ? '' : 's'}</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"><CheckCircle2 className="h-7 w-7 text-emerald-500" /></div>
            <h2 className="text-sm font-semibold text-slate-700">All caught up</h2>
            <p className="mt-1 text-xs text-slate-500">No pending actions. Everything is under control.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Property / Description</th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Due</th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Priority</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  const isOverdue = item.due ? daysUntil(item.due) < 0 : false;
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg}`}><Icon className={`h-4 w-4 ${meta.color}`} /></div>
                          <span className="text-xs font-medium text-slate-700">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subtitle}</p>
                        {item.amount !== null && <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatCurrency(item.amount)}</p>}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {item.due ? (
                          <span className={`text-xs ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                            {formatDate(item.due)}
                            {isOverdue && <span className="ml-1 text-red-500">({Math.abs(daysUntil(item.due))}d overdue)</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[item.priority]}`}>{item.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.type === 'pending_task' || item.type === 'in_progress_task' ? (
                            <button onClick={() => completeTask(item.id.replace('task-', ''))} className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>
                          ) : item.type === 'overdue_payment' ? (
                            <button onClick={() => markPaymentPaid(item.id.replace('payment-', ''))} className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"><CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid</button>
                          ) : item.type === 'scheduled_inspection' ? (
                            <button onClick={() => completeInspection(item.id.replace('inspection-', ''))} className="flex items-center gap-1 rounded-md bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>
                          ) : (
                            <button className="flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">View <ArrowRight className="h-3.5 w-3.5" /></button>
                          )}
                          <button onClick={() => dismissItem(item.id)} title="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><Circle className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showCompleted && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Completed & Dismissed</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {tasks.filter((task) => task.status === 'completed').length === 0 && dismissed.size === 0 ? (
                <p className="text-xs text-slate-500">No completed or dismissed items.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.filter((task) => task.status === 'completed').map((task) => {
                    const property = propertyMap.get(task.property_id);
                    return (
                      <div key={task.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-slate-600">{property?.address ?? 'Property'} — {task.title}</span>
                      </div>
                    );
                  })}
                  {Array.from(dismissed).map((id) => (
                    <div key={id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <Circle className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Dismissed: {id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, count, color, bg, border }: { label: string; count: number; color: string; bg: string; border: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border ${border} ${bg} p-4`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
        <AlertTriangle className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{count}</p>
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
