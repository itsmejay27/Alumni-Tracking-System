import React, { useState } from 'react';
import { Briefcase, Building2, MapPin, Clock, DollarSign, Plus, X } from 'lucide-react';

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
}

interface JobBoardProps {
  userRole: 'admin' | 'alumni';
}

export function JobBoard({ userRole }: JobBoardProps) {
  const [showPostForm, setShowPostForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'full-time' | 'part-time' | 'contract' | 'internship'>('all');

  const filteredJobs = filterType === 'all'
    ? mockJobPostings
    : mockJobPostings.filter(job => job.type === filterType);

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
      {showPostForm && <JobPostingForm onClose={() => setShowPostForm(false)} />}

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
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: JobPosting }) {
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
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
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

function JobPostingForm({ onClose }: { onClose: () => void }) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Job posting submitted! (In the real system, this will be saved to the database)');
    onClose();
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
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Post Job
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

const mockJobPostings: JobPosting[] = [
  {
    id: '1',
    title: 'Junior Software Developer',
    company: 'TechHub Philippines',
    location: 'Makati, Metro Manila',
    type: 'full-time',
    salary: '₱30,000 - ₱45,000/month',
    description: 'We are looking for a passionate Junior Software Developer to join our growing team. You will work on building web applications using modern technologies.',
    requirements: [
      'Bachelor\'s degree in Computer Science or related field',
      'Knowledge of JavaScript, React, and Node.js',
      'Strong problem-solving skills',
      'Good communication skills',
    ],
    postedBy: 'Maria Santos',
    postedDate: 'May 26, 2026',
    contactEmail: 'careers@techhub.ph',
  },
  {
    id: '2',
    title: 'Registered Nurse',
    company: 'Manila Medical Center',
    location: 'Manila City',
    type: 'full-time',
    salary: '₱28,000 - ₱40,000/month',
    description: 'Looking for dedicated Registered Nurses to provide quality patient care in our medical center.',
    requirements: [
      'Valid PRC License',
      'BS Nursing degree',
      'Fresh graduates are welcome',
      'Compassionate and patient-oriented',
    ],
    postedBy: 'Carlos Mendoza',
    postedDate: 'May 25, 2026',
    contactEmail: 'hr@manilamedical.com',
  },
  {
    id: '3',
    title: 'Marketing Intern',
    company: 'GlobalCorp Inc.',
    location: 'Quezon City',
    type: 'internship',
    description: 'Great opportunity for students or fresh graduates to gain hands-on experience in marketing and brand management.',
    requirements: [
      'Currently pursuing or completed degree in Marketing, Business, or related field',
      'Strong written and verbal communication skills',
      'Familiarity with social media platforms',
      'Creative and detail-oriented',
    ],
    postedBy: 'Juan dela Cruz',
    postedDate: 'May 24, 2026',
    contactEmail: 'internships@globalcorp.com',
  },
  {
    id: '4',
    title: 'Elementary Teacher',
    company: 'DepEd Mindoro',
    location: 'Calapan City, Oriental Mindoro',
    type: 'full-time',
    salary: '₱25,000 - ₱32,000/month',
    description: 'Seeking passionate educators to teach elementary students. Position available for the upcoming school year.',
    requirements: [
      'Bachelor\'s degree in Elementary Education',
      'Valid PRC License for Professional Teachers',
      'Strong classroom management skills',
      'Commitment to student development',
    ],
    postedBy: 'OMSC Alumni Relations',
    postedDate: 'May 23, 2026',
    contactEmail: 'recruitment@deped-mindoro.gov.ph',
  },
  {
    id: '5',
    title: 'Civil Engineer',
    company: 'BuildRight Construction',
    location: 'Calapan City, Oriental Mindoro',
    type: 'full-time',
    salary: '₱35,000 - ₱50,000/month',
    description: 'Infrastructure projects require experienced Civil Engineers for planning and site supervision.',
    requirements: [
      'BS Civil Engineering degree',
      'Valid PRC License',
      'At least 1 year experience preferred',
      'Knowledge of AutoCAD and engineering software',
    ],
    postedBy: 'Miguel Torres',
    postedDate: 'May 22, 2026',
    contactEmail: 'jobs@buildright.ph',
  },
];
