import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Building2, Check, CreditCard, UserRound, SlidersHorizontal, Users, Mail, Trash2, Plus, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import type { TeamInvite, TeamRole } from '@/lib/supabase';

export type SettingsSection = 'profile' | 'agency' | 'payments' | 'preferences' | 'team';

type Profile = { id?: string; user_id: string; first_name: string; last_name: string; phone: string; preferences: { show_overview: boolean; show_today_tasks: boolean } };
type PaymentSettings = { id?: string; agency_id: string; account_name: string; bank_name: string; bsb: string; account_number: string; invoice_prefix: string; default_payment_terms: number };

const tabs: { key: SettingsSection; label: string; icon: typeof UserRound }[] = [
  { key: 'profile', label: 'My Profile', icon: UserRound },
  { key: 'agency', label: 'Agency Profile', icon: Building2 },
  { key: 'payments', label: 'Payment Settings', icon: CreditCard },
  { key: 'team', label: 'Team Members', icon: Users },
  { key: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export function SettingsPage({ initialSection = 'profile' }: { initialSection?: SettingsSection }) {
  const { user, membership, isAdmin } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({ user_id: user?.id ?? '', first_name: '', last_name: '', phone: '', preferences: { show_overview: true, show_today_tasks: true } });
  const [agency, setAgency] = useState({ name: '', email: '', phone: '', website: '', address: '', city: '', state: '', postcode: '', abn: '' });
  const [payments, setPayments] = useState<PaymentSettings>({ agency_id: membership?.agency_id ?? '', account_name: '', bank_name: '', bsb: '', account_number: '', invoice_prefix: 'INV', default_payment_terms: 7 });

  useEffect(() => {
    if (!user || !membership) return;
    let cancelled = false;
    Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('agency_payment_settings').select('*').eq('agency_id', membership.agency_id).maybeSingle(),
    ]).then(([profileResult, paymentResult]) => {
      if (cancelled) return;
      const savedProfile = profileResult.data as Partial<Profile> | null;
      const savedPayment = paymentResult.data as Partial<PaymentSettings> | null;
      setProfile((current) => ({ ...current, ...savedProfile, user_id: user.id, phone: savedProfile?.phone ?? '', preferences: { ...current.preferences, ...(savedProfile?.preferences ?? {}) } }));
      setAgency({ name: membership.agencies.name, email: membership.agencies.email ?? '', phone: membership.agencies.phone ?? '', website: membership.agencies.website ?? '', address: membership.agencies.address ?? '', city: membership.agencies.city ?? '', state: membership.agencies.state ?? '', postcode: membership.agencies.postcode ?? '', abn: membership.agencies.abn ?? '' });
      setPayments((current) => ({ ...current, ...savedPayment, agency_id: membership.agency_id, account_name: savedPayment?.account_name ?? '', bank_name: savedPayment?.bank_name ?? '', bsb: savedPayment?.bsb ?? '', account_number: savedPayment?.account_number ?? '', invoice_prefix: savedPayment?.invoice_prefix ?? 'INV', default_payment_terms: savedPayment?.default_payment_terms ?? 7 }));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, membership]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_profiles').upsert({ ...profile, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSaving(false);
    toast(error ? 'Could not save your profile.' : 'Profile saved.', error ? 'error' : 'success');
  }

  async function recordAudit(action: string, entityType: string, details: Record<string, string | number>) {
    if (!membership || !user) return;
    await supabase.from('admin_audit_log').insert({ agency_id: membership.agency_id, actor_user_id: user.id, action, entity_type: entityType, details });
  }

  async function saveAgency() {
    if (!membership || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from('agencies').update(agency).eq('id', membership.agency_id);
    if (!error) await recordAudit('agency_profile_updated', 'agency', { changed_fields: 'name,contact,address' });
    setSaving(false);
    toast(error ? 'Could not save agency details.' : 'Agency profile saved.', error ? 'error' : 'success');
  }

  async function savePayments() {
    if (!membership || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from('agency_payment_settings').upsert({ ...payments, agency_id: membership.agency_id, updated_at: new Date().toISOString() }, { onConflict: 'agency_id' });
    if (!error) await recordAudit('payment_settings_updated', 'agency_payment_settings', { invoice_prefix: payments.invoice_prefix, payment_terms: payments.default_payment_terms });
    setSaving(false);
    toast(error ? 'Could not save payment settings.' : 'Payment settings saved.', error ? 'error' : 'success');
  }

  async function savePreferences() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_profiles').upsert({ ...profile, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSaving(false);
    toast(error ? 'Could not save preferences.' : 'Preferences saved.', error ? 'error' : 'success');
  }

  if (loading) return <Spinner variant="light" />;

  return (
    <div className="min-h-full bg-[#f4f5f7] -m-4 p-4 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5"><h1 className="text-2xl font-semibold text-slate-800">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your account, agency, payments, and workspace preferences.</p></div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-blue-700 p-2">
            {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.key} onClick={() => setSection(tab.key)} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${section === tab.key ? 'bg-white text-blue-700' : 'text-blue-100 hover:bg-blue-600 hover:text-white'}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}
          </div>
          <div className="p-5 sm:p-7">
            {section === 'profile' && <ProfileSection profile={profile} setProfile={setProfile} email={user?.email ?? ''} saving={saving} onSave={saveProfile} />}
            {section === 'agency' && <AgencySection agency={agency} setAgency={setAgency} isAdmin={isAdmin} saving={saving} onSave={saveAgency} />}
            {section === 'payments' && <PaymentsSection payments={payments} setPayments={setPayments} isAdmin={isAdmin} saving={saving} onSave={savePayments} />}
            {section === 'preferences' && <PreferencesSection profile={profile} setProfile={setProfile} saving={saving} onSave={savePreferences} />}
            {section === 'team' && <TeamMembersSection isAdmin={isAdmin} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) { return <div className="mb-6 border-b border-slate-200 pb-5"><h2 className="text-xl font-semibold text-slate-800">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>; }
function SaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) { return <button onClick={onSave} disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : <><Check className="h-4 w-4" /> Save changes</>}</button>; }
function Field({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; disabled?: boolean }) { return <div><label className={labelClass}>{label}</label><input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`} /></div>; }

function ProfileSection({ profile, setProfile, email, saving, onSave }: { profile: Profile; setProfile: (profile: Profile) => void; email: string; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="My Profile" description="Update your personal details and contact information." /><div className="grid max-w-2xl gap-5 sm:grid-cols-2"><Field label="First name" value={profile.first_name} onChange={(value) => setProfile({ ...profile, first_name: value })} /><Field label="Last name" value={profile.last_name} onChange={(value) => setProfile({ ...profile, last_name: value })} /><Field label="Email address" value={email} onChange={() => undefined} disabled /><Field label="Phone number" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} /></div><SaveButton saving={saving} onSave={onSave} /></div>;
}

type AgencyForm = { name: string; email: string; phone: string; website: string; address: string; city: string; state: string; postcode: string; abn: string };

function AgencySection({ agency, setAgency, isAdmin, saving, onSave }: { agency: AgencyForm; setAgency: Dispatch<SetStateAction<AgencyForm>>; isAdmin: boolean; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="Agency Profile" description="Manage the public business information for your agency." />{!isAdmin && <Notice>Only agency administrators can edit these details.</Notice>}<div className="grid max-w-3xl gap-5 sm:grid-cols-2"><Field label="Agency name" value={agency.name} onChange={(value) => setAgency({ ...agency, name: value })} disabled={!isAdmin} /><Field label="ABN" value={agency.abn} onChange={(value) => setAgency({ ...agency, abn: value })} disabled={!isAdmin} /><Field label="Business email" value={agency.email} onChange={(value) => setAgency({ ...agency, email: value })} type="email" disabled={!isAdmin} /><Field label="Phone" value={agency.phone} onChange={(value) => setAgency({ ...agency, phone: value })} disabled={!isAdmin} /><Field label="Website" value={agency.website} onChange={(value) => setAgency({ ...agency, website: value })} disabled={!isAdmin} /><Field label="Street address" value={agency.address} onChange={(value) => setAgency({ ...agency, address: value })} disabled={!isAdmin} /><Field label="City / suburb" value={agency.city} onChange={(value) => setAgency({ ...agency, city: value })} disabled={!isAdmin} /><Field label="State" value={agency.state} onChange={(value) => setAgency({ ...agency, state: value })} disabled={!isAdmin} /><Field label="Postcode" value={agency.postcode} onChange={(value) => setAgency({ ...agency, postcode: value })} disabled={!isAdmin} /></div>{isAdmin && <SaveButton saving={saving} onSave={onSave} />}</div>;
}

function PaymentsSection({ payments, setPayments, isAdmin, saving, onSave }: { payments: PaymentSettings; setPayments: (payments: PaymentSettings) => void; isAdmin: boolean; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="Payment Settings" description="Configure where agency payments are received and how invoices are numbered." />{!isAdmin && <Notice>Only agency administrators can edit payment settings.</Notice>}<div className="grid max-w-3xl gap-5 sm:grid-cols-2"><Field label="Account name" value={payments.account_name} onChange={(value) => setPayments({ ...payments, account_name: value })} disabled={!isAdmin} /><Field label="Bank name" value={payments.bank_name} onChange={(value) => setPayments({ ...payments, bank_name: value })} disabled={!isAdmin} /><Field label="BSB" value={payments.bsb} onChange={(value) => setPayments({ ...payments, bsb: value })} disabled={!isAdmin} /><Field label="Account number" value={payments.account_number} onChange={(value) => setPayments({ ...payments, account_number: value })} disabled={!isAdmin} /><Field label="Invoice prefix" value={payments.invoice_prefix} onChange={(value) => setPayments({ ...payments, invoice_prefix: value })} disabled={!isAdmin} /><Field label="Default payment terms (days)" value={payments.default_payment_terms} onChange={(value) => setPayments({ ...payments, default_payment_terms: Number(value) || 0 })} type="number" disabled={!isAdmin} /></div>{isAdmin && <SaveButton saving={saving} onSave={onSave} />}</div>;
}

function PreferencesSection({ profile, setProfile, saving, onSave }: { profile: Profile; setProfile: (profile: Profile) => void; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="Preferences" description="Manage how your workspace looks and behaves." /><div className="max-w-3xl rounded-xl border border-slate-200"><div className="border-b border-slate-200 p-5"><p className="text-sm font-semibold text-slate-800">Action Centre</p><p className="mt-1 text-sm text-slate-500">Control which sections appear on your Action Centre page.</p></div><div className="divide-y divide-slate-200"><PreferenceRow title="Show Overview" description="Display the summary of created tasks by users." checked={profile.preferences.show_overview} onChange={(checked) => setProfile({ ...profile, preferences: { ...profile.preferences, show_overview: checked } })} /><PreferenceRow title="Show Today's Tasks" description="Display the list of tasks due today." checked={profile.preferences.show_today_tasks} onChange={(checked) => setProfile({ ...profile, preferences: { ...profile.preferences, show_today_tasks: checked } })} /></div></div><SaveButton saving={saving} onSave={onSave} /></div>;
}
function PreferenceRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-4 p-5"><span><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span><button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`} aria-pressed={checked}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} /></button></label>; }
function Notice({ children }: { children: string }) { return <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{children}</div>; }

