import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, FileText, DollarSign, TrendingUp, Home, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, daysUntil } from '@/lib/format';
import { Badge, Spinner } from '@/components/ui';
import type { Lease, Payment, Property, RentReview, PropertyInspection } from '@/lib/supabase';

type CalendarEvent = {
  id: string;
  date: string;
  type: 'lease_expiry' | 'rent_due' | 'rent_review' | 'inspection';
  label: string;
  sublabel: string;
  amount?: number;
};

const EVENT_CONFIG: Record<CalendarEvent['type'], { color: string; bg: string; dot: string; icon: typeof FileText; label: string }> = {
  lease_expiry: { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', icon: FileText, label: 'Lease Expiry' },
  rent_due: { color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', icon: DollarSign, label: 'Rent Due' },
  rent_review: { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: TrendingUp, label: 'Rent Review' },
  inspection: { color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: Home, label: 'Inspection' },
};

export function CalendarPage() {
  const { membership } = useAuth();
  const agencyId = membership?.agency_id;
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentReviews, setRentReviews] = useState<RentReview[]>([]);
  const [inspections, setInspections] = useState<PropertyInspection[]>([]);

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    (async () => {
      const [leaseRes, paymentRes, propRes, reviewRes, inspectionRes] = await Promise.all([
        supabase.from('leases').select('*').eq('agency_id', agencyId),
        supabase.from('payments').select('*').eq('agency_id', agencyId),
        supabase.from('properties').select('*').eq('agency_id', agencyId),
        supabase.from('rent_reviews').select('*').eq('agency_id', agencyId),
        supabase.from('property_inspections').select('*').eq('agency_id', agencyId),
      ]);
      if (cancelled) return;
      setLeases(leaseRes.data ?? []);
      setPayments(paymentRes.data ?? []);
      setProperties(propRes.data ?? []);
      setRentReviews(reviewRes.data ?? []);
      setInspections((inspectionRes.data ?? []) as PropertyInspection[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agencyId]);

  const events = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];
    for (const lease of leases) {
      if (lease.status === 'active') {
        const prop = properties.find((p) => p.id === lease.property_id);
        list.push({ id: `lease-${lease.id}`, date: lease.end_date, type: 'lease_expiry', label: prop?.address ?? 'Property', sublabel: 'Lease expires' });
      }
    }
    for (const payment of payments) {
      if (payment.status === 'pending' || payment.status === 'overdue') {
        const lease = leases.find((l) => l.id === payment.lease_id);
        const prop = properties.find((p) => p.id === lease?.property_id);
        list.push({ id: `payment-${payment.id}`, date: payment.due_date, type: 'rent_due', label: prop?.address ?? 'Property', sublabel: 'Rent due', amount: Number(payment.amount) });
      }
    }
    for (const review of rentReviews) {
      if (review.status === 'pending') {
        const lease = leases.find((l) => l.id === review.lease_id);
        const prop = properties.find((p) => p.id === lease?.property_id);
        list.push({ id: `review-${review.id}`, date: review.review_date, type: 'rent_review', label: prop?.address ?? 'Property', sublabel: 'Rent review due' });
      }
    }
    for (const insp of inspections) {
      if (insp.status === 'scheduled') {
        const prop = properties.find((p) => p.id === insp.property_id);
        list.push({ id: `insp-${insp.id}`, date: insp.inspection_date, type: 'inspection', label: prop?.address ?? 'Property', sublabel: insp.type ? `${insp.type} inspection` : 'Inspection' });
      }
    }
    return list;
  }, [leases, payments, properties, rentReviews, inspections]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const monthData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days: ({ date: Date; events: CalendarEvent[]; isToday: boolean } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().slice(0, 10);
      days.push({ date, events: eventsByDate[dateStr] ?? [], isToday: date.getTime() === today.getTime() });
    }
    return days;
  }, [currentMonth, eventsByDate]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((ev) => new Date(ev.date).getTime() >= today.getTime())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [events]);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  if (loading) return <Spinner variant="light" />;

  const monthLabel = currentMonth.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  const typeCounts = events.reduce((acc, ev) => {
    acc[ev.type] = (acc[ev.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-full bg-[#f4f5f7] -m-4 p-4 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-slate-800">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Lease expiries, rent due dates, inspections, and rent reviews all in one view.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{monthLabel}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Today</button>
                <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
              {monthData.map((cell, i) => {
                if (!cell) return <div key={i} className="bg-white min-h-[88px] p-1.5" />;
                const dateStr = cell.date.toISOString().slice(0, 10);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`bg-white min-h-[88px] p-1.5 text-left align-top transition hover:bg-blue-50/40 ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''} ${cell.isToday ? 'bg-blue-50/30' : ''}`}
                  >
                    <span className={`text-xs font-medium ${cell.isToday ? 'text-blue-600' : 'text-slate-600'}`}>{cell.date.getDate()}</span>
                    <div className="mt-1 space-y-0.5">
                      {cell.events.slice(0, 3).map((ev) => {
                        const cfg = EVENT_CONFIG[ev.type];
                        return (
                          <div key={ev.id} className={`flex items-center gap-1 rounded px-1 py-0.5 ${cfg.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            <span className={`text-[10px] font-medium truncate ${cfg.color}`}>{ev.label}</span>
                          </div>
                        );
                      })}
                      {cell.events.length > 3 && <p className="text-[10px] text-slate-400 pl-1">+{cell.events.length - 3} more</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {(Object.keys(EVENT_CONFIG) as CalendarEvent['type'][]).map((type) => {
                const cfg = EVENT_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    <span className="text-xs text-slate-600">{cfg.label}</span>
                    {typeCounts[type] > 0 && <span className="text-xs font-bold text-slate-400">({typeCounts[type]})</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {selectedDate && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">{formatDate(selectedDate)}</h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">No events on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((ev) => {
                      const cfg = EVENT_CONFIG[ev.type];
                      const Icon = cfg.icon;
                      return (
                        <div key={ev.id} className={`flex items-start gap-2.5 rounded-lg ${cfg.bg} px-3 py-2`}>
                          <Icon className={`h-4 w-4 mt-0.5 ${cfg.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{ev.label}</p>
                            <p className="text-xs text-slate-500">{ev.sublabel}{ev.amount ? ` — ${formatCurrency(ev.amount)}` : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-800">Upcoming Events</h3>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No upcoming events in the next 60 days.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {upcomingEvents.map((ev) => {
                    const cfg = EVENT_CONFIG[ev.type];
                    const Icon = cfg.icon;
                    const d = daysUntil(ev.date);
                    return (
                      <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:border-slate-200 transition">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bg}`}>
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{ev.label}</p>
                          <p className="text-xs text-slate-500">{cfg.label}{ev.amount ? ` — ${formatCurrency(ev.amount)}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{formatDate(ev.date)}</p>
                          <Badge color={d <= 7 ? 'red' : d <= 30 ? 'amber' : 'blue'} variant="light">
                            {d === 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
