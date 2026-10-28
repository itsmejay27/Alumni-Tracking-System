import React, { useEffect, useState } from 'react';
import { Globe, ExternalLink, Sparkles } from 'lucide-react';
import { fetchMyRecord } from '@/lib/alumni';
import { PROGRAMS } from '@/lib/programs';
import { useT } from '@/lib/preferences';
import type { JobPrefill } from './JobAssistant';

const field =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm';

// Words to search for, based on the graduate's program
const PROGRAM_WORDS: Record<string, string> = {
  BSIT: 'IT',
  BEED: 'elementary teacher',
  'BSBA-FM': 'finance',
  'BSBA-OM': 'operations',
  BSOA: 'office administration',
};
const JOB_TYPE_WORDS: Record<string, string> = {
  'full-time': 'full time',
  'part-time': 'part time',
  contract: 'contract',
  internship: 'internship',
};

function searchWords(program: string, keywords: string, jobType: string) {
  return [keywords.trim() || PROGRAM_WORDS[program] || '', JOB_TYPE_WORDS[jobType] || ''].filter(Boolean).join(' ') || 'fresh graduate';
}

/** Ready-made searches on job sites, filled in with what the person typed. */
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
    { name: 'Google Jobs', note: 'google.com', url: `https://www.google.com/search?q=${encodeURIComponent(`${words} jobs ${location}`)}&ibp=htl;jobs` },
    ...(remote
      ? [{ name: 'OnlineJobs.ph (work from home)', note: 'onlinejobs.ph', url: `https://www.google.com/search?q=${encodeURIComponent(`site:onlinejobs.ph ${words}`)}` }]
      : []),
  ];
}

/** Find jobs online: links that open trusted job sites already searched for the graduate's program. */
export function JobSearch({
  userId,
  defaultProgram,
  onExplain,
}: {
  userId?: string;
  defaultProgram?: string;
  onExplain: (text: string) => void;
  onPost?: (prefill: JobPrefill) => void;
}) {
  const t = useT();
  const [program, setProgram] = useState(defaultProgram || '');
  const [location, setLocation] = useState('Occidental Mindoro, Philippines');
  const [jobType, setJobType] = useState('any');
  const [keywords, setKeywords] = useState('');
  const [remote, setRemote] = useState(true);

  // Start from the graduate's own program
  useEffect(() => {
    if (!defaultProgram && userId) {
      fetchMyRecord(userId)
        .then((r) => r?.course && setProgram(r.course))
        .catch(() => {});
    }
  }, [userId, defaultProgram]);

  const sites = siteSearches(searchWords(program, keywords, jobType), location, remote);

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3 pr-10">
          <span className="w-10 h-10 rounded-xl bg-[#002060] text-[#f5c400] flex items-center justify-center shrink-0">
            <Globe size={20} />
          </span>
          <div>
            <h3 className="font-bold text-lg">{t('Find jobs online')}</h3>
            <p className="text-sm text-muted-foreground">{t('Choose what you are looking for, then open a job site. The search is filled in for you.')}</p>
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
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">{t('Job title or keywords (optional)')}</span>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={field} placeholder={t('e.g. web developer, teacher, bookkeeper')} />
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
        </div>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="w-4 h-4 accent-[#002060]" />
          {t('Include work-from-home jobs')}
        </label>
      </div>

      <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        <p className="font-semibold">{t('Search these job sites')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sites.map((site) => (
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-muted-foreground">{t('Found a job you like? Copy its details and let the AI explain it.')}</p>
          <button
            type="button"
            onClick={() => onExplain('')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <Sparkles size={14} /> {t('Explain a job')}
          </button>
        </div>
      </div>
    </div>
  );
}
