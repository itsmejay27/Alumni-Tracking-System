import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, MapPin, Clock, DollarSign, Plus, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { LoadingState, ErrorState } from './DataState';

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
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this job posting?')) return;
    const { data, error } = await supabase.from('jobs').delete().eq('id', id).select('id');
    if (error || !data?.length) {
      toast.error(error ? `Could not delete: ${error.message}` : 'You can only remove your own postings.');
      return;
    }
    setJobs((list) => list.filter((j) => j.id !== id));
  };

  const filteredJobs = filterType === 'all'
    ? jobs
    : jobs.filter(job => job.type === filterType);

  if (loading) return <LoadingState label="Loading job postings..." />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Job Board</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredJobs.length} job opportunities available
          </p>
        </div>
        <button
          onClick={() => setShowPostForm(!showPostForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          {showPostForm ? <X size={18} /> : <Plus size={18} />}
          {showPostForm ? 'Cancel' : 'Post a Job'}
        </button>
      </div>

      {/* Post Job Form */}
      {showPostForm && (
        <JobPostingForm
          posterName={posterName}
          onClose={() => setShowPostForm(false)}
          onPosted={() => { setShowPostForm(false); load(); }}
        />
      )}

      {/* Filter */}
      <div className="bg-card border border-border rounded-lg p-4">
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
        {filteredJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            canDelete={isAdmin || job.createdBy === userId}
            onDelete={() => handleDelete(job.id)}
          />
        ))}
        {filteredJobs.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
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
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-lg mb-1">{job.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 size={16} />
              {job.company}
            </div>
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

function JobPostingForm({ posterName, onClose, onPosted }: { posterName: string; onClose: () => void; onPosted: () => void }) {
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

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Post a Job Opportunity</h3>
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

        <div className="flex gap-3 pt-2">
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
  );
}
