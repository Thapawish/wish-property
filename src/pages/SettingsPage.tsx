import { useEffect, useState } from 'react';
import { Building2, Check, CreditCard, UserRound, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';

export type SettingsSection = 'profile' | 'agency' | 'payments' | 'preferences';

type Profile = { id?: string; user_id: string; first_name: string; last_name: string; phone: string; preferences: { show_overview: boolean; show_today_tasks: boolean } };
type PaymentSettings = { id?: string; agency_id: string; account_name: string; bank_name: string; bsb: string; account_number: string; invoice_prefix: string; default_payment_terms: number };

const tabs: { key: SettingsSection; label: string; icon: typeof UserRound }[] = [
  { key: 'profile', label: 'My Profile', icon: UserRound },
  { key: 'agency', label: 'Agency Profile', icon: Building2 },
  { key: 'payments', label: 'Payment Settings', icon: CreditCard },
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

  async function saveAgency() {
    if (!membership || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from('agencies').update(agency).eq('id', membership.agency_id);
    setSaving(false);
    toast(error ? 'Could not save agency details.' : 'Agency profile saved.', error ? 'error' : 'success');
  }

  async function savePayments() {
    if (!membership || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from('agency_payment_settings').upsert({ ...payments, agency_id: membership.agency_id, updated_at: new Date().toISOString() }, { onConflict: 'agency_id' });
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

function AgencySection({ agency, setAgency, isAdmin, saving, onSave }: { agency: Record<string, string>; setAgency: (agency: Record<string, string>) => void; isAdmin: boolean; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="Agency Profile" description="Manage the public business information for your agency." />{!isAdmin && <Notice>Only agency administrators can edit these details.</Notice>}<div className="grid max-w-3xl gap-5 sm:grid-cols-2"><Field label="Agency name" value={agency.name} onChange={(value) => setAgency({ ...agency, name: value })} disabled={!isAdmin} /><Field label="ABN" value={agency.abn} onChange={(value) => setAgency({ ...agency, abn: value })} disabled={!isAdmin} /><Field label="Business email" value={agency.email} onChange={(value) => setAgency({ ...agency, email: value })} type="email" disabled={!isAdmin} /><Field label="Phone" value={agency.phone} onChange={(value) => setAgency({ ...agency, phone: value })} disabled={!isAdmin} /><Field label="Website" value={agency.website} onChange={(value) => setAgency({ ...agency, website: value })} disabled={!isAdmin} /><Field label="Street address" value={agency.address} onChange={(value) => setAgency({ ...agency, address: value })} disabled={!isAdmin} /><Field label="City / suburb" value={agency.city} onChange={(value) => setAgency({ ...agency, city: value })} disabled={!isAdmin} /><Field label="State" value={agency.state} onChange={(value) => setAgency({ ...agency, state: value })} disabled={!isAdmin} /><Field label="Postcode" value={agency.postcode} onChange={(value) => setAgency({ ...agency, postcode: value })} disabled={!isAdmin} /></div>{isAdmin && <SaveButton saving={saving} onSave={onSave} />}</div>;
}

function PaymentsSection({ payments, setPayments, isAdmin, saving, onSave }: { payments: PaymentSettings; setPayments: (payments: PaymentSettings) => void; isAdmin: boolean; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="Payment Settings" description="Configure where agency payments are received and how invoices are numbered." />{!isAdmin && <Notice>Only agency administrators can edit payment settings.</Notice>}<div className="grid max-w-3xl gap-5 sm:grid-cols-2"><Field label="Account name" value={payments.account_name} onChange={(value) => setPayments({ ...payments, account_name: value })} disabled={!isAdmin} /><Field label="Bank name" value={payments.bank_name} onChange={(value) => setPayments({ ...payments, bank_name: value })} disabled={!isAdmin} /><Field label="BSB" value={payments.bsb} onChange={(value) => setPayments({ ...payments, bsb: value })} disabled={!isAdmin} /><Field label="Account number" value={payments.account_number} onChange={(value) => setPayments({ ...payments, account_number: value })} disabled={!isAdmin} /><Field label="Invoice prefix" value={payments.invoice_prefix} onChange={(value) => setPayments({ ...payments, invoice_prefix: value })} disabled={!isAdmin} /><Field label="Default payment terms (days)" value={payments.default_payment_terms} onChange={(value) => setPayments({ ...payments, default_payment_terms: Number(value) || 0 })} type="number" disabled={!isAdmin} /></div>{isAdmin && <SaveButton saving={saving} onSave={onSave} />}</div>;
}

function PreferencesSection({ profile, setProfile, saving, onSave }: { profile: Profile; setProfile: (profile: Profile) => void; saving: boolean; onSave: () => void }) {
  return <div><SectionHeader title="Preferences" description="Manage how your workspace looks and behaves." /><div className="max-w-3xl divide-y divide-slate-200 rounded-xl border border-slate-200"><PreferenceRow title="Show Overview" description="Display the summary of created tasks by users." checked={profile.preferences.show_overview} onChange={(checked) => setProfile({ ...profile, preferences: { ...profile.preferences, show_overview: checked } })} /><PreferenceRow title="Show Today's Tasks" description="Display the list of tasks due today." checked={profile.preferences.show_today_tasks} onChange={(checked) => setProfile({ ...profile, preferences: { ...profile.preferences, show_today_tasks: checked } })} /></div><SaveButton saving={saving} onSave={onSave} /></div>;
}
function PreferenceRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-4 p-5"><span><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span><button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`} aria-pressed={checked}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} /></button></label>; }
function Notice({ children }: { children: string }) { return <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{children}</div>; }
