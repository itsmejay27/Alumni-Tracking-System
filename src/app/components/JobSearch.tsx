import React, { useEffect, useState } from 'react';
import { Search, Globe, MapPin, Building2, ExternalLink, Sparkles, Plus, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchMyRecord } from '@/lib/alumni';
import { PROGRAMS } from '@/lib/programs';
import { salaryInPesos } from '@/lib/money';
import { usePrefs, useT } from '@/lib/preferences';
import type { JobPrefill } from './JobAssistant';

interface FoundJob {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  postedDate: string;
  url: string;
  site: string;
  linkSeen: boolean;
  whyMatch: string;
  description: string;
  requirements: string[];
  contactEmail: string;
  relatedProgram: string;
}

// Same key as the AI Assistant, so skills typed in one place show up in the other
const SKILLS_KEY = 'omsu-job-assistant-skills';
const field =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm';

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

const jobText = (j: FoundJob) =>
  [
    `Job title: ${j.title}`,
    `Company: ${j.company}`,
    `Location: ${j.location}`,
    `Type: ${j.type}`,
    `Salary: ${salaryInPesos(j.salary) || 'Not stated'}`,
    '',
    j.description,
    '',
    'Requirements:',
    ...j.requirements.map((r) => `- ${r}`),
    j.url ? `\nLink: ${j.url}` : '',
  ].join('\n');

