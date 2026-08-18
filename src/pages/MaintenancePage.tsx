import { useEffect, useState } from 'react';
import { Database, GitBranch, Download, RefreshCw, AlertCircle, CheckCircle, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Badge, PageHeader, Spinner } from '@/components/ui';

type BackupEntry = {
  id: number;
  triggered_by: string | null;
  status: string;
  tables_backed_up: string[];
  row_counts: Record<string, number>;
  total_rows: number;
  created_at: string;
};

type ChangelogEntry = {
  id: number;
  version: string;
  released_at: string;
  summary: string;
  changes: { type: string; description: string }[];
  breaking: boolean;
  min_app_version: string | null;
};

const APP_VERSION = '1.1.0';

export function MaintenancePage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1-maintenance`;

    const [backupRes, changelogRes] = await Promise.all([
      fetch(`${apiUrl}?action=list`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiUrl}?action=changelog`, { headers: { Authorization: `Bearer ${token}`, 'X-App-Version': APP_VERSION } }),
    ]);

    if (backupRes.ok) {
      const body = await backupRes.json();
      setBackups(body.backups ?? []);
    }

    if (changelogRes.ok) {
      const body = await changelogRes.json();
      setChangelog(body.changelog ?? []);
      setUpdateAvailable(body.update_available ?? false);
      setLatestVersion(body.current_api_version ?? null);
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function triggerBackup() {
    setBacking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1-maintenance?action=backup`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Backup failed');
      }

      const body = await res.json();
      toast(`Backup completed — ${body.total_rows} rows across ${Object.keys(body.tables).length} tables.`, 'success');
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Backup failed. Please try again.', 'error');
    } finally {
      setBacking(false);
    }
  }

  if (loading) return <Spinner />;

  const changeTypeColors: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'teal'> = {
    added: 'green',
    changed: 'amber',
    deprecated: 'amber',
    removed: 'red',
    fixed: 'blue',
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Database backups, API versioning, and system health"
        action={isAdmin && (
          <button
            onClick={triggerBackup}
            disabled={backing}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {backing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {backing ? 'Backing up...' : 'Trigger Backup'}
          </button>
        )}
      />

      {/* Update available banner */}
      {updateAvailable && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium text-sm">A new app version is available</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Your installed version ({APP_VERSION}) may not support the latest API features. Update the app to ensure full compatibility.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Backup History */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-teal-400" />
            <h3 className="text-white font-semibold">Backup History</h3>
          </div>

          {backups.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">No backups recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {backups.map((b) => (
                <div key={b.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm font-medium">
                        {new Date(b.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <Badge color="green">{b.status}</Badge>
                  </div>
                  <p className="text-slate-500 text-xs">
                    {b.total_rows.toLocaleString()} rows across {b.tables_backed_up.length} tables
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.tables_backed_up.map((t) => (
                      <span key={t} className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Changelog */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-teal-400" />
            <h3 className="text-white font-semibold">API Version Changelog</h3>
            {latestVersion && (
              <Badge color="teal">
                <Tag className="w-3 h-3 mr-1 inline" />
                {latestVersion}
              </Badge>
            )}
          </div>

          {changelog.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">No changelog entries.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {changelog.map((entry) => (
                <div key={entry.id} className="border-l-2 border-slate-700 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{entry.version}</span>
                    {entry.breaking && <Badge color="red">Breaking</Badge>}
                    <span className="text-slate-500 text-xs">
                      {new Date(entry.released_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{entry.summary}</p>
                  <ul className="space-y-1">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Badge color={changeTypeColors[c.type] ?? 'slate'}>{c.type}</Badge>
                        <span className="text-slate-400">{c.description}</span>
                      </li>
                    ))}
                  </ul>
                  {entry.min_app_version && (
                    <p className="text-slate-600 text-xs mt-2">Requires app v{entry.min_app_version}+</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
