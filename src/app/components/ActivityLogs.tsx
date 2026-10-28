import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { roleLabel } from '@/lib/programs';
import { mdy } from '@/lib/dates';
import { LoadingState, ErrorState } from './DataState';
import { Pagination, usePaged } from './Pagination';

interface LogEntry {
  id: number;
  created_at: string;
  actor_email: string | null;
  actor_role: string | null;
  category: string;
  action: string;
  target: string | null;
  details: string | null;
}

const CATEGORIES = [
  { value: 'all', label: 'All activity' },
  { value: 'sign-in', label: 'Sign-ins' },
  { value: 'account', label: 'Accounts' },
  { value: 'record', label: 'Alumni records' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'job', label: 'Job Board' },
  { value: 'settings', label: 'Site settings' },
];
const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label || c;

// Most recent entries loaded at a time; narrow the dates to look further back
const LIMIT = 1000;

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const isWarning = (e: LogEntry) => /wrong password|locked|deactivated|removed|deleted/i.test(e.action);

/** Activity log for the Super Admin: sign-ins, account changes, record edits and posts. */
export function ActivityLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(LIMIT);
    if (category !== 'all') q = q.eq('category', category);
    if (from) q = q.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
    if (to) q = q.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
    const { data, error: loadError } = await q;
    if (loadError) setError(loadError.message);
    else {
      setError(null);
      setEntries((data || []) as LogEntry[]);
    }
    setLoading(false);
  }, [category, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e) => [e.actor_email, e.action, e.target, e.details, roleLabel(e.actor_role || '')].some((v) => (v || '').toLowerCase().includes(s)));
  }, [entries, search]);
  const paged = usePaged(visible, 15);

  // Quick counts for the last 24 hours
  const day = useMemo(() => {
    const since = Date.now() - 24 * 3600 * 1000;
    const recent = entries.filter((e) => new Date(e.created_at).getTime() >= since);
    return {
      signIns: recent.filter((e) => e.action === 'Signed in').length,
      wrong: recent.filter((e) => e.action === 'Wrong password').length,
      locked: recent.filter((e) => e.action.startsWith('Locked')).length,
      changes: recent.filter((e) => e.category !== 'sign-in').length,
    };
  }, [entries]);

  const exportCsv = () => {
    const cell = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Time', 'Email', 'Role', 'Type', 'Action', 'Target', 'Details'],
      ...visible.map((e) => [mdy(e.created_at), time(e.created_at), e.actor_email || '', roleLabel(e.actor_role || ''), categoryLabel(e.category), e.action, e.target || '', e.details || '']),
    ];
    const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filtersOn = category !== 'all' || !!from || !!to || !!search;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground mt-1">Who signed in and what changed in the system</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!visible.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Sign-ins (24h)', day.signIns],
          ['Wrong passwords (24h)', day.wrong],
          ['Lockouts (24h)', day.locked],
          ['Changes (24h)', day.changes],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-card rounded-2xl shadow-sm px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-sm">
        <div className="p-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center border-b border-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, action or name..."
              className="w-full pl-9 pr-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="filter-select md:w-44" aria-label="Type of activity">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            From
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="filter-select" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            To
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="filter-select" />
          </label>
          {filtersOn ? (
            <button
              onClick={() => {
                setCategory('all');
                setFrom('');
                setTo('');
                setSearch('');
              }}
              className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
            >
              Clear filters
            </button>
          ) : (
            <span />
          )}
        </div>

        {loading && !entries.length ? (
          <LoadingState label="Loading activity..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-medium">Who</th>
                    <th className="px-4 py-3 font-medium">Activity</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.pageItems.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p>{mdy(e.created_at)}</p>
                        <p className="text-xs text-muted-foreground">{time(e.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[12rem]">
                        <p className="break-all">{e.actor_email || 'System'}</p>
                        {e.actor_role && <p className="text-xs text-muted-foreground">{roleLabel(e.actor_role)}</p>}
                      </td>
                      <td className="px-4 py-3 min-w-[12rem]">
                        <p className={isWarning(e) ? 'font-semibold' : ''}>{e.action}</p>
                        <p className="text-xs text-muted-foreground">{categoryLabel(e.category)}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[14rem]">
                        {e.target && <p className="break-words">{e.target}</p>}
                        {e.details && <p className="text-xs text-muted-foreground break-words">{e.details}</p>}
                        {!e.target && !e.details && <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No activity found.</p>}
            {entries.length >= LIMIT && (
              <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
                Showing the latest {LIMIT} entries. Choose dates to look further back.
              </p>
            )}
          </>
        )}
        <Pagination {...paged} label="entries" />
      </div>
    </div>
  );
}
