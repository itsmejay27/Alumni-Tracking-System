import { mockRecords } from './csvRecords';
import React, { useState } from 'react';
import { Search, Download, Filter, Mail, Briefcase, Calendar, Building2, Facebook, User, MapPin, GraduationCap, ClipboardList, HelpCircle, X } from 'lucide-react';

interface AlumniRecord {
  id: string;
  studentId: string;
  lastName: string;
  givenName: string;
  middleName: string;
  name: string; // compatibility
  email: string;
  batch: string;
  yearGraduated: number;
  sex: 'Female' | 'Male';
  dateOfBirth: string;
  civilStatus: 'Single' | 'Married' | 'Separated' | 'Widowed';
  mobileNo: string;
  facebookName: string;
  presentAddress: string;
  permanentAddress: string;
  course: 'BSIT' | 'BEED' | 'BSBA-FM' | 'BSBA-OM' | 'BSOA';
  
  // Employment
  status: 'Employed' | 'Self-Employed' | 'Unemployed';
  employmentStatus?: 'PERMANENT' | 'CONTRACTUAL' | 'DAILY WAGE';
  currentPosition?: string;
  currentCompany?: string;
  employerType?: 'Private' | 'Semi-Private' | 'Government' | 'NGO/INGO';
  employerAddress?: string;
  jobDescription?: string;
  lengthOfService?: string;
  employmentStartDate?: string;
  
  lastUpdated: string;
  suggestions?: string;
}

interface AlumniRecordsProps {
  userRole: string;
}

