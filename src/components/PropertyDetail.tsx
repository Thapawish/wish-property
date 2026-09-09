import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Home,
  Bed,
  Bath,
  Car,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Badge, EmptyState, Modal, Spinner, statusColor } from '@/components/ui';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { exportToCsv } from '@/lib/csv';
import type {
  Property,
  Contact,
  Lease,
  Payment,
  RentReview,
  PropertyTask,
  PropertyInspection,
  PropertyForm,
} from '@/lib/supabase';

type TabKey = 'overview' | 'lease' | 'lease-tasks' | 'transactions' | 'inspections' | 'reports' | 'forms';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'lease', label: 'Lease' },
  { key: 'lease-tasks', label: 'Lease Tasks' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'reports', label: 'Reports' },
  { key: 'forms', label: 'Forms' },
];

const inputCls = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

export function PropertyDetail({
  property,
  landlords,
  onBack,
}: {
  property: Property;
  landlords: Contact[];
  onBack: () => void;
}) {
  const { membership, isAdmin } = useAuth();
  const agencyId = membership?.agency_id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);

  const [lease, setLease] = useState<Lease | null>(null);
  const [tenant, setTenant] = useState<Contact | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentReviews, setRentReviews] = useState<RentReview[]>([]);
  const [tasks, setTasks] = useState<PropertyTask[]>([]);
  const [inspections, setInspections] = useState<PropertyInspection[]>([]);
  const [forms, setForms] = useState<PropertyForm[]>([]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PropertyTask | null>(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<PropertyInspection | null>(null);
  const [showFormForm, setShowFormForm] = useState(false);
  const [editingForm, setEditingForm] = useState<PropertyForm | null>(null);

  const landlord = landlords.find((l) => l.id === property.landlord_id) ?? null;

  const loadData = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    const [{ data: leaseData }, { data: tenantData }, { data: payData }, { data: reviewData }, { data: taskData }, { data: inspData }, { data: formData }] = await Promise.all([
      supabase.from('leases').select('*').eq('property_id', property.id).eq('agency_id', agencyId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('contacts').select('*').eq('agency_id', agencyId).eq('type', 'tenant'),
      supabase.from('payments').select('*').eq('agency_id', agencyId).order('due_date', { ascending: false }),
      supabase.from('rent_reviews').select('*').eq('agency_id', agencyId).order('review_date', { ascending: false }),
      supabase.from('property_tasks').select('*').eq('property_id', property.id).order('created_at', { ascending: false }),
      supabase.from('property_inspections').select('*').eq('property_id', property.id).order('inspection_date', { ascending: false }),
      supabase.from('property_forms').select('*').eq('property_id', property.id).order('created_at', { ascending: false }),
    ]);

    setLease(leaseData as Lease | null);
    setTenant(leaseData?.tenant_id ? (tenantData?.find((t) => t.id === leaseData.tenant_id) ?? null) : null);
    setPayments((payData ?? []).filter((p) => leaseData && p.lease_id === leaseData.id));
    setRentReviews((reviewData ?? []).filter((r) => leaseData && r.lease_id === leaseData.id));
    setTasks(taskData ?? []);
    setInspections(inspData ?? []);
    setForms(formData ?? []);
    setLoading(false);
  }, [agencyId, property.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Handlers ----

  async function handleDeleteTask(id: string) {
    const { error } = await supabase.from('property_tasks').delete().eq('id', id);
    if (error) toast('Could not delete task.', 'error');
    else { toast('Task deleted.', 'success'); loadData(); }
  }

  async function toggleTaskStatus(task: PropertyTask) {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase.from('property_tasks').update({ status: next }).eq('id', task.id);
    if (error) toast('Could not update task.', 'error');
    else loadData();
  }

  async function handleDeleteInspection(id: string) {
    const { error } = await supabase.from('property_inspections').delete().eq('id', id);
    if (error) toast('Could not delete inspection.', 'error');
    else { toast('Inspection deleted.', 'success'); loadData(); }
  }

  async function handleDeleteForm(id: string) {
    const { error } = await supabase.from('property_forms').delete().eq('id', id);
    if (error) toast('Could not delete form.', 'error');
    else { toast('Form deleted.', 'success'); loadData(); }
  }

  async function markPaymentPaid(payment: Payment) {
    const { error } = await supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', payment.id);
    if (error) toast('Could not mark payment as paid.', 'error');
    else { toast('Payment marked as paid.', 'success'); loadData(); }
  }

  // ---- Render helpers ----

  const features: { label: string; value: boolean }[] = [
    { label: 'Air Con', value: property.has_aircon },
    { label: 'Garden', value: property.has_garden },
    { label: 'Built-ins', value: property.has_built_ins },
    { label: 'Internal Laundry', value: property.has_internal_laundry },
    { label: 'Balcony', value: property.has_balcony },
    { label: 'Gas Cooking', value: property.has_gas_cooking },
    { label: 'Electric Cooking', value: property.has_electric_cooking },
    { label: 'Dishwasher', value: property.has_dishwasher },
    { label: 'Stairs', value: property.has_stairs },
    { label: 'Lift', value: property.has_lift },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium mb-4 transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Properties
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{property.address}</h2>
              <Badge color={statusColor(property.status)}>{property.status}</Badge>
            </div>
            <p className="text-slate-500 text-sm">
              {[property.suburb, property.state, property.postcode].filter(Boolean).join(', ') || 'No location set'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-sm">
            <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" /> {property.bedrooms}</span>
            <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" /> {property.bathrooms}</span>
            <span className="flex items-center gap-1.5"><Car className="w-4 h-4" /> {property.parking}</span>
            <span className="capitalize text-slate-500">{property.property_type}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab property={property} landlord={landlord} lease={lease} tenant={tenant} features={features} payments={payments} />}
          {activeTab === 'lease' && <LeaseTab lease={lease} tenant={tenant} payments={payments} />}
          {activeTab === 'lease-tasks' && (
            <LeaseTasksTab
              tasks={tasks}
              isAdmin={isAdmin}
              onAdd={() => { setEditingTask(null); setShowTaskForm(true); }}
              onEdit={(t) => { setEditingTask(t); setShowTaskForm(true); }}
              onDelete={handleDeleteTask}
              onToggle={toggleTaskStatus}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsTab payments={payments} onMarkPaid={markPaymentPaid} />
          )}
          {activeTab === 'inspections' && (
            <InspectionsTab
              inspections={inspections}
              isAdmin={isAdmin}
              onAdd={() => { setEditingInspection(null); setShowInspectionForm(true); }}
              onEdit={(i) => { setEditingInspection(i); setShowInspectionForm(true); }}
              onDelete={handleDeleteInspection}
            />
          )}
          {activeTab === 'reports' && <ReportsTab property={property} lease={lease} payments={payments} rentReviews={rentReviews} inspections={inspections} tasks={tasks} />}
          {activeTab === 'forms' && (
            <FormsTab
              forms={forms}
              isAdmin={isAdmin}
              onAdd={() => { setEditingForm(null); setShowFormForm(true); }}
              onEdit={(f) => { setEditingForm(f); setShowFormForm(true); }}
              onDelete={handleDeleteForm}
            />
          )}
        </>
      )}

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          agencyId={agencyId!}
          propertyId={property.id}
          onClose={() => setShowTaskForm(false)}
          onSaved={() => { setShowTaskForm(false); loadData(); }}
        />
      )}
      {showInspectionForm && (
        <InspectionForm
          inspection={editingInspection}
          agencyId={agencyId!}
          propertyId={property.id}
          onClose={() => setShowInspectionForm(false)}
          onSaved={() => { setShowInspectionForm(false); loadData(); }}
        />
      )}
      {showFormForm && (
        <FormForm
          form={editingForm}
          agencyId={agencyId!}
          propertyId={property.id}
          onClose={() => setShowFormForm(false)}
          onSaved={() => { setShowFormForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

// ============ OVERVIEW TAB ============

function OverviewTab({
  property,
  landlord,
  lease,
  tenant,
  features,
  payments,
}: {
  property: Property;
  landlord: Contact | null;
  lease: Lease | null;
  tenant: Contact | null;
  features: { label: string; value: boolean }[];
  payments: Payment[];
}) {
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);

  const stats = [
    { label: 'Rent', value: lease ? formatCurrency(Number(lease.rent_amount)) : '—', sub: lease?.payment_frequency ?? '' },
    { label: 'Bond', value: lease ? formatCurrency(Number(lease.bond_amount)) : '—' },
    { label: 'Collected', value: formatCurrency(totalPaid) },
    { label: 'Outstanding', value: formatCurrency(totalPending) },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs mb-1">{s.label}</p>
            <p className="text-slate-800 text-lg font-bold">{s.value}</p>
            {s.sub && <p className="text-slate-500 text-xs capitalize">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Property Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-blue-600" />
            <h3 className="text-slate-800 font-semibold">Property Details</h3>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="text-slate-700 capitalize">{property.property_type}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="text-slate-700 capitalize">{property.property_category ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Aspect</dt><dd className="text-slate-700 capitalize">{(property.property_aspect ?? '—').replace('_', '-')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Ownership</dt><dd className="text-slate-700 capitalize">{property.ownership_type ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Split Payments</dt><dd className="text-slate-700">{property.split_payments ? 'Yes' : 'No'}</dd></div>
          </dl>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-slate-500 text-xs mb-2">Features</p>
            <div className="flex flex-wrap gap-1.5">
              {features.map((f) => (
                <span key={f.label} className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.value ? 'bg-blue-600/10 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Lease & Tenant */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-slate-800 font-semibold">Lease & Tenant</h3>
          </div>
          {lease ? (
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Tenant</dt><dd className="text-slate-700">{tenant ? `${tenant.first_name} ${tenant.last_name}` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Term</dt><dd className="text-slate-700">{formatDate(lease.start_date)} → {formatDate(lease.end_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><Badge color={statusColor(lease.status)}>{lease.status}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Periodic</dt><dd className="text-slate-700">{lease.is_periodic ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Paid Until</dt><dd className="text-slate-700">{formatDate(lease.paid_until)}</dd></div>
            </dl>
          ) : (
            <p className="text-slate-500 text-sm py-4">No active lease for this property.</p>
          )}
          {landlord && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-slate-500 text-xs mb-1">Landlord</p>
              <p className="text-slate-700 text-sm">{landlord.first_name} {landlord.last_name}</p>
              {landlord.email && <p className="text-slate-500 text-xs">{landlord.email}</p>}
              {landlord.phone && <p className="text-slate-500 text-xs">{landlord.phone}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Management Fees */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-slate-800 font-semibold">Management Fees & Settings</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <FeeItem label="Mgmt Fee %" value={property.management_fee_percent != null ? `${property.management_fee_percent}%` : '—'} />
          <FeeItem label="Letting Fee" value={property.letting_fee != null ? formatCurrency(Number(property.letting_fee)) : '—'} />
          <FeeItem label="Renewal Fee" value={property.lease_renewal_fee != null ? formatCurrency(Number(property.lease_renewal_fee)) : '—'} />
          <FeeItem label="Advertising" value={property.advertising_fee != null ? formatCurrency(Number(property.advertising_fee)) : '—'} />
          <FeeItem label="Maint. Spend Limit" value={property.approved_maintenance_spend != null ? formatCurrency(Number(property.approved_maintenance_spend)) : '—'} />
          <FeeItem label="Admin Fee" value={property.admin_fee != null ? formatCurrency(Number(property.admin_fee)) : '—'} />
        </div>
      </div>
    </div>
  );
}

function FeeItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-slate-700 font-medium">{value}</p>
    </div>
  );
}

// ============ LEASE TASKS TAB ============

function LeaseTasksTab({
  tasks,
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: {
  tasks: PropertyTask[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (t: PropertyTask) => void;
  onDelete: (id: string) => void;
  onToggle: (t: PropertyTask) => void;
}) {
  const priorityColor: Record<string, 'red' | 'amber' | 'slate'> = { high: 'red', medium: 'amber', low: 'slate' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-semibold">Lease Tasks</h3>
        <button onClick={onAdd} className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-slate-800 text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={<Check className="w-7 h-7" />} title="No tasks" description="Track lease-related tasks like renewals, inspections, and follow-ups." />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 group">
              <button
                onClick={() => onToggle(task)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                  task.status === 'completed' ? 'bg-blue-600 border-blue-600' : 'border-slate-600 hover:border-blue-600'
                }`}
              >
                {task.status === 'completed' && <Check className="w-3 h-3 text-slate-800" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</p>
                  <Badge color={priorityColor[task.priority]}>{task.priority}</Badge>
                </div>
                {task.description && <p className="text-slate-500 text-sm mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  {task.due_date && (
                    <span className={`flex items-center gap-1 ${daysUntil(task.due_date) < 0 && task.status !== 'completed' ? 'text-red-400' : ''}`}>
                      <Calendar className="w-3 h-3" /> {formatDate(task.due_date)}
                    </span>
                  )}
                  {task.assigned_to && <span>Assigned: {task.assigned_to}</span>}
                  <span className="capitalize">{task.status.replace('_', ' ')}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => onEdit(task)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-50 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskForm({
  task,
  agencyId,
  propertyId,
  onClose,
  onSaved,
}: {
  task: PropertyTask | null;
  agencyId: string;
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    due_date: task?.due_date ?? '',
    priority: task?.priority ?? 'medium',
    assigned_to: task?.assigned_to ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      agency_id: agencyId,
      property_id: propertyId,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
    };
    const { error: err } = task
      ? await supabase.from('property_tasks').update(payload).eq('id', task.id)
      : await supabase.from('property_tasks').insert({ ...payload, status: 'pending' });
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  return (
    <Modal title={task ? 'Edit Task' : 'Add Task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as 'low' | 'medium' | 'high' })} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Assigned To</label>
          <input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className={inputCls} placeholder="Name" />
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-slate-800 font-medium rounded-lg transition">{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-50 hover:bg-slate-700 text-slate-700 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ============ TRANSACTIONS TAB ============

function TransactionsTab({ payments, onMarkPaid }: { payments: Payment[]; onMarkPaid: (p: Payment) => void }) {
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2"><Check className="w-4 h-4 text-emerald-400" /></div>
          <p className="text-slate-500 text-xs">Collected</p>
          <p className="text-slate-800 text-lg font-bold">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2"><Clock className="w-4 h-4 text-amber-400" /></div>
          <p className="text-slate-500 text-xs">Pending</p>
          <p className="text-slate-800 text-lg font-bold">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center mb-2"><AlertCircle className="w-4 h-4 text-red-400" /></div>
          <p className="text-slate-500 text-xs">Overdue</p>
          <p className="text-slate-800 text-lg font-bold">{formatCurrency(totalOverdue)}</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState icon={<TrendingUp className="w-7 h-7" />} title="No transactions" description="Payments for this property's lease will appear here." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wider">Due Date</th>
                  <th className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wider">Paid</th>
                  <th className="px-5 py-3 text-slate-500 text-xs font-medium uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200/50 hover:bg-slate-50/30 transition group">
                    <td className="px-5 py-4 text-slate-700 text-sm">{formatDate(p.due_date)}</td>
                    <td className="px-5 py-4 text-slate-200 text-sm font-medium">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-5 py-4"><Badge color={statusColor(p.status)}>{p.status}</Badge></td>
                    <td className="px-5 py-4 text-slate-500 text-sm">{formatDate(p.paid_date)}</td>
                    <td className="px-5 py-4 text-slate-500 text-sm">{p.method ?? '—'}</td>
                    <td className="px-5 py-4 text-right">
                      {p.status !== 'paid' && (
                        <button onClick={() => onMarkPaid(p)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg transition opacity-0 group-hover:opacity-100">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ INSPECTIONS TAB ============

function InspectionsTab({
  inspections,
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
}: {
  inspections: PropertyInspection[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (i: PropertyInspection) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-semibold">Inspections</h3>
        <button onClick={onAdd} className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-slate-800 text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Schedule Inspection
        </button>
      </div>
      {inspections.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="w-7 h-7" />} title="No inspections" description="Schedule routine, entry, and exit inspections for this property." />
      ) : (
        <div className="space-y-3">
          {inspections.map((insp) => (
            <div key={insp.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-200 text-sm font-medium capitalize">{insp.type} Inspection</span>
                    <Badge color={statusColor(insp.status)}>{insp.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(insp.inspection_date)}</span>
                    {insp.inspector && <span>Inspector: {insp.inspector}</span>}
                  </div>
                  {insp.notes && <p className="text-slate-500 text-sm mt-2">{insp.notes}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => onEdit(insp)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(insp.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-50 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InspectionForm({
  inspection,
  agencyId,
  propertyId,
  onClose,
  onSaved,
}: {
  inspection: PropertyInspection | null;
  agencyId: string;
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    inspection_date: inspection?.inspection_date ?? new Date().toISOString().slice(0, 10),
    type: inspection?.type ?? 'routine',
    status: inspection?.status ?? 'scheduled',
    inspector: inspection?.inspector ?? '',
    notes: inspection?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      agency_id: agencyId,
      property_id: propertyId,
      inspection_date: form.inspection_date,
      type: form.type,
      status: form.status,
      inspector: form.inspector || null,
      notes: form.notes || null,
    };
    const { error: err } = inspection
      ? await supabase.from('property_inspections').update(payload).eq('id', inspection.id)
      : await supabase.from('property_inspections').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  return (
    <Modal title={inspection ? 'Edit Inspection' : 'Schedule Inspection'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" required value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PropertyInspection['type'] })} className={inputCls}>
              <option value="routine">Routine</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
              <option value="special">Special</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PropertyInspection['status'] })} className={inputCls}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Inspector</label>
            <input value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} className={inputCls} placeholder="Name" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={3} />
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-slate-800 font-medium rounded-lg transition">{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-50 hover:bg-slate-700 text-slate-700 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ============ REPORTS TAB ============

function ReportsTab({
  property,
  lease,
  payments,
  rentReviews,
  inspections,
  tasks,
}: {
  property: Property;
  lease: Lease | null;
  payments: Payment[];
  rentReviews: RentReview[];
  inspections: PropertyInspection[];
  tasks: PropertyTask[];
}) {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const completedInspections = inspections.filter((i) => i.status === 'completed').length;

  function exportPayments() {
    exportToCsv(`${property.address}-transactions.csv`, [
      { header: 'Due Date', value: (p) => p.due_date },
      { header: 'Amount', value: (p) => p.amount },
      { header: 'Status', value: (p) => p.status },
      { header: 'Paid Date', value: (p) => p.paid_date ?? '' },
      { header: 'Method', value: (p) => p.method ?? '' },
      { header: 'Reference', value: (p) => p.reference ?? '' },
    ], payments);
  }

  function exportReviews() {
    exportToCsv(`${property.address}-rent-reviews.csv`, [
      { header: 'Review Date', value: (r) => r.review_date },
      { header: 'Current Rent', value: (r) => r.current_rent },
      { header: 'Proposed Rent', value: (r) => r.proposed_rent },
      { header: 'Approved Rent', value: (r) => r.approved_rent ?? '' },
      { header: 'Status', value: (r) => r.status },
      { header: 'Notes', value: (r) => r.notes ?? '' },
    ], rentReviews);
  }

  function exportInspections() {
    exportToCsv(`${property.address}-inspections.csv`, [
      { header: 'Date', value: (i) => i.inspection_date },
      { header: 'Type', value: (i) => i.type },
      { header: 'Status', value: (i) => i.status },
      { header: 'Inspector', value: (i) => i.inspector ?? '' },
      { header: 'Notes', value: (i) => i.notes ?? '' },
    ], inspections);
  }

  const reports = [
    { label: 'Transactions', count: payments.length, desc: 'All payment records', onExport: exportPayments },
    { label: 'Rent Reviews', count: rentReviews.length, desc: 'Rent review history', onExport: exportReviews },
    { label: 'Inspections', count: inspections.length, desc: `${completedInspections} completed`, onExport: exportInspections },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-slate-500 text-xs">Lease Status</p>
          <p className="text-slate-800 text-lg font-bold capitalize">{lease?.status ?? 'None'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-slate-500 text-xs">Transactions</p>
          <p className="text-slate-800 text-lg font-bold">{payments.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-slate-500 text-xs">Tasks Completed</p>
          <p className="text-slate-800 text-lg font-bold">{completedTasks}/{tasks.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-slate-500 text-xs">Inspections</p>
          <p className="text-slate-800 text-lg font-bold">{inspections.length}</p>
        </div>
      </div>

      <div>
        <h3 className="text-slate-800 font-semibold mb-4">Export Reports</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {reports.map((r) => (
            <div key={r.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="text-slate-800 font-medium text-sm">{r.label}</h4>
              </div>
              <p className="text-slate-500 text-xs mb-3">{r.desc} — {r.count} records</p>
              <button
                onClick={r.onExport}
                disabled={r.count === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      {lease && rentReviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-slate-800 font-semibold mb-4">Recent Rent Reviews</h3>
          <div className="space-y-2">
            {rentReviews.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-200/50 pb-2">
                <span className="text-slate-500">{formatDate(r.review_date)}</span>
                <span className="text-slate-200">{formatCurrency(Number(r.current_rent))} → {formatCurrency(Number(r.proposed_rent))}</span>
                <Badge color={statusColor(r.status)}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ FORMS TAB ============

function FormsTab({
  forms,
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
}: {
  forms: PropertyForm[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (f: PropertyForm) => void;
  onDelete: (id: string) => void;
}) {
  const formTypeLabels: Record<string, string> = {
    lease_agreement: 'Lease Agreement',
    renewal_notice: 'Renewal Notice',
    entry_notice: 'Entry Notice',
    exit_report: 'Exit Report',
    bond_form: 'Bond Form',
    general: 'General',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-semibold">Forms & Documents</h3>
        <button onClick={onAdd} className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-slate-800 text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Form
        </button>
      </div>
      {forms.length === 0 ? (
        <EmptyState icon={<FileText className="w-7 h-7" />} title="No forms" description="Track lease agreements, notices, and other documents for this property." />
      ) : (
        <div className="space-y-3">
          {forms.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-200 text-sm font-medium">{f.title}</span>
                    <Badge color={statusColor(f.status)}>{f.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="capitalize">{formTypeLabels[f.form_type] ?? f.form_type}</span>
                    {f.sent_date && <span>Sent: {formatDate(f.sent_date)}</span>}
                    {f.signed_date && <span>Signed: {formatDate(f.signed_date)}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => onEdit(f)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(f.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-50 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormForm({
  form,
  agencyId,
  propertyId,
  onClose,
  onSaved,
}: {
  form: PropertyForm | null;
  agencyId: string;
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState({
    form_type: form?.form_type ?? 'general',
    title: form?.title ?? '',
    status: form?.status ?? 'draft',
    sent_date: form?.sent_date ?? '',
    signed_date: form?.signed_date ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      agency_id: agencyId,
      property_id: propertyId,
      form_type: state.form_type,
      title: state.title,
      status: state.status,
      sent_date: state.sent_date || null,
      signed_date: state.signed_date || null,
    };
    const { error: err } = form
      ? await supabase.from('property_forms').update(payload).eq('id', form.id)
      : await supabase.from('property_forms').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  return (
    <Modal title={form ? 'Edit Form' : 'Add Form'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input required value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select value={state.form_type} onChange={(e) => setState({ ...state, form_type: e.target.value as PropertyForm['form_type'] })} className={inputCls}>
              <option value="lease_agreement">Lease Agreement</option>
              <option value="renewal_notice">Renewal Notice</option>
              <option value="entry_notice">Entry Notice</option>
              <option value="exit_report">Exit Report</option>
              <option value="bond_form">Bond Form</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={state.status} onChange={(e) => setState({ ...state, status: e.target.value as PropertyForm['status'] })} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="signed">Signed</option>
              <option value="filed">Filed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sent Date</label>
            <input type="date" value={state.sent_date} onChange={(e) => setState({ ...state, sent_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Signed Date</label>
            <input type="date" value={state.signed_date} onChange={(e) => setState({ ...state, signed_date: e.target.value })} className={inputCls} />
          </div>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-slate-800 font-medium rounded-lg transition">{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-50 hover:bg-slate-700 text-slate-700 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
