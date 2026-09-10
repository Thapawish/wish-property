import type { ReactNode } from 'react';

export function Badge({
  children,
  color = 'slate',
  variant = 'dark',
}: {
  children: ReactNode;
  color?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'teal';
  variant?: 'dark' | 'light';
}) {
  const darkColors: Record<string, string> = {
    slate: 'bg-slate-700/50 text-slate-300',
    green: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    teal: 'bg-teal-500/10 text-teal-400',
  };
  const lightColors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
  };
  const colors = variant === 'light' ? lightColors : darkColors;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  variant = 'dark',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'dark' | 'light';
}) {
  const isLight = variant === 'light';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <h2 className={`text-lg font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>{title}</h2>
          <button onClick={onClose} className={`text-xl leading-none ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'}`}>
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'dark',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  variant?: 'dark' | 'light';
}) {
  const isLight = variant === 'light';
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-500'}`}>
        {icon}
      </div>
      <h3 className={`font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  variant = 'dark',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'dark' | 'light';
}) {
  const isLight = variant === 'light';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h2 className={`text-xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{title}</h2>
        {description && <p className={`text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const isLight = variant === 'light';
  return (
    <div className="flex items-center justify-center py-16">
      <div className={`w-8 h-8 border-2 rounded-full animate-spin ${isLight ? 'border-slate-200 border-t-blue-600' : 'border-slate-700 border-t-teal-500'}`} />
    </div>
  );
}

export function statusColor(status: string): 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'teal' {
  switch (status) {
    case 'leased':
    case 'active':
    case 'paid':
    case 'approved':
    case 'applied':
      return 'green';
    case 'vacant':
    case 'expired':
      return 'slate';
    case 'pending':
      return 'amber';
    case 'overdue':
    case 'rejected':
      return 'red';
    default:
      return 'slate';
  }
}
