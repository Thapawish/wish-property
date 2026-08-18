import { useEffect, useState } from 'react';
import { Home, Plus, Pencil, Trash2, Bed, Bath, Car, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { SearchToolbar, uniqueSuburbs, type FilterOption } from '@/components/SearchToolbar';
import { exportToCsv } from '@/lib/csv';
import { Badge, EmptyState, Modal, PageHeader, Spinner, statusColor } from '@/components/ui';
import type { Property, Contact } from '@/lib/supabase';

export function PropertiesPage() {
  const { membership, isAdmin } = useAuth();
  const agencyId = membership?.agency_id;
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlords, setLandlords] = useState<Contact[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [suburbFilter, setSuburbFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);

  const { toast } = useToast();

  async function loadData() {
    if (!agencyId) return;
    const [{ data: props, error: propsErr }, { data: contacts }] = await Promise.all([
      supabase.from('properties').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('agency_id', agencyId).eq('type', 'landlord'),
    ]);
    if (propsErr) toast('Could not load properties. Check your connection and try again.', 'error');
    setProperties(props ?? []);
    setLandlords(contacts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [agencyId]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this property? This will also remove related leases and payments.')) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      toast('Could not delete property. You may not have permission.', 'error');
    } else {
      toast('Property deleted.', 'success');
      loadData();
    }
  }

  if (loading) return <Spinner />;

  const statusOptions: FilterOption[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Leased', value: 'leased' },
    { label: 'Vacant', value: 'vacant' },
    { label: 'Pending', value: 'pending' },
  ];
  const suburbOptions = uniqueSuburbs(properties);

  const filtered = properties.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (suburbFilter !== 'all' && p.suburb !== suburbFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const landlord = landlords.find((l) => l.id === p.landlord_id);
      const haystack = [p.address, p.suburb, p.state, p.postcode, p.property_type, landlord ? `${landlord.first_name} ${landlord.last_name}` : '']
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  function clearFilters() {
    setSearch(''); setStatusFilter('all'); setSuburbFilter('all');
  }

  return (
    <div>
      <PageHeader
        title="Properties"
        description={`${properties.length} properties in your portfolio`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCsv('properties.csv', [
                { header: 'Address', value: (p) => p.address },
                { header: 'Suburb', value: (p) => p.suburb },
                { header: 'State', value: (p) => p.state },
                { header: 'Postcode', value: (p) => p.postcode },
                { header: 'Type', value: (p) => p.property_type },
                { header: 'Category', value: (p) => p.property_category },
                { header: 'Aspect', value: (p) => p.property_aspect },
                { header: 'Status', value: (p) => p.status },
                { header: 'Bedrooms', value: (p) => p.bedrooms },
                { header: 'Bathrooms', value: (p) => p.bathrooms },
                { header: 'Parking', value: (p) => p.parking },
                { header: 'Air Con', value: (p) => (p.has_aircon ? 'Yes' : 'No') },
                { header: 'Garden', value: (p) => (p.has_garden ? 'Yes' : 'No') },
                { header: 'Built-ins', value: (p) => (p.has_built_ins ? 'Yes' : 'No') },
                { header: 'Internal Laundry', value: (p) => (p.has_internal_laundry ? 'Yes' : 'No') },
                { header: 'Balcony', value: (p) => (p.has_balcony ? 'Yes' : 'No') },
                { header: 'Gas Cooking', value: (p) => (p.has_gas_cooking ? 'Yes' : 'No') },
                { header: 'Electric Cooking', value: (p) => (p.has_electric_cooking ? 'Yes' : 'No') },
                { header: 'Dishwasher', value: (p) => (p.has_dishwasher ? 'Yes' : 'No') },
                { header: 'Stairs', value: (p) => (p.has_stairs ? 'Yes' : 'No') },
                { header: 'Lift', value: (p) => (p.has_lift ? 'Yes' : 'No') },
                { header: 'Landlord', value: (p) => { const l = landlords.find((x) => x.id === p.landlord_id); return l ? `${l.first_name} ${l.last_name}` : ''; } },
                { header: 'Ownership Type', value: (p) => p.ownership_type },
                { header: 'Split Payments', value: (p) => (p.split_payments ? 'Yes' : 'No') },
                { header: 'Owner First Name', value: (p) => p.owner_first_name },
                { header: 'Owner Last Name', value: (p) => p.owner_last_name },
                { header: 'Owner Email', value: (p) => p.owner_email },
                { header: 'Owner Mobile', value: (p) => p.owner_mobile },
                { header: 'Mgmt Fee %', value: (p) => p.management_fee_percent },
                { header: 'Letting Fee', value: (p) => p.letting_fee },
                { header: 'Lease Renewal Fee', value: (p) => p.lease_renewal_fee },
                { header: 'Advertising Fee', value: (p) => p.advertising_fee },
                { header: 'Approved Maint Spend', value: (p) => p.approved_maintenance_spend },
                { header: 'Admin Fee', value: (p) => p.admin_fee },
                { header: 'Admin Fee Charge', value: (p) => p.admin_fee_charge_date },
                { header: 'No Admin Fee If Vacant', value: (p) => (p.do_not_charge_admin_fee_if_vacant ? 'Yes' : 'No') },
              ], filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </button>
          </div>
        }
      />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search address, suburb, landlord..."
        statusFilters={statusOptions}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        suburbFilters={suburbOptions}
        suburbValue={suburbFilter}
        onSuburbChange={setSuburbFilter}
        resultCount={filtered.length}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Home className="w-7 h-7" />}
          title="No properties yet"
          description="Add your first property to start managing your portfolio."
          action={
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">
              Add Property
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prop) => {
            const landlord = landlords.find((l) => l.id === prop.landlord_id);
            return (
              <div key={prop.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition group">
                <div className="flex items-start justify-between mb-3">
                  <Badge color={statusColor(prop.status)}>{prop.status}</Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => { setEditing(prop); setShowForm(true); }} className="p-1.5 text-slate-500 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                    <button onClick={() => handleDelete(prop.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-1">{prop.address}</h3>
                <p className="text-slate-500 text-sm mb-4">
                  {[prop.suburb, prop.state, prop.postcode].filter(Boolean).join(', ')}
                </p>
                <div className="flex items-center gap-4 text-slate-400 text-sm mb-4">
                  <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" /> {prop.bedrooms}</span>
                  <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" /> {prop.bathrooms}</span>
                  <span className="flex items-center gap-1.5"><Car className="w-4 h-4" /> {prop.parking}</span>
                  <span className="capitalize text-slate-500">{prop.property_type}</span>
                </div>
                {landlord && (
                  <div className="pt-3 border-t border-slate-800">
                    <p className="text-slate-500 text-xs">Landlord</p>
                    <p className="text-slate-300 text-sm">{landlord.first_name} {landlord.last_name}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PropertyForm
          property={editing}
          landlords={landlords}
          agencyId={agencyId!}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function PropertyForm({
  property,
  landlords,
  agencyId,
  onClose,
  onSaved,
}: {
  property: Property | null;
  landlords: Contact[];
  agencyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    address: property?.address ?? '',
    suburb: property?.suburb ?? '',
    state: property?.state ?? '',
    postcode: property?.postcode ?? '',
    property_type: property?.property_type ?? 'house',
    status: property?.status ?? 'vacant',
    bedrooms: property?.bedrooms ?? 0,
    bathrooms: property?.bathrooms ?? 0,
    parking: property?.parking ?? 0,
    landlord_id: property?.landlord_id ?? '',
    management_gained_reason: property?.management_gained_reason ?? '',
    gained_reason_source: property?.gained_reason_source ?? '',
    property_category: property?.property_category ?? '',
    property_aspect: property?.property_aspect ?? '',
    has_aircon: property?.has_aircon ?? false,
    has_garden: property?.has_garden ?? false,
    has_built_ins: property?.has_built_ins ?? false,
    has_internal_laundry: property?.has_internal_laundry ?? false,
    has_balcony: property?.has_balcony ?? false,
    has_gas_cooking: property?.has_gas_cooking ?? false,
    has_electric_cooking: property?.has_electric_cooking ?? false,
    has_dishwasher: property?.has_dishwasher ?? false,
    has_stairs: property?.has_stairs ?? false,
    has_lift: property?.has_lift ?? false,
    ownership_type: property?.ownership_type ?? 'personal',
    split_payments: property?.split_payments ?? false,
    owner_first_name: property?.owner_first_name ?? '',
    owner_last_name: property?.owner_last_name ?? '',
    owner_email: property?.owner_email ?? '',
    owner_mobile: property?.owner_mobile ?? '',
    management_fee_percent: property?.management_fee_percent ?? '',
    letting_fee: property?.letting_fee ?? '',
    lease_renewal_fee: property?.lease_renewal_fee ?? '',
    advertising_fee: property?.advertising_fee ?? '',
    approved_maintenance_spend: property?.approved_maintenance_spend ?? '',
    admin_fee: property?.admin_fee ?? '',
    admin_fee_charge_date: property?.admin_fee_charge_date ?? '',
    do_not_charge_admin_fee_if_vacant: property?.do_not_charge_admin_fee_if_vacant ?? false,
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
      address: form.address,
      suburb: form.suburb || null,
      state: form.state || null,
      postcode: form.postcode || null,
      property_type: form.property_type,
      status: form.status,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      parking: Number(form.parking),
      landlord_id: form.landlord_id || null,
      management_gained_reason: form.management_gained_reason || null,
      gained_reason_source: form.gained_reason_source || null,
      property_category: form.property_category || null,
      property_aspect: form.property_aspect || null,
      has_aircon: form.has_aircon,
      has_garden: form.has_garden,
      has_built_ins: form.has_built_ins,
      has_internal_laundry: form.has_internal_laundry,
      has_balcony: form.has_balcony,
      has_gas_cooking: form.has_gas_cooking,
      has_electric_cooking: form.has_electric_cooking,
      has_dishwasher: form.has_dishwasher,
      has_stairs: form.has_stairs,
      has_lift: form.has_lift,
      ownership_type: form.ownership_type,
      split_payments: form.split_payments,
      owner_first_name: form.owner_first_name || null,
      owner_last_name: form.owner_last_name || null,
      owner_email: form.owner_email || null,
      owner_mobile: form.owner_mobile || null,
      management_fee_percent: form.management_fee_percent === '' ? null : Number(form.management_fee_percent),
      letting_fee: form.letting_fee === '' ? null : Number(form.letting_fee),
      lease_renewal_fee: form.lease_renewal_fee === '' ? null : Number(form.lease_renewal_fee),
      advertising_fee: form.advertising_fee === '' ? null : Number(form.advertising_fee),
      approved_maintenance_spend: form.approved_maintenance_spend === '' ? null : Number(form.approved_maintenance_spend),
      admin_fee: form.admin_fee === '' ? null : Number(form.admin_fee),
      admin_fee_charge_date: form.admin_fee_charge_date || null,
      do_not_charge_admin_fee_if_vacant: form.do_not_charge_admin_fee_if_vacant,
    };
    const { error: err } = property
      ? await supabase.from('properties').update(payload).eq('id', property.id)
      : await supabase.from('properties').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';
  const sectionCls = 'border-t border-slate-800 pt-4 mt-4';
  const sectionTitleCls = 'text-sm font-semibold text-teal-400 mb-3';

  const featureToggles: { key: keyof typeof form; label: string }[] = [
    { key: 'has_aircon', label: 'Air Conditioning' },
    { key: 'has_garden', label: 'Garden' },
    { key: 'has_built_ins', label: 'Built-ins' },
    { key: 'has_internal_laundry', label: 'Internal Laundry' },
    { key: 'has_balcony', label: 'Balcony' },
    { key: 'has_gas_cooking', label: 'Gas Cooking' },
    { key: 'has_electric_cooking', label: 'Electric Cooking' },
    { key: 'has_dishwasher', label: 'Dishwasher' },
    { key: 'has_stairs', label: 'Stairs' },
    { key: 'has_lift', label: 'Lift' },
  ];

  return (
    <Modal title={property ? 'Edit Property' : 'Add Property'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Property Details */}
        <div>
          <label className={labelCls}>Address</label>
          <input required value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="Street address" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Suburb</label>
            <input value={form.suburb} onChange={(e) => set('suburb', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input value={form.state} onChange={(e) => set('state', e.target.value)} className={inputCls} placeholder="NSW" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Postcode</label>
            <input value={form.postcode} onChange={(e) => set('postcode', e.target.value)} className={inputCls} placeholder="2000" />
          </div>
          <div>
            <label className={labelCls}>Property Type</label>
            <select value={form.property_type} onChange={(e) => set('property_type', e.target.value)} className={inputCls}>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="townhouse">Townhouse</option>
              <option value="unit">Unit</option>
              <option value="land">Land</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Beds</label>
            <input type="number" min="0" value={form.bedrooms} onChange={(e) => set('bedrooms', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Baths</label>
            <input type="number" min="0" value={form.bathrooms} onChange={(e) => set('bathrooms', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Parking</label>
            <input type="number" min="0" value={form.parking} onChange={(e) => set('parking', Number(e.target.value))} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="vacant">Vacant</option>
              <option value="leased">Leased</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Landlord</label>
            <select value={form.landlord_id} onChange={(e) => set('landlord_id', e.target.value)} className={inputCls}>
              <option value="">No landlord</option>
              {landlords.map((l) => (
                <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Management Gained */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Management Gained</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>Reason</label>
              <select value={form.management_gained_reason} onChange={(e) => set('management_gained_reason', e.target.value)} className={inputCls}>
                <option value="">Select reason…</option>
                <option value="referral">Referral</option>
                <option value="walk_in">Walk-in</option>
                <option value="online_enquiry">Online enquiry</option>
                <option value="repeat_client">Repeat client</option>
                <option value="transfer">Transfer from another agency</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <input value={form.gained_reason_source} onChange={(e) => set('gained_reason_source', e.target.value)} className={inputCls} placeholder="e.g. Domain, friend, signage" />
            </div>
          </div>
        </div>

        {/* Property Features */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Property Features</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.property_category} onChange={(e) => set('property_category', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="rural">Rural</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Aspect</label>
              <select value={form.property_aspect} onChange={(e) => set('property_aspect', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north_east">North-East</option>
                <option value="north_west">North-West</option>
                <option value="south_east">South-East</option>
                <option value="south_west">South-West</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {featureToggles.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Ownership Details */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Ownership Details</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelCls}>Ownership Type</label>
              <select value={form.ownership_type} onChange={(e) => set('ownership_type', e.target.value)} className={inputCls}>
                <option value="personal">Personal</option>
                <option value="company">Company / Trust</option>
                <option value="multi">Multiple Owners</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition w-full">
                <input
                  type="checkbox"
                  checked={form.split_payments}
                  onChange={(e) => set('split_payments', e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-sm text-slate-300">Split payments across owners</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Owner First Name</label>
              <input value={form.owner_first_name} onChange={(e) => set('owner_first_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Owner Last Name</label>
              <input value={form.owner_last_name} onChange={(e) => set('owner_last_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Owner Email</label>
              <input type="email" value={form.owner_email} onChange={(e) => set('owner_email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Owner Mobile</label>
              <input value={form.owner_mobile} onChange={(e) => set('owner_mobile', e.target.value)} className={inputCls} placeholder="04xx xxx xxx" />
            </div>
          </div>
        </div>

        {/* Management Fees */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>Management Fees & Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Management Fee (% ex GST)</label>
              <input type="number" step="0.01" min="0" value={form.management_fee_percent} onChange={(e) => set('management_fee_percent', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="8.80" />
            </div>
            <div>
              <label className={labelCls}>Letting Fee</label>
              <input type="number" step="0.01" min="0" value={form.letting_fee} onChange={(e) => set('letting_fee', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Lease Renewal Fee</label>
              <input type="number" step="0.01" min="0" value={form.lease_renewal_fee} onChange={(e) => set('lease_renewal_fee', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Advertising Fee</label>
              <input type="number" step="0.01" min="0" value={form.advertising_fee} onChange={(e) => set('advertising_fee', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Approved Maintenance Spend</label>
              <input type="number" step="0.01" min="0" value={form.approved_maintenance_spend} onChange={(e) => set('approved_maintenance_spend', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Admin Fee</label>
              <input type="number" step="0.01" min="0" value={form.admin_fee} onChange={(e) => set('admin_fee', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelCls}>Admin Fee Charge Date</label>
              <select value={form.admin_fee_charge_date} onChange={(e) => set('admin_fee_charge_date', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="lease_start">At lease start</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition w-full">
                <input
                  type="checkbox"
                  checked={form.do_not_charge_admin_fee_if_vacant}
                  onChange={(e) => set('do_not_charge_admin_fee_if_vacant', e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-sm text-slate-300">Don't charge admin fee when vacant</span>
              </label>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {busy ? 'Saving…' : property ? 'Save Changes' : 'Add Property'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
