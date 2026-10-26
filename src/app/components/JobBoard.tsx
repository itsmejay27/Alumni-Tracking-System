import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '@/lib/preferences';
import { createPortal } from 'react-dom';
import { JobAssistant } from './JobAssistant';
import { Briefcase, Building2, MapPin, Clock, DollarSign, Plus, X, Trash2, Sparkles, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from './ConfirmDialog';
import { Pagination, usePaged } from './Pagination';
import { supabase } from '@/lib/supabase';
import { LoadingState, ErrorState } from './DataState';
import { PROGRAMS } from '@/lib/programs';
import { courseScopeForRole, fetchMyRecord } from '@/lib/alumni';

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary?: string;
  description: string;
  requirements: string[];
  postedBy: string;
  postedDate: string;
  contactEmail: string;
  createdBy: string | null;
  program: string | null;
  createdAt: string;
}

interface JobBoardProps {
  userRole: string;
  userId: string;
  posterName: string;
}

export function JobBoard({ userRole, userId, posterName }: JobBoardProps) {
  const t = useT();
  // AI assistant pop-up: null = closed, '' = empty, otherwise a job's text to explain
  const [assistant, setAssistant] = useState<string | null>(null);
  // Job details filled in by the AI, shown in the Post a Job form for review
  const [postPrefill, setPostPrefill] = useState<Partial<JobFormData> | undefined>();
  const [showPostForm, setShowPostForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'full-time' | 'part-time' | 'contract' | 'internship'>('all');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [sortBy, setSortBy] = useState<'match' | 'newest'>('match');
  const [myProgram, setMyProgram] = useState<string | null>(courseScopeForRole(userRole));

  // Alumni see jobs for their own program first
  useEffect(() => {
    if (userRole !== 'alumni') return;
    fetchMyRecord(userId)
      .then((r) => r && setMyProgram(r.course))
      .catch(() => {});
  }, [userId, userRole]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isAdmin = userRole.startsWith('admin');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setJobs(
        data.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          type: j.type,
          salary: j.salary || undefined,
          description: j.description,
          requirements: j.requirements || [],
          postedBy: j.posted_by,
          postedDate: new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          contactEmail: j.contact_email,
          createdBy: j.created_by,
          program: j.program,
          createdAt: j.created_at,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: t('Remove this job posting?'), confirmLabel: t('Remove'), danger: true }))) return;
    const { data, error } = await supabase.from('jobs').delete().eq('id', id).select('id');
    if (error || !data?.length) {
      toast.error(error ? `Could not delete: ${error.message}` : 'You can only remove your own postings.');
      return;
    }
    setJobs((list) => list.filter((j) => j.id !== id));
  };

  const typeFiltered = filterType === 'all' ? jobs : jobs.filter((job) => job.type === filterType);
  const matchScore = (j: JobPosting) => (myProgram && j.program === myProgram ? 2 : j.program ? 0 : 1);
  const filteredJobs = [...typeFiltered].sort((a, b) =>
    sortBy === 'match' && myProgram
      ? matchScore(b) - matchScore(a) || b.createdAt.localeCompare(a.createdAt)
      : b.createdAt.localeCompare(a.createdAt)
  );

  const paged = usePaged(filteredJobs, 5);

  if (loading) return <LoadingState label={t('Loading job postings...')} />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('Job Board')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('{n} job opportunities', { n: filteredJobs.length })}{myProgram ? ` · ${t('{program} jobs shown first', { program: myProgram })}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {myProgram && (
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="filter-select">
            <option value="match">{t('Best match')}</option>
            <option value="newest">{t('Newest')}</option>
          </select>
        )}
        <button
          onClick={() => setAssistant('')}
          className="flex items-center gap-2 px-4 py-2 bg-[#f5c400] text-[#002060] font-semibold rounded-lg hover:brightness-95 transition whitespace-nowrap"
        >
          <Sparkles size={18} />
          {t('AI Assistant')}
        </button>
        <button
          onClick={() => { setPostPrefill(undefined); setShowPostForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <Plus size={18} />
          {t('Post a Job')}
        </button>
        </div>
      </div>

      {/* AI Job Assistant pop-up */}
      {assistant !== null && (
        <AssistantModal
          userId={userId}
          seed={assistant}
          onClose={() => setAssistant(null)}
          onPost={(prefill) => {
            setAssistant(null);
            setPostPrefill(prefill);
            setShowPostForm(true);
          }}
        />
      )}

      {/* Post Job Form */}
      {showPostForm && (
        <JobPostingForm
          posterName={posterName}
          defaultProgram={courseScopeForRole(userRole) || myProgram || ''}
          initial={postPrefill}
          onClose={() => { setShowPostForm(false); setPostPrefill(undefined); }}
          onPosted={() => { setShowPostForm(false); setPostPrefill(undefined); load(); }}
        />
      )}

      {/* Filter */}
      <div className="bg-card rounded-2xl shadow-sm p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('All Jobs')}
          </button>
          <button
            onClick={() => setFilterType('full-time')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'full-time'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('Full-time')}
          </button>
          <button
            onClick={() => setFilterType('part-time')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'part-time'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('Part-time')}
          </button>
          <button
            onClick={() => setFilterType('contract')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'contract'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('Contract')}
          </button>
          <button
            onClick={() => setFilterType('internship')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'internship'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t('Internship')}
          </button>
        </div>
      </div>

      {/* Job Listings */}
      <div className="space-y-4">
        {paged.pageItems.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            canDelete={isAdmin || job.createdBy === userId}
            onDelete={() => handleDelete(job.id)}
            onExplain={() => setAssistant(jobToText(job))}
          />
        ))}
        <Pagination {...paged} label={t('jobs')} alwaysShowControls />
        {filteredJobs.length === 0 && (
          <div className="bg-card rounded-2xl shadow-sm p-12 text-center">
            <Briefcase className="mx-auto mb-3 text-muted-foreground/60" size={40} />
            <p className="font-medium">{t('No job postings yet')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('Be the first to share an opportunity with fellow alumni.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const jobToText = (j: JobPosting) =>
  [
    `Job title: ${j.title}`,
    `Company: ${j.company}`,
    `Location: ${j.location}`,
    `Type: ${j.type}`,
    j.salary ? `Salary: ${j.salary}` : 'Salary: not stated',
    '',
    j.description,
    '',
    'Requirements:',
    ...j.requirements.map((r) => `- ${r}`),
    '',
    `Contact: ${j.contactEmail}`,
  ].join('\n');

function JobCard({ job, canDelete, onDelete, onExplain }: { job: JobPosting; canDelete: boolean; onDelete: () => void; onExplain?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card rounded-2xl shadow-sm p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 mb-2">
        <button type="button" onClick={() => setOpen(true)} className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold text-lg mb-1 truncate hover:text-primary">{job.title}</h3>
          <JobMeta job={job} />
        </button>
        <JobTypeBadge type={job.type} />
      </div>

      {job.salary && (
        <div className="flex items-center gap-1.5 text-sm text-foreground mb-2">
          <DollarSign size={16} className="text-muted-foreground" />
          {job.salary}
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{job.description}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <Clock size={14} className="shrink-0" />
          <span className="truncate">{t('Posted {date} by {name}', { date: job.postedDate, name: job.postedBy })}</span>
        </div>
        <div className="flex items-center gap-4">
          {canDelete && (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-destructive hover:underline">
              <Trash2 size={13} />
              {t('Remove')}
            </button>
          )}
          {onExplain && (
            <button onClick={onExplain} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Sparkles size={14} /> {t('Explain with AI')}
            </button>
          )}
          <button onClick={() => setOpen(true)} className="text-sm font-semibold text-primary hover:underline">
            {t('View details')}
          </button>
        </div>
      </div>

      {open && <JobDetails job={job} onClose={() => setOpen(false)} onExplain={onExplain} />}
    </div>
  );
}

function JobMeta({ job }: { job: JobPosting }) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5 min-w-0">
        <Building2 size={16} className="shrink-0" />
        {job.company}
      </span>
      {job.program && (
        <>
          <span>•</span>
          <span className="text-xs font-medium rounded-full bg-primary/10 text-primary px-2 py-0.5">{job.program}</span>
        </>
      )}
      <span>•</span>
      <span className="flex items-center gap-1.5">
        <MapPin size={16} className="shrink-0" />
        {job.location}
      </span>
    </div>
  );
}

/** Full job posting in a pop-up, so the list below never shifts. */
function JobDetails({ job, onClose, onExplain }: { job: JobPosting; onClose: () => void; onExplain?: () => void }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={job.title}>
      <div className="absolute inset-0 bg-slate-900/40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-xl">{job.title}</h3>
            <div className="mt-1.5">
              <JobMeta job={job} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <JobTypeBadge type={job.type} />
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {job.salary && (
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-sm font-medium">
            <DollarSign size={16} className="text-muted-foreground" />
            {job.salary}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-1.5">{t('About the job')}</h4>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>

        {job.requirements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1.5">{t('Requirements')}</h4>
            <ul className="space-y-1.5">
              {job.requirements.map((req, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl bg-muted/50 p-4 text-sm">
          <p className="font-semibold mb-0.5">{t('How to apply')}</p>
          <a href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`} className="text-primary hover:underline break-all">
            {job.contactEmail}
          </a>
          <p className="text-xs text-muted-foreground mt-2">{t('Posted {date} by {name}', { date: job.postedDate, name: job.postedBy })}. {t('Never pay a fee to apply for a job.')}</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
          {onExplain && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onExplain();
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f5c400] text-[#002060] text-sm font-semibold hover:brightness-95"
            >
              <Sparkles size={16} /> {t('Explain with AI')}
            </button>
          )}
          <a
            href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Mail size={16} /> {t('Apply by email')}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AssistantModal({ userId, seed, onClose, onPost }: { userId: string; seed: string; onClose: () => void; onPost: (prefill: Partial<JobFormData>) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="AI Job Assistant">
      <div className="absolute inset-0 bg-slate-900/50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-6xl max-h-[96vh] overflow-y-auto rounded-2xl bg-background shadow-2xl p-3 sm:p-5 animate-in fade-in zoom-in-95 duration-200">
        <JobAssistant userId={userId} initialText={seed || undefined} onClose={onClose} onPost={onPost} />
      </div>
    </div>,
    document.body
  );
}

