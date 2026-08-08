import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Home,
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  Building2,
  LogOut,
  Menu,
  X,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type PageKey = 'dashboard' | 'properties' | 'leases' | 'contacts' | 'payments' | 'rent-reviews' | 'maintenance';

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof Home; shortLabel: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortLabel: 'Home' },
  { key: 'properties', label: 'Properties', icon: Home, shortLabel: 'Properties' },
  { key: 'leases', label: 'Leases', icon: FileText, shortLabel: 'Leases' },
  { key: 'contacts', label: 'Contacts', icon: Users, shortLabel: 'Contacts' },
  { key: 'payments', label: 'Payments', icon: DollarSign, shortLabel: 'Payments' },
  { key: 'rent-reviews', label: 'Rent Reviews', icon: TrendingUp, shortLabel: 'Reviews' },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench, shortLabel: 'System' },
];

const MOBILE_NAV: { key: PageKey; icon: typeof Home; shortLabel: string }[] = [
  { key: 'dashboard', icon: LayoutDashboard, shortLabel: 'Home' },
  { key: 'properties', icon: Home, shortLabel: 'Properties' },
  { key: 'leases', icon: FileText, shortLabel: 'Leases' },
  { key: 'payments', icon: DollarSign, shortLabel: 'Payments' },
];

export function AppShell({
  current,
  onNavigate,
  children,
}: {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}) {
  const { membership, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const agency = membership?.agencies;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar — desktop only */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">PropertyHub</p>
            <p className="text-slate-500 text-xs truncate">{agency?.name ?? 'Agency'}</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500/10 text-teal-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-slate-500 text-xs">Signed in as</p>
            <p className="text-slate-300 text-sm truncate capitalize">{membership?.role.replace('_', ' ')}</p>
            {membership?.role === 'agency_admin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400">Admin access</span>
            ) : (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400">View & edit</span>
            )}
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 safe-top">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-white capitalize hidden sm:block">
            {current.replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-slate-300 text-sm font-medium leading-tight">{agency?.name}</p>
              <p className="text-slate-500 text-xs leading-tight">Plan: {agency?.plan}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-medium">
              {agency?.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto pb-24 lg:pb-8">{children}</main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-slate-900/95 backdrop-blur border-t border-slate-800 safe-bottom-nav">
        <div className="flex items-center justify-around px-2 pt-2">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition ${
                  active ? 'text-teal-400' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.shortLabel}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-slate-500"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export function MobileCloseButton() {
  return (
    <button className="lg:hidden absolute top-4 right-4 text-slate-400">
      <X className="w-5 h-5" />
    </button>
  );
}
