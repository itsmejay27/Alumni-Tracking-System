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
} from 'lucide-react';
import { toast } from 'sonner';

import { CurrentUser } from '../App';
import { AlumniRecord, Course, EmploymentEntry, fetchMyRecord, saveMyRecord, currentJob } from '@/lib/alumni';
import { PROGRAMS, EMPLOYMENT_STATUSES, JOB_LEVELS, EMPLOYER_TYPES } from '@/lib/programs';
import { LoadingState } from './DataState';

interface AlumniProfileProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => Promise<void> | void;
}

const THIS_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);
const PAGE_SIZE = 3;

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
        if (rec.sex) setSex(rec.sex);
        setDateOfBirth((v) => v || rec.dateOfBirth);
        if (rec.civilStatus) setCivilStatus(rec.civilStatus);
        setMobileNo((v) => v || rec.mobileNo);
        setFacebookName((v) => v || rec.facebookName);
        setPresentAddress((v) => v || rec.presentAddress);
        setPermanentAddress((v) => v || rec.permanentAddress);
        setIsIP(!!rec.isIP);
        setIpGroup(rec.ipGroup || '');
        setCourse(rec.course);
        if (rec.yearGraduated) setYearGraduated(rec.yearGraduated);
        setStatus(rec.status || 'Employed');
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
  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const shown = ordered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const updateEntry = (id: string, patch: Partial<EmploymentEntry>) =>
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const addEntry = () => {
    // Adding a new job closes the previous current job, so history is kept instead of replaced
    const month = new Date().toISOString().slice(0, 7);
    setHistory((h) => [...h.map((e) => (!e.endDate && savedIds.has(e.id) ? { ...e, endDate: month } : e)), newEntry()]);
    setPage(0);
    if (status === 'Unemployed') setStatus('Employed');
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
    const latest = [...history].reverse().find((h) => !h.endDate);
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
        status,
        employmentHistory: history.map((h) => ({ ...h, position: h.position.trim(), company: h.company.trim() })),
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
      setSavedIds(new Set(history.map((h) => h.id)));
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
            <Field label="Date of birth *"><input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={input} /></Field>
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

        {/* EMPLOYMENT */}
        <Section
          icon={<Briefcase size={18} />}
          title="Employment"
          action={
            <button type="button" onClick={addEntry} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              <Plus size={16} /> Add job
            </button>
          }
        >
          <Field label="Current status *">
            <div className="flex flex-wrap gap-2">
              {(['Employed', 'Self-Employed', 'Unemployed'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="space-y-1">
            <p className="text-sm font-medium">Employment history</p>
            <p className="text-xs text-muted-foreground">
              Click "Add job" whenever your job changes. Earlier jobs are kept for the tracer history instead of being replaced.
            </p>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No jobs recorded yet. {status !== 'Unemployed' && 'Click "Add job" to add your current job.'}
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map((entry) => {
                const locked = savedIds.has(entry.id);
                return (
                  <div key={entry.id} className="rounded-xl bg-muted/40 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${entry.endDate ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {entry.endDate ? 'Previous job' : 'Current job'}
                        </span>
                        {entry.recordedAt && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            recorded {new Date(entry.recordedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {!locked && (
                        <button type="button" onClick={() => setHistory((h) => h.filter((x) => x.id !== entry.id))} className="p-1.5 rounded-lg text-muted-foreground hover:bg-card" aria-label="Remove this job">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {locked && (
                      <p className="text-xs text-muted-foreground -mt-2">Saved jobs are kept as history. You can only set when it ended.</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Position / job title *"><input value={entry.position} onChange={(e) => updateEntry(entry.id, { position: e.target.value })} disabled={locked} className={input} /></Field>
                      <Field label="Company / agency *"><input value={entry.company} onChange={(e) => updateEntry(entry.id, { company: e.target.value })} disabled={locked} className={input} /></Field>
                      <Field label="Employment status *">
                        <select value={entry.employmentStatus} onChange={(e) => updateEntry(entry.id, { employmentStatus: e.target.value })} disabled={locked} className={input}>
                          {EMPLOYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Job level *">
                        <select value={entry.jobLevel} onChange={(e) => updateEntry(entry.id, { jobLevel: e.target.value })} disabled={locked} className={input}>
                          {JOB_LEVELS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Employer type *">
                        <select value={entry.employerType} onChange={(e) => updateEntry(entry.id, { employerType: e.target.value })} disabled={locked} className={input}>
                          {EMPLOYER_TYPES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Employer address"><input value={entry.employerAddress || ''} onChange={(e) => updateEntry(entry.id, { employerAddress: e.target.value })} disabled={locked} className={input} /></Field>
                      <Field label="Start (month)"><input type="month" value={entry.startDate || ''} onChange={(e) => updateEntry(entry.id, { startDate: e.target.value })} disabled={locked} className={input} /></Field>
                      <Field label="End (month)">
                        <div className="flex gap-2 items-center">
                          <input type="month" value={entry.endDate || ''} onChange={(e) => updateEntry(entry.id, { endDate: e.target.value })} className={input} />
                          {entry.endDate && (
                            <button type="button" onClick={() => updateEntry(entry.id, { endDate: '' })} className="text-xs text-primary whitespace-nowrap hover:underline">
                              Still here
                            </button>
                          )}
                        </div>
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Job description">
                          <textarea rows={2} value={entry.jobDescription || ''} onChange={(e) => updateEntry(entry.id, { jobDescription: e.target.value })} disabled={locked} className={`${input} resize-none`} />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {page + 1} of {pages} · {history.length} jobs
                  </span>
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
        </Section>

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
