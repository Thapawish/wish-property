import type { ReactNode } from 'react';
import { Search, X, Filter } from 'lucide-react';

export type FilterOption = {
  label: string;
  value: string;
};

export function SearchToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusFilters,
  statusValue,
  onStatusChange,
  suburbFilters,
  suburbValue,
  onSuburbChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  dateLabel = 'Date',
  resultCount,
  onClear,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  statusFilters?: FilterOption[];
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  suburbFilters?: FilterOption[];
  suburbValue?: string;
  onSuburbChange?: (v: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
  dateLabel?: string;
  resultCount?: number;
  onClear?: () => void;
}) {
  const hasFilters = search || (statusValue && statusValue !== 'all') || (suburbValue && suburbValue !== 'all') || dateFrom || dateTo;
  const selectCls = 'px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
  const inputCls = 'px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        {statusFilters && onStatusChange && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 hidden sm:block" />
            <select value={statusValue} onChange={(e) => onStatusChange(e.target.value)} className={selectCls}>
              {statusFilters.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Suburb filter */}
        {suburbFilters && onSuburbChange && (
          <select value={suburbValue} onChange={(e) => onSuburbChange(e.target.value)} className={selectCls}>
            {suburbFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        )}

        {/* Date range */}
        {onDateFromChange && onDateToChange && (
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom ?? ''} onChange={(e) => onDateFromChange(e.target.value)} className={inputCls} aria-label={`${dateLabel} from`} />
            <span className="text-slate-600 text-sm">—</span>
            <input type="date" value={dateTo ?? ''} onChange={(e) => onDateToChange(e.target.value)} className={inputCls} aria-label={`${dateLabel} to`} />
          </div>
        )}
      </div>

      {/* Active filter summary */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-xs">
          {resultCount !== undefined && (
            <>
              Showing {resultCount} {resultCount === 1 ? 'result' : 'results'}
              {hasFilters && ' (filtered)'}
            </>
          )}
        </p>
        {hasFilters && onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-slate-400 hover:text-teal-400 text-xs font-medium transition"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function uniqueSuburbs(items: { suburb: string | null }[]): FilterOption[] {
  const set = new Set<string>();
  items.forEach((i) => { if (i.suburb) set.add(i.suburb); });
  return [{ label: 'All suburbs', value: 'all' }, ...Array.from(set).sort().map((s) => ({ label: s, value: s }))];
}
