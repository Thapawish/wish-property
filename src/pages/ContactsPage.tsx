import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Mail, Phone, Building2, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Badge, EmptyState, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Contact, ContactType, ServiceProviderSpecialty } from '@/lib/supabase';

const SPECIALTIES: ServiceProviderSpecialty[] = [
  'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Locksmith', 'Cleaner',
  'Gardener', 'Pest Control', 'Air Conditioning', 'Roofing', 'Plasterer', 'Tiler', 'Other',
];

const FILTER_TABS: ('all' | ContactType)[] = ['all', 'landlord', 'tenant', 'service_provider'];

const TYPE_COLORS: Record<ContactType, 'blue' | 'teal' | 'amber'> = {
  landlord: 'blue',
  tenant: 'teal',
  service_provider: 'amber',
};

const TYPE_AVATAR_COLORS: Record<ContactType, string> = {
  landlord: 'bg-blue-50 text-blue-600',
  tenant: 'bg-blue-50 text-blue-600',
  service_provider: 'bg-amber-50 text-amber-600',
};

export function ContactsPage() {
  const { membership, isAdmin } = useAuth();
  const agencyId = membership?.agency_id;
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState<'all' | ContactType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  async function loadData() {
    if (!agencyId) return;
    const { data } = await supabase.from('contacts').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false });
    setContacts(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [agencyId]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    loadData();
  }

  if (loading) return <Spinner />;

  const filtered = filter === 'all' ? contacts : contacts.filter((c) => c.type === filter);
  const counts = {
    all: contacts.length,
    landlord: contacts.filter((c) => c.type === 'landlord').length,
    tenant: contacts.filter((c) => c.type === 'tenant').length,
    service_provider: contacts.filter((c) => c.type === 'service_provider').length,
  };
  const description = filter === 'all'
    ? `${contacts.length} contacts total`
    : `${counts[filter]} ${filter.replace('_', ' ')}${counts[filter] === 1 ? '' : 's'}`;

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={description}
        action={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#1000d6] hover:bg-[#0c00a8] text-white text-sm font-medium rounded-lg transition">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        }
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTER_TABS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              filter === f
                ? 'bg-[#1000d6] text-white'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {f.replace('_', ' ')}
            <span className={`ml-1.5 text-xs ${filter === f ? 'text-blue-200' : 'text-slate-400'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No contacts yet"
          description="Add landlords, tenants, and service providers to manage your contacts."
          action={
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-[#1000d6] hover:bg-[#0c00a8] text-white text-sm font-medium rounded-lg transition">
              Add Contact
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contact) => (
            <ContactCard key={contact.id} contact={contact} isAdmin={!!isAdmin} onEdit={() => { setEditing(contact); setShowForm(true); }} onDelete={() => handleDelete(contact.id)} />
          ))}
        </div>
      )}

      {showForm && (
        <ContactForm contact={editing} agencyId={agencyId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadData(); }} />
      )}
    </div>
  );
}

function ContactCard({ contact, isAdmin, onEdit, onDelete }: { contact: Contact; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
  const isServiceProvider = contact.type === 'service_provider';
  const displayName = isServiceProvider && contact.business_name
    ? contact.business_name
    : `${contact.first_name} ${contact.last_name}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${TYPE_AVATAR_COLORS[contact.type]}`}>
            {isServiceProvider
              ? <Wrench className="w-5 h-5" />
              : `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`
            }
          </div>
          <div>
            <h3 className="text-slate-900 font-semibold text-sm">{displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge color={TYPE_COLORS[contact.type]} variant="light">{contact.type.replace('_', ' ')}</Badge>
              {isServiceProvider && contact.specialty && (
                <span className="text-xs text-slate-500">{contact.specialty}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-[#1000d6] rounded-lg hover:bg-slate-50 transition"><Pencil className="w-4 h-4" /></button>
          {isAdmin && (
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </div>
      <div className="space-y-1.5 pt-3 border-t border-slate-100">
        {isServiceProvider && contact.business_name && (
          <p className="flex items-center gap-2 text-slate-600 text-sm"><Building2 className="w-4 h-4" /> {contact.business_name}</p>
        )}
        {contact.email && <p className="flex items-center gap-2 text-slate-600 text-sm"><Mail className="w-4 h-4" /> {contact.email}</p>}
        {contact.phone && <p className="flex items-center gap-2 text-slate-600 text-sm"><Phone className="w-4 h-4" /> {contact.phone}</p>}
        {isServiceProvider && (contact.bank_name || contact.bank_account_name) && (
          <p className="flex items-center gap-2 text-slate-500 text-xs pt-1">
            <span className="font-medium">Bank:</span> {contact.bank_name ?? '—'} {contact.bank_account_name ? `(${contact.bank_account_name})` : ''}
          </p>
        )}
        {!contact.email && !contact.phone && !isServiceProvider && <p className="text-slate-400 text-sm">No contact details</p>}
      </div>
    </div>
  );
}

function ContactForm({ contact, agencyId, onClose, onSaved }: { contact: Contact | null; agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    type: contact?.type ?? 'tenant' as ContactType,
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    specialty: contact?.specialty ?? 'Electrician' as ServiceProviderSpecialty,
    business_name: contact?.business_name ?? '',
    bank_account_name: contact?.bank_account_name ?? '',
    bank_bsb: contact?.bank_bsb ?? '',
    bank_account_number: contact?.bank_account_number ?? '',
    bank_name: contact?.bank_name ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isServiceProvider = form.type === 'service_provider';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      type: form.type,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      agency_id: agencyId,
      specialty: isServiceProvider ? form.specialty : null,
      business_name: isServiceProvider ? (form.business_name || null) : null,
      bank_account_name: isServiceProvider ? (form.bank_account_name || null) : null,
      bank_bsb: isServiceProvider ? (form.bank_bsb || null) : null,
      bank_account_number: isServiceProvider ? (form.bank_account_number || null) : null,
      bank_name: isServiceProvider ? (form.bank_name || null) : null,
    };
    const { error: err } = contact
      ? await supabase.from('contacts').update(payload).eq('id', contact.id)
      : await supabase.from('contacts').insert(payload);
    if (err) {
      setError('Could not save contact. Please check your details and try again.');
    } else {
      onSaved();
    }
    setBusy(false);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1000d6] focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';
  const sectionTitleCls = 'text-sm font-semibold text-slate-800 pt-2';

  return (
    <Modal title={contact ? 'Edit Contact' : 'Add Contact'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Contact Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })} className={inputCls}>
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
            <option value="service_provider">Service Provider</option>
          </select>
        </div>

        {isServiceProvider && (
          <div>
            <label className={labelCls}>Business Name</label>
            <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inputCls} placeholder="e.g. ABC Electrical Pty Ltd" />
          </div>
        )}

        {isServiceProvider && (
          <div>
            <label className={labelCls}>Specialty</label>
            <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value as ServiceProviderSpecialty })} className={inputCls}>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First Name</label>
            <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="name@email.com" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="04xx xxx xxx" />
        </div>

        {isServiceProvider && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className={sectionTitleCls}>Bank Account Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Account Name</label>
                <input value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} className={inputCls} placeholder="John Smith" />
              </div>
              <div>
                <label className={labelCls}>Bank Name</label>
                <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={inputCls} placeholder="Commonwealth Bank" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>BSB</label>
                <input value={form.bank_bsb} onChange={(e) => setForm({ ...form, bank_bsb: e.target.value })} className={inputCls} placeholder="062-000" />
              </div>
              <div>
                <label className={labelCls}>Account Number</label>
                <input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} className={inputCls} placeholder="12345678" />
              </div>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-[#1000d6] hover:bg-[#0c00a8] disabled:opacity-50 text-white font-medium rounded-lg transition">{contact ? 'Save Changes' : 'Add Contact'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
