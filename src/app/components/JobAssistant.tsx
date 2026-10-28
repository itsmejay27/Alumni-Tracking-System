import { usePrefs } from '@/lib/preferences';
import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Link2,
  FileText,
  Upload,
  Loader2,
  AlertTriangle,
  Wallet,
  ListChecks,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MailPlus,
  MessagesSquare,
  Copy,
  MapPin,
  Building2,
  Briefcase,
  RotateCcw,
  X,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { currentJob, fetchMyRecord } from '@/lib/alumni';
import { programName } from '@/lib/programs';

interface Analysis {
  isJobPosting: boolean;
  title: string;
  company: string;
  location: string;
  workSetup: string;
  summary: string;
  dailyTasks: string[];
  requiredSkills: { skill: string; meaning: string }[];
  qualifications: string[];
  salary: { stated: string; currency: string; hourly: string; weekly: string; monthly: string; monthlyInPhp: string; explanation: string };
  glossary: { term: string; meaning: string; example: string }[];
  fit: { verdict: string; matchedSkills: string[]; missingSkills: string[]; advice: string[] };
  warnings: string[];
  posting?: {
    jobType: string;
    salaryRange: string;
    contactEmail: string;
    relatedProgram: string;
    description: string;
    requirements: string[];
  };
}

/** Values for the Job Board's Post a Job form */
export interface JobPrefill {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string;
  contactEmail: string;
  program: string;
}

const notStated = (v?: string) => (!v || /^not stated$/i.test(v.trim()) ? '' : v.trim());

function toPrefill(a: Analysis): JobPrefill {
  const p = a.posting;
  return {
    title: notStated(a.title),
    company: notStated(a.company),
    location: notStated(a.location),
    type: ['full-time', 'part-time', 'contract', 'internship'].includes(p?.jobType || '') ? p!.jobType : 'full-time',
    salary: notStated(p?.salaryRange || (a.salary.stated !== 'Not stated' ? a.salary.stated : '')),
    description: p?.description || a.summary,
    requirements: (p?.requirements?.length ? p.requirements : a.qualifications).join('\n'),
    contactEmail: /@/.test(p?.contactEmail || '') ? p!.contactEmail.trim() : '',
    program: p?.relatedProgram && p.relatedProgram !== 'None' ? p.relatedProgram : '',
  };
}

type Mode = 'url' | 'text' | 'file';
type Lang = 'en' | 'fil';

const SKILLS_KEY = 'omsu-job-assistant-skills';
const MAX_FILE = 8 * 1024 * 1024;

const card = 'bg-card rounded-2xl shadow-sm p-5 sm:p-6';
const field =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm';

const VERDICT_STYLE: Record<string, string> = {
  'Strong match': 'bg-emerald-100 text-emerald-800',
  'Possible match': 'bg-amber-100 text-amber-800',
  'Not yet a match': 'bg-red-100 text-red-700',
  'Not enough information': 'bg-slate-100 text-slate-700',
};

