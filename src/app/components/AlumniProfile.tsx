import React, { useEffect, useState } from 'react';
import { RequiredLabel } from './RequiredMark';
import { useT } from '@/lib/preferences';
import {
  Save,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  ChevronDown,
  Camera,
  FileText,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

import { CurrentUser } from '../App';
import { AlumniRecord, Course, EmploymentEntry, fetchMyRecord, saveMyRecord, currentJob, ageFrom } from '@/lib/alumni';
import { PROGRAMS, EMPLOYMENT_STATUSES, EMPLOYER_TYPES, programName } from '@/lib/programs';
import { LoadingState } from './DataState';
import { PhoneInput, isValidMobile } from './PhoneInput';

interface AlumniProfileProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => Promise<void> | void;
  /** Called after a section is saved */
  onSaved?: () => void;
  /** New graduates must finish these before using the rest of the system */
  gate?: { missing: string[]; needsSave: boolean } | null;
}

const THIS_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);
const PAGE_SIZE = 5;
// Graduates are at least 15 years old
const MAX_BIRTH_DATE = `${THIS_YEAR - 15}-12-31`;

const input =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm disabled:opacity-70 disabled:cursor-not-allowed';
const labelCls = 'block text-sm font-medium text-foreground mb-1.5';

const newEntry = (): EmploymentEntry => ({
  id: crypto.randomUUID(),
  position: '',
  company: '',
  employerType: 'Private',
  employmentStatus: 'Permanent',
  employerAddress: '',
  jobDescription: '',
  startDate: '',
  endDate: '',
  recordedAt: new Date().toISOString(),
});

