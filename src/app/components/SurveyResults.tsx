import React, { useState } from 'react';
import { tr } from '@/lib/preferences';
import { Download } from 'lucide-react';
import type { AlumniRecord } from '@/lib/alumni';
import { ALL_QUESTIONS, LIKERT, SATISFACTION, SURVEY_SECTIONS, surveyApplies } from '@/lib/survey';

/** Summary of the BSIT PEO survey for the program chair and Alumni Affairs, with a CSV download. */
export function SurveyResults({ records }: { records: AlumniRecord[] }) {
  const [open, setOpen] = useState(false);
  const eligible = records.filter((r) => surveyApplies(r.course));
  if (!eligible.length) return null;
  const done = eligible.filter((r) => r.peoSurvey?.completedAt);
  const a = (r: AlumniRecord, id: string) => r.peoSurvey?.answers?.[id];
  const avg = (vals: number[]) => (vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null);
  const score = (scale: readonly string[], v: unknown) => (typeof v === 'string' && scale.includes(v) ? scale.indexOf(v) + 1 : null);
  const fmt = (n: number | null) => (n == null ? '–' : n.toFixed(2));
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '–');

  const satisfaction = avg(done.map((r) => score(SATISFACTION, a(r, 'satisfaction'))).filter((n): n is number => n != null));
  const months = avg(done.map((r) => Number(a(r, 'monthsToFirstJob'))).filter((n) => Number.isFinite(n)));

  const download = () => {
    const cell = (v: unknown) => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`;
    const cols = ALL_QUESTIONS.flatMap((q) => (q.kind === 'multi' || (q.kind === 'single' && q.specify) ? [q.id, `${q.id}Other`] : [q.id]));
    const head = ['Last Name', 'Given Name', 'Year Graduated', 'Submitted', ...cols.map((c) => {
      const q = ALL_QUESTIONS.find((x) => x.id === c);
      return q ? q.label : `${ALL_QUESTIONS.find((x) => `${x.id}Other` === c)?.label || c} (other / specify)`;
    })];
    const rows = done.map((r) => [r.lastName, r.givenName, r.yearGraduated || r.batch, (r.peoSurvey?.completedAt || '').slice(0, 10), ...cols.map((c) => a(r, c))]);
    const blob = new Blob([[head, ...rows].map((row) => row.map(cell).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `BSIT_PEO_Survey_${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">{tr("BSIT PEO survey results")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tr('{a} of {b} BSIT graduates answered ({pct}). Scores: 1 = Strongly Disagree … 5 = Strongly Agree.', { a: done.length, b: eligible.length, pct: pct(done.length, eligible.length) })}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
            {open ? tr('Hide details') : tr('Show all answers')}
          </button>
          <button type="button" onClick={download} disabled={!done.length} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50">
            <Download size={14} /> {tr("Download answers (CSV)")}
          </button>
        </div>
      </div>

      {!done.length ? (
        <p className="text-sm text-muted-foreground">{tr("No completed surveys yet. BSIT alumni answer it in My Alumni Profile → Survey & feedback.")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Responses" value={String(done.length)} />
            <Tile label={tr("Satisfaction (1–5)")} value={fmt(satisfaction)} />
            <Tile label={tr("Months to first job (avg)")} value={months == null ? '–' : months.toFixed(1)} />
            <Tile label={tr("Job relevant to IT")} value={pct(done.filter((r) => a(r, 'jobRelevantToIT') === 'Yes').length, done.filter((r) => a(r, 'jobRelevantToIT')).length)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{tr("Program Educational Objective")}</th>
                  <th className="py-2 px-2 font-medium text-right">{tr("Average")}</th>
                  <th className="py-2 pl-2 font-medium w-[38%]">{tr("Answers (Strongly Disagree → Strongly Agree)")}</th>
                </tr>
              </thead>
              <tbody>
                {SURVEY_SECTIONS[1].questions.map((q, i) => {
                  const counts = LIKERT.map((l) => done.filter((r) => a(r, q.id) === l).length);
                  const n = counts.reduce((x, y) => x + y, 0);
                  const mean = avg(done.map((r) => score(LIKERT, a(r, q.id))).filter((x): x is number => x != null));
                  return (
                    <tr key={q.id} className="border-t border-border/60 align-top">
                      <td className="py-2.5 pr-3">PEO {i + 1}. {q.label}</td>
                      <td className="py-2.5 px-2 text-right font-semibold tabular-nums">{fmt(mean)}</td>
                      <td className="py-2.5 pl-2">
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted" role="img" aria-label={LIKERT.map((l, k) => `${l}: ${counts[k]}`).join(', ')}>
                          {counts.map((c, k) => (
                            <span key={k} style={{ width: n ? `${(c / n) * 100}%` : 0, background: ['#c2410c', '#f59e0b', '#94a3b8', '#22c55e', '#15803d'][k] }} />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{counts.join(' · ')}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {open && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {ALL_QUESTIONS.filter((q) => q.kind === 'yesno' || q.kind === 'single' || q.kind === 'multi' || q.kind === 'scale').map((q) => {
                const options = q.kind === 'yesno' ? ['Yes', 'No'] : q.kind === 'scale' ? [...SATISFACTION] : q.options;
                const counts = options.map((o) => ({ o, n: done.filter((r) => (Array.isArray(a(r, q.id)) ? (a(r, q.id) as string[]).includes(o) : a(r, q.id) === o)).length }));
                const others = done.map((r) => String(a(r, `${q.id}Other`) || '').trim()).filter(Boolean);
                return (
                  <div key={q.id} className="rounded-xl border border-border p-4 text-sm">
                    <p className="font-medium mb-2">{q.label}</p>
                    <ul className="space-y-1">
                      {counts.sort((x, y) => (q.kind === 'multi' ? y.n - x.n : 0)).map(({ o, n }) => (
                        <li key={o} className="flex items-center gap-2">
                          <span className="flex-1 min-w-0">{o}</span>
                          <span className="tabular-nums font-semibold">{n}</span>
                          <span className="tabular-nums text-muted-foreground w-10 text-right">{pct(n, done.length)}</span>
                        </li>
                      ))}
                    </ul>
                    {!!others.length && (
                      <p className="text-xs text-muted-foreground mt-2">Specified: {others.slice(0, 10).join(' · ')}{others.length > 10 ? ' …' : ''}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
