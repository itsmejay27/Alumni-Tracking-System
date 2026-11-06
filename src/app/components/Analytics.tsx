import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Send, Table2, LineChart as LineIcon, CheckCircle2, UserCheck, UserX, Clock } from 'lucide-react';
import { Pagination, usePaged } from './Pagination';
import { toast } from 'sonner';
import { confirmDialog } from './ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { mdy } from '@/lib/dates';
import { AlumniRecord, Course, courseScopeForRole, currentJob, isEmployed, isTracked, useAlumniRecords } from '@/lib/alumni';
import { PROGRAMS } from '@/lib/programs';
import { LoadingState, ErrorState } from './DataState';

interface AnalyticsProps {
  userRole: string;
}

type Metric = 'rate' | 'employed' | 'unemployed' | 'untracked';
const METRICS: { id: Metric; label: string }[] = [
  { id: 'rate', label: 'Employment rate (%)' },
  { id: 'employed', label: 'Employed (count)' },
  { id: 'unemployed', label: 'Unemployed (count)' },
  { id: 'untracked', label: 'Not tracked (count)' },
];

const isGovernment = (t?: string) => t === 'Government';

interface BatchTotal {
  course: Course;
  year_graduated: number;
  enrolled: number | null;
  graduated: number | null;
}

export function Analytics({ userRole }: AnalyticsProps) {
  const scope = courseScopeForRole(userRole);
  const { records, loading, error } = useAlumniRecords();
  const [program, setProgram] = useState<string>(scope || 'all');
  const [year, setYear] = useState<string>('all');
  const [metric, setMetric] = useState<Metric>('rate');
  const [showTable, setShowTable] = useState(false);
  const [chartHover, setChartHover] = useState(false);

  const visiblePrograms = PROGRAMS.filter((p) => (scope ? p.code === scope : program === 'all' || p.code === program));
  const inProgram = records.filter((r) => visiblePrograms.some((p) => p.code === r.course));
  const years = Array.from(new Set(inProgram.map((r) => r.yearGraduated).filter(Boolean))).sort((a, b) => a - b);
  const filtered = inProgram.filter((r) => year === 'all' || String(r.yearGraduated) === year);

  // Headline numbers
  const total = filtered.length;
  const tracked = filtered.filter(isTracked).length;
  const notTracked = total - tracked;
  const employed = filtered.filter(isEmployed).length;
  const unemployed = tracked - employed;
  const rate = tracked ? Math.round((employed / tracked) * 100) : 0;
  const jobs = filtered.map(currentJob).filter(Boolean) as NonNullable<ReturnType<typeof currentJob>>[];
  const gov = jobs.filter((j) => isGovernment(j.employerType)).length;
  // Response = the graduate signed in and saved their own record
  const responded = filtered.filter((r) => !!r.respondedAt).length;
  const responseRate = total ? Math.round((responded / total) * 100) : 0;
  const priv = jobs.length - gov;

  // Line chart: one line per program, x = year graduated
  const chartData = useMemo(() => {
    return years.map((y) => {
      const row: Record<string, number | string | null> = { year: y };
      for (const p of visiblePrograms) {
        const all = records.filter((r) => r.course === p.code && r.yearGraduated === y);
        if (metric === 'untracked') {
          row[p.code] = all.length ? all.filter((r) => !isTracked(r)).length : null;
          continue;
        }
        const rs = all.filter(isTracked);
        if (!rs.length) {
          row[p.code] = null;
          continue;
        }
        const e = rs.filter(isEmployed).length;
        row[p.code] = metric === 'rate' ? Math.round((e / rs.length) * 100) : metric === 'employed' ? e : rs.length - e;
      }
      return row;
    });
  }, [records, years.join(','), visiblePrograms.map((p) => p.code).join(','), metric]);
  const programsWithData = visiblePrograms.filter((p) => chartData.some((d) => d[p.code] != null));

  // Program comparison (government vs private)
  const programTable = visiblePrograms.map((p) => {
    const rs = filtered.filter((r) => r.course === p.code);
    const js = rs.map(currentJob).filter(Boolean) as NonNullable<ReturnType<typeof currentJob>>[];
    const e = rs.filter(isEmployed).length;
    const t = rs.filter(isTracked).length;
    return {
      ...p,
      total: rs.length,
      tracked: t,
      employed: e,
      unemployed: t - e,
      untracked: rs.length - t,
      gov: js.filter((j) => isGovernment(j.employerType)).length,
      priv: js.filter((j) => !isGovernment(j.employerType)).length,
    };
  });

  if (loading) return <LoadingState label="Loading analytics..." />;
  if (error) return <ErrorState message={error} />;

  const scopeText = scope ? `${scope} graduates` : program === 'all' ? 'All programs' : program;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header + filters (one row) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">{scopeText} · {year === 'all' ? 'all batches' : `class of ${year}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!scope && (
            <select value={program} onChange={(e) => setProgram(e.target.value)} className="filter-select">
              <option value="all">All programs</option>
              {PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </select>
          )}
          <select value={year} onChange={(e) => setYear(e.target.value)} className="filter-select">
            <option value="all">All batches</option>
            {years.map((y) => (
              <option key={y} value={y}>Class of {y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat label="Graduates on file" value={total} note={`${tracked} with employment status`} />
        <Stat label="Employed" value={employed} note={`${rate}% of those who responded`} />
        <Stat label="Unemployed" value={unemployed} />
        <Stat label="Not tracked" value={notTracked} note="no employment status yet" />
        <Stat label="Government / Private" value={`${gov} / ${priv}`} note="of employed alumni" />
        <Stat label="Response rate" value={`${responseRate}%`} note={`${responded} of ${total} updated their own record`} />
      </div>

      <ResponsesPanel records={filtered} />

      {/* Line chart */}
      <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-semibold">Program comparison by graduation year</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Each line is one program</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetric(m.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    metric === m.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTable((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {showTable ? <LineIcon size={14} /> : <Table2 size={14} />} {showTable ? 'Chart' : 'Table'}
            </button>
          </div>
        </div>

        {/* Legend (always shown; identity never by color alone: each line also has its own dash) */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
          {programsWithData.map((p) => (
            <span key={p.code} className="inline-flex items-center gap-2 text-xs text-foreground">
              <svg width="26" height="8" aria-hidden>
                <line x1="1" y1="4" x2="25" y2="4" stroke={p.color} strokeWidth="2.5" strokeDasharray={p.dash} strokeLinecap="round" />
              </svg>
              {p.code}
            </span>
          ))}
        </div>

        {programsWithData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">No tracer data yet for this selection.</p>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Year graduated</th>
                  {programsWithData.map((p) => (
                    <th key={p.code} className="py-2 px-3 font-medium text-right">{p.code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((d) => (
                  <tr key={String(d.year)} className="border-t border-border/60">
                    <td className="py-2 pr-4 font-medium">{d.year}</td>
                    {programsWithData.map((p) => (
                      <td key={p.code} className="py-2 px-3 text-right tabular-nums">
                        {d[p.code] == null ? '–' : `${d[p.code]}${metric === 'rate' ? '%' : ''}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // select-none: clicking the chart shouldn't highlight the program labels. The hover line and
          // tooltip disappear as soon as the pointer leaves the chart (or shortly after a tap).
          <div
            className="h-[320px] select-none outline-none [&_*]:outline-none"
            onMouseEnter={() => setChartHover(true)}
            onMouseLeave={() => setChartHover(false)}
            onTouchStart={() => setChartHover(true)}
            onTouchEnd={() => window.setTimeout(() => setChartHover(false), 2500)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 72, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={metric === 'rate' ? [0, 100] : [0, 'auto']}
                  tickFormatter={(v) => (metric === 'rate' ? `${v}%` : String(v))}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  active={chartHover ? undefined : false}
                  cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
                  content={<ChartTooltip metric={metric} />}
                />
                {programsWithData.map((p) => (
                  <Line
                    key={p.code}
                    type="linear"
                    dataKey={p.code}
                    name={p.code}
                    stroke={p.color}
                    strokeWidth={2}
                    strokeDasharray={p.dash}
                    dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
                    connectNulls
                    isAnimationActive={false}
                    label={<EndLabel name={p.code} lastIndex={lastIndexOf(chartData, p.code)} />}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Program comparison table */}
        <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="font-semibold">Employment by program</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Current status, {year === 'all' ? 'all batches' : `class of ${year}`}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Program</th>
                  <th className="py-2 px-2 font-medium text-right">Graduates</th>
                  <th className="py-2 px-2 font-medium text-right">Responded</th>
                  <th className="py-2 px-2 font-medium text-right">Employed</th>
                  <th className="py-2 px-2 font-medium text-right">Unemployed</th>
                  <th className="py-2 px-2 font-medium text-right">Not tracked</th>
                  <th className="py-2 px-2 font-medium text-right">Government</th>
                  <th className="py-2 pl-2 font-medium text-right">Private</th>
                </tr>
              </thead>
              <tbody>
                {programTable.map((p) => (
                  <tr key={p.code} className="border-t border-border/60">
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        {p.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.total}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.tracked}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.employed}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.unemployed}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.untracked}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.gov}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{p.priv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>


      <ReminderPanel scope={scope} />
    </div>
  );
}

function lastIndexOf(data: Record<string, any>[], key: string) {
  for (let i = data.length - 1; i >= 0; i--) if (data[i][key] != null) return i;
  return -1;
}

/** Direct label at the end of each line, so identity is never color-only. */
function EndLabel(props: any) {
  const { x, y, index, name, lastIndex } = props;
  if (index !== lastIndex) return null;
  return (
    <text x={x + 8} y={y} dy={4} fontSize={11} fontWeight={600} fill="var(--foreground)">
      {name}
    </text>
  );
}

function ChartTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-card shadow-lg border border-border px-3 py-2 text-xs">
      <p className="font-semibold mb-1">Class of {label}</p>
      {payload
        .filter((p: any) => p.value != null)
        .sort((a: any, b: any) => b.value - a.value)
        .map((p: any) => (
          <p key={p.dataKey} className="flex items-center gap-2 text-foreground">
            <span className="w-2 h-2 rounded-full" style={{ background: p.stroke }} />
            <span className="w-16">{p.dataKey}</span>
            <span className="font-semibold tabular-nums">
              {p.value}
              {metric === 'rate' ? '%' : ''}
            </span>
          </p>
        ))}
    </div>
  );
}

/** Which graduates have updated their own record in the system, and which haven't yet. */
function ResponsesPanel({ records: all }: { records: AlumniRecord[] }) {
  const [view, setView] = useState<'responded' | 'waiting'>('responded');
  // Filters for this panel (the page's program/batch filters apply first)
  const [q, setQ] = useState('');
  const [fProgram, setFProgram] = useState('all');
  const [fYear, setFYear] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fAccount, setFAccount] = useState('all');
  const programs = Array.from(new Set(all.map((r) => r.course))).sort();
  const years = Array.from(new Set(all.map((r) => r.yearGraduated).filter(Boolean))).sort((a, b) => b - a);
  const accountOf = (r: AlumniRecord) => (r.respondedAt ? 'updated' : r.accountLinked ? 'signed-up' : 'no-account');
  const records = all.filter((r) => {
    const name = `${r.givenName} ${r.middleName || ''} ${r.lastName}`.toLowerCase();
    return (
      (!q.trim() || name.includes(q.trim().toLowerCase()) || (r.email || '').toLowerCase().includes(q.trim().toLowerCase())) &&
      (fProgram === 'all' || r.course === fProgram) &&
      (fYear === 'all' || String(r.yearGraduated) === fYear) &&
      (fStatus === 'all' || r.status === fStatus) &&
      (fAccount === 'all' || accountOf(r) === fAccount)
    );
  });
  const active = [fProgram, fYear, fStatus, fAccount].filter((v) => v !== 'all').length + (q.trim() ? 1 : 0);
  const clear = () => {
    setQ('');
    setFProgram('all');
    setFYear('all');
    setFStatus('all');
    setFAccount('all');
  };
  const done = records.filter((r) => !!r.respondedAt).sort((a, b) => (b.respondedAt || '').localeCompare(a.respondedAt || ''));
  const waiting = records
    .filter((r) => !r.respondedAt)
    .sort((a, b) => Number(!!b.accountLinked) - Number(!!a.accountLinked) || a.lastName.localeCompare(b.lastName));
  const signedUpOnly = waiting.filter((r) => r.accountLinked).length;
  const noAccount = waiting.length - signedUpOnly;
  const pct = records.length ? Math.round((done.length / records.length) * 100) : 0;
  const list = view === 'responded' ? done : waiting;
  const paged = usePaged(list, 8);
  const when = (iso?: string) =>
    mdy(iso);

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">Alumni responses</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            A graduate counts once they sign in and <b>save</b> their own record (signing in alone does not count). The goal is 100%: every graduate on file has updated.
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums shrink-0">
          {done.length} / {records.length} updated · {pct}%
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email..."
          className="filter-select w-full"
          aria-label="Search graduates"
        />
        {programs.length > 1 ? (
          <select value={fProgram} onChange={(e) => setFProgram(e.target.value)} className="filter-select w-full" aria-label="Program">
            <option value="all">All programs</option>
            {programs.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : null}
        <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="filter-select w-full" aria-label="Class of">
          <option value="all">All batches</option>
          {years.map((y) => (
            <option key={y} value={y}>Class of {y}</option>
          ))}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="filter-select w-full" aria-label="Status">
          <option value="all">All statuses</option>
          <option value="Employed">Employed</option>
          <option value="Self-Employed">Self-Employed</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Not Tracked">Not tracked</option>
        </select>
        <select value={fAccount} onChange={(e) => setFAccount(e.target.value)} className="filter-select w-full" aria-label="Account">
          <option value="all">All accounts</option>
          <option value="updated">Updated their record</option>
          <option value="signed-up">Signed up, follow up update</option>
          <option value="no-account">No account yet</option>
        </select>
      </div>
      {active > 0 && (
        <div className="flex items-center justify-between text-sm -mt-2">
          <p className="text-muted-foreground">
            Showing {records.length} of {all.length} graduates
          </p>
          <button onClick={clear} className="font-semibold text-primary hover:underline">
            Clear filters ({active})
          </button>
        </div>
      )}

      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><CheckCircle2 size={14} /> Updated their record</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{done.length}</p>
        </div>
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><UserCheck size={14} /> Signed up, follow up update</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{signedUpOnly}</p>
        </div>
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><UserX size={14} /> No account yet</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{noAccount}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['responded', `Responded (${done.length})`],
            ['waiting', `Not yet (${waiting.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setView(value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              view === value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {view === 'responded' ? 'No graduate has updated their record yet.' : 'Everyone on file has responded.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Graduate</th>
                <th className="py-2 px-2 font-medium">Program</th>
                <th className="py-2 px-2 font-medium">Class of</th>
                <th className="py-2 px-2 font-medium">Status</th>
                <th className="py-2 pl-2 font-medium text-right">{view === 'responded' ? 'Responded on' : 'Account'}</th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2.5 pr-3 font-medium">{`${r.givenName} ${r.lastName}`.trim() || '—'}</td>
                  <td className="py-2.5 px-2">{r.course}</td>
                  <td className="py-2.5 px-2 tabular-nums">{r.yearGraduated || '—'}</td>
                  <td className="py-2.5 px-2">{r.status}</td>
                  <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                    {view === 'responded' ? (
                      <span className="inline-flex items-center gap-1"><Clock size={13} className="text-muted-foreground" /> {when(r.respondedAt)}</span>
                    ) : r.accountLinked ? (
                      <span className="font-medium">Signed up</span>
                    ) : (
                      <span className="text-muted-foreground">No account</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...paged} label="graduates" inline />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );
}

/** Program chairs ask their alumni (by email) to update their tracer record. */
function ReminderPanel({ scope }: { scope: Course | null }) {
  const [course, setCourse] = useState<string>(scope || 'BSIT');
  const [minYears, setMinYears] = useState('1');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [last, setLast] = useState<{ created_at: string; recipients: number } | null>(null);

  useEffect(() => {
    supabase
      .from('reminder_log')
      .select('created_at, recipients')
      .eq('course', course)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLast(data));
  }, [course, sending]);

  const send = async () => {
    const target = minYears === '0' ? 'all alumni with an account' : `alumni who haven't updated in ${minYears}+ year(s)`;
    const ok = await confirmDialog({
      title: 'Send update reminder?',
      message: `An email will be sent to ${course} ${target}.`,
      confirmLabel: 'Send reminder',
    });
    if (!ok) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-reminders', {
      body: { course, minYears: Number(minYears), message },
    });
    setSending(false);
    if (error) {
      let msg = error.message;
      try {
        const body = await (error as any).context?.json();
        if (body?.error) msg = body.error;
      } catch {
        /* keep default */
      }
      toast.error(msg);
      return;
    }
    toast.success(data.sent ? `Reminder sent to ${data.sent} alumni` : 'Nobody needs a reminder right now');
    setMessage('');
  };

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
      <h3 className="font-semibold">Ask alumni to update their data</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">
        Sends an email to alumni of the program who have an account. {last && `Last sent ${mdy(last.created_at)} to ${last.recipients} alumni.`}
      </p>
      <div className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto] md:items-center">
        {!scope && (
          <select value={course} onChange={(e) => setCourse(e.target.value)} className="filter-select">
            {PROGRAMS.map((p) => (
              <option key={p.code} value={p.code}>{p.code}</option>
            ))}
          </select>
        )}
        <select value={minYears} onChange={(e) => setMinYears(e.target.value)} className="filter-select">
          <option value="1">Follow up update: 1+ year</option>
          <option value="2">Follow up update: 2+ years</option>
          <option value="3">Follow up update: 3+ years</option>
          <option value="0">Everyone in the program</option>
        </select>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional note to include"
          className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        />
        <button
          onClick={send}
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Send size={15} /> {sending ? 'Sending...' : 'Send reminder'}
        </button>
      </div>
    </div>
  );
}
