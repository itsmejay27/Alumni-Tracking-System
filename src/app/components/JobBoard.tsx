import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, Building2, MapPin, Clock, DollarSign, Plus, X, Trash2 } from 'lucide-react';
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
    if (!(await confirmDialog({ title: 'Remove this job posting?', confirmLabel: 'Remove', danger: true }))) return;
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

  const paged = usePaged(filteredJobs, 8);

  if (loading) return <LoadingState label="Loading job postings..." />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Job Board</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredJobs.length} job opportunities{myProgram ? ` · ${myProgram} jobs shown first` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
        {myProgram && (
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="filter-select">
            <option value="match">Best match</option>
            <option value="newest">Newest</option>
          </select>
        )}
        <button
          onClick={() => setShowPostForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Post a Job
        </button>
        </div>
      </div>

      {/* Post Job Form */}
      {showPostForm && (
        <JobPostingForm
          posterName={posterName}
          defaultProgram={courseScopeForRole(userRole) || myProgram || ''}
          onClose={() => setShowPostForm(false)}
          onPosted={() => { setShowPostForm(false); load(); }}
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
            All Jobs
          </button>
          <button
            onClick={() => setFilterType('full-time')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'full-time'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Full-time
          </button>
          <button
            onClick={() => setFilterType('part-time')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'part-time'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Part-time
          </button>
          <button
            onClick={() => setFilterType('contract')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'contract'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Contract
          </button>
          <button
            onClick={() => setFilterType('internship')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'internship'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Internship
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
          />
        ))}
        <Pagination {...paged} label="jobs" />
        {filteredJobs.length === 0 && (
          <div className="bg-card rounded-2xl shadow-sm p-12 text-center">
            <Briefcase className="mx-auto mb-3 text-muted-foreground/60" size={40} />
            <p className="font-medium">No job postings yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to share an opportunity with fellow alumni.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, canDelete, onDelete }: { job: JobPosting; canDelete: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 size={16} />
              {job.company}
            </div>
            {job.program && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs font-medium rounded-full bg-primary/10 text-primary px-2 py-0.5">{job.program}</span>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin size={16} />
              {job.location}
            </div>
          </div>
        </div>
        <JobTypeBadge type={job.type} />
      </div>

      {job.salary && (
        <div className="flex items-center gap-1.5 text-sm text-foreground mb-3">
          <DollarSign size={16} className="text-muted-foreground" />
          {job.salary}
        </div>
      )}

      <p className="text-sm text-foreground mb-4 line-clamp-2">{job.description}</p>

      {expanded && (
        <div className="space-y-4 mb-4 pb-4 border-b border-border">
          <div>
            <h4 className="text-sm font-medium mb-2">Requirements:</h4>
            <ul className="space-y-1">
              {job.requirements.map((req, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Contact:</h4>
            <p className="text-sm text-muted-foreground">{job.contactEmail}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={14} />
          Posted {job.postedDate} by {job.postedBy}
        </div>
        <div className="flex items-center gap-4">
          {canDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <Trash2 size={13} />
              Remove
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobTypeBadge({ type }: { type: JobPosting['type'] }) {
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
      {labels[type]}
    </span>
  );
}

function JobPostingForm({ posterName, defaultProgram, onClose, onPosted }: { posterName: string; defaultProgram: string; onClose: () => void; onPosted: () => void }) {
  const [submitting, setSubmitting] = useState(false);
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('jobs').insert({
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
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Could not post job: ${error.message}`);
      return;
    }
    toast.success('Job posted!');
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
          <h3 className="font-semibold text-lg">Post a Job Opportunity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Fields marked * are required.</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">Job Title *</label>
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
            <label className="block text-sm mb-1.5">Company *</label>
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
            <label className="block text-sm mb-1.5">Location *</label>
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
            <label className="block text-sm mb-1.5">Job Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1.5">Salary Range (Optional)</label>
            <input
              type="text"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. ₱25,000 - ₱35,000/month"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">Related Program</label>
            <select
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Any program</option>
              {PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>{p.code} – {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1.5">Contact Email *</label>
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
          <label className="block text-sm mb-1.5">Job Description *</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Describe the job role and responsibilities..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5">Requirements *</label>
          <textarea
            required
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="List requirements (one per line)"
          />
          <p className="text-xs text-muted-foreground mt-1">Enter each requirement on a new line</p>
        </div>

        <div className="flex flex-row-reverse gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? 'Posting...' : 'Post Job'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </div>,
    document.body
  );
}
