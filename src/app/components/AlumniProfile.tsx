import React, { useEffect, useState } from 'react';
import {
  User,
  Briefcase,
  GraduationCap,
  Save,
  ImageIcon,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  X,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { CurrentUser } from '../App';
import { AlumniRecord, Course, EmploymentEntry, fetchMyRecord, saveMyRecord, currentJob, ageFrom } from '@/lib/alumni';
import { PROGRAMS, EMPLOYMENT_STATUSES, JOB_LEVELS, EMPLOYER_TYPES, JOB_LEVEL_HELP } from '@/lib/programs';
import { LoadingState } from './DataState';

interface AlumniProfileProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => Promise<void> | void;
}

const THIS_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);
const PAGE_SIZE = 5;

const input =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm disabled:opacity-70 disabled:cursor-not-allowed';
const labelCls = 'block text-sm font-medium text-foreground mb-1.5';

const newEntry = (): EmploymentEntry => ({
  id: crypto.randomUUID(),
  position: '',
  company: '',
  employerType: 'Private',
  employmentStatus: 'Permanent',
  jobLevel: 'Rank and File',
  employerAddress: '',
  jobDescription: '',
  startDate: '',
  endDate: '',
  recordedAt: new Date().toISOString(),
});

export function AlumniProfile({ currentUser, onUpdateProfile }: AlumniProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [record, setRecord] = useState<AlumniRecord | null>(null);

  // Personal
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [givenName, setGivenName] = useState(currentUser?.givenName || '');
  const [middleName, setMiddleName] = useState(currentUser?.middleName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [sex, setSex] = useState<'Male' | 'Female'>(currentUser?.sex || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || '');
  const [civilStatus, setCivilStatus] = useState<CurrentUser['civilStatus']>(currentUser?.civilStatus || 'Single');
  const [mobileNo, setMobileNo] = useState(currentUser?.mobileNo || '');
  const [facebookName, setFacebookName] = useState(currentUser?.facebookName || '');
  const [presentAddress, setPresentAddress] = useState(currentUser?.presentAddress || '');
  const [permanentAddress, setPermanentAddress] = useState(currentUser?.permanentAddress || '');
  const [isIP, setIsIP] = useState(false);
  const [ipGroup, setIpGroup] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherContact, setFatherContact] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherContact, setMotherContact] = useState('');

  // Education
  const [course, setCourse] = useState<Course>('BSIT');
  const [yearGraduated, setYearGraduated] = useState<number>(THIS_YEAR);

  // Employment
  const [status, setStatus] = useState<'Employed' | 'Self-Employed' | 'Unemployed'>('Employed');
  const [history, setHistory] = useState<EmploymentEntry[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const [suggestions, setSuggestions] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    fetchMyRecord(currentUser.id)
      .then((rec) => {
        if (cancelled || !rec) return;
        setRecord(rec);
        setGivenName((v) => v || rec.givenName);
        setMiddleName((v) => v || rec.middleName);
        setLastName((v) => v || rec.lastName);
        if (rec.sex) setSex(rec.sex as 'Male' | 'Female');
        setDateOfBirth((v) => v || rec.dateOfBirth);
        if (rec.civilStatus) setCivilStatus(rec.civilStatus);
        setMobileNo((v) => v || rec.mobileNo);
        setFacebookName((v) => v || rec.facebookName);
        setPresentAddress((v) => v || rec.presentAddress);
        setPermanentAddress((v) => v || rec.permanentAddress);
        setIsIP(!!rec.isIP);
        setIpGroup(rec.ipGroup || '');
        setFatherName(rec.fatherName || '');
        setFatherContact(rec.fatherContact || '');
        setMotherName(rec.motherName || '');
        setMotherContact(rec.motherContact || '');
        setCourse(rec.course);
        if (rec.yearGraduated) setYearGraduated(rec.yearGraduated);
        setStatus(rec.status && rec.status !== 'Not Tracked' ? rec.status : 'Employed');
        // Older imported records only had one job: turn it into the first history entry
        let h = rec.employmentHistory || [];
        if (!h.length) {
          const legacy = currentJob(rec);
          if (legacy) h = [{ ...legacy, id: crypto.randomUUID(), recordedAt: rec.lastUpdated || '' }];
        }
        setHistory(h);
        setSavedIds(new Set(h.map((e) => e.id)));
        setSuggestions(rec.suggestions || '');
        setIsPublic(rec.isPublic ?? true);
      })
      .catch((err) => toast.error(`Could not load your record: ${err.message}`))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Newest first for display
  const ordered = [...history].reverse();
  const currentJobs = ordered.filter((e) => !e.endDate);
  const previousJobs = ordered.filter((e) => e.endDate);
  const pages = Math.max(1, Math.ceil(previousJobs.length / PAGE_SIZE));
  const shownPrevious = previousJobs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const [employmentOpen, setEmploymentOpen] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [jobModal, setJobModal] = useState<{ entry: EmploymentEntry; isNew: boolean } | null>(null);

  const openNewJob = () => setJobModal({ entry: newEntry(), isNew: true });

  const saveJob = (entry: EmploymentEntry, isNew: boolean) => {
    if (isNew) {
      // A new job closes the previous current job, so history is kept instead of replaced
      const month = new Date().toISOString().slice(0, 7);
      setHistory((h) => [...h.map((e) => (!e.endDate && !entry.endDate ? { ...e, endDate: e.endDate || month } : e)), entry]);
      if (status === 'Unemployed' && !entry.endDate) setStatus('Employed');
    } else {
      setHistory((h) => h.map((e) => (e.id === entry.id ? entry : e)));
    }
    setJobModal(null);
    setEmploymentOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const hasCurrentJob = history.some((h) => !h.endDate);
    if (status !== 'Unemployed' && !hasCurrentJob) {
      toast.error('Add your current job under Employment History, or set your status to Unemployed');
      return;
    }
    if (history.some((h) => !h.position.trim() || !h.company.trim())) {
      toast.error('Each job needs a position and a company');
      return;
    }

    setSaving(true);
    // Marking yourself unemployed ends your current job(s); they stay in your history
    const month = new Date().toISOString().slice(0, 7);
    const finalHistory = status === 'Unemployed' ? history.map((h) => (h.endDate ? h : { ...h, endDate: month })) : history;
    const latest = [...finalHistory].reverse().find((h) => !h.endDate);
    const updatedUser: CurrentUser = {
      ...currentUser,
      givenName: givenName.trim().toUpperCase(),
      middleName: middleName.trim().toUpperCase(),
      lastName: lastName.trim().toUpperCase(),
      mobileNo: mobileNo.trim(),
      presentAddress: presentAddress.trim(),
      permanentAddress: permanentAddress.trim(),
      sex,
      civilStatus,
      dateOfBirth,
      facebookName: facebookName.trim(),
      avatarUrl,
    };
    const employed = status !== 'Unemployed' && latest;

    try {
      const id = await saveMyRecord(currentUser.id, {
        id: record?.id,
        studentId: record?.studentId || '',
        givenName: updatedUser.givenName,
        middleName: updatedUser.middleName,
        lastName: updatedUser.lastName,
        email: currentUser.email,
        course,
        yearGraduated,
        batch: `${yearGraduated - 1}-${yearGraduated}`,
        sex,
        dateOfBirth,
        civilStatus,
        mobileNo: updatedUser.mobileNo,
        facebookName: updatedUser.facebookName,
        presentAddress: updatedUser.presentAddress,
        permanentAddress: updatedUser.permanentAddress,
        isIP,
        ipGroup: isIP ? ipGroup.trim() : '',
        fatherName: fatherName.trim().toUpperCase(),
        fatherContact: fatherContact.trim(),
        motherName: motherName.trim().toUpperCase(),
        motherContact: motherContact.trim(),
        status,
        employmentHistory: finalHistory.map((h) => ({ ...h, position: h.position.trim(), company: h.company.trim() })),
        // Current-job summary fields kept for reports and older screens
        currentPosition: employed ? latest!.position : undefined,
        currentCompany: employed ? latest!.company : undefined,
        employerType: employed ? (latest!.employerType as any) : undefined,
        employerAddress: employed ? latest!.employerAddress : undefined,
        jobDescription: employed ? latest!.jobDescription : undefined,
        jobLevel: employed ? latest!.jobLevel : undefined,
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        suggestions: suggestions.trim(),
        isPublic,
      });
      await onUpdateProfile(updatedUser);
      setRecord((r) => ({ ...(r as AlumniRecord), id }));
      setHistory(finalHistory);
      setSavedIds(new Set(finalHistory.map((h) => h.id)));
      setSaved(true);
      toast.success('Your alumni profile has been saved');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSaved(false), 5000);
    } catch (err: any) {
      toast.error(`Could not save: ${err.message}`);
    }
    setSaving(false);
  };

  if (loading) return <LoadingState label="Loading your profile..." />;

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Alumni Profile</h2>
        <p className="text-muted-foreground text-sm mt-1">Keep your details and employment history up to date for the OMSU graduate tracer study.</p>
      </div>

      {saved && (
        <div className="bg-emerald-50 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
          <p className="text-sm text-emerald-800">Saved. Your program chair can now see your updated record.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PERSONAL */}
        <Section icon={<User size={18} />} title="Personal information">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <ImageIcon className="text-muted-foreground/60" size={30} />}
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold cursor-pointer hover:bg-primary/15">
                  <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} /> Remove photo
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG or JPG, up to 2 MB. Removing it deletes it from your record when you save.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="First name *"><input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={input} /></Field>
            <Field label="Middle name"><input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={input} /></Field>
            <Field label="Last name *"><input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} /></Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Email"><input readOnly value={currentUser?.email || ''} className={`${input} bg-muted text-muted-foreground`} /></Field>
            <Field label="Mobile number *"><input required value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} className={input} placeholder="09XXXXXXXXX" /></Field>
            <Field label="Facebook name"><input value={facebookName} onChange={(e) => setFacebookName(e.target.value)} className={input} /></Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Sex *">
              <select value={sex} onChange={(e) => setSex(e.target.value as any)} className={input}>
                <option>Female</option>
                <option>Male</option>
              </select>
            </Field>
            <Field label={`Date of birth *${ageFrom(dateOfBirth) != null ? ` · Age ${ageFrom(dateOfBirth)}` : ''}`}><input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={input} /></Field>
            <Field label="Civil status *">
              <select value={civilStatus} onChange={(e) => setCivilStatus(e.target.value as any)} className={input}>
                <option>Single</option>
                <option>Married</option>
                <option>Separated</option>
                <option>Widowed</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Present address *"><input required value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} className={input} /></Field>
            <Field label="Permanent address *"><input required value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className={input} /></Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Father's name"><input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className={input} placeholder="Full name" /></Field>
            <Field label="Father's contact number"><input value={fatherContact} onChange={(e) => setFatherContact(e.target.value)} className={input} placeholder="09XXXXXXXXX" inputMode="tel" /></Field>
            <Field label="Mother's name"><input value={motherName} onChange={(e) => setMotherName(e.target.value)} className={input} placeholder="Full maiden name" /></Field>
            <Field label="Mother's contact number"><input value={motherContact} onChange={(e) => setMotherContact(e.target.value)} className={input} placeholder="09XXXXXXXXX" inputMode="tel" /></Field>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">Are you a member of an Indigenous Peoples (IP) group?</p>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={!isIP} onChange={() => setIsIP(false)} /> No</label>
              <label className="flex items-center gap-2"><input type="radio" checked={isIP} onChange={() => setIsIP(true)} /> Yes</label>
            </div>
            {isIP && (
              <input value={ipGroup} onChange={(e) => setIpGroup(e.target.value)} placeholder="IP group (e.g. Mangyan – Iraya)" className={input} />
            )}
          </div>
        </Section>

        {/* EDUCATION */}
        <Section icon={<GraduationCap size={18} />} title="Education">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            <Field label="Program *">
              <select value={course} onChange={(e) => setCourse(e.target.value as Course)} className={input}>
                {PROGRAMS.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} – {p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Year graduated *">
              <select value={yearGraduated} onChange={(e) => setYearGraduated(Number(e.target.value))} className={input}>
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* EMPLOYMENT (collapsed to a one-line summary until opened) */}
        <section className="bg-card rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setEmploymentOpen((v) => !v)}
            aria-expanded={employmentOpen}
            className="w-full flex items-center justify-between gap-3 p-5 sm:p-6 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Briefcase size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base">Employment</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {status}
                  {currentJobs[0] && ` · ${currentJobs[0].position || 'Position'} at ${currentJobs[0].company || 'Company'}`}
                  {previousJobs.length > 0 && ` · ${previousJobs.length} previous job${previousJobs.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary shrink-0">
              {employmentOpen ? 'Hide' : 'Show'}
              <ChevronDown size={16} className={`transition-transform ${employmentOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {employmentOpen && (
            <div className="px-5 sm:px-6 pb-6 space-y-5 border-t border-border/60 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium mr-1">Current status:</span>
                  {(['Employed', 'Self-Employed', 'Unemployed'] as const).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        status === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                {status !== 'Unemployed' && (
                  <button type="button" onClick={openNewJob} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                    <Plus size={16} /> Add job
                  </button>
                )}
              </div>

              {/* Current job(s) */}
              {status === 'Unemployed' ? (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  You're marked as <strong>unemployed</strong>, so no job details are needed.
                  {currentJobs.length > 0 && ' When you save, your current job will move to your previous jobs.'} If you find work, choose
                  Employed or Self-Employed and add the job.
                </p>
              ) : currentJobs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  No current job recorded. {status !== 'Unemployed' && 'Click "Add job" to add it.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {currentJobs.map((j) => (
                    <JobRow key={j.id} job={j} onOpen={() => setJobModal({ entry: j, isNew: false })} />
                  ))}
                </div>
              )}

              {/* Previous jobs, hidden until asked for */}
              {previousJobs.length > 0 && (
                <div>
                  <button type="button" onClick={() => setShowPrevious((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    <ChevronDown size={16} className={`transition-transform ${showPrevious ? 'rotate-180' : ''}`} />
                    {showPrevious ? 'Hide' : 'Show'} previous jobs ({previousJobs.length})
                  </button>
                  {showPrevious && (
                    <div className="mt-3 space-y-2">
                      {shownPrevious.map((j) => (
                        <JobRow key={j.id} job={j} onOpen={() => setJobModal({ entry: j, isNew: false })} />
                      ))}
                      {pages > 1 && (
                        <div className="flex items-center justify-between text-sm pt-1">
                          <span className="text-muted-foreground">Page {page + 1} of {pages}</span>
                          <div className="flex gap-2">
                            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted disabled:opacity-40">
                              <ChevronLeft size={15} /> Newer
                            </button>
                            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted disabled:opacity-40">
                              Older <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Saved jobs are kept as your employment history. Remember to click "Save profile" below.</p>
            </div>
          )}
        </section>

        {jobModal && (
          <JobModal
            entry={jobModal.entry}
            isNew={jobModal.isNew}
            locked={savedIds.has(jobModal.entry.id)}
            onClose={() => setJobModal(null)}
            onSave={(e) => saveJob(e, jobModal.isNew)}
            onRemove={
              !jobModal.isNew && !savedIds.has(jobModal.entry.id)
                ? () => {
                    setHistory((h) => h.filter((x) => x.id !== jobModal.entry.id));
                    setJobModal(null);
                  }
                : undefined
            }
          />
        )}

        {/* PRIVACY + FEEDBACK */}
        <Section icon={<ShieldCheck size={18} />} title="Privacy">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1 w-4 h-4" />
            <span className="text-sm">
              <span className="font-medium block">Let other OMSU alumni find me</span>
              <span className="text-muted-foreground text-xs">Only your name, program, batch and current position are shown. Addresses, birth date and civil status are never shown.</span>
            </span>
          </label>
        </Section>

        <Section icon={<HelpCircle size={18} />} title="Suggestions & feedback">
          <textarea
            rows={3}
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            className={`${input} resize-none`}
            placeholder="How can OMSU improve its programs or this tracer study?"
          />
        </Section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
            <Save size={18} /> {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

function JobRow({ job, onOpen }: { job: EmploymentEntry; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full flex items-center justify-between gap-3 rounded-xl bg-muted/50 hover:bg-muted px-4 py-3 text-left">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">
          {job.position || 'Position not set'} <span className="font-normal text-muted-foreground">at {job.company || '—'}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {[job.employmentStatus, job.employerType, job.jobLevel].filter(Boolean).join(' · ')}
          {job.startDate && job.endDate && ` · ${job.startDate} – ${job.endDate}`}
          {job.startDate && !job.endDate && ` · since ${job.startDate}`}
          {!job.startDate && job.endDate && ` · until ${job.endDate}`}
        </p>
      </div>
      <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${job.endDate ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
        {job.endDate ? 'Previous' : 'Current'}
      </span>
    </button>
  );
}

/** Add or view one job. Saved jobs are history: only their end month can change. */
function JobModal({
  entry,
  isNew,
  locked,
  onClose,
  onSave,
  onRemove,
}: {
  entry: EmploymentEntry;
  isNew: boolean;
  locked: boolean;
  onClose: () => void;
  onSave: (e: EmploymentEntry) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState<EmploymentEntry>(entry);
  const set = (patch: Partial<EmploymentEntry>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    if (!draft.position.trim() || !draft.company.trim()) {
      toast.error('Enter the position and the company');
      return;
    }
    onSave({ ...draft, position: draft.position.trim(), company: draft.company.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Job details">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">{isNew ? 'Add job' : locked ? 'Job details' : 'Edit job'}</h3>
            {locked && <p className="text-xs text-muted-foreground mt-0.5">Saved jobs are kept as history and can't be edited.</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Position / job title *"><input autoFocus={!locked} disabled={locked} value={draft.position} onChange={(e) => set({ position: e.target.value })} className={input} /></Field>
          <Field label="Company / agency *"><input disabled={locked} value={draft.company} onChange={(e) => set({ company: e.target.value })} className={input} /></Field>
          <Field label="Employment status *">
            <select disabled={locked} value={draft.employmentStatus} onChange={(e) => set({ employmentStatus: e.target.value })} className={input}>
              {EMPLOYMENT_STATUSES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Job level *">
            <select disabled={locked} value={draft.jobLevel} onChange={(e) => set({ jobLevel: e.target.value })} className={input}>
              {JOB_LEVELS.map((x) => <option key={x}>{x}</option>)}
            </select>
            {JOB_LEVEL_HELP[draft.jobLevel] && <p className="text-xs text-muted-foreground mt-1">{JOB_LEVEL_HELP[draft.jobLevel]}</p>}
          </Field>
          <Field label="Employer type *">
            <select disabled={locked} value={draft.employerType} onChange={(e) => set({ employerType: e.target.value })} className={input}>
              {EMPLOYER_TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Employer address"><input disabled={locked} value={draft.employerAddress || ''} onChange={(e) => set({ employerAddress: e.target.value })} className={input} /></Field>
          <div className="md:col-span-2">
            <Field label="Job description">
              <textarea rows={3} disabled={locked} value={draft.jobDescription || ''} onChange={(e) => set({ jobDescription: e.target.value })} className={`${input} resize-none`} />
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {onRemove && (
              <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
                <Trash2 size={15} /> Remove
              </button>
            )}
            {!isNew && !entry.endDate && (
              <button
                type="button"
                onClick={() => onSave({ ...draft, endDate: new Date().toISOString().slice(0, 7) })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                I no longer work here
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-muted">Cancel</button>
            <button type="button" onClick={submit} className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground">
              {isNew ? 'Add job' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
