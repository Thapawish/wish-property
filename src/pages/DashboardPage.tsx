import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Home,
  Search,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { Badge, Spinner, statusColor } from '@/components/ui';
import type { Lease, Payment, Property, RentReview } from '@/lib/supabase';

type DashboardSummary = {
  agency: { id: string; name: string; plan: string };
  stats: {
    total_properties: number;
    leased_properties: number;
    vacant_properties: number;
    pending_properties: number;
    occupancy_rate: number;
    active_leases: number;
    monthly_rent: number;
    total_arrears: number;
    total_collected: number;
    overdue_payments_count: number;
    pending_rent_reviews: number;
  };
  arrears_trend: { month: string; arrears: number }[];
  expiring_leases: {
    lease_id: string;
    property_address: string;
    property_suburb: string | null;
    end_date: string;
    days_remaining: number;
    rent_amount: number;
  }[];
};

type ChartCardProps = { title: string; children: React.ReactNode; className?: string };

function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <h2 className="mb-3 text-center text-sm font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

const chartText = '#64748b';
const chartGrid = '#e2e8f0';

export function DashboardPage() {
  const { session, membership } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentReviews, setRentReviews] = useState<RentReview[]>([]);
  const [agencyFilter, setAgencyFilter] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('days');
  const [showCompliance, setShowCompliance] = useState(true);

  useEffect(() => {
    if (!membership?.agency_id) return;
    let cancelled = false;

    (async () => {
      const agencyId = membership.agency_id;
      const [propsResult, leasesResult, paymentsResult, reviewsResult] = await Promise.all([
        supabase.from('properties').select('*').eq('agency_id', agencyId),
        supabase.from('leases').select('*').eq('agency_id', agencyId),
        supabase.from('payments').select('*').eq('agency_id', agencyId),
        supabase.from('rent_reviews').select('*').eq('agency_id', agencyId),
      ]);

      if (cancelled) return;
      const propList = propsResult.data ?? [];
      const leaseList = leasesResult.data ?? [];
      const paymentList = paymentsResult.data ?? [];
      const reviewList = reviewsResult.data ?? [];
      const leased = propList.filter((p) => p.status === 'leased').length;
      const arrearsTrend: { month: string; arrears: number }[] = [];

      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthPayments = paymentList.filter((payment) => {
          const due = new Date(payment.due_date);
          return due.getMonth() === date.getMonth() && due.getFullYear() === date.getFullYear();
        });
        arrearsTrend.push({
          month: date.toLocaleString('en-AU', { month: 'short' }),
          arrears: monthPayments.filter((payment) => payment.status === 'overdue').reduce((total, payment) => total + Number(payment.amount), 0),
        });
      }

      const expiringLeases = leaseList
        .filter((lease) => lease.status === 'active' && daysUntil(lease.end_date) >= 0 && daysUntil(lease.end_date) <= 60)
        .map((lease) => {
          const property = propList.find((item) => item.id === lease.property_id);
          return {
            lease_id: lease.id,
            property_address: property?.address ?? 'Unknown property',
            property_suburb: property?.suburb ?? null,
            end_date: lease.end_date,
            days_remaining: daysUntil(lease.end_date),
            rent_amount: Number(lease.rent_amount),
          };
        })
        .sort((a, b) => a.days_remaining - b.days_remaining);

      setProperties(propList);
      setLeases(leaseList);
      setPayments(paymentList);
      setRentReviews(reviewList);
      setSummary({
        agency: { id: agencyId, name: membership.agencies.name, plan: membership.agencies.plan },
        stats: {
          total_properties: propList.length,
          leased_properties: leased,
          vacant_properties: propList.filter((p) => p.status === 'vacant').length,
          pending_properties: propList.filter((p) => p.status === 'pending').length,
          occupancy_rate: propList.length ? Math.round((leased / propList.length) * 100) : 0,
          active_leases: leaseList.filter((lease) => lease.status === 'active').length,
          monthly_rent: leaseList.filter((lease) => lease.status === 'active').reduce((total, lease) => total + Number(lease.rent_amount), 0),
          total_arrears: paymentList.filter((payment) => payment.status === 'overdue').reduce((total, payment) => total + Number(payment.amount), 0),
          total_collected: paymentList.filter((payment) => payment.status === 'paid').reduce((total, payment) => total + Number(payment.amount), 0),
          overdue_payments_count: paymentList.filter((payment) => payment.status === 'overdue').length,
          pending_rent_reviews: reviewList.filter((review) => review.status === 'pending').length,
        },
        arrears_trend: arrearsTrend,
        expiring_leases: expiringLeases,
      });
      setAgencyFilter(membership.agencies.name);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [membership?.agency_id, membership?.agencies.name, membership?.agencies.plan, session?.access_token]);

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return properties;
    return properties.filter((property) => [property.address, property.suburb, property.state, property.postcode].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [properties, search]);

  if (loading || !summary) return <Spinner />;

  const s = summary.stats;
  const activeLeases = leases.filter((lease) => lease.status === 'active');
  const expiredLeases = leases.filter((lease) => lease.status === 'expired');
  const upcomingRenewals = summary.expiring_leases;
  const reviewedLeases = new Set(rentReviews.map((review) => review.lease_id)).size;
  const currentReviewCount = activeLeases.filter((lease) => rentReviews.some((review) => review.lease_id === lease.id && review.status === 'pending')).length;
  const complianceCount = properties.reduce((total, property) => total + (property.status === 'leased' ? 1 : 0), 0);

  const arrearsOptions = {
    chart: { type: 'bar' as const, toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    plotOptions: { bar: { borderRadius: 5, columnWidth: '42%' } },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    grid: { borderColor: chartGrid, strokeDashArray: 0 },
    xaxis: { categories: summary.arrears_trend.map((item) => item.month), labels: { style: { colors: chartText, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, labels: { style: { colors: chartText, fontSize: '10px' } }, title: { text: undefined } },
    tooltip: { theme: 'light', y: { formatter: (value: number) => formatCurrency(value) } },
  };

  const donutOptions = {
    chart: { type: 'donut' as const, fontFamily: 'inherit', background: 'transparent' },
    labels: ['Leased', 'Pending', 'Vacant'],
    colors: ['#56c667', '#3b82f6', '#f7c32e'],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' as const, labels: { colors: chartText }, fontSize: '10px', markers: { width: 8, height: 8 } },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, name: { show: true, color: chartText, fontSize: '10px' }, value: { show: true, color: '#0f172a', fontSize: '20px', fontWeight: 700, formatter: () => `${s.total_properties}` }, total: { show: true, label: 'Total', color: chartText, formatter: () => `${s.total_properties}` } } } } },
    tooltip: { theme: 'light', y: { formatter: (value: number) => `${value} properties` } },
  };

  const halfDonutOptions = (colors: string[], labels: string[]) => ({
    chart: { type: 'donut' as const, fontFamily: 'inherit', background: 'transparent' },
    labels,
    colors,
    stroke: { width: 0 },
    dataLabels: { enabled: true, style: { fontSize: '10px', fontWeight: 600 } },
    legend: { position: 'bottom' as const, labels: { colors: chartText }, fontSize: '10px', markers: { width: 8, height: 8 } },
    plotOptions: { pie: { startAngle: -90, endAngle: 90, offsetY: 10, donut: { size: '62%', labels: { show: true, value: { show: true, color: '#0f172a', fontSize: '18px', fontWeight: 700, offsetY: -12 }, total: { show: true, label: 'Leases', color: chartText, offsetY: -4, formatter: () => `${activeLeases.length}` } } } } },
    grid: { padding: { bottom: -70 } },
    tooltip: { theme: 'light' },
  });

  const myLeasesSeries = [
    activeLeases.filter((lease) => !lease.is_periodic).length,
    activeLeases.filter((lease) => lease.is_periodic).length,
    leases.filter((lease) => lease.status === 'expired').length,
  ];
  const expiredSeries = [expiredLeases.filter((lease) => daysUntil(lease.end_date) >= -30).length, expiredLeases.filter((lease) => daysUntil(lease.end_date) < -30 && daysUntil(lease.end_date) >= -60).length, expiredLeases.filter((lease) => daysUntil(lease.end_date) < -60).length];
  const renewalSeries = [upcomingRenewals.filter((lease) => lease.days_remaining <= 30).length, upcomingRenewals.filter((lease) => lease.days_remaining > 30 && lease.days_remaining <= 60).length, Math.max(activeLeases.length - upcomingRenewals.length, 0)];
  const reviewSeries = [Math.max(activeLeases.length - reviewedLeases, 0), currentReviewCount, Math.max(reviewedLeases - currentReviewCount, 0)];

  return (
    <div className="min-h-full bg-[#f4f5f7] -m-4 p-4 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">Agency</span>
              <select value={agencyFilter} onChange={(event) => setAgencyFilter(event.target.value)} className="h-9 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-600 outline-none sm:w-56">
                <option>{summary.agency.name}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
            </label>
            <label className="relative block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:w-56" />
            </label>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</button>
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none">
            <option value="days">Days in Arrears</option>
            <option value="amount">Amount in Arrears</option>
          </select>
          {search && <button onClick={() => setSearch('')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Clear search</button>}
          <span className="ml-auto text-xs text-slate-500">Showing {filteredProperties.length} of {properties.length} properties</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <ChartCard title="Arrears" className="xl:col-span-2">
            <div className="mb-1 flex justify-end"><span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500">{period === 'days' ? 'Days in Arrears' : 'Amount in Arrears'} <ChevronDown className="ml-1 inline h-3 w-3" /></span></div>
            <Chart options={arrearsOptions} series={[{ name: 'Properties', data: summary.arrears_trend.map((item) => item.arrears) }]} type="bar" height={230} />
          </ChartCard>
          <ChartCard title="My Properties">
            <Chart options={donutOptions} series={[s.leased_properties, s.pending_properties, s.vacant_properties]} type="donut" height={250} />
          </ChartCard>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ChartCard title="My Leases"><Chart options={halfDonutOptions(['#56c667', '#3b82f6', '#f7c32e'], ['Current', 'Periodic', 'Expired'])} series={myLeasesSeries} type="donut" height={235} /></ChartCard>
          <ChartCard title="Expired Leases"><Chart options={halfDonutOptions(['#56c667', '#f7c32e', '#f97316', '#ef4444'], ['0-30 days', '31-60 days', '61-90 days', '91+ days'])} series={[expiredSeries[0], expiredSeries[1], 0, expiredSeries[2]]} type="donut" height={235} /></ChartCard>
          <ChartCard title="Upcoming Leases Renewal"><Chart options={halfDonutOptions(['#ef4444', '#f7c32e', '#56c667'], ['0-30 days', '31-60 days', '61+ days'])} series={renewalSeries} type="donut" height={235} /></ChartCard>
          <ChartCard title="Rent Reviews"><Chart options={halfDonutOptions(['#3b82f6', '#f7c32e', '#56c667'], ['No Date', 'Overdue', 'Upcoming'])} series={reviewSeries} type="donut" height={235} /></ChartCard>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Compliance Overview</h2>
            <p className="mt-1 text-xs text-slate-500">Agency and Manager filters don’t apply to the charts below.</p>
          </div>
          <button onClick={() => setShowCompliance((visible) => !visible)} className="flex items-center gap-1 text-xs font-medium text-blue-600">{showCompliance ? 'Hide Charts' : 'Show Charts'} {showCompliance ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
        </div>

        {showCompliance && (
          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            <ChartCard title="Compliance Checks">
              <div className="relative flex h-48 items-center justify-center overflow-hidden">
                <div className="absolute top-10 h-36 w-72 rounded-t-full border-[18px] border-slate-300 border-b-0" />
                <div className="absolute top-10 h-36 w-72 rounded-t-full border-[18px] border-emerald-500 border-b-0 opacity-0" />
                <div className="relative mt-20 text-center"><p className="text-xl font-bold text-slate-800">{complianceCount}</p><p className="text-[10px] text-slate-500">Checks</p></div>
              </div>
              <div className="flex justify-center gap-4 text-[10px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />Compliant</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-500" />Upcoming</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-500" />Overdue</span></div>
            </ChartCard>
            <ChartCard title="Agency vs. Owner Managed Compliance Check">
              <div className="space-y-6 py-5 text-[10px] text-slate-500">
                <ComplianceBar label="Agency Managed" value={Math.round(complianceCount * 0.7)} total={Math.max(properties.length, 1)} color="bg-slate-300" />
                <ComplianceBar label="Owner Self-Managed" value={Math.round(complianceCount * 0.3)} total={Math.max(properties.length, 1)} color="bg-slate-300" />
              </div>
            </ChartCard>
            <ChartCard title="Properties’ Standards">
              <div className="space-y-5 py-6 text-[10px] text-slate-500">
                <ComplianceBar label="Compliant" value={properties.filter((property) => property.status === 'leased').length} total={Math.max(properties.length, 1)} color="bg-red-500" />
                <div className="flex justify-between"><span>Compliant</span><span>Non-Compliant</span></div>
              </div>
            </ChartCard>
          </div>
        )}

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-semibold text-slate-800">Upcoming Lease Renewal</h2></div>
            {upcomingRenewals.length === 0 ? <p className="py-3 text-sm text-slate-500">No leases expiring in the next 60 days.</p> : <div className="space-y-2">{upcomingRenewals.slice(0, 5).map((lease) => <div key={lease.lease_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"><div><p className="text-sm font-medium text-slate-700">{lease.property_address}</p><p className="text-xs text-slate-500">Ends {formatDate(lease.end_date)}</p></div><Badge color={lease.days_remaining <= 30 ? 'red' : 'amber'}>{lease.days_remaining} days</Badge></div>)}</div>}
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><h2 className="text-sm font-semibold text-slate-800">Overdue Payments</h2></div>
            {payments.filter((payment) => payment.status === 'overdue').length === 0 ? <p className="py-3 text-sm text-slate-500">No overdue payments. All good.</p> : <div className="space-y-2">{payments.filter((payment) => payment.status === 'overdue').slice(0, 5).map((payment) => { const lease = leases.find((item) => item.id === payment.lease_id); const property = properties.find((item) => item.id === lease?.property_id); return <div key={payment.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"><div><p className="text-sm font-medium text-slate-700">{property?.address ?? 'Property'}</p><p className="text-xs text-slate-500">Due {formatDate(payment.due_date)}</p></div><Badge color={statusColor(payment.status)}>{formatCurrency(Number(payment.amount))}</Badge></div>; })}</div>}
          </section>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniMetric icon={<Home className="h-4 w-4" />} label="Properties" value={`${s.total_properties}`} />
          <MiniMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Occupancy" value={`${s.occupancy_rate}%`} />
          <MiniMetric icon={<Clock3 className="h-4 w-4" />} label="Monthly rent" value={formatCurrency(s.monthly_rent)} />
          <MiniMetric icon={<Filter className="h-4 w-4" />} label="Rent reviews" value={`${s.pending_rent_reviews}`} />
        </div>
      </div>
    </div>
  );
}

function ComplianceBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = Math.min(100, Math.round((value / total) * 100));
  return <div><div className="mb-1 flex justify-between"><span>{label}</span><span>{value}</span></div><div className="h-7 rounded-sm bg-slate-100"><div className={`h-7 rounded-sm ${color}`} style={{ width: `${Math.max(width, 8)}%` }} /></div></div>;
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><div className="text-blue-600">{icon}</div><div><p className="text-[10px] text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-800">{value}</p></div></div>;
}