export function AlumniRecords({ userRole }: AlumniRecordsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AlumniRecord | null>(null);
  const [viewTab, setViewTab] = useState<'records' | 'suggestions'>('records');

  const isSuperAdmin = userRole === 'admin';
  
  const getCourseScope = (): string | null => {
    if (userRole === 'admin.beed') return 'BEED';
    if (userRole === 'admin.bsit') return 'BSIT';
    if (userRole === 'admin.bsba-fm') return 'BSBA-FM';
    if (userRole === 'admin.bsba-om') return 'BSBA-OM';
    if (userRole === 'admin.bsoa') return 'BSOA';
    return null;
  };

  const courseScope = getCourseScope();

  // Filter records based on role and inputs
  const filteredRecords = mockRecords.filter((record) => {
    // 1. Role Scope Filter
    if (courseScope && record.course !== courseScope) {
      return false;
    }

    // 2. Text Search Match
    const fullName = `${record.givenName} ${record.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      record.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.email.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Batch Filter
    const matchesBatch = filterBatch === 'all' || record.batch === filterBatch;

    // 4. Course Filter (only applicable to super admin)
    const matchesCourse = courseScope ? true : (filterCourse === 'all' || record.course === filterCourse);

    // 5. Status Filter
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;

    return matchesSearch && matchesBatch && matchesCourse && matchesStatus;
  });

  const batches = Array.from(new Set(mockRecords.map(r => r.batch))).sort().reverse();
  const courses = ['BSIT', 'BEED', 'BSBA-FM', 'BSBA-OM', 'BSOA'];

  const handleDownload = () => {
    const scopeName = courseScope || (filterCourse === 'all' ? 'All Courses' : filterCourse);
    const csvContent = generateCSV(filteredRecords);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMSC_Alumni_${scopeName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = (records: AlumniRecord[]) => {
    const headers = [
      'Student ID', 'Last Name', 'Given Name', 'Email', 'Sex', 'Date of Birth', 
      'Civil Status', 'Mobile No.', 'Facebook Name', 'Course', 'Batch', 
      'Status', 'Employment Status', 'Job Title', 'Organization', 'Company Type', 
      'Length of Service', 'Suggestions'
    ];
    const rows = records.map(r => [
      r.studentId,
      r.lastName,
      r.givenName,
      r.email,
      r.sex,
      r.dateOfBirth,
      r.civilStatus,
      r.mobileNo,
      r.facebookName,
      r.course,
      r.batch,
      r.status,
      r.employmentStatus || '',
      r.currentPosition || '',
      r.currentCompany || '',
      r.employerType || '',
      r.lengthOfService || '',
      (r.suggestions || '').replace(/,/g, ';')
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {courseScope ? `${courseScope} Department Records` : 'College Alumni Registry'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {courseScope ? `Managing OMSC ${courseScope} Alumni submissions` : 'Central OMSC Alumni tracking system'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-[#001740] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setViewTab('records')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            viewTab === 'records'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap size={16} />
          Alumni Directory ({filteredRecords.length})
        </button>
        <button
          onClick={() => setViewTab('suggestions')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            viewTab === 'suggestions'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HelpCircle size={16} />
          Suggestions & Feedback ({filteredRecords.filter(r => r.suggestions).length})
        </button>
      </div>

      {viewTab === 'records' ? (
        <>
          {/* Filters */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search name, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              {/* Course Selector (only for Super Admin) */}
              <div>
                <select
                  disabled={!!courseScope}
                  value={courseScope || filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-semibold disabled:opacity-75 disabled:bg-muted"
                >
                  {courseScope ? (
                    <option value={courseScope}>{courseScope} Department</option>
                  ) : (
                    <>
                      <option value="all">All Courses</option>
                      {courses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Batch Filter */}
              <div>
                <select
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="all">All Batches</option>
                  {batches.map(batch => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="all">All Statuses</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records View (Mobile-responsive cards or Desktop Table) */}
          <div className="space-y-4">
            {/* Mobile Cards (visible on mobile only) */}
            <div className="block md:hidden space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-xs text-primary font-bold">{record.studentId}</span>
                      <h4 className="font-bold text-foreground text-base mt-0.5">{record.givenName} {record.lastName}</h4>
                      <p className="text-xs text-muted-foreground break-all">{record.email}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                        record.status === 'Employed'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : record.status === 'Self-Employed'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border/50">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Course</span>
                      <span className="font-bold text-foreground">{record.course}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch</span>
                      <span className="font-bold text-foreground">{record.batch}</span>
                    </div>
                    {record.status !== 'Unemployed' && (
                      <div className="col-span-2 border-t border-border/30 pt-2 mt-1">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Current Job</span>
                        <span className="font-semibold text-foreground text-xs block mt-0.5 leading-snug">
                          {record.currentPosition} <span className="text-muted-foreground">at</span> {record.currentCompany}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs rounded-lg transition-all text-center border border-primary/20 hover:border-transparent"
                  >
                    View Full Details
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table (visible on desktop only) */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border/70">
                    <tr>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Student ID</th>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Course</th>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Batch</th>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Current Position</th>
                      <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-primary font-bold">{record.studentId}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{record.givenName} {record.lastName}</div>
                          <div className="text-xs text-muted-foreground">{record.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-xs px-2.5 py-1 bg-muted rounded-lg border border-border/40">{record.course}</span>
                        </td>
                        <td className="px-6 py-4 font-medium">{record.batch}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              record.status === 'Employed'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : record.status === 'Self-Employed'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {record.status !== 'Unemployed' ? (
                            <div className="text-xs">
                              <p className="font-semibold text-foreground truncate max-w-[180px]">{record.currentPosition}</p>
                              <p className="text-muted-foreground truncate max-w-[180px]">{record.currentCompany}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Actively seeking work</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs rounded-lg transition-all"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredRecords.length === 0 && (
              <div className="bg-card border border-border rounded-xl text-center py-16 shadow-sm">
                <Filter className="mx-auto mb-3 text-muted-foreground/60" size={48} />
                <h4 className="font-bold text-lg mb-0.5">No Records Found</h4>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">Try refining your filters or query to locate alumni profiles.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Suggestions Tracker Board */
        <div className="grid grid-cols-1 gap-4">
          {filteredRecords
            .filter((r) => r.suggestions)
            .map((r) => (
              <div
                key={r.id}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-extrabold text-foreground text-lg">
                      {r.givenName} {r.lastName}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <GraduationCap size={13} /> {r.course} • Batch {r.batch}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded-lg">
                    SUBMITTED SUGGESTION
                  </span>
                </div>

                <div className="bg-muted/40 border border-border/30 rounded-xl p-4 my-4">
                  <p className="text-sm italic text-foreground leading-relaxed">
                    "{r.suggestions}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border/50 text-xs">
                  <a
                    href={`mailto:${r.email}`}
                    className="flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <Mail size={12} /> Contact Email
                  </a>
                  {r.facebookName && (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Facebook size={12} /> {r.facebookName}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto">Last updated: {r.lastUpdated}</span>
                </div>
              </div>
            ))}

          {filteredRecords.filter((r) => r.suggestions).length === 0 && (
            <div className="bg-card border border-border/80 rounded-2xl p-16 text-center shadow-lg">
              <ClipboardList className="mx-auto mb-4 text-muted-foreground/60" size={56} />
              <h3 className="font-bold text-xl mb-1 text-foreground">No Feedback Submitted</h3>
              <p className="text-muted-foreground text-sm">
                Alumni from this course department have not submitted any recommendations yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}

function RecordDetailModal({ record, onClose }: { record: AlumniRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg relative my-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors z-10"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Main Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border pr-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center justify-center font-bold text-xl uppercase shadow-inner shrink-0">
              {record.givenName[0]}{record.lastName[0]}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground leading-tight">{record.givenName} {record.lastName}</h3>
              <p className="text-sm font-mono text-primary font-bold mt-0.5">Student ID: {record.studentId}</p>
            </div>
          </div>
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shrink-0 text-center self-start sm:self-auto ${
              record.status === 'Employed'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : record.status === 'Self-Employed'
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}
          >
            {record.status}
          </span>
        </div>

        <div className="space-y-6 pt-6">
          {/* PERSONAL INFRASTRUCTURE DETAILS */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-primary" /> Personal Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 bg-muted/30 border border-border/50 rounded-2xl p-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Email Contact</p>
                <p className="font-bold text-foreground break-all mt-0.5">{record.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Mobile No.</p>
                <p className="font-bold text-foreground mt-0.5">{record.mobileNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Facebook Profile</p>
                <div className="flex items-center gap-1 text-blue-600 font-bold mt-0.5 break-all">
                  <Facebook size={14} className="shrink-0" />
                  <span>{record.facebookName}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Date of Birth</p>
                <p className="font-bold text-foreground mt-0.5">{record.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Sex</p>
                <p className="font-bold text-foreground mt-0.5">{record.sex}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Civil Status</p>
                <p className="font-bold text-foreground mt-0.5">{record.civilStatus}</p>
              </div>
              <div className="col-span-full border-t border-border/40 pt-3 mt-1">
                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><MapPin size={12} /> Present Address</p>
                <p className="font-semibold text-foreground mt-0.5">{record.presentAddress}</p>
              </div>
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><MapPin size={12} /> Permanent Address</p>
                <p className="font-semibold text-foreground mt-0.5">{record.permanentAddress}</p>
              </div>
            </div>
          </div>

          {/* EDUCATIONAL DETAILS */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <GraduationCap size={16} className="text-primary" /> College Background
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/30 border border-border/50 rounded-2xl p-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Finished Course / Degree</p>
                <p className="font-bold text-foreground mt-0.5">{record.course}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Academic Year Graduated</p>
                <p className="font-bold text-foreground mt-0.5">{record.batch}</p>
              </div>
            </div>
          </div>

          {/* EMPLOYMENT DETAILS */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={16} className="text-primary" /> Career Status
            </h4>
            {record.status !== 'Unemployed' ? (
              <div className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl p-5 text-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">Job Title</p>
                    <p className="font-bold text-foreground mt-0.5">{record.currentPosition}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">Organization / Employer</p>
                    <p className="font-bold text-foreground mt-0.5">{record.currentCompany}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">Company Sector</p>
                    <p className="font-bold text-foreground mt-0.5">{record.employerType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-emerald-500/10 pt-3">
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">Job Engagement Type</p>
                    <span className="inline-block mt-1 font-bold text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">
                      {record.employmentStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">Length of Service</p>
                    <p className="font-bold text-foreground mt-0.5">{record.lengthOfService}</p>
                  </div>
                </div>

                {record.employerAddress && (
                  <div className="border-t border-emerald-500/10 pt-3">
                    <p className="text-xs text-emerald-700 font-semibold">Employer Worksite Address</p>
                    <p className="font-semibold text-foreground mt-0.5">{record.employerAddress}</p>
                  </div>
                )}

                {record.jobDescription && (
                  <div className="border-t border-emerald-500/10 pt-3">
                    <p className="text-xs text-emerald-700 font-semibold">Primary Duties / Description</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{record.jobDescription}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-5 text-sm italic text-amber-800">
                This alumni is currently seeking professional employment opportunity and actively building career skills.
              </div>
            )}
          </div>

          {/* SUGGESTIONS & FEEDBACK */}
          {record.suggestions && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                <HelpCircle size={16} className="text-primary" /> Suggestions for OMSC
              </h4>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-sm">
                <p className="italic text-foreground leading-relaxed">
                  "{record.suggestions}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Close */}
        <button
          onClick={onClose}
          className="mt-8 w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-all text-sm shadow-md"
        >
          Close Profile details
        </button>
      </div>
    </div>
  );
}

