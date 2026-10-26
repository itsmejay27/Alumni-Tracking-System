import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Send, Table2, LineChart as LineIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from './ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { AlumniRecord, Course, courseScopeForRole, currentJob, isEmployed, useAlumniRecords } from '@/lib/alumni';
import { PROGRAMS, JOB_LEVELS } from '@/lib/programs';
import { LoadingState, ErrorState } from './DataState';

interface AnalyticsProps {
  userRole: string;
}

type Metric = 'rate' | 'employed' | 'unemployed';
const METRICS: { id: Metric; label: string }[] = [
  { id: 'rate', label: 'Employment rate (%)' },
  { id: 'employed', label: 'Employed (count)' },
  { id: 'unemployed', label: 'Unemployed (count)' },
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

  const visiblePrograms = PROGRAMS.filter((p) => (scope ? p.code === scope : program === 'all' || p.code === program));
  const inProgram = records.filter((r) => visiblePrograms.some((p) => p.code === r.course));
  const years = Array.from(new Set(inProgram.map((r) => r.yearGraduated).filter(Boolean))).sort((a, b) => a - b);
  const filtered = inProgram.filter((r) => year === 'all' || String(r.yearGraduated) === year);

  // Headline numbers
  const total = filtered.length;
  const employed = filtered.filter(isEmployed).length;
  const unemployed = total - employed;
  const rate = total ? Math.round((employed / total) * 100) : 0;
  const jobs = filtered.map(currentJob).filter(Boolean) as NonNullable<ReturnType<typeof currentJob>>[];
  const gov = jobs.filter((j) => isGovernment(j.employerType)).length;
  const priv = jobs.length - gov;
  const ipCount = filtered.filter((r) => r.isIP).length;

  // Line chart: one line per program, x = year graduated
  const chartData = useMemo(() => {
    return years.map((y) => {
      const row: Record<string, number | string | null> = { year: y };
      for (const p of visiblePrograms) {
        const rs = records.filter((r) => r.course === p.code && r.yearGraduated === y);
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

  // Job level x employer type (industry vs government)
  const levelTable = JOB_LEVELS.map((level) => ({
    level,
    gov: jobs.filter((j) => j.jobLevel === level && isGovernment(j.employerType)).length,
    priv: jobs.filter((j) => j.jobLevel === level && !isGovernment(j.employerType)).length,
  }));

  // Program comparison (government vs private)
  const programTable = visiblePrograms.map((p) => {
    const rs = filtered.filter((r) => r.course === p.code);
    const js = rs.map(currentJob).filter(Boolean) as NonNullable<ReturnType<typeof currentJob>>[];
    const e = rs.filter(isEmployed).length;
    return {
      ...p,
      total: rs.length,
      employed: e,
      unemployed: rs.length - e,
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Alumni tracked" value={total} />
        <Stat label="Employed" value={employed} note={`${rate}% employment rate`} />
        <Stat label="Unemployed" value={unemployed} />
        <Stat label="Government / Private" value={`${gov} / ${priv}`} note="of employed alumni" />
        <Stat label="Indigenous Peoples (IP)" value={ipCount} note="self-identified" />
      </div>

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
          <div className="h-[320px]">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Program comparison table */}
        <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="font-semibold">Employment by program</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Current status, {year === 'all' ? 'all batches' : `class of ${year}`}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Program</th>
                  <th className="py-2 px-2 font-medium text-right">Tracked</th>
                  <th className="py-2 px-2 font-medium text-right">Employed</th>
                  <th className="py-2 px-2 font-medium text-right">Unemployed</th>
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
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.employed}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.unemployed}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{p.gov}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{p.priv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Job level by sector */}
        <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="font-semibold">Job level by sector</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Employed alumni, industry (private) vs government</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Job level</th>
                <th className="py-2 px-2 font-medium text-right">Industry / Private</th>
                <th className="py-2 pl-2 font-medium text-right">Government</th>
              </tr>
            </thead>
            <tbody>
              {levelTable.map((l) => (
                <tr key={l.level} className="border-t border-border/60">
                  <td className="py-2.5 pr-3 font-medium">{l.level}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{l.priv}</td>
                  <td className="py-2.5 pl-2 text-right tabular-nums">{l.gov}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-3">Older imported records without a job level are counted as Rank and File.</p>
        </div>
      </div>

      <BatchTotals records={inProgram} programs={visiblePrograms.map((p) => p.code)} />

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

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );
}

/** Enrollment and graduate counts per batch, with tracer response rate. Editable by chairs. */
function BatchTotals({ records, programs }: { records: AlumniRecord[]; programs: Course[] }) {
  const [totals, setTotals] = useState<BatchTotal[]>([]);
  const [draft, setDraft] = useState<Record<string, { enrolled: string; graduated: string }>>({});
  const [saving, setSaving] = useState(false);
  const [addYear, setAddYear] = useState('');
  const [course, setCourse] = useState<Course>(programs[0]);

  useEffect(() => {
    if (!programs.includes(course)) setCourse(programs[0]);
  }, [programs.join(',')]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('batch_totals').select('*');
    setTotals((data as BatchTotal[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const yearsFromRecords = records.filter((r) => r.course === course).map((r) => r.yearGraduated);
  const yearsFromTotals = totals.filter((t) => t.course === course).map((t) => t.year_graduated);
  const years = Array.from(new Set([...yearsFromRecords, ...yearsFromTotals].filter(Boolean))).sort((a, b) => b - a);

  const key = (y: number) => `${course}:${y}`;
  const valueOf = (y: number, field: 'enrolled' | 'graduated') => {
    const d = draft[key(y)];
    if (d) return d[field];
    const t = totals.find((x) => x.course === course && x.year_graduated === y);
    return t?.[field] == null ? '' : String(t[field]);
  };
  const setValue = (y: number, field: 'enrolled' | 'graduated', v: string) => {
    setDraft((d) => ({
      ...d,
      [key(y)]: { enrolled: valueOf(y, 'enrolled'), graduated: valueOf(y, 'graduated'), ...d[key(y)], [field]: v.replace(/\D/g, '') },
    }));
  };

  const save = async () => {
    const rows = Object.entries(draft).map(([k, v]) => {
      const [c, y] = k.split(':');
      return {
        course: c,
        year_graduated: Number(y),
        enrolled: v.enrolled === '' ? null : Number(v.enrolled),
        graduated: v.graduated === '' ? null : Number(v.graduated),
        updated_at: new Date().toISOString(),
      };
    });
    if (!rows.length) return;
    setSaving(true);
    const { error } = await supabase.from('batch_totals').upsert(rows);
    setSaving(false);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    toast.success('Batch totals saved');
    setDraft({});
    load();
  };

  const addBatch = () => {
    const y = Number(addYear);
    if (!y || y < 1966 || y > 2100) {
      toast.error('Enter a valid year, e.g. 2025');
      return;
    }
    setDraft((d) => ({ ...d, [key(y)]: d[key(y)] || { enrolled: '', graduated: '' } }));
    setTotals((t) => (t.some((x) => x.course === course && x.year_graduated === y) ? t : [...t, { course, year_graduated: y, enrolled: null, graduated: null }]));
    setAddYear('');
  };

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Enrollment, graduates and response rate</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Enter enrolled and graduate counts per batch; tracked counts come from tracer records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {programs.length > 1 && (
            <select value={course} onChange={(e) => setCourse(e.target.value as Course)} className="filter-select">
              {programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          <input
            value={addYear}
            onChange={(e) => setAddYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Year"
            className="w-20 px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
          />
          <button onClick={addBatch} className="px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/70">
            Add batch
          </button>
          <button
            onClick={save}
            disabled={saving || !Object.keys(draft).length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Year graduated</th>
              <th className="py-2 px-2 font-medium">Enrolled</th>
              <th className="py-2 px-2 font-medium">Graduates</th>
              <th className="py-2 px-2 font-medium text-right">Tracked</th>
              <th className="py-2 px-2 font-medium text-right">Response rate</th>
              <th className="py-2 px-2 font-medium text-right">Employed</th>
              <th className="py-2 px-2 font-medium text-right">Unemployed</th>
              <th className="py-2 pl-2 font-medium text-right">IP</th>
            </tr>
          </thead>
          <tbody>
            {years.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">No batches yet. Add a year to start.</td>
              </tr>
            )}
            {years.map((y) => {
              const rs = records.filter((r) => r.course === course && r.yearGraduated === y);
              const grads = Number(valueOf(y, 'graduated')) || 0;
              const e = rs.filter(isEmployed).length;
              return (
                <tr key={y} className="border-t border-border/60">
                  <td className="py-2 pr-3 font-medium">{y}</td>
                  {(['enrolled', 'graduated'] as const).map((f) => (
                    <td key={f} className="py-2 px-2">
                      <input
                        value={valueOf(y, f)}
                        onChange={(ev) => setValue(y, f, ev.target.value)}
                        inputMode="numeric"
                        className="w-20 px-2 py-1 rounded-md bg-input-background border border-border text-sm tabular-nums"
                        aria-label={`${f} ${y}`}
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right tabular-nums">{rs.length}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{grads ? `${Math.round((rs.length / grads) * 100)}%` : '–'}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{e}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{rs.length - e}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{rs.filter((r) => r.isIP).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
        Sends an email to alumni of the program who have an account. {last && `Last sent ${new Date(last.created_at).toLocaleDateString()} to ${last.recipients} alumni.`}
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
          <option value="1">Not updated in 1+ year</option>
          <option value="2">Not updated in 2+ years</option>
          <option value="3">Not updated in 3+ years</option>
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
