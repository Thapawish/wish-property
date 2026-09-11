import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge, Spinner } from '@/components/ui';
import type { Lease, Payment, Property } from '@/lib/supabase';

export type ReportSection = 'snapshot' | 'gain-loss' | 'financials' | 'efficiency' | 'data';

type ReportData = { properties: Property[]; leases: Lease[]; payments: Payment[] };

const sections: { key: ReportSection; label: string }[] = [
  { key: 'snapshot', label: 'Snapshot' },
  { key: 'gain-loss', label: 'Gain/Lost' },
  { key: 'financials', label: 'Financials' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'data', label: 'Data' },
];

export function ReportsPage({ section = 'snapshot' }: { section?: ReportSection }) {
  const { membership } = useAuth();
  const [data, setData] = useState<ReportData>({ properties: [], leases: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!membership?.agency_id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from('properties').select('*').eq('agency_id', membership.agency_id),
      supabase.from('leases').select('*').eq('agency_id', membership.agency_id),
      supabase.from('payments').select('*').eq('agency_id', membership.agency_id).order('due_date', { ascending: false }),
    ]).then(([propertiesResult, leasesResult, paymentsResult]) => {
      if (cancelled) return;
      setData({ properties: propertiesResult.data ?? [], leases: leasesResult.data ?? [], payments: paymentsResult.data ?? [] });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [membership?.agency_id]);

  const filteredPayments = useMemo(() => data.payments.filter((payment) => (!fromDate || payment.due_date >= fromDate) && (!toDate || payment.due_date <= toDate)), [data.payments, fromDate, toDate]);
  const income = filteredPayments.filter((payment) => payment.status === 'paid').reduce((total, payment) => total + Number(payment.amount), 0);
  const outstanding = filteredPayments.filter((payment) => payment.status !== 'paid').reduce((total, payment) => total + Number(payment.amount), 0);
  const activeLeases = data.leases.filter((lease) => lease.status === 'active');
  const occupied = data.properties.filter((property) => property.status === 'leased').length;
  const occupancy = data.properties.length ? Math.round((occupied / data.properties.length) * 100) : 0;

  function exportData() {
    const rows = filteredPayments.map((payment) => `${payment.due_date},${payment.status},${payment.amount},${payment.paid_date ?? ''}`);
    const blob = new Blob([`Due Date,Status,Amount,Paid Date\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'propertyhub-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Spinner variant="light" />;

  return (
    <div className="min-h-full bg-[#f4f5f7] -m-4 p-4 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-semibold text-slate-800">Reports</h1><p className="mt-1 text-sm text-slate-500">Understand your portfolio performance at a glance.</p></div>
          <button onClick={exportData} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"><Download className="h-4 w-4" /> Export Excel</button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
          {sections.map((item) => <a key={item.key} href={`#${item.key}`} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${section === item.key ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{item.label}</a>)}
          <div className="ml-auto flex items-center gap-2">
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600" aria-label="From date" />
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600" aria-label="To date" />
          </div>
        </div>

        {section === 'snapshot' && <Snapshot properties={data.properties} leases={activeLeases} income={income} outstanding={outstanding} occupancy={occupancy} />}
        {section === 'gain-loss' && <GainLoss properties={data.properties} income={income} outstanding={outstanding} />}
        {section === 'financials' && <Financials payments={filteredPayments} income={income} outstanding={outstanding} />}
        {section === 'efficiency' && <Efficiency properties={data.properties} leases={data.leases} payments={filteredPayments} />}
        {section === 'data' && <DataTable properties={data.properties} leases={data.leases} payments={filteredPayments} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string; detail: string; icon: typeof Wallet; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600' };
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Snapshot({ properties, leases, income, outstanding, occupancy }: { properties: Property[]; leases: Lease[]; income: number; outstanding: number; occupancy: number }) {
  return <div id="snapshot" className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Portfolio value" value={`${properties.length}`} detail="Properties managed" icon={BarChart3} /><StatCard label="Occupancy" value={`${occupancy}%`} detail={`${leases.length} active leases`} icon={TrendingUp} tone="green" /><StatCard label="Collected" value={formatCurrency(income)} detail="Payments in selected period" icon={Wallet} tone="blue" /><StatCard label="Outstanding" value={formatCurrency(outstanding)} detail="Pending and overdue" icon={TrendingDown} tone="amber" /></div><ReportPanel title="Portfolio snapshot"><div className="grid gap-4 md:grid-cols-3"><Metric label="Leased properties" value={`${properties.filter((property) => property.status === 'leased').length}`} /><Metric label="Vacant properties" value={`${properties.filter((property) => property.status === 'vacant').length}`} /><Metric label="Pending properties" value={`${properties.filter((property) => property.status === 'pending').length}`} /></div></ReportPanel></div>;
}

function GainLoss({ properties, income, outstanding }: { properties: Property[]; income: number; outstanding: number }) {
  const leased = properties.filter((property) => property.status === 'leased').length;
  return <div id="gain-loss" className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Income" value={formatCurrency(income)} detail="Collected rent" icon={TrendingUp} tone="green" /><StatCard label="Lost income" value={formatCurrency(outstanding)} detail="Uncollected payments" icon={TrendingDown} tone="red" /><StatCard label="Income coverage" value={`${income + outstanding ? Math.round((income / (income + outstanding)) * 100) : 0}%`} detail="Collected versus due" icon={BarChart3} /></div><ReportPanel title="Gain / Lost overview"><div className="space-y-4"><Progress label="Income collected" value={income} total={income + outstanding} tone="bg-emerald-500" /><Progress label="Outstanding income" value={outstanding} total={income + outstanding} tone="bg-amber-500" /><p className="pt-2 text-sm text-slate-500">{leased} properties are currently contributing rental income.</p></div></ReportPanel></div>;
}

function Financials({ payments, income, outstanding }: { payments: Payment[]; income: number; outstanding: number }) {
  return <div id="financials" className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Total income" value={formatCurrency(income)} detail="GST inclusive" icon={Wallet} tone="green" /><StatCard label="Total outstanding" value={formatCurrency(outstanding)} detail="Pending and overdue" icon={TrendingDown} tone="amber" /><StatCard label="Transactions" value={`${payments.length}`} detail="In selected period" icon={FileSpreadsheet} /></div><ReportPanel title="Agency Revenue"><ReportTable headers={['Tax Category', 'GST', 'Total Income', 'Actions']} rows={[['Management fees', '$0.00', formatCurrency(income), `${payments.filter((payment) => payment.status === 'paid').length}`], ['Total', '$0.00', formatCurrency(income), ''], ['Total transaction fees paid', '$0.00', '$0.00', '']]} /></ReportPanel><ReportPanel title="Agency Expenses"><ReportTable headers={['Tax Category', 'GST', 'Total Expenses', 'Actions']} rows={[['Total', '$0.00', '$0.00', ''], ['Total transaction fees paid', '$0.00', '$0.00', '']]} /></ReportPanel></div>;
}

function Efficiency({ properties, leases, payments }: { properties: Property[]; leases: Lease[]; payments: Payment[] }) {
  const paid = payments.filter((payment) => payment.status === 'paid').length;
  return <div id="efficiency" className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Collection rate" value={`${payments.length ? Math.round((paid / payments.length) * 100) : 0}%`} detail="Payments collected" icon={TrendingUp} tone="green" /><StatCard label="Active leases" value={`${leases.filter((lease) => lease.status === 'active').length}`} detail="Currently managed" icon={FileSpreadsheet} /><StatCard label="Vacancy rate" value={`${properties.length ? Math.round((properties.filter((property) => property.status === 'vacant').length / properties.length) * 100) : 0}%`} detail="Portfolio vacancy" icon={TrendingDown} tone="amber" /><StatCard label="Payments tracked" value={`${payments.length}`} detail="All records" icon={BarChart3} /></div><ReportPanel title="Operational efficiency"><Progress label="Payments collected on time" value={paid} total={payments.length} tone="bg-blue-500" /><Progress label="Portfolio occupied" value={properties.filter((property) => property.status === 'leased').length} total={properties.length} tone="bg-emerald-500" /></ReportPanel></div>;
}

function DataTable({ properties, leases, payments }: ReportData) {
  return <div id="data" className="space-y-5"><ReportPanel title="Portfolio data"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Property</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Lease</th><th className="px-3 py-3">Payments</th><th className="px-3 py-3">Collected</th></tr></thead><tbody>{properties.map((property) => { const lease = leases.find((item) => item.property_id === property.id); const propertyPayments = payments.filter((payment) => payment.lease_id === lease?.id); const collected = propertyPayments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount), 0); return <tr key={property.id} className="border-b border-slate-100 text-sm"><td className="px-3 py-4 font-medium text-slate-700">{property.address}</td><td className="px-3 py-4"><Badge color={property.status === 'leased' ? 'green' : property.status === 'vacant' ? 'slate' : 'amber'} variant="light">{property.status}</Badge></td><td className="px-3 py-4 text-slate-500">{lease ? `${formatDate(lease.start_date)} – ${formatDate(lease.end_date)}` : '—'}</td><td className="px-3 py-4 text-slate-500">{propertyPayments.length}</td><td className="px-3 py-4 font-medium text-slate-700">{formatCurrency(collected)}</td></tr>; })}</tbody></table></div></ReportPanel></div>;
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"><h2 className="mb-5 text-xl font-semibold text-slate-800">{title}</h2>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-800">{value}</p></div>; }
function Progress({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) { const percent = total ? Math.round((value / total) * 100) : 0; return <div><div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-medium text-slate-700">{percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} /></div></div>; }
function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-b border-slate-100 text-sm">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`px-3 py-4 ${cellIndex === 0 ? 'font-medium text-slate-700' : 'text-right text-slate-600'}`}>{cell}</td>)}</tr>)}</tbody></table></div>; }
