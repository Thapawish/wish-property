import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Badge, EmptyState, Modal, PageHeader, Spinner } from '@/components/ui';
import type { Contact, ContactType } from '@/lib/supabase';

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

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${contacts.length} contacts (landlords & tenants)`}
        action={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        }
      />

      <div className="flex gap-2 mb-5">
        {(['all', 'landlord', 'tenant'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition ${filter === f ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-7 h-7" />} title="No contacts yet" description="Add landlords and tenants to link them to properties and leases." action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition">Add Contact</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contact) => (
            <div key={contact.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${contact.type === 'landlord' ? 'bg-blue-500/10 text-blue-400' : 'bg-teal-500/10 text-teal-400'}`}>
                    {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{contact.first_name} {contact.last_name}</h3>
                    <Badge color={contact.type === 'landlord' ? 'blue' : 'teal'}>{contact.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => { setEditing(contact); setShowForm(true); }} className="p-1.5 text-slate-500 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition"><Pencil className="w-4 h-4" /></button>
                  {isAdmin && (
                  <button onClick={() => handleDelete(contact.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 pt-3 border-t border-slate-800">
                {contact.email && <p className="flex items-center gap-2 text-slate-400 text-sm"><Mail className="w-4 h-4" /> {contact.email}</p>}
                {contact.phone && <p className="flex items-center gap-2 text-slate-400 text-sm"><Phone className="w-4 h-4" /> {contact.phone}</p>}
                {!contact.email && !contact.phone && <p className="text-slate-600 text-sm">No contact details</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ContactForm contact={editing} agencyId={agencyId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadData(); }} />
      )}
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
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { ...form, agency_id: agencyId, email: form.email || null, phone: form.phone || null };
    const { error: err } = contact ? await supabase.from('contacts').update(payload).eq('id', contact.id) : await supabase.from('contacts').insert(payload);
    if (err) setError(err.message);
    else onSaved();
    setBusy(false);
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <Modal title={contact ? 'Edit Contact' : 'Add Contact'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Contact Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })} className={inputCls}>
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
          </select>
        </div>
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
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-medium rounded-lg transition">{contact ? 'Save Changes' : 'Add Contact'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