async function invokeError(error: any) {
  let message = error?.message || 'Something went wrong';
  try {
    const body = await error.context?.json();
    if (body?.error) message = body.error;
  } catch {
    /* keep default */
  }
  return message as string;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** AI helper that explains a job posting, its pay and requirements, and helps the user apply. */
export function JobAssistant({
  userId,
  initialText,
  onSeedUsed,
  onClose,
  onPost,
}: {
  userId?: string;
  initialText?: string;
  onSeedUsed?: () => void;
  onClose?: () => void;
  /** Opens the Post a Job form filled with this job's details */
  onPost?: (prefill: JobPrefill) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialText ? 'text' : 'url');
  // Starts in the language chosen in Settings; can be switched just for the AI's answer
  const [lang, setLang] = useState<Lang>(usePrefs().lang);
  const [url, setUrl] = useState('');
  const [text, setText] = useState(initialText || '');
  const [file, setFile] = useState<File | null>(null);
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [assist, setAssist] = useState<{ kind: 'cover_letter' | 'interview'; text: string } | null>(null);
  const [assistBusy, setAssistBusy] = useState<'cover_letter' | 'interview' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // A job sent from the Job Board
  useEffect(() => {
    if (initialText) {
      setMode('text');
      setText(initialText);
      onSeedUsed?.();
    }
  }, [initialText]);

  // Skills: remembered on this device, or a starting point from the tracer record
  useEffect(() => {
    let saved = '';
    try {
      saved = localStorage.getItem(SKILLS_KEY) || '';
    } catch {
      /* storage blocked */
    }
    if (saved) {
      setSkills(saved);
      return;
    }
    if (!userId) return;
    fetchMyRecord(userId)
      .then((rec) => {
        if (!rec) return;
        const job = currentJob(rec);
        const lines = [
          `Graduate of ${programName(rec.course)}${rec.yearGraduated ? `, class of ${rec.yearGraduated}` : ''}.`,
          job ? `Current job: ${[job.position, job.company].filter(Boolean).join(' at ')}.` : '',
          'Skills: ',
        ].filter(Boolean);
        setSkills(lines.join('\n'));
      })
      .catch(() => {});
  }, [userId]);

  const saveSkills = (v: string) => {
    setSkills(v);
    try {
      localStorage.setItem(SKILLS_KEY, v);
    } catch {
      /* storage blocked */
    }
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/|application\/pdf/.test(f.type)) {
      toast.error('Choose an image (PNG, JPG, WEBP) or a PDF');
      return;
    }
    if (f.size > MAX_FILE) {
      toast.error('File is too large (8 MB max)');
      return;
    }
    setFile(f);
  };

  const analyze = async () => {
    const body: Record<string, unknown> = { action: 'analyze', language: lang, profile: skills };
    if (mode === 'url') {
      if (!/^https?:\/\/\S+\.\S+/.test(url.trim())) return toast.error('Paste the full job link, starting with https://');
      body.url = url.trim();
    } else if (mode === 'text') {
      if (text.trim().length < 40) return toast.error('Paste the full job description');
      body.text = text;
    } else {
      if (!file) return toast.error('Choose a screenshot or PDF of the job posting');
      body.file = { mimeType: file.type, data: await fileToBase64(file) };
    }
    setBusy(true);
    setAssist(null);
    const { data, error } = await supabase.functions.invoke('job-assistant', { body });
    setBusy(false);
    if (error) {
      toast.error(await invokeError(error));
      return;
    }
    setAnalysis(data.analysis as Analysis);
    if (typeof data.remaining === 'number') setRemaining(data.remaining);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const runAssist = async (kind: 'cover_letter' | 'interview') => {
    if (!analysis) return;
    setAssistBusy(kind);
    const { data, error } = await supabase.functions.invoke('job-assistant', {
      body: { action: 'assist', kind, analysis, language: lang, profile: skills },
    });
    setAssistBusy(null);
    if (error) {
      toast.error(await invokeError(error));
      return;
    }
    setAssist({ kind, text: data.text });
  };

  const reset = () => {
    setAnalysis(null);
    setAssist(null);
    setUrl('');
    setText('');
    setFile(null);
    resultRef.current?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tab = (id: Mode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        mode === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl bg-[#002060] text-white p-5 sm:p-6">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#f5c400]">
              <Sparkles size={14} /> AI Job Assistant
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold">Understand any job posting</h2>
            <p className="text-white/80 text-sm">
              Paste a link, the job text, or a screenshot. Get a simple explanation, the pay per hour, week and month, a skills check, and
              help with your application.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="flex rounded-xl bg-white/10 p-1">
              {(['en', 'fil'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${lang === l ? 'bg-[#f5c400] text-[#002060]' : 'text-white/80 hover:text-white'}`}
                >
                  {l === 'en' ? 'English' : 'Filipino'}
                </button>
              ))}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white">
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Input */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <section className={`${card} space-y-4`}>
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 w-full sm:w-fit">
            {tab('url', <Link2 size={15} />, 'Job link')}
            {tab('text', <FileText size={15} />, 'Paste text')}
            {tab('file', <Upload size={15} />, 'Screenshot / PDF')}
          </div>

          {mode === 'url' && (
            <div className="space-y-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.onlinejobs.ph/jobseekers/job/..." className={field} inputMode="url" />
              <p className="text-xs text-muted-foreground">
                Works best with public job pages. If a site needs a login (e.g. Facebook, LinkedIn), paste the text or upload a screenshot instead.
              </p>
            </div>
          )}
          {mode === 'text' && (
            <textarea
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the whole job description here: title, duties, requirements, salary..."
              className={`${field} resize-y`}
            />
          )}
          {mode === 'file' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors p-8 text-center"
            >
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              <Upload className="mx-auto text-primary mb-2" size={26} />
              {file ? (
                <p className="text-sm font-semibold">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold">Click or drop a screenshot or PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP or PDF, up to 8 MB</p>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={analyze}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {busy ? 'Reading the job... this can take up to a minute' : 'Explain this job'}
          </button>
          {remaining != null && <p className="text-xs text-center text-muted-foreground">{remaining} AI requests left today</p>}
        </section>

        <section className={`${card} space-y-3`}>
          <div>
            <h3 className="font-semibold">Your skills and experience</h3>
            <p className="text-xs text-muted-foreground">Used for the skills check and your cover letter. Saved on this device only.</p>
          </div>
          <textarea
            rows={7}
            value={skills}
            onChange={(e) => saveSkills(e.target.value)}
            placeholder="e.g. BSIT graduate 2024. Skills: MS Excel, customer service, basic HTML. 6 months as office assistant."
            className={`${field} resize-y`}
          />
          <p className="text-[11px] text-muted-foreground">
            The AI can make mistakes. Always read the original posting, and never pay to apply for a job.
          </p>
        </section>
      </div>

      {/* Results */}
      {analysis && (
        <div ref={resultRef} className="space-y-6 scroll-mt-4">
          {!analysis.isJobPosting ? (
            <section className={`${card} flex items-start gap-3`}>
              <AlertTriangle className="text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold">This doesn't look like a job posting</p>
                <p className="text-sm text-muted-foreground mt-1">{analysis.summary}</p>
              </div>
            </section>
          ) : (
            <>
              <section className={card}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-extrabold">{analysis.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1.5">
                      <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {analysis.company}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {analysis.location}</span>
                      <span className="inline-flex items-center gap-1.5"><Briefcase size={14} /> {analysis.workSetup}</span>
                    </div>
                  </div>
                  <span className={`self-start shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${VERDICT_STYLE[analysis.fit.verdict] || VERDICT_STYLE['Not enough information']}`}>
                    {analysis.fit.verdict}
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed">{analysis.summary}</p>
                {onPost && (
                  <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Want fellow alumni to see this opening? Share it on the Job Board.</p>
                    <button
                      type="button"
                      onClick={() => onPost(toPrefill(analysis))}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shrink-0"
                    >
                      <Send size={16} /> Post to Job Board
                    </button>
                  </div>
                )}
              </section>

              {analysis.warnings.length > 0 && (
                <section className="rounded-2xl bg-red-50 p-5 space-y-2">
                  <p className="flex items-center gap-2 font-semibold text-red-800">
                    <AlertTriangle size={18} /> Be careful
                  </p>
                  <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                    {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </section>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Block icon={<ListChecks size={18} />} title="What you'd do every day">
                  <ul className="space-y-2">
                    {analysis.dailyTasks.map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </Block>

                <Block icon={<Wallet size={18} />} title="Pay breakdown">
                  <p className="text-sm text-muted-foreground mb-3">As posted: <span className="font-semibold text-foreground">{analysis.salary.stated}</span></p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ['Per hour', analysis.salary.hourly],
                      ['Per week', analysis.salary.weekly],
                      ['Per month', analysis.salary.monthly],
                      ['Monthly in ₱', analysis.salary.monthlyInPhp],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-muted/60 p-3">
                        <p className="text-[11px] text-muted-foreground">{k}</p>
                        <p className="font-bold text-sm mt-0.5 break-words">{v}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{analysis.salary.explanation}</p>
                </Block>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Block icon={<GraduationCap size={18} />} title="Skills the job needs">
                  <ul className="space-y-2.5">
                    {analysis.requiredSkills.map((s, i) => {
                      const has = analysis.fit.matchedSkills.some((m) => m.toLowerCase().includes(s.skill.toLowerCase()) || s.skill.toLowerCase().includes(m.toLowerCase()));
                      return (
                        <li key={i} className="flex gap-2.5 text-sm">
                          {has ? <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" /> : <span className="w-[17px] h-[17px] rounded-full border-2 border-border shrink-0 mt-0.5" />}
                          <span>
                            <span className="font-semibold">{s.skill}</span>
                            <span className="text-muted-foreground"> — {s.meaning}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {analysis.qualifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/60">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Qualifications</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.qualifications.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                  )}
                </Block>

                <Block icon={<CheckCircle2 size={18} />} title="Do you qualify?">
                  <div className="space-y-4 text-sm">
                    {analysis.fit.matchedSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-1.5">You already have</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.fit.matchedSkills.map((s, i) => <span key={i} className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-1 text-xs">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {analysis.fit.missingSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1.5">Still to learn</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.fit.missingSkills.map((s, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-xs">
                              <XCircle size={12} /> {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Advice</p>
                      <ul className="space-y-1.5">
                        {analysis.fit.advice.map((a, i) => (
                          <li key={i} className="flex gap-2"><Lightbulb size={15} className="text-amber-500 shrink-0 mt-0.5" /> {a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Block>
              </div>

              {analysis.glossary.length > 0 && (
                <Block icon={<BookOpen size={18} />} title="Words you might not know">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {analysis.glossary.map((g, i) => (
                      <div key={i} className="rounded-xl bg-muted/50 p-4">
                        <p className="font-semibold text-sm">{g.term}</p>
                        <p className="text-sm mt-1">{g.meaning}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 italic">Example: {g.example}</p>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              <Block icon={<MailPlus size={18} />} title="Application assistant">
                <div className="flex flex-col sm:flex-row gap-3">
                  <AssistButton busy={assistBusy === 'cover_letter'} onClick={() => runAssist('cover_letter')} icon={<MailPlus size={16} />} label="Draft a cover letter" />
                  <AssistButton busy={assistBusy === 'interview'} onClick={() => runAssist('interview')} icon={<MessagesSquare size={16} />} label="Practice interview questions" />
                </div>
                {assist && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold">{assist.kind === 'cover_letter' ? 'Cover letter draft' : 'Interview practice'}</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(assist.text).then(() => toast.success('Copied'));
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderLight(assist.text)}</div>
                    <p className="text-[11px] text-muted-foreground mt-3">Fill in the [brackets] and check every detail before sending.</p>
                  </div>
                )}
              </Block>
            </>
          )}

          <div className="flex justify-center">
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-sm font-medium">
              <RotateCcw size={15} /> Check another job
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h4 className="flex items-center gap-2.5 font-semibold mb-4">
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function AssistButton({ busy, onClick, icon, label }: { busy: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 disabled:opacity-60"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : icon} {busy ? 'Writing...' : label}
    </button>
  );
}

/** Shows **bold** and "# heading" from the AI text without a markdown library (text stays escaped). */
function renderLight(text: string) {
  return text.split('\n').map((line, i) => {
    const heading = line.match(/^#{1,4}\s+(.*)/);
    const content = heading ? heading[1] : line;
    const pieces = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : <React.Fragment key={j}>{p}</React.Fragment>,
    );
    return (
      <React.Fragment key={i}>
        {heading ? <strong>{pieces}</strong> : pieces}
        {'\n'}
      </React.Fragment>
    );
  });
}
