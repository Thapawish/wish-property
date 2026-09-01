import type { ReactNode } from 'react';

export function Badge({
  children,
  color = 'slate',
}: {
  children: ReactNode;
  color?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'teal';
}) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-700/50 text-slate-300',
    green: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    teal: 'bg-teal-500/10 text-teal-400',
  };
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">
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
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
        {icon}
      </div>
      <h3 className="text-slate-300 font-medium mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {description && <p className="text-slate-400 text-sm mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-teal-500 rounded-full animate-spin" />
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