function JobTypeBadge({ type }: { type: JobPosting['type'] }) {
  const t = useT();
  const styles = {
    'full-time': 'bg-blue-500/10 text-blue-700 border-blue-200',
    'part-time': 'bg-purple-500/10 text-purple-700 border-purple-200',
    'contract': 'bg-orange-500/10 text-orange-700 border-orange-200',
    'internship': 'bg-green-500/10 text-green-700 border-green-200',
  };

  const labels = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'internship': 'Internship',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs border ${styles[type]}`}>
      {t(labels[type])}
    </span>
  );
}

export interface JobFormData {
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

function JobPostingForm({
  posterName,
  defaultProgram,
  initial,
  onClose,
  onPosted,
}: {
  posterName: string;
  defaultProgram: string;
  initial?: Partial<JobFormData>;
  onClose: () => void;
  onPosted: () => void;
}) {
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [emailAlumni, setEmailAlumni] = useState(true);
  // Who gets the email: everyone, or only the job's program (its alumni and chair)
  const [audience, setAudience] = useState<'everyone' | 'department'>(initial?.program || defaultProgram ? 'department' : 'everyone');
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'full-time',
    salary: '',
    description: '',
    requirements: '',
    contactEmail: '',
    program: defaultProgram,
    ...initial,
    // Keep the usual program (e.g. a chair's own) when the AI didn't pick one
    ...(initial && !initial.program ? { program: defaultProgram } : {}),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: created, error } = await supabase.from('jobs').insert({
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim(),
      type: formData.type,
      salary: formData.salary.trim() || null,
      description: formData.description.trim(),
      requirements: formData.requirements.split('\n').map((r) => r.trim()).filter(Boolean),
      contact_email: formData.contactEmail.trim(),
      posted_by: posterName,
      program: formData.program || null,
      created_by: user?.id,
    }).select('id').single();
    if (error) {
      setSubmitting(false);
      toast.error(`Could not post job: ${error.message}`);
      return;
    }
    if (emailAlumni && created) {
      const { data: mail, error: mailError } = await supabase.functions.invoke('notify-job', {
        body: { jobId: created.id, audience: formData.program ? audience : 'everyone' },
      });
      if (mailError) {
        let message = 'Job posted, but the email could not be sent.';
        try {
          const body = await (mailError as any).context?.json();
          if (body?.error) message = `Job posted. ${body.error}`;
        } catch {
          /* keep default */
        }
        toast.warning(message);
      } else {
        toast.success(t('Job posted and emailed to {n} people (including your copy).', { n: mail?.sent ?? 0 }));
      }
    } else {
      toast.success(t('Job posted!'));
    }
    setSubmitting(false);
    onPosted();
  };

  // Close with the Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  // Rendered on <body> so the backdrop covers the whole screen
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Post a job">
      <div className="absolute inset-0 bg-slate-900/40 animate-in fade-in duration-200" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-lg">{t('Post a Job Opportunity')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {initial ? t('Filled in by the AI Assistant. Check every field before posting.') : t('Fields marked * are required.')}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">{t('Job Title')} *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">{t('Company')} *</label>
            <input
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. TechHub Philippines"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">{t('Location')} *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Manila, Philippines"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">{t('Job Type')} *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="full-time">{t('Full-time')}</option>
              <option value="part-time">{t('Part-time')}</option>
              <option value="contract">{t('Contract')}</option>
              <option value="internship">{t('Internship')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1.5">{t('Salary Range (Optional)')}</label>
            <input
              type="text"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. ₱25,000 - ₱35,000/month"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">{t('Related Program')}</label>
            <select
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('Any program')}</option>
              {PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>{p.code} – {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1.5">{t('Contact Email')} *</label>
            <input
              type="email"
              required
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. hr@company.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5">{t('Job Description')} *</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder={t('Describe the job role and responsibilities...')}
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5">{t('Requirements')} *</label>
          <textarea
            required
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder={t('List requirements (one per line)')}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('Enter each requirement on a new line')}</p>
        </div>

        <div className="rounded-xl bg-muted/50 p-3.5 text-sm space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={emailAlumni} onChange={(e) => setEmailAlumni(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#002060]" />
            <span>
              <span className="font-medium">{t('Email this job')}</span>
              <span className="block text-xs text-muted-foreground">{t('You also get a copy. People who turned off job emails are skipped.')}</span>
            </span>
          </label>
          {emailAlumni && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
              {(
                [
                  ['everyone', t('Everyone'), t('All alumni, program chairs and Alumni Affairs')],
                  ['department', formData.program ? t('{program} department only', { program: formData.program }) : t('My department only'), formData.program ? t('{program} alumni and the {program} chair', { program: formData.program }) : t('Choose a Related Program above first')],
                ] as const
              ).map(([value, title, sub]) => {
                const disabled = value === 'department' && !formData.program;
                const selected = (formData.program ? audience : 'everyone') === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setAudience(value)}
                    className={`rounded-xl p-3 text-left ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      selected ? 'ring-primary bg-card' : 'ring-transparent bg-card/60 hover:ring-border'
                    }`}
                  >
                    <span className="block font-semibold text-sm">{title}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-row-reverse gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? t('Posting...') : t('Post Job')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {t('Cancel')}
          </button>
        </div>
      </form>
      </div>
    </div>,
    document.body
  );
}