const TEAM_ROLES: { value: TeamRole; label: string; description: string }[] = [
  { value: 'agency_admin', label: 'Agency Admin', description: 'Full access to all settings, team management, and data.' },
  { value: 'property_manager', label: 'Property Manager', description: 'Manage properties, leases, contacts, and maintenance.' },
  { value: 'leasing_consultant', label: 'Leasing Consultant', description: 'Manage leases and tenant communications.' },
  { value: 'accounts_admin', label: 'Accounts Admin', description: 'Manage payments, invoices, and financial reports.' },
];

function TeamMembersSection({ isAdmin }: { isAdmin: boolean }) {
  const { user, membership } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<{ id: string; user_id: string; role: string; created_at: string; email: string }[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('property_manager');
  const [busy, setBusy] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  async function loadData() {
    if (!membership) return;
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('agency_members').select('*').eq('agency_id', membership.agency_id).order('created_at', { ascending: true }),
      supabase.from('team_invites').select('*').eq('agency_id', membership.agency_id).order('created_at', { ascending: false }),
    ]);
    const memberRows = (membersRes.data ?? []) as { id: string; user_id: string; role: string; created_at: string }[];
    const memberWithEmails = await Promise.all(
      memberRows.map(async (m) => {
        const { data } = await supabase.from('user_profiles').select('first_name, last_name').eq('user_id', m.user_id).maybeSingle();
        const name = data ? `${data.first_name} ${data.last_name}`.trim() : m.user_id.slice(0, 8);
        return { ...m, email: name };
      })
    );
    setMembers(memberWithEmails);
    setInvites((invitesRes.data ?? []) as TeamInvite[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [membership?.agency_id]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!membership || !user) return;
    if (!inviteEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('team_invites').insert({
      agency_id: membership.agency_id,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
    });
    if (error) {
      toast('Could not send invite. That email may already have a pending invite.', 'error');
    } else {
      toast(`Invitation sent to ${inviteEmail.trim()}.`, 'success');
      setInviteEmail('');
      setInviteRole('property_manager');
      loadData();
    }
    setBusy(false);
  }

  async function cancelInvite(id: string) {
    if (!confirm('Cancel this invitation?')) return;
    await supabase.from('team_invites').delete().eq('id', id);
    toast('Invitation cancelled.', 'info');
    loadData();
  }

  async function updateMemberRole(memberId: string, role: string) {
    const { error } = await supabase.from('agency_members').update({ role }).eq('id', memberId);
    if (error) {
      toast('Could not update role.', 'error');
    } else {
      toast('Team member role updated.', 'success');
      setEditingRole(null);
      loadData();
    }
  }

  async function removeMember(memberId: string, memberIdUserId: string) {
    if (memberIdUserId === user?.id) {
      toast('You cannot remove yourself. Ask another admin to do this.', 'error');
      return;
    }
    if (!confirm('Remove this team member from the agency?')) return;
    const { error } = await supabase.from('agency_members').delete().eq('id', memberId);
    if (error) {
      toast('Could not remove team member.', 'error');
    } else {
      toast('Team member removed.', 'success');
      loadData();
    }
  }

  if (loading) return <Spinner variant="light" />;

  return (
    <div>
      <SectionHeader title="Team Members" description="Invite staff to your agency and manage their access roles." />
      {!isAdmin && <Notice>Only agency administrators can invite and manage team members.</Notice>}

      {isAdmin && (
        <form onSubmit={sendInvite} className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="mb-4 text-sm font-semibold text-slate-800">Invite a new team member</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@agency.com.au"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)} className={inputClass}>
                {TEAM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
                <Plus className="h-4 w-4" /> Send Invite
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">{TEAM_ROLES.find((r) => r.value === inviteRole)?.description}</p>
        </form>
      )}

      {invites.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Pending Invitations</h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{invite.email}</p>
                    <p className="text-xs text-slate-500">Invited as {TEAM_ROLES.find((r) => r.value === invite.role)?.label ?? invite.role}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => cancelInvite(invite.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Current Team ({members.length})</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="text-sm">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-600">
                        {m.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{m.email}</p>
                        {m.user_id === user?.id && <p className="text-xs text-slate-400">You</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && m.user_id !== user?.id && editingRole === m.id ? (
                      <div className="flex items-center gap-2">
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                          {TEAM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button onClick={() => updateMemberRole(m.id, newRole)} className="text-xs font-medium text-blue-600 hover:text-blue-800">Save</button>
                        <button onClick={() => setEditingRole(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                      </div>
                    ) : (
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          m.role === 'agency_admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {TEAM_ROLES.find((r) => r.value === m.role)?.label ?? m.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.user_id !== user?.id && editingRole !== m.id && (
                          <button onClick={() => { setEditingRole(m.id); setNewRole(m.role); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition">
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                        {m.user_id !== user?.id && (
                          <button onClick={() => removeMember(m.id, m.user_id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
