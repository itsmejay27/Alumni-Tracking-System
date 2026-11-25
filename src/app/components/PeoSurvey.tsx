import React from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { useT } from '@/lib/preferences';
import { LIKERT, SATISFACTION, SURVEY_SECTIONS, SurveyAnswers, Question, unansweredQuestions } from '@/lib/survey';

const box = 'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm';

/** The BSIT PEO survey form. Answers live in the parent (My Alumni Profile) and are saved with the profile. */
export function PeoSurveyForm({
  answers,
  onChange,
  completedAt,
}: {
  answers: SurveyAnswers;
  onChange: (next: SurveyAnswers) => void;
  completedAt?: string;
}) {
  const t = useT();
  const set = (id: string, v: string | string[] | undefined) => onChange({ ...answers, [id]: v });
  const setMany = (patch: SurveyAnswers) => onChange({ ...answers, ...patch });
  const missing = unansweredQuestions(answers);
  const total = SURVEY_SECTIONS.reduce((n, s) => n + s.questions.filter((q) => q.kind !== 'text').length, 0);
  const done = total - missing.length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold flex items-center gap-2">
          <ClipboardList size={16} className="text-primary" /> {t('BSIT Program Educational Objectives (PEO) Survey')}
        </p>
        <p className="text-muted-foreground">
          {t('Dear alumni, as a graduate of the BS Information Technology program, please answer this survey on the Program Educational Objectives. Your answers help us see how well the program prepared you for your career and improve the curriculum for future IT professionals. All responses are kept confidential and used only for academic and program evaluation.')}
        </p>
        <p className="text-xs text-muted-foreground">— {t('BSIT Program Chair, Occidental Mindoro State College')}</p>
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-2 rounded-full bg-border overflow-hidden" aria-hidden>
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums">
            {done} / {total} {t('answered')}
          </span>
        </div>
        {completedAt && (
          <p className="text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {t('Survey submitted. You can still change your answers and save again.')}
          </p>
        )}
      </div>

      {SURVEY_SECTIONS.map((section) => (
        <fieldset key={section.title} className="space-y-4">
          <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{section.title}</legend>
          {section.questions.map((q, i) => (
            <QuestionField key={q.id} q={q} n={i + 1} answers={answers} set={set} setMany={setMany} missing={missing.some((m) => m.id === q.id)} />
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function QuestionField({
  q,
  n,
  answers,
  set,
  setMany,
  missing,
}: {
  q: Question;
  n: number;
  answers: SurveyAnswers;
  set: (id: string, v: string | string[] | undefined) => void;
  setMany: (patch: SurveyAnswers) => void;
  missing: boolean;
}) {
  const t = useT();
  const v = answers[q.id];
  const name = `peo-${q.id}`;
  const label = (
    <p className="text-sm font-medium">
      {q.kind === 'likert' || q.kind === 'single' || q.kind === 'multi' || q.kind === 'scale' ? `${n}. ` : ''}
      {q.label}
      {q.kind !== 'text' && <span className="text-red-600"> *</span>}
    </p>
  );
  const radio = (options: readonly string[], cols = false) => (
    <div className={cols ? 'flex flex-wrap gap-2' : 'space-y-1.5'} role="radiogroup" aria-label={q.label}>
      {options.map((o) => (
        <label
          key={o}
          className={`flex items-start gap-2 text-sm cursor-pointer rounded-lg ${cols ? `px-3 py-1.5 border ${v === o ? 'border-primary bg-primary/10 font-semibold' : 'border-border'}` : ''}`}
        >
          <input type="radio" name={name} checked={v === o} onChange={() => set(q.id, o)} className={cols ? 'sr-only' : 'mt-1'} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className={`rounded-xl p-3 space-y-2 ${missing ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
      {label}
      {q.kind === 'text' && <input value={(v as string) || ''} onChange={(e) => set(q.id, e.target.value)} className={box} placeholder={q.placeholder ? t(q.placeholder) : ''} />}
      {q.kind === 'months' && (
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={(v as string) ?? ''}
            onChange={(e) => set(q.id, e.target.value.replace(/\D/g, '').slice(0, 3))}
            className={`${box} w-24`}
            aria-label={t('Number of months')}
            placeholder="0"
          />
          <span className="text-sm text-muted-foreground">{t('months (0 if hired right after graduation)')}</span>
        </div>
      )}
      {q.kind === 'yesno' && radio(['Yes', 'No'], true)}
      {q.kind === 'likert' && radio(LIKERT, true)}
      {q.kind === 'scale' && radio(SATISFACTION, true)}
      {q.kind === 'single' && (
        <>
          {radio(q.options)}
          {q.specify && (
            <input value={(answers[`${q.id}Other`] as string) || ''} onChange={(e) => set(`${q.id}Other`, e.target.value)} className={box} placeholder={q.specify} aria-label={q.specify} />
          )}
        </>
      )}
      {q.kind === 'multi' && (
        <>
          <div className="space-y-1.5">
            {q.options.map((o) => {
              const list = Array.isArray(v) ? v : [];
              const on = list.includes(o);
              return (
                <label key={o} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={on} onChange={() => set(q.id, on ? list.filter((x) => x !== o) : [...list, o])} />
                  <span>{o}</span>
                </label>
              );
            })}
          </div>
          <input
            value={(answers[`${q.id}Other`] as string) || ''}
            onChange={(e) => setMany({ [`${q.id}Other`]: e.target.value, ...(Array.isArray(v) ? {} : { [q.id]: [] }) })}
            className={box}
            placeholder={t('Other (please specify)')}
            aria-label={t('Other (please specify)')}
          />
        </>
      )}
    </div>
  );
}
