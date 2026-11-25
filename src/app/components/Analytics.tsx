import React, { useEffect, useMemo, useState } from 'react';
import { functionError } from '@/lib/errors';
import { plural } from '@/lib/text';
import { tr } from '@/lib/preferences';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Send, Table2, LineChart as LineIcon, CheckCircle2, UserCheck, UserX, Clock } from 'lucide-react';
import { Pagination, usePaged } from './Pagination';
import { toast } from 'sonner';
import { confirmDialog } from './ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { mdy } from '@/lib/dates';
import { AlumniRecord, Course, courseScopeForRole, currentJob, isEmployed, isTracked, useAlumniRecords } from '@/lib/alumni';
import { PROGRAMS, INDUSTRIES } from '@/lib/programs';
import { LoadingState, ErrorState } from './DataState';
import { SurveyResults } from './SurveyResults';

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
const isPrivate = (t?: string) => t === 'Private';

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
  const priv = jobs.filter((j) => isPrivate(j.employerType)).length;

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
      priv: js.filter((j) => isPrivate(j.employerType)).length,
      ngo: js.filter((j) => j.employerType === 'NGO/INGO').length,
      other: js.filter((j) => !isGovernment(j.employerType) && !isPrivate(j.employerType) && j.employerType !== 'NGO/INGO').length,
    };
  });

  if (loading) return <LoadingState label={tr("Loading analytics...")} />;
  if (error) return <ErrorState message={error} />;

  const scopeText = scope ? tr('{program} graduates', { program: scope }) : program === 'all' ? tr('All programs') : program;
  const yearText = year === 'all' ? tr('all batches') : tr('class of {year}', { year });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header + filters (one row) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tr("Analytics")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{scopeText} · {yearText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!scope && (
            <select value={program} onChange={(e) => setProgram(e.target.value)} className="filter-select">
              <option value="all">{tr("All programs")}</option>
              {PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </select>
          )}
          <select value={year} onChange={(e) => setYear(e.target.value)} className="filter-select">
            <option value="all">{tr("All batches")}</option>
            {years.map((y) => (
              <option key={y} value={y}>{tr('Class of {year}', { year: y })}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat label={tr("Graduates on file")} value={total} note={tr('{n} with employment status', { n: tracked })} />
        <Stat label={tr("Employed")} value={employed} note={tr("{n}% of those who responded", { n: rate })} />
        <Stat label={tr("Unemployed")} value={unemployed} />
        <Stat label={tr("Not tracked")} value={notTracked} note={tr("no employment status yet")} />
        <Stat label={tr("Government / Private")} value={`${gov} / ${priv}`} note={tr('{n} not specified yet', { n: jobs.filter((j) => !j.employerType || j.employerType === 'Not specified').length })} />
        <Stat label={tr("Response rate")} value={`${responseRate}%`} note={tr('{a} of {b} updated their own record', { a: responded, b: total })} />
      </div>

      <ResponsesPanel records={filtered} />

      <Breakdown records={filtered} subtitle={`${scopeText} · ${yearText}`} />

      <IndustryPanel records={filtered} />

      <SurveyResults records={filtered} />

      {/* Line chart */}
      <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-semibold">{tr("Program comparison by graduation year")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{tr("Each line is one program")}</p>
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
                  {tr(m.label)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTable((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {showTable ? <LineIcon size={14} /> : <Table2 size={14} />} {showTable ? tr('Chart') : tr('Table')}
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
          <p className="text-sm text-muted-foreground py-16 text-center">{tr("No tracer data yet for this selection.")}</p>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{tr("Year graduated")}</th>
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
        ) : ( // select-none: clicking the chart shouldn't highlight the program labels. The hover line and // tooltip disappear as soon as the pointer leaves the chart (or shortly after a tap).
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
          <h3 className="font-semibold">{tr("Employment by program")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">{tr('Current status')}, {yearText}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{tr("Program")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Graduates")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Responded")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Employed")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Unemployed")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Not tracked")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Government")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Private")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("NGO/INGO")}</th>
                  <th className="py-2 pl-2 font-medium text-right">{tr("Other / not specified")}</th>
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
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.priv}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.ngo}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{p.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>


      <ReminderPanel scope={scope} records={records} />
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
      <p className="font-semibold mb-1">{tr('Class of {year}', { year: label })}</p>
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
  // Download the list shown (panel: the names of those who have not updated yet)
  const downloadList = () => {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Last Name', 'Given Name', 'Middle Name', 'Program', 'Year Graduated', 'Email', 'Account', view === 'responded' ? 'Updated On' : 'Status'],
      ...list.map((r) => [
        r.lastName, r.givenName, r.middleName, r.course, r.yearGraduated || r.batch, r.email,
        r.respondedAt ? 'Updated' : r.accountLinked ? 'Signed up, not updated' : 'No account yet',
        view === 'responded' ? mdy(r.respondedAt) : r.status,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMSU_${view === 'responded' ? 'Updated' : 'Not_Yet_Updated'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">{tr("Alumni responses")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tr('A graduate counts once they sign in and save their own record (signing in alone does not count). The goal is 100%: every graduate on file has updated.')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-sm font-semibold tabular-nums">
            {tr('{a} / {b} updated · {pct}%', { a: done.length, b: records.length, pct })}
          </p>
          <button
            type="button"
            onClick={downloadList}
            disabled={!list.length}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted disabled:opacity-50"
          >
            {tr("Download list (CSV)")}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Search name or email...")}
          className="filter-select w-full"
          aria-label={tr("Search graduates")}
        />
        {programs.length > 1 ? (
          <select value={fProgram} onChange={(e) => setFProgram(e.target.value)} className="filter-select w-full" aria-label={tr("Program")}>
            <option value="all">{tr("All programs")}</option>
            {programs.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : null}
        <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="filter-select w-full" aria-label={tr("Class of")}>
          <option value="all">{tr("All batches")}</option>
          {years.map((y) => (
            <option key={y} value={y}>{tr('Class of {year}', { year: y })}</option>
          ))}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="filter-select w-full" aria-label={tr("Status")}>
          <option value="all">{tr("All statuses")}</option>
          <option value="Employed">{tr("Employed")}</option>
          <option value="Self-Employed">{tr("Self-Employed")}</option>
          <option value="Unemployed">{tr("Unemployed")}</option>
          <option value="Not Tracked">{tr("Not tracked")}</option>
        </select>
        <select value={fAccount} onChange={(e) => setFAccount(e.target.value)} className="filter-select w-full" aria-label={tr("Account")}>
          <option value="all">{tr("All accounts")}</option>
          <option value="updated">{tr("Updated their record")}</option>
          <option value="signed-up">{tr("Signed up, follow up update")}</option>
          <option value="no-account">{tr("No account yet")}</option>
        </select>
      </div>
      {active > 0 && (
        <div className="flex items-center justify-between text-sm -mt-2">
          <p className="text-muted-foreground">
            {tr('Showing {a} of {b}', { a: records.length, b: all.length })} {tr(plural(all.length, 'graduate', 'graduates'))}
          </p>
          <button onClick={clear} className="font-semibold text-primary hover:underline">
            {tr('Clear filters')} ({active})
          </button>
        </div>
      )}

      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><CheckCircle2 size={14} /> {tr("Updated their record")}</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{done.length}</p>
        </div>
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><UserCheck size={14} /> {tr("Signed up, follow up update")}</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{signedUpOnly}</p>
        </div>
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><UserX size={14} /> {tr("No account yet")}</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{noAccount}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['responded', tr('Responded ({n})', { n: done.length })],
            ['waiting', tr('Not yet ({n})', { n: waiting.length })],
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
          {view === 'responded' ? tr('No graduate has updated their record yet.') : tr('Everyone on file has responded.')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{tr("Graduate")}</th>
                <th className="py-2 px-2 font-medium">{tr("Program")}</th>
                <th className="py-2 px-2 font-medium">{tr("Class of")}</th>
                <th className="py-2 px-2 font-medium">{tr("Status")}</th>
                <th className="py-2 pl-2 font-medium text-right">{view === 'responded' ? tr('Responded on') : tr('Account')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2.5 pr-3 font-medium">{`${r.givenName} ${r.lastName}`.trim() || '—'}</td>
                  <td className="py-2.5 px-2">{r.course}</td>
                  <td className="py-2.5 px-2 tabular-nums">{r.yearGraduated || '—'}</td>
                  <td className="py-2.5 px-2">{tr(r.status)}</td>
                  <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                    {view === 'responded' ? (
                      <span className="inline-flex items-center gap-1"><Clock size={13} className="text-muted-foreground" /> {when(r.respondedAt)}</span>
                    ) : r.accountLinked ? (
                      <span className="font-medium">{tr("Signed up")}</span>
                    ) : (
                      <span className="text-muted-foreground">{tr("No account")}</span>
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
function ReminderPanel({ scope, records }: { scope: Course | null; records: AlumniRecord[] }) {
  const [course, setCourse] = useState<string>(scope || 'BSIT');
  const [audience, setAudience] = useState<'accounts' | 'invite' | 'both'>('accounts');
  // Graduates of this program who have no account yet (panel: reach every graduate)
  const isMail = (v?: string) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isMobile = (v?: string) => /^09\d{9}$/.test(v || '');
  const noAccount = records.filter((r) => r.course === course && !r.accountLinked);
  const withEmail = noAccount.filter((r) => isMail(r.email)).length;
  const withMobileOnly = noAccount.filter((r) => !isMail(r.email) && isMobile(r.mobileNo)).length;
  const withFacebookOnly = noAccount.filter((r) => !isMail(r.email) && !isMobile(r.mobileNo) && (r.facebookName || '').trim()).length;
  const unreachable = noAccount.length - withEmail - withMobileOnly - withFacebookOnly;
  const downloadContacts = () => {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Last Name', 'Given Name', 'Middle Name', 'Program', 'Year Graduated', 'Email', 'Mobile No.', 'Facebook Name', 'How to reach'],
      ...[...noAccount]
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.givenName.localeCompare(b.givenName))
        .map((r) => [
          r.lastName, r.givenName, r.middleName, r.course, r.yearGraduated || r.batch,
          isMail(r.email) ? r.email : '', isMobile(r.mobileNo) ? r.mobileNo : '', r.facebookName || '',
          isMail(r.email) ? 'Email invitation' : isMobile(r.mobileNo) ? 'Text message' : (r.facebookName || '').trim() ? 'Facebook message' : 'No contact on file',
        ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMSU_${course}_No_Account_Contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
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
    const reminderText =
      minYears === '0'
        ? tr('{program} alumni with an account get a reminder to update.', { program: course })
        : tr(plural(Number(minYears), "{program} alumni who haven't updated in {n}+ year get a reminder.", "{program} alumni who haven't updated in {n}+ years get a reminder."), { program: course, n: minYears });
    const inviteText = tr(plural(withEmail, '{n} {program} graduate without an account gets an invitation to sign up (at most once every 30 days).', '{n} {program} graduates without an account get an invitation to sign up (each at most once every 30 days).'), { n: withEmail, program: course });
    const ok = await confirmDialog({
      title: tr('Send these emails?'),
      message: audience === 'accounts' ? reminderText : audience === 'invite' ? inviteText : `${reminderText} ${inviteText}`,
      confirmLabel: tr('Send'),
    });
    if (!ok) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-reminders', {
      body: { course, minYears: Number(minYears), message, audience },
    });
    setSending(false);
    if (error) {
      toast.error(await functionError(error));
      return;
    }
    if (!data.sent) toast.info(data.skippedRecent ? tr(plural(data.skippedRecent, 'Nobody to email right now. {n} was already invited in the last 30 days.', 'Nobody to email right now. {n} were already invited in the last 30 days.'), { n: data.skippedRecent }) : tr('Nobody needs a reminder right now'));
    else if (data.invited) toast.success(tr('Emails sent: {a} and {b}.', { a: tr(plural(data.reminded ?? 0, '{n} reminder', '{n} reminders'), { n: data.reminded ?? 0 }), b: tr(plural(data.invited, '{n} invitation', '{n} invitations'), { n: data.invited }) }));
    else toast.success(tr(plural(data.sent, 'Reminder sent to {n} alumnus', 'Reminder sent to {n} alumni'), { n: data.sent }));
    setMessage('');
  };

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
      <h3 className="font-semibold">{tr("Ask alumni to update their data")}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">
        {tr('Sends a reminder to alumni with an account, and an invitation to sign up to graduates without one.')} {last && tr(plural(last.recipients, 'Last sent {date} to {n} alumnus.', 'Last sent {date} to {n} alumni.'), { date: mdy(last.created_at), n: last.recipients })}
      </p>
      <div className="grid gap-3 md:grid-cols-[auto_auto_auto_1fr_auto] md:items-center">
        {!scope && (
          <select value={course} onChange={(e) => setCourse(e.target.value)} className="filter-select">
            {PROGRAMS.map((p) => (
              <option key={p.code} value={p.code}>{p.code}</option>
            ))}
          </select>
        )}
        <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} className="filter-select" aria-label={tr('Who gets the email')}>
          <option value="accounts">{tr('Alumni with an account (reminder)')}</option>
          <option value="invite">{tr('Graduates without an account (invitation)')}</option>
          <option value="both">{tr('Both')}</option>
        </select>
        <select value={minYears} disabled={audience === 'invite'} onChange={(e) => setMinYears(e.target.value)} className="filter-select disabled:opacity-50">
          <option value="1">{tr("Follow up update: 1+ year")}</option>
          <option value="2">{tr("Follow up update: 2+ years")}</option>
          <option value="3">{tr("Follow up update: 3+ years")}</option>
          <option value="0">{tr("Everyone in the program")}</option>
        </select>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={tr("Optional note to include")}
          className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
        />
        <button
          onClick={send}
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Send size={15} /> {sending ? tr('Sending...') : tr('Send reminder')}
        </button>
      </div>

      {/* Graduates without an account: who can be reached, and how */}
      <div className="mt-5 rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{tr('{program} graduates without an account: {n}', { program: course, n: noAccount.length })}</p>
            <p className="text-xs text-muted-foreground">{tr('Email invitations reach those with an email on file. Download the list to reach the rest by text or Facebook.')}</p>
          </div>
          <button type="button" onClick={downloadContacts} disabled={!noAccount.length} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted disabled:opacity-50 shrink-0">
            {tr('Download contact list (CSV)')}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {[
            [tr('Can be emailed'), withEmail],
            [tr('Mobile number only'), withMobileOnly],
            [tr('Facebook only'), withFacebookOnly],
            [tr('No contact on file'), unreachable],
          ].map(([label, n]) => (
            <div key={String(label)} className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tabular-nums">{n}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Breakdown pie charts (panel: per batch, per category) ----------------

type Slice = { name: string; value: number; color: string; people: AlumniRecord[] };

// Categorical colors, checked for contrast on light and dark cards; slices also list counts in text
const SLICE_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#eb6834', '#6250d6', '#0f9fb5', '#c2417a', '#7a8f2a'];
// "Unknown" kinds of answers are always grey, so they never look like a real category
const UNKNOWN = new Set(['Not specified', 'Not answered', 'Not tracked']);

function slices(records: AlumniRecord[], keyOf: (r: AlumniRecord) => string | null, order: string[]): Slice[] {
  const groups = new Map<string, AlumniRecord[]>();
  for (const r of records) {
    const k = keyOf(r);
    if (k == null) continue;
    groups.set(k, [...(groups.get(k) || []), r]);
  }
  const keys = [...order.filter((k) => groups.has(k)), ...[...groups.keys()].filter((k) => !order.includes(k))];
  let next = 0;
  return keys.map((k) => ({
    name: k,
    value: groups.get(k)!.length,
    color: UNKNOWN.has(k) ? '#94a3b8' : SLICE_COLORS[next++ % SLICE_COLORS.length],
    people: groups.get(k)!,
  }));
}

function Breakdown({ records, subtitle }: { records: AlumniRecord[]; subtitle: string }) {
  const [open, setOpen] = useState<{ chart: string; slice: Slice } | null>(null);
  const job = (r: AlumniRecord) => (isEmployed(r) ? currentJob(r) : null);
  const charts: { title: string; note: string; data: Slice[] }[] = [
    {
      title: tr('Employment status'),
      note: tr('All graduates on file'),
      data: slices(records, (r) => (r.status === 'Not Tracked' ? 'Not tracked' : r.status), ['Employed', 'Self-Employed', 'Unemployed', 'Not tracked']),
    },
    {
      title: tr('Type of employer'),
      note: tr('Employed graduates, current job'),
      data: slices(records, (r) => (job(r) ? job(r)!.employerType || 'Not specified' : null), ['Government', 'Private', 'Semi-Private', 'NGO/INGO', 'Self-Employed / Own Business', 'Not specified']),
    },
    {
      title: tr('Kind of employment'),
      note: tr('Employed graduates, current job'),
      data: slices(records, (r) => (job(r) ? job(r)!.employmentStatus || 'Not specified' : null), ['Permanent', 'Probationary', 'Contractual', 'Job Order', 'Self-Employed', 'Not specified']),
    },
    {
      title: tr('Job related to course'),
      note: tr('Employed graduates, current job'),
      data: slices(records, (r) => (job(r) ? job(r)!.relatedToCourse || 'Not answered' : null), ['Yes', 'No', 'Not answered']),
    },
  ];

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
      <h3 className="font-semibold">{tr("Breakdown by category")}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-5">{subtitle}. {tr("Click a slice or a row to see who is in it.")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
        {charts.map((c) => {
          const total = c.data.reduce((n, d) => n + d.value, 0);
          return (
            <div key={c.title} className="min-w-0">
              <p className="text-sm font-semibold">{tr(c.title)}</p>
              <p className="text-xs text-muted-foreground">{tr(c.note)} · {total} {tr(total === 1 ? 'graduate' : 'graduates')}</p>
              {total === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">{tr("No data yet")}</p>
              ) : (
                <>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={c.data}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="55%"
                          outerRadius="90%"
                          paddingAngle={c.data.length > 1 ? 2 : 0}
                          stroke="var(--card)"
                          strokeWidth={2}
                          isAnimationActive={false}
                          onClick={(d: any) => d?.payload && setOpen({ chart: c.title, slice: d.payload as Slice })}
                          className="cursor-pointer"
                        >
                          {c.data.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number, n: string) => [`${v} (${Math.round((v / total) * 100)}%)`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {c.data.map((d) => (
                      <li key={d.name}>
                        <button
                          type="button"
                          onClick={() => setOpen({ chart: c.title, slice: d })}
                          className="w-full flex items-center gap-2 text-xs rounded-md px-1.5 py-1 hover:bg-muted text-left"
                        >
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                          <span className="flex-1 min-w-0 truncate">{tr(d.name)}</span>
                          <span className="tabular-nums font-semibold">{d.value}</span>
                          <span className="tabular-nums text-muted-foreground w-10 text-right">{Math.round((d.value / total) * 100)}%</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
      {open && <SliceList chart={open.chart} slice={open.slice} onClose={() => setOpen(null)} />}
    </div>
  );
}

function SliceList({ chart, slice, onClose }: { chart: string; slice: Slice; onClose: () => void }) {
  const people = [...slice.people].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.givenName.localeCompare(b.givenName));
  const paged = usePaged(people, 12);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${chart}: ${slice.name}`}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{tr(chart)}</p>
            <h3 className="font-semibold text-lg">
              {tr(slice.name)} · {slice.value} {tr(slice.value === 1 ? 'graduate' : 'graduates')}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="px-2 py-1 rounded-lg text-sm text-muted-foreground hover:bg-muted" aria-label={tr("Close")}>
            {tr("Close")}
          </button>
        </div>
        <ul className="divide-y divide-border">
          {paged.pageItems.map((r) => {
            const j = currentJob(r);
            return (
              <li key={r.id} className="py-2 text-sm flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-medium">{r.lastName}, {r.givenName}</span>
                  {j && isEmployed(r) && <span className="block text-xs text-muted-foreground truncate">{[j.position, j.company].filter(Boolean).join(' · ')}</span>}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{r.course} · {r.yearGraduated || r.batch}</span>
              </li>
            );
          })}
        </ul>
        <Pagination {...paged} label="graduates" />
      </div>
    </div>
  );
}

// ---------------- Industry by batch (panel: how many work in each sector, compared by batch) ----------------

function IndustryPanel({ records }: { records: AlumniRecord[] }) {
  const [open, setOpen] = useState<Slice | null>(null);
  const employed = records.filter((r) => isEmployed(r) && currentJob(r));
  const industryOf = (r: AlumniRecord) => currentJob(r)?.industry || 'Not specified';
  const years = Array.from(new Set(employed.map((r) => r.yearGraduated).filter(Boolean))).sort((a, b) => a - b);
  const names = [...INDUSTRIES, 'Not specified'].filter((n) => employed.some((r) => industryOf(r) === n));
  const max = Math.max(1, ...names.map((n) => employed.filter((r) => industryOf(r) === n).length));
  const answered = employed.filter((r) => currentJob(r)?.industry).length;

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
      <h3 className="font-semibold">{tr("Employed graduates by industry")}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">
        {tr('Current job, compared by batch. {a} of {b} employed graduates have given their industry; the rest show as Not specified until they update. Click a row to see who.', { a: answered, b: employed.length })}
      </p>
      {!employed.length ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{tr("No employed graduates in this selection.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{tr("Industry")}</th>
                {years.map((y) => (
                  <th key={y} className="py-2 px-2 font-medium text-right whitespace-nowrap">{tr('Class of {year}', { year: y })}</th>
                ))}
                <th className="py-2 px-2 font-medium text-right">{tr("Total")}</th>
                <th className="py-2 pl-2 font-medium w-[22%]"><span className="sr-only">{tr("Share")}</span></th>
              </tr>
            </thead>
            <tbody>
              {names.map((n) => {
                const people = employed.filter((r) => industryOf(r) === n);
                return (
                  <tr
                    key={n}
                    className="border-t border-border/60 cursor-pointer hover:bg-muted/50"
                    onClick={() => setOpen({ name: n, value: people.length, color: '', people })}
                  >
                    <td className={`py-2 pr-3 ${n === 'Not specified' ? 'text-muted-foreground' : 'font-medium'}`}>{tr(n)}</td>
                    {years.map((y) => {
                      const c = people.filter((r) => r.yearGraduated === y).length;
                      return (
                        <td key={y} className={`py-2 px-2 text-right tabular-nums ${c ? '' : 'text-muted-foreground'}`}>{c || '–'}</td>
                      );
                    })}
                    <td className="py-2 px-2 text-right tabular-nums font-semibold">{people.length}</td>
                    <td className="py-2 pl-2">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(people.length / max) * 100}%`, background: n === 'Not specified' ? '#94a3b8' : 'var(--primary)' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && <SliceList chart="Employed graduates by industry" slice={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