/** Uses the AI with Google Search to find open jobs online that fit the graduate's program and skills. */
export function JobSearch({
  userId,
  defaultProgram,
  onExplain,
  onPost,
}: {
  userId?: string;
  defaultProgram?: string;
  onExplain: (text: string) => void;
  onPost?: (prefill: JobPrefill) => void;
}) {
  const t = useT();
  const { lang } = usePrefs();
  const [program, setProgram] = useState(defaultProgram || '');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('Occidental Mindoro, Philippines');
  const [jobType, setJobType] = useState('any');
  const [remote, setRemote] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<FoundJob[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  // Shown when the AI search can't run (daily limit or busy): links to search job sites directly
  const [fallback, setFallback] = useState<{ reason: string } | null>(null);

  // Start from the skills saved on this device, or the graduate's program
  useEffect(() => {
    try {
      setSkills(localStorage.getItem(SKILLS_KEY) || '');
    } catch {
      /* storage blocked */
    }
    if (!defaultProgram && userId) {
      fetchMyRecord(userId)
        .then((r) => r?.course && setProgram(r.course))
        .catch(() => {});
    }
  }, [userId, defaultProgram]);

  const saveSkills = (v: string) => {
    setSkills(v);
    try {
      localStorage.setItem(SKILLS_KEY, v);
    } catch {
      /* storage blocked */
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program && !skills.trim() && !keywords.trim()) {
      toast.error(t('Choose your program or type a few skills first.'));
      return;
    }
    setBusy(true);
    setJobs(null);
    setFallback(null);
    const programName = PROGRAMS.find((p) => p.code === program)?.name || program;
    const { data, error } = await supabase.functions.invoke('job-assistant', {
      body: { action: 'search', program: programName, skills, location, jobType, remote, keywords, language: lang },
    });
    setBusy(false);
    if (error) {
      const message = await invokeError(error);
      if (/limit|busy|did not answer/i.test(message)) setFallback({ reason: message });
      else toast.error(message);
      return;
    }
    setJobs(data.jobs || []);
    setTips(data.tips || []);
    if (typeof data.remaining === 'number') setRemaining(data.remaining);
  };

  const toPrefill = (j: FoundJob): JobPrefill => ({
    title: j.title,
    company: j.company,
    location: j.location,
    type: j.type,
    salary: /not stated/i.test(j.salary) ? '' : j.salary,
    description: [j.description, j.url ? `\nOriginal posting: ${j.url}` : ''].join('').trim(),
    requirements: j.requirements.join('\n'),
    contactEmail: j.contactEmail,
    program: PROGRAMS.some((p) => p.code === j.relatedProgram) ? j.relatedProgram : program,
  });

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#002060] text-[#f5c400] flex items-center justify-center shrink-0">
            <Globe size={20} />
          </span>
          <div>
            <h3 className="font-bold text-lg">{t('Find jobs online')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('The AI searches job sites on the internet for openings that fit your program and skills.')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">{t('Program')}</span>
            <select value={program} onChange={(e) => setProgram(e.target.value)} className={field}>
              <option value="">{t('Any program')}</option>
              {PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} – {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">{t('Where')}</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} placeholder="e.g. San Jose, Occidental Mindoro" />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-sm font-medium mb-1.5">{t('Your skills')}</span>
            <input
              value={skills}
              onChange={(e) => saveSkills(e.target.value)}
              className={field}
              placeholder={t('e.g. MS Excel, customer service, basic web design')}
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">{t('Job type')}</span>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)} className={field}>
              <option value="any">{t('Any')}</option>
              <option value="full-time">{t('Full-time')}</option>
              <option value="part-time">{t('Part-time')}</option>
              <option value="contract">{t('Contract')}</option>
              <option value="internship">{t('Internship')}</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">{t('Other keywords (optional)')}</span>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={field} placeholder={t('e.g. government, teacher, bank')} />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="w-4 h-4 accent-[#002060]" />
            {t('Include work-from-home jobs')}
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {busy ? t('Searching the internet...') : t('Search jobs')}
          </button>
        </div>
        {remaining !== null && <p className="text-xs text-muted-foreground">{t('{n} AI requests left today', { n: remaining })}</p>}
      </form>

      {fallback && (
        <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
          <div>
            <p className="font-semibold">{t('Search these job sites directly')}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{t(fallback.reason)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {siteSearches(searchWords(program, keywords, skills), location, remote).map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-semibold">{site.name}</span>
                  <span className="block text-xs text-muted-foreground">{site.note}</span>
                </span>
                <ExternalLink size={15} className="text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('Found a job you like? Copy its link and use Explain a job to understand it.')}</p>
        </div>
      )}

      {busy && (
        <div className="bg-card rounded-2xl shadow-sm p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 animate-spin text-primary" size={28} />
          {t('Searching job sites. This can take up to a minute.')}
        </div>
      )}

      {jobs && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 text-amber-800 px-4 py-3 text-xs">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              {t('These were found by AI on other websites, not posted by OMSU. Open the link and check the posting before you apply. Never pay a fee to apply.')}
            </span>
          </div>

          {jobs.length === 0 && (
            <div className="bg-card rounded-2xl shadow-sm p-8 text-center text-sm text-muted-foreground">
              {t('No matching openings were found. Try fewer keywords or a wider location.')}
            </div>
          )}

          {jobs.map((j, i) => (
            <div key={i} className="bg-card rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-base">{j.title}</h4>
                  <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Building2 size={14} /> {j.company}
                    </span>
                    {j.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} /> {j.location}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-muted capitalize">{t(j.type.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase()))}</span>
              </div>
              {j.whyMatch && (
                <p className="text-sm rounded-lg bg-emerald-500/10 text-emerald-800 px-3 py-2">
                  <span className="font-semibold">{t('Why it fits you')}:</span> {j.whyMatch}
                </p>
              )}
              {j.description && <p className="text-sm text-muted-foreground">{j.description}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {j.salary && <span>💰 {salaryInPesos(j.salary)}</span>}
                {j.postedDate && <span>🗓 {j.postedDate}</span>}
                {j.site && (
                  <span>
                    {t('Found on')} {j.site}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {j.url ? (
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    <ExternalLink size={14} /> {t('Open posting')}
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${j.title} ${j.company} job`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    <Search size={14} /> {t('Search for this job')}
                  </a>
                )}
                <button
                  onClick={() => onExplain(jobText(j))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  <Sparkles size={14} /> {t('Explain with AI')}
                </button>
                {onPost && (
                  <button
                    onClick={() => onPost(toPrefill(j))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    <Plus size={14} /> {t('Share on Job Board')}
                  </button>
                )}
              </div>
            </div>
          ))}

          {tips.length > 0 && (
            <div className="bg-card rounded-2xl shadow-sm p-5">
              <p className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Lightbulb size={16} className="text-amber-500" /> {t('Search tips')}
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Words to search for when the AI search is unavailable
const PROGRAM_WORDS: Record<string, string> = {
  BSIT: 'IT',
  BEED: 'elementary teacher',
  'BSBA-FM': 'finance',
  'BSBA-OM': 'operations',
  BSOA: 'office administration',
};
function searchWords(program: string, keywords: string, skills: string) {
  // Skills only when they are a short list (the profile summary is too long to search with)
  const firstSkill = skills.length <= 60 ? skills.split(/[,;]/)[0].trim() : '';
  return [PROGRAM_WORDS[program] || firstSkill, keywords.trim()].filter(Boolean).join(' ') || 'fresh graduate';
}

/** Ready-made searches on job sites, so people can still look for jobs without the AI. */
function siteSearches(words: string, location: string, remote: boolean) {
  const q = encodeURIComponent(words);
  const where = encodeURIComponent(location || 'Philippines');
  const google = (site: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${words} ${location}`)}`;
  return [
    { name: 'Indeed Philippines', note: 'ph.indeed.com', url: `https://ph.indeed.com/jobs?q=${q}&l=${where}` },
    { name: 'LinkedIn Jobs', note: 'linkedin.com/jobs', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${where}` },
    { name: 'JobStreet', note: 'ph.jobstreet.com', url: google('ph.jobstreet.com') },
    { name: 'Kalibrr', note: 'kalibrr.com', url: google('kalibrr.com') },
    { name: 'PhilJobNet (government)', note: 'philjobnet.gov.ph', url: google('philjobnet.gov.ph') },
    remote
      ? { name: 'OnlineJobs.ph (work from home)', note: 'onlinejobs.ph', url: `https://www.google.com/search?q=${encodeURIComponent(`site:onlinejobs.ph ${words}`)}` }
      : { name: 'Google Jobs', note: 'google.com', url: `https://www.google.com/search?q=${encodeURIComponent(`${words} jobs ${location}`)}&ibp=htl;jobs` },
  ];
}
