import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { Home, FileText, DollarSign, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { Badge, PageHeader, Spinner, statusColor } from '@/components/ui';
import type { Property, Lease, Payment } from '@/lib/supabase';

type DashboardSummary = {
  agency: { id: string; name: string; plan: string };
  user_role: string;
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
  generated_at: string;
};

export function DashboardPage() {
  const { session, membership } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [overduePayments, setOverduePayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);

  useEffect(() => {
    if (!session?.access_token || !membership?.agency_id) return;
    (async () => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1-dashboard`;
      try {
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data: DashboardSummary = await response.json();
        setSummary(data);
      } catch {
        const agencyId = membership.agency_id;
        const [{ data: props }, { data: leaseData }, { data: payData }] = await Promise.all([
          supabase.from('properties').select('*').eq('agency_id', agencyId),
          supabase.from('leases').select('*').eq('agency_id', agencyId),
          supabase.from('payments').select('*').eq('agency_id', agencyId),
        ]);
        const propList = props ?? [];
        const leaseList = leaseData ?? [];
        const payList = payData ?? [];
        setProperties(propList);
        setLeases(leaseList);
        setOverduePayments(payList.filter((p) => p.status === 'overdue'));

        const leased = propList.filter((p) => p.status === 'leased').length;
        const arrearsTrend: { month: string; arrears: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const label = d.toLocaleString('en-AU', { month: 'short' });
          const monthPay = payList.filter((p) => {
            const pd = new Date(p.due_date);
            return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
          });
          arrearsTrend.push({
            month: label,
            arrears: monthPay.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0),
          });
        }
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiring = leaseList
          .filter((l) => {
            if (l.status !== 'active') return false;
            const days = daysUntil(l.end_date);
            return days >= 0 && days <= 30;
          })
          .map((l) => {
            const prop = propList.find((p) => p.id === l.property_id);
            return {
              lease_id: l.id,
              property_address: prop?.address ?? 'Unknown',
              property_suburb: prop?.suburb ?? null,
              end_date: l.end_date,
              days_remaining: daysUntil(l.end_date),
              rent_amount: Number(l.rent_amount),
            };
          });

        setSummary({
          agency: { id: membership.agency_id, name: membership.agencies.name, plan: membership.agencies.plan },
          user_role: membership.role,
          stats: {
            total_properties: propList.length,
            leased_properties: leased,
            vacant_properties: propList.filter((p) => p.status === 'vacant').length,
            pending_properties: propList.filter((p) => p.status === 'pending').length,
            occupancy_rate: propList.length ? Math.round((leased / propList.length) * 100) : 0,
            active_leases: leaseList.filter((l) => l.status === 'active').length,
            monthly_rent: leaseList.filter((l) => l.status === 'active').reduce((s, l) => s + Number(l.rent_amount), 0),
            total_arrears: payList.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0),
            total_collected: payList.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
            overdue_payments_count: payList.filter((p) => p.status === 'overdue').length,
            pending_rent_reviews: 0,
          },
          arrears_trend: arrearsTrend,
          expiring_leases: expiring,
          generated_at: new Date().toISOString(),
        });
      }
      setLoading(false);
    })();
  }, [session?.access_token, membership?.agency_id]);

  useEffect(() => {
    if (summary && overduePayments.length === 0 && membership?.agency_id) {
      supabase
        .from('payments')
        .select('*')
        .eq('agency_id', membership.agency_id)
        .eq('status', 'overdue')
        .order('due_date', { ascending: false })
        .then(({ data }) => setOverduePayments(data ?? []));
    }
  }, [summary, overduePayments.length, membership?.agency_id]);

  if (loading || !summary) return <Spinner />;

  const s = summary.stats;
  const stats = [
    { label: 'Total Properties', value: s.total_properties, icon: Home, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Active Leases', value: s.active_leases, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Monthly Rent', value: formatCurrency(s.monthly_rent), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Arrears', value: formatCurrency(s.total_arrears), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  const arrearsChartOptions = {
    chart: { type: 'bar' as const, background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    series: [{ name: 'Arrears', data: summary.arrears_trend.map((t) => t.arrears) }],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
    colors: ['#f43f5e'],
    xaxis: { categories: summary.arrears_trend.map((t) => t.month), labels: { style: { colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#94a3b8' }, formatter: (val: number) => (val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`) } },
    grid: { borderColor: '#1e293b', strokeDashArray: 0 },
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark', y: { formatter: (val: number) => formatCurrency(val) } },
    fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, gradientToColors: ['#fb7185'], inverseColors: false, opacityFrom: 0.9, opacityTo: 0.5 } },
  };

  const donutChartOptions = {
    chart: { type: 'donut' as const, background: 'transparent', fontFamily: 'inherit' },
    series: [s.leased_properties, s.vacant_properties, s.pending_properties],
    labels: ['Leased', 'Vacant', 'Pending'],
    colors: ['#10b981', '#64748b', '#f59e0b'],
    stroke: { width: 0 },
    legend: { position: 'bottom' as const, labels: { colors: '#94a3b8' }, markers: { width: 10, height: 10, radius: 5 } },
    plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { color: '#94a3b8', fontSize: '13px' }, value: { color: '#fff', fontSize: '28px', fontWeight: 700, formatter: () => `${s.occupancy_rate}%` }, total: { show: true, label: 'Occupancy', color: '#94a3b8' } } } } },
    tooltip: { theme: 'dark', y: { formatter: (val: number) => `${val} properties` } },
    dataLabels: { enabled: false },
    responsive: [{ breakpoint: 480, options: { chart: { width: 280 } } }],
  };

  return (
    <div>
      <PageHeader title="Dashboard" description={`${summary.agency.name} — overview of your portfolio`} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-slate-400 text-xs font-medium mb-1">{stat.label}</p>
              <p className="text-white text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Arrears bar chart */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-1">Arrears Trend</h3>
          <p className="text-slate-500 text-sm mb-4">Outstanding rent over the last 6 months</p>
          <Chart options={arrearsChartOptions} series={arrearsChartOptions.series} type="bar" height={280} />
        </div>

        {/* Property status donut */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-1">Property Status</h3>
          <p className="text-slate-500 text-sm mb-4">Distribution across your portfolio</p>
          <Chart options={donutChartOptions} series={donutChartOptions.series} type="donut" height={280} />
        </div>
      </div>

      {/* Expiring leases + recent arrears */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold">Leases Expiring Soon</h3>
          </div>
          {summary.expiring_leases.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No leases expiring in the next 30 days.</p>
          ) : (
            <div className="space-y-3">
              {summary.expiring_leases.map((lease) => (
                <div key={lease.lease_id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{lease.property_address}</p>
                    <p className="text-slate-500 text-xs">Ends {formatDate(lease.end_date)}</p>
                  </div>
                  <Badge color={lease.days_remaining <= 7 ? 'red' : 'amber'}>
                    {lease.days_remaining} {lease.days_remaining === 1 ? 'day' : 'days'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-red-400" />
            <h3 className="text-white font-semibold">Overdue Payments</h3>
          </div>
          {overduePayments.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No overdue payments. All good!</p>
          ) : (
            <div className="space-y-3">
              {overduePayments.slice(0, 5).map((payment) => {
                const lease = leases.find((l) => l.id === payment.lease_id);
                const prop = lease ? properties.find((p) => p.id === lease.property_id) : null;
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{prop?.address ?? 'Property'}</p>
                      <p className="text-slate-500 text-xs">Due {formatDate(payment.due_date)}</p>
                    </div>
                    <Badge color={statusColor(payment.status)}>{formatCurrency(Number(payment.amount))}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