export function AlumniProfile({ currentUser, onUpdateProfile, onSaved, gate }: AlumniProfileProps) {
  const t = useT();
  const [loading, setLoading] = useState(true);
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
  const [twitter, setTwitter] = useState('');
  const [otherSocialNetwork, setOtherSocialNetwork] = useState('');
  const [otherSocialId, setOtherSocialId] = useState('');
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
  const [campus, setCampus] = useState('');
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
        setTwitter(rec.twitter || '');
        setOtherSocialNetwork(rec.otherSocialNetwork || '');
        setOtherSocialId(rec.otherSocialId || '');
        setCampus(rec.campus || '');
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
      toast.error(t('Image must be 2 MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => savePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Newest first for display
  const ordered = [...history].reverse();
  const currentJobs = ordered.filter((e) => !e.endDate);
  const previousJobs = ordered.filter((e) => e.endDate);
  const pages = Math.max(1, Math.ceil(previousJobs.length / PAGE_SIZE));
  const shownPrevious = previousJobs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
  };

  // ---- Saving, one section at a time ----
  type SectionId = 'personal' | 'education' | 'employment' | 'feedback';
  const [tab, setTab] = useState<SectionId>('personal');
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);

  const personalSlice = () => ({
    givenName: givenName.trim().toUpperCase(),
    middleName: middleName.trim().toUpperCase(),
    lastName: lastName.trim().toUpperCase(),
    sex,
    dateOfBirth,
    civilStatus,
    mobileNo: mobileNo.trim(),
    facebookName: facebookName.trim(),
    twitter: twitter.trim(),
    otherSocialNetwork: otherSocialNetwork.trim(),
    otherSocialId: otherSocialId.trim(),
    presentAddress: presentAddress.trim(),
    permanentAddress: permanentAddress.trim(),
    fatherName: fatherName.trim().toUpperCase(),
    fatherContact: fatherContact.trim(),
    motherName: motherName.trim().toUpperCase(),
    motherContact: motherContact.trim(),
  });
  const educationSlice = () => ({ course, yearGraduated, batch: `${yearGraduated - 1}-${yearGraduated}`, campus: campus.trim() });
  const employmentSlice = () => {
    // Marking yourself unemployed ends your current job(s); they stay in your history
    const month = new Date().toISOString().slice(0, 7);
    const finalHistory = (status === 'Unemployed' ? history.map((h) => (h.endDate ? h : { ...h, endDate: month })) : history).map((h) => ({
      ...h,
      position: h.position.trim(),
      company: h.company.trim(),
    }));
    const latest = [...finalHistory].reverse().find((h) => !h.endDate);
    const employed = status !== 'Unemployed' && latest;
    return {
      status,
      employmentHistory: finalHistory,
      // Current-job summary fields kept for reports and older screens
      currentPosition: employed ? latest!.position : undefined,
      currentCompany: employed ? latest!.company : undefined,
      employerType: employed ? (latest!.employerType as any) : undefined,
      employerAddress: employed ? latest!.employerAddress : undefined,
      employerContact: employed ? latest!.employerContact : undefined,
      lengthOfService: employed ? latest!.lengthOfService : undefined,
      jobDescription: employed ? latest!.jobDescription : undefined,
    };
  };
  const feedbackSlice = () => ({ suggestions: suggestions.trim(), isPublic });

  // Which sections have changes that are not saved yet (compared with what was loaded or last saved)
  const snapshot = (section: SectionId) =>
    JSON.stringify(
      section === 'personal'
        ? personalSlice()
        : section === 'education'
          ? educationSlice()
          : section === 'employment'
            ? [status, history]
            : feedbackSlice(),
    );
  const [baseline, setBaseline] = useState<Record<SectionId, string> | null>(null);
  useEffect(() => {
    if (!loading && !baseline) {
      setBaseline({ personal: snapshot('personal'), education: snapshot('education'), employment: snapshot('employment'), feedback: snapshot('feedback') });
    }
  });
  const dirty = Object.fromEntries(
    (['personal', 'education', 'employment', 'feedback'] as SectionId[]).map((sct) => [sct, !!baseline && snapshot(sct) !== baseline[sct]]),
  ) as Record<SectionId, boolean>;

  const validate = (section: SectionId): string | null => {
    if (section === 'personal') {
      if (!givenName.trim() || !lastName.trim()) return 'First and last name are required';
      if (!isValidMobile(mobileNo)) return 'Enter an 11-digit mobile number starting with 09';
      if (!fatherName.trim() || !motherName.trim()) return "Enter your father's and mother's names";
      for (const [label, v] of [["Father's", fatherContact], ["Mother's", motherContact]] as const) {
        if (!isValidMobile(v)) return `${label} contact number must be 11 digits starting with 09`;
      }
      const age = ageFrom(dateOfBirth);
      if (age == null || age < 15) return 'Please enter your correct date of birth';
      if (!presentAddress.trim() || !permanentAddress.trim()) return 'Enter your present and permanent address';
    }
    if (section === 'employment') {
      if (status !== 'Unemployed' && !history.some((h) => !h.endDate)) return 'Add your current job, or choose Unemployed';
      if (history.some((h) => !h.position.trim() || !h.company.trim())) return 'Each job needs a position and a company';
      if (status !== 'Unemployed' && history.some((h) => !h.endDate && !h.proofPath))
        return 'Attach a proof of employment (contract, company ID or business permit) to your current job';
    }
    return null;
  };

  // ---- Unsaved answers survive a page refresh (kept on this device until saved) ----
  const draftKey = currentUser ? `omsu-profile-draft:${currentUser.id}` : '';
  const draftState = {
    givenName, middleName, lastName, sex, dateOfBirth, civilStatus, mobileNo, facebookName, twitter,
    otherSocialNetwork, otherSocialId, presentAddress, permanentAddress, fatherName, fatherContact,
    motherName, motherContact, course, campus, yearGraduated, status, history, suggestions, isPublic,
  };
  const [draftReady, setDraftReady] = useState(false);
  // Restore once, right after the saved record has loaded
  useEffect(() => {
    if (loading || draftReady || !draftKey) return;
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (d && typeof d === 'object') {
        const v = d.values || {};
        if ('givenName' in v) setGivenName(v.givenName);
        if ('middleName' in v) setMiddleName(v.middleName);
        if ('lastName' in v) setLastName(v.lastName);
        if (v.sex) setSex(v.sex);
        if ('dateOfBirth' in v) setDateOfBirth(v.dateOfBirth);
        if (v.civilStatus) setCivilStatus(v.civilStatus);
        if ('mobileNo' in v) setMobileNo(v.mobileNo);
        if ('facebookName' in v) setFacebookName(v.facebookName);
        if ('twitter' in v) setTwitter(v.twitter);
        if ('otherSocialNetwork' in v) setOtherSocialNetwork(v.otherSocialNetwork);
        if ('otherSocialId' in v) setOtherSocialId(v.otherSocialId);
        if ('presentAddress' in v) setPresentAddress(v.presentAddress);
        if ('permanentAddress' in v) setPermanentAddress(v.permanentAddress);
        if ('fatherName' in v) setFatherName(v.fatherName);
        if ('fatherContact' in v) setFatherContact(v.fatherContact);
        if ('motherName' in v) setMotherName(v.motherName);
        if ('motherContact' in v) setMotherContact(v.motherContact);
        if (v.course) setCourse(v.course);
        if ('campus' in v) setCampus(v.campus);
        if (v.yearGraduated) setYearGraduated(v.yearGraduated);
        if (v.status) setStatus(v.status);
        if (Array.isArray(v.history)) setHistory(v.history);
        if ('suggestions' in v) setSuggestions(v.suggestions);
        if ('isPublic' in v) setIsPublic(v.isPublic);
        if (d.tab) setTab(d.tab);
      }
    } catch {
      /* no draft, or storage blocked */
    }
    setDraftReady(true);
  }, [loading, draftReady, draftKey]);
  // Keep the draft up to date while typing
  useEffect(() => {
    if (!draftReady || !draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ values: draftState, tab }));
    } catch {
      /* storage full or blocked */
    }
  }, [draftReady, draftKey, tab, JSON.stringify(draftState)]);
  const clearDraft = () => {
    try {
      if (draftKey) localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  /** Saves the whole profile at once (one save = one entry in the record history). */
  const saveAll = async () => {
    if (!currentUser) return;
    const sections: SectionId[] = ['personal', 'education', 'employment', 'feedback'];
    for (const sct of sections) {
      const problem = validate(sct);
      if (problem) {
        setTab(sct);
        toast.error(t(problem));
        return;
      }
    }
    const patch = Object.assign(
      {},
      ...sections.map((sct) =>
        sct === 'personal' ? personalSlice() : sct === 'education' ? educationSlice() : sct === 'employment' ? employmentSlice() : feedbackSlice(),
      ),
    );
    const { id: _id, name: _name, ...base } = (record || {}) as AlumniRecord;
    const next = {
      ...base,
      ...patch,
      id: record?.id,
      email: currentUser.email,
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      // Counts as a response in Analytics
      respondedAt: new Date().toISOString(),
    } as Parameters<typeof saveMyRecord>[1];

    setSavingSection('feedback');
    try {
      const id = await saveMyRecord(currentUser.id, next);
      if (sections.includes('personal')) {
        const p = personalSlice();
        await onUpdateProfile({ ...currentUser, ...p, avatarUrl });
      }
      setRecord({ ...(next as AlumniRecord), id });
      if (sections.includes('employment')) {
        setHistory(next.employmentHistory || []);
        setSavedIds(new Set((next.employmentHistory || []).map((h) => h.id)));
      }
      // Employment history may have changed (unemployed closes current jobs), so snapshot what was saved
      setBaseline((bl) => {
        const nextBl = { ...(bl as Record<SectionId, string>) };
        for (const sct of sections) nextBl[sct] = sct === 'employment' ? JSON.stringify([status, next.employmentHistory || []]) : snapshot(sct);
        return nextBl;
      });
      toast.success(t('Your alumni profile has been saved'));
      clearDraft();
      onSaved?.();
    } catch (err: any) {
      toast.error(`Could not save: ${err.message}`);
    }
    setSavingSection(null);
  };

  // The photo is saved as soon as it is chosen or removed
  const savePhoto = async (url: string) => {
    if (!currentUser) return;
    setAvatarUrl(url);
    try {
      await onUpdateProfile({ ...currentUser, avatarUrl: url });
      toast.success(url ? t('Photo updated') : t('Photo removed'));
    } catch (err: any) {
      toast.error(`Could not save photo: ${err.message}`);
    }
  };


  if (loading) return <LoadingState label={t('Loading your profile...')} />;

  const checks = [
    !!givenName.trim() && !!lastName.trim(),
    isValidMobile(mobileNo),
    (ageFrom(dateOfBirth) ?? 0) >= 15,
    !!presentAddress.trim(),
    !!permanentAddress.trim(),
    !!fatherName.trim() || !!motherName.trim(),
    status === 'Unemployed' || currentJobs.length > 0,
    !!avatarUrl,
  ];
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const initials = `${givenName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'OM';
  const validateSafe = (sct: SectionId) => validate(sct) === null;
  const tabs: { id: SectionId; label: string; saveLabel: string; done: boolean; optional?: boolean }[] = [
    {
      id: 'personal',
      label: 'Personal information',
      saveLabel: 'Save personal information',
      done: validateSafe('personal'),
    },
    { id: 'education', label: 'Education', saveLabel: 'Save education', done: !!course && !!yearGraduated },
    { id: 'employment', label: 'Employment', saveLabel: 'Save employment', done: validateSafe('employment') },
    { id: 'feedback', label: 'Feedback', saveLabel: 'Save', done: !!suggestions.trim(), optional: true },
  ];
  const tabIndex = tabs.findIndex((x) => x.id === tab);
  const anyDirty = Object.values(dirty).some(Boolean);
  /** Moving forward is only allowed when the steps before it have their required answers. */
  const goToTab = (id: SectionId) => {
    const target = tabs.findIndex((x) => x.id === id);
    for (let i = 0; i < target; i++) {
      const problem = validate(tabs[i].id);
      if (problem) {
        setTab(tabs[i].id);
        toast.error(t(problem));
        return;
      }
    }
    setTab(id);
  };
  const displayName = `${givenName} ${middleName ? middleName[0] + '. ' : ''}${lastName}`.trim();

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Profile header */}
      <section className="relative overflow-hidden rounded-2xl bg-[#002060] text-white">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6 p-6 sm:p-8">
          <label className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/20 bg-white/10 overflow-hidden shrink-0 cursor-pointer self-center md:self-auto" title="Change photo">
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-3xl font-black text-[#f5c400]">{initials}</span>
            )}
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={22} />
            </span>
          </label>
          <div className="flex-1 min-w-0 text-center md:text-left space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#f5c400]">{t('My Alumni Profile')}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold truncate">{displayName || 'Your name'}</h2>
            <p className="text-white/80 text-sm">
              {programName(course)} · {t('Class of')} {yearGraduated}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{t(status)}</span>
              {record?.lastUpdated && <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs">{t('Updated')} {record.lastUpdated}</span>}
              {avatarUrl && (
                <button type="button" onClick={() => savePhoto('')} className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/15 px-3 py-1 text-xs">
                  <Trash2 size={12} /> {t('Remove photo')}
                </button>
              )}
            </div>
          </div>
          <div className="md:w-56 shrink-0 rounded-xl bg-white/10 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/80">{t('Profile complete')}</span>
              <span className="text-xl font-extrabold">{completion}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-[#f5c400] transition-all duration-500" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-[11px] text-white/70 mt-2">{completion === 100 ? t('All set. Thank you!') : t('Fill in the remaining details below.')}</p>
          </div>
        </div>
      </section>

      {/* New graduates finish their profile before using the rest of the system */}
      {gate && (gate.missing.length > 0 || gate.needsSave) && (
        <div className="rounded-2xl border-2 border-primary bg-card p-5 space-y-2">
          <p className="font-bold text-base">{t('Welcome! Please complete your profile to continue')}</p>
          <p className="text-sm text-muted-foreground">
            {t('Check the details we have on file, fill in what is missing, and press Save in each section. The rest of OMSU Alumni Track unlocks once your profile is complete.')}
          </p>
          {gate.missing.length > 0 && (
            <p className="text-sm">
              <span className="font-semibold">{t('Still missing')}:</span> {gate.missing.map((m) => t(m)).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* One container: tabs for each part of the tracer form */}
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border [scrollbar-width:none]" role="tablist">
          {tabs.map((tb, i) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => goToTab(tb.id)}
              className={`relative flex-1 min-w-[9.5rem] flex items-center gap-3 px-4 sm:px-5 py-4 text-left transition-colors ${
                tab === tb.id ? 'bg-muted/50' : 'hover:bg-muted/30'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  tab === tb.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tb.done && !dirty[tb.id] ? <CheckCircle2 size={16} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{t(tb.label)}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {dirty[tb.id] ? t('Not saved') : tb.done ? t('Complete') : tb.optional ? t('Optional') : t('Needs your answer')}
                </span>
              </span>
              {!tb.done && !tb.optional && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />}
              {tab === tb.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* PERSONAL */}
          {tab === 'personal' && (
            <>
              <Group title="Name">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="First name *"><input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={input} /></Field>
                  <Field label="Middle name"><input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={input} /></Field>
                  <Field label="Last name *"><input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} /></Field>
                </div>
              </Group>

              <Group title="Personal details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Sex *">
                    <select value={sex} onChange={(e) => setSex(e.target.value as any)} className={input}>
                      <option value="Female">{t('Female')}</option>
                      <option value="Male">{t('Male')}</option>
                    </select>
                  </Field>
                  <Field label="Date of birth *">
                    <input type="date" required min="1940-01-01" max={MAX_BIRTH_DATE} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={input} />
                  </Field>
                  <Field label="Civil status *">
                    <select value={civilStatus} onChange={(e) => setCivilStatus(e.target.value as any)} className={input}>
                      <option value="Single">{t('Single')}</option>
                      <option value="Married">{t('Married')}</option>
                      <option value="Separated">{t('Separated')}</option>
                      <option value="Widowed">{t('Widowed')}</option>
                    </select>
                  </Field>
                </div>
              </Group>

              <Group title="Contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Email"><input readOnly value={currentUser?.email || ''} className={`${input} bg-muted text-muted-foreground`} /></Field>
                  <Field label="Mobile number *"><PhoneInput required value={mobileNo} onChange={setMobileNo} className={input} /></Field>
                </div>
              </Group>

              <Group title="Address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Present address *"><input required value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} className={input} /></Field>
                  <Field label="Permanent address *"><input required value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className={input} /></Field>
                </div>
              </Group>

              <Group title="Social media">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Facebook name"><input value={facebookName} onChange={(e) => setFacebookName(e.target.value)} className={input} /></Field>
                  <Field label="Twitter / X"><input value={twitter} onChange={(e) => setTwitter(e.target.value)} className={input} placeholder="@username" /></Field>
                  <Field label="Other social network"><input value={otherSocialNetwork} onChange={(e) => setOtherSocialNetwork(e.target.value)} className={input} placeholder={t('e.g. Instagram, LinkedIn')} /></Field>
                  <Field label="Other social network ID"><input value={otherSocialId} onChange={(e) => setOtherSocialId(e.target.value)} className={input} placeholder={t('Username or link')} /></Field>
                </div>
              </Group>

              <Group title="Parents">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Father's name *"><input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className={input} placeholder={t('Full name')} /></Field>
                  <Field label="Father's contact number *"><PhoneInput value={fatherContact} onChange={setFatherContact} className={input} /></Field>
                  <Field label="Mother's name *"><input value={motherName} onChange={(e) => setMotherName(e.target.value)} className={input} placeholder={t('Full maiden name')} /></Field>
                  <Field label="Mother's contact number *"><PhoneInput value={motherContact} onChange={setMotherContact} className={input} /></Field>
                </div>
              </Group>
            </>
          )}

          {/* EDUCATION */}
          {tab === 'education' && (
            <Group title="Degree finished from OMSU">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">
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
                      <option key={y} value={y}>{y - 1}-{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Campus"><input value={campus} onChange={(e) => setCampus(e.target.value)} className={input} placeholder={t('e.g. San Jose (Main)')} /></Field>
              </div>
            </Group>
          )}

          {/* EMPLOYMENT */}
          {tab === 'employment' && (
            <>
              <Group title="Current status">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(['Employed', 'Self-Employed', 'Unemployed'] as const).map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setStatus(st)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          status === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'
                        }`}
                      >
                        {t(st)}
                      </button>
                    ))}
                  </div>
                  {status !== 'Unemployed' && (
                    <button type="button" onClick={openNewJob} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
                      <Plus size={16} /> {t('Add job')}
                    </button>
                  )}
                </div>
              </Group>

              <Group title="Current job">
                {status === 'Unemployed' ? (
                  <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    {t("You're marked as unemployed, so no job details are needed.")}
                    {currentJobs.length > 0 && ` ${t('When you save, your current job will move to your previous jobs.')}`}{' '}
                    {t('If you find work, choose Employed or Self-Employed and add the job.')}
                  </p>
                ) : currentJobs.length === 0 ? (
                  <button
                    type="button"
                    onClick={openNewJob}
                    className="w-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:bg-muted/40"
                  >
                    <Plus size={18} className="mx-auto mb-1" />
                    {t('No current job yet. Click here to add it.')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {currentJobs.map((j) => (
                      <JobRow key={j.id} job={j} onOpen={() => setJobModal({ entry: j, isNew: false })} />
                    ))}
                  </div>
                )}
              </Group>

              {previousJobs.length > 0 && (
                <Group title="Previous jobs">
                  <button type="button" onClick={() => setShowPrevious((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    <ChevronDown size={16} className={`transition-transform ${showPrevious ? 'rotate-180' : ''}`} />
                    {showPrevious ? t('Hide previous jobs') : t('Show previous jobs')} ({previousJobs.length})
                  </button>
                  {showPrevious && (
                    <div className="mt-3 space-y-2">
                      {shownPrevious.map((j) => (
                        <JobRow key={j.id} job={j} onOpen={() => setJobModal({ entry: j, isNew: false })} />
                      ))}
                      {pages > 1 && (
                        <div className="flex items-center justify-between text-sm pt-1">
                          <span className="text-muted-foreground">{t('Page {page} of {pages}', { page: page + 1, pages })}</span>
                          <div className="flex gap-2">
                            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted disabled:opacity-40">
                              <ChevronLeft size={15} /> {t('Newer')}
                            </button>
                            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted disabled:opacity-40">
                              {t('Older')} <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Group>
              )}
              <p className="text-xs text-muted-foreground">{t('Saved jobs are kept as your employment history.')}</p>
            </>
          )}

          {/* FEEDBACK */}
          {tab === 'feedback' && (
            <>
              <Group title="Suggestions">
                <Field label="Suggestions & feedback">
                  <textarea
                    rows={4}
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    className={`${input} resize-none`}
                    placeholder={t('How can OMSU improve its programs or this tracer study?')}
                  />
                </Field>
              </Group>
              <Group title="Privacy">
                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border p-4">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1 w-4 h-4" />
                  <span className="text-sm">
                    <span className="font-medium flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary" /> {t('Let other OMSU alumni find me')}</span>
                    <span className="text-muted-foreground text-xs">{t('Only your name, program, batch and current position are shown. Addresses, birth date and civil status are never shown.')}</span>
                  </span>
                </label>
              </Group>
            </>
          )}

          {/* Back / Next between steps; one Save at the end so each save is one history entry */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-5 border-t border-border/60">
            <span className="text-xs sm:mr-auto">
              {anyDirty ? (
                <span className="font-medium text-amber-600">{t('Your answers are kept on this device until you save.')}</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 size={14} /> {t('Saved')}
                </span>
              )}
            </span>
            {tabIndex > 0 && (
              <button
                type="button"
                onClick={() => setTab(tabs[tabIndex - 1].id)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted"
              >
                <ChevronLeft size={16} /> {t('Back')}
              </button>
            )}
            {tabIndex < tabs.length - 1 ? (
              <button
                type="button"
                onClick={() => goToTab(tabs[tabIndex + 1].id)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
              >
                {t('Next')}: {t(tabs[tabIndex + 1].label)} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={saveAll}
                disabled={!!savingSection || (!anyDirty && !!record?.respondedAt)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> {savingSection ? t('Saving...') : t('Save profile')}
              </button>
            )}
          </div>
        </div>
      </div>

      {jobModal && (
        <JobModal
          userId={currentUser?.id || ''}
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
    </div>
  );
}


/** A titled group of fields inside a tab */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t(title)}</h4>
      {children}
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      <span className={labelCls}>
        <RequiredLabel text={label.endsWith(' *') ? `${t(label.slice(0, -2))} *` : label.includes(' *') ? label : t(label)} />
      </span>
      {children}
    </div>
  );
}

function JobRow({ job, onOpen }: { job: EmploymentEntry; onOpen: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onOpen} className="w-full flex items-center justify-between gap-3 rounded-xl bg-muted/50 hover:bg-muted px-4 py-3 text-left">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">
          {job.position || t('Position not set')} <span className="font-normal text-muted-foreground">{t('at')} {job.company || '—'}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {[job.employmentStatus, job.employerType].filter(Boolean).join(' · ')}
          {job.startDate && job.endDate && ` · ${job.startDate} – ${job.endDate}`}
          {job.startDate && !job.endDate && ` · since ${job.startDate}`}
          {!job.startDate && job.endDate && ` · until ${job.endDate}`}
        </p>
      </div>
      <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${job.endDate ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
        {job.endDate ? t('Previous') : t('Current')}
      </span>
    </button>
  );
}

/** Add or view one job. Saved jobs are history: only their end month can change. */
function JobModal({
  userId,
  entry,
  isNew,
  locked,
  onClose,
  onSave,
  onRemove,
}: {
  userId: string;
  entry: EmploymentEntry;
  isNew: boolean;
  locked: boolean;
  onClose: () => void;
  onSave: (e: EmploymentEntry) => void;
  onRemove?: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<EmploymentEntry>(entry);
  const set = (patch: Partial<EmploymentEntry>) => setDraft((d) => ({ ...d, ...patch }));
  const [uploading, setUploading] = useState(false);
  const submit = () => {
    if (!draft.position.trim() || !draft.company.trim()) {
      toast.error(t('Enter the position and the company'));
      return;
    }
    if (!draft.endDate && !draft.proofPath) {
      toast.error(t('Attach a proof of employment (contract, company ID or business permit)'));
      return;
    }
    onSave({ ...draft, position: draft.position.trim(), company: draft.company.trim() });
  };

  // Proof of employment goes to private storage; only the graduate and their staff can open it
  const uploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) {
      toast.error(t('Upload a PDF, JPG, PNG or WEBP file.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('The file must be 5 MB or smaller.'));
      return;
    }
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/${draft.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('employment-proofs').upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) {
      toast.error(`${t('Could not upload the file')}: ${error.message}`);
      return;
    }
    set({ proofPath: path, proofName: file.name.slice(0, 120) });
  };
  const viewProof = async () => {
    if (!draft.proofPath) return;
    const { data, error } = await supabase.storage.from('employment-proofs').createSignedUrl(draft.proofPath, 300);
    if (error || !data) toast.error(t('Could not open the file'));
    else window.open(data.signedUrl, '_blank', 'noopener');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Job details">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">{isNew ? t('Add job') : locked ? t('Job details') : t('Edit job')}</h3>
            {locked && <p className="text-xs text-muted-foreground mt-0.5">{t("Saved jobs are kept as history and can't be edited, but you can still attach the proof of employment.")}</p>}
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
          <Field label="Employer type *">
            <select disabled={locked} value={draft.employerType} onChange={(e) => set({ employerType: e.target.value })} className={input}>
              {EMPLOYER_TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Employer address"><input disabled={locked} value={draft.employerAddress || ''} onChange={(e) => set({ employerAddress: e.target.value })} className={input} /></Field>
          <Field label="Employer contact no.">
            <input
              disabled={locked}
              inputMode="tel"
              value={draft.employerContact || ''}
              onChange={(e) => set({ employerContact: e.target.value.replace(/[^\d+()\-\s]/g, '').slice(0, 20) })}
              className={input}
              placeholder={t('Phone or landline')}
            />
          </Field>
          <Field label="Length of service"><input disabled={locked} value={draft.lengthOfService || ''} onChange={(e) => set({ lengthOfService: e.target.value })} className={input} placeholder={t('e.g. 1 year 3 months')} /></Field>
          <div className="md:col-span-2">
            <Field label="Job description">
              <textarea rows={3} disabled={locked} value={draft.jobDescription || ''} onChange={(e) => set({ jobDescription: e.target.value })} className={`${input} resize-none`} />
            </Field>
          </div>
          {/* Proof can be added even to a saved job, e.g. one imported from the tracer sheet */}
          <div className="md:col-span-2">
            <Field label={draft.endDate ? 'Proof of employment' : 'Proof of employment *'}>
              <div className="rounded-xl border border-dashed border-border p-4 flex flex-wrap items-center gap-3">
                <FileText size={20} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  {draft.proofPath ? (
                    <button type="button" onClick={viewProof} className="text-sm font-semibold text-primary hover:underline truncate max-w-full text-left">
                      {draft.proofName || t('View file')}
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('Contract, company ID, appointment paper or business permit (PDF or photo, up to 5 MB)')}</p>
                  )}
                </div>
                <label className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-border cursor-pointer hover:bg-muted ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={uploadProof} className="hidden" />
                  <Upload size={15} /> {uploading ? t('Uploading...') : draft.proofPath ? t('Replace') : t('Upload')}
                </label>
              </div>
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {onRemove && (
              <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
                <Trash2 size={15} /> {t('Remove')}
              </button>
            )}
            {!isNew && !entry.endDate && (
              <button
                type="button"
                onClick={() => onSave({ ...draft, endDate: new Date().toISOString().slice(0, 7) })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                {t('I no longer work here')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-muted">{t('Cancel')}</button>
            <button type="button" onClick={submit} disabled={uploading} className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
              {isNew ? t('Add job') : t('Done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
