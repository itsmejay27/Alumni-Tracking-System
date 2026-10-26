import React, { useState, useRef } from 'react';
import { ShieldCheck, KeyRound, Save, User, Mail, Camera, Trash2, ArrowRight, Lock, Bell, Database, Download, LogOut, Clock, Megaphone, Briefcase, UserX } from 'lucide-react';
import { useContactInfo } from '@/lib/settings';
import { confirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';
import { CurrentUser } from '../App';
import { supabase, passwordUpdateError } from '@/lib/supabase';
import { PasswordStrength } from './PasswordStrength';
import { passwordStrength, roleLabel } from '@/lib/programs';
import { PhoneInput, isValidMobile } from './PhoneInput';
import { RevealButton } from './RevealButton';

interface SettingsProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => Promise<void> | void;
  /** Alumni keep their full personal details in My Alumni Profile */
  onOpenProfile?: () => void;
}

type Tab = 'account' | 'password' | 'notifications' | 'data';

const input =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm';

export function Settings({ currentUser, onUpdateProfile, onOpenProfile }: SettingsProps) {
  // Alumni manage their name, photo and details in My Alumni Profile, so Settings is just the password
  const [tab, setTab] = useState<Tab>(currentUser?.role === 'alumni' ? 'password' : 'account');

  // Account
  const [givenName, setGivenName] = useState(currentUser?.givenName || '');
  const [middleName, setMiddleName] = useState(currentUser?.middleName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [mobileNo, setMobileNo] = useState(currentUser?.mobileNo || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);

  const isAlumni = currentUser?.role === 'alumni';
  const initials = `${givenName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'OM';
  const displayName = `${givenName} ${lastName}`.trim();

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!givenName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (mobileNo && !isValidMobile(mobileNo)) {
      toast.error('Enter an 11-digit mobile number starting with 09');
      return;
    }
    setSavingProfile(true);
    try {
      await onUpdateProfile({
        ...currentUser,
        givenName: givenName.trim().toUpperCase(),
        middleName: middleName.trim().toUpperCase(),
        lastName: lastName.trim().toUpperCase(),
        mobileNo,
        avatarUrl,
      });
      toast.success('Your account details have been saved.');
    } catch (err: any) {
      toast.error(`Could not save: ${err.message}`);
    }
    setSavingProfile(false);
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8 || passwordStrength(newPassword).label === 'Weak') {
      toast.error('Please choose a stronger password (at least 8 characters).');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    // Confirm the current password before changing it
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser?.email || '',
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      toast.error('Current password is incorrect.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(await passwordUpdateError(error));
      return;
    }
    toast.success('Your password has been changed.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const navItem = (id: Tab, icon: React.ReactNode, label: string, sub: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        tab === id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
      }`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tab === id ? 'bg-white/15' : 'bg-primary/10 text-primary'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`block text-xs truncate ${tab === id ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">{isAlumni ? 'Sign-in, notifications and your data' : 'Your account, sign-in, notifications and data'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 items-start">
        {/* Left: who you are + section menu */}
        <aside className="bg-card rounded-2xl shadow-sm p-5 space-y-5 lg:sticky lg:top-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary overflow-hidden flex items-center justify-center text-2xl font-black">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="min-w-0 w-full">
              <p className="font-bold truncate">{displayName || 'Your name'}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
              <span className="inline-block mt-2 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
                {roleLabel(currentUser?.role || '')}
              </span>
            </div>
          </div>
          <nav className="space-y-1.5">
            {!isAlumni && navItem('account', <User size={16} />, 'Account', 'Name, photo and mobile')}
            {navItem('password', <KeyRound size={16} />, 'Sign-in & security', 'Password and devices')}
            {navItem('notifications', <Bell size={16} />, 'Notifications', 'Emails you receive')}
            {navItem('data', <Database size={16} />, 'Privacy & data', 'Download or delete your data')}
          </nav>
          {isAlumni && onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-full flex items-center justify-between gap-3 rounded-xl bg-muted/60 hover:bg-muted px-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">My Alumni Profile</span>
                <span className="block text-xs text-muted-foreground">Name, photo, contact and employment</span>
              </span>
              <ArrowRight size={16} className="text-primary shrink-0" />
            </button>
          )}
        </aside>

        {/* Right: the selected section */}
        {tab === 'account' && !isAlumni ? (
          <form onSubmit={saveProfile} className="bg-card rounded-2xl shadow-sm divide-y divide-border/70">
            <div className="p-5 sm:p-6">
              <h3 className="font-semibold text-lg">Account</h3>
              <p className="text-sm text-muted-foreground">How your name and photo appear in the system.</p>
            </div>

            <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-20 h-20 rounded-full bg-primary/10 text-primary overflow-hidden flex items-center justify-center text-2xl font-black shrink-0">
                {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="text-center sm:text-left space-y-2">
                <input type="file" ref={fileRef} accept="image/*" onChange={handleImage} className="hidden" />
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15">
                    <Camera size={15} /> {avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {avatarUrl && (
                    <button type="button" onClick={() => setAvatarUrl('')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50">
                      <Trash2 size={15} /> Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG or PNG, up to 2 MB.</p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="First name *">
                  <input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={`${input} uppercase`} />
                </Field>
                <Field label="Middle name">
                  <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={`${input} uppercase`} />
                </Field>
                <Field label="Last name *">
                  <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${input} uppercase`} />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email (used to sign in)">
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input readOnly value={currentUser?.email || ''} className={`${input} pl-9 bg-muted text-muted-foreground`} />
                  </div>
                </Field>
                <Field label={isAlumni ? 'Mobile number *' : 'Mobile number'}>
                  <PhoneInput required={isAlumni} value={mobileNo} onChange={setMobileNo} className={input} />
                </Field>
              </div>
            </div>

            {isAlumni && onOpenProfile && (
              <div className="p-5 sm:p-6">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="w-full flex items-center justify-between gap-3 rounded-xl bg-muted/60 hover:bg-muted px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold">Address, birth date, parents and employment</span>
                    <span className="block text-xs text-muted-foreground">These are in My Alumni Profile.</span>
                  </span>
                  <ArrowRight size={18} className="text-primary shrink-0" />
                </button>
              </div>
            )}

            <div className="p-5 sm:p-6 flex justify-end">
              <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-60">
                <Save size={16} /> {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : tab === 'password' ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_18rem] gap-6 items-start">
            <form onSubmit={savePassword} className="bg-card rounded-2xl shadow-sm divide-y divide-border/70">
              <div className="p-5 sm:p-6">
                <h3 className="font-semibold text-lg">Change password</h3>
                <p className="text-sm text-muted-foreground">You'll stay signed in on this device. Other devices will be signed out.</p>
              </div>
              <div className="p-5 sm:p-6 space-y-4 max-w-xl">
                <PasswordField label="Current password *" value={currentPassword} onChange={setCurrentPassword} shown={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} autoComplete="current-password" />
                <div>
                  <PasswordField label="New password *" value={newPassword} onChange={setNewPassword} shown={show.next} onToggle={() => setShow((s) => ({ ...s, next: !s.next }))} autoComplete="new-password" />
                  <PasswordStrength password={newPassword} />
                </div>
                <PasswordField label="Confirm new password *" value={confirmPassword} onChange={setConfirmPassword} shown={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} autoComplete="new-password" />
                {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-600">Passwords don't match yet.</p>}
              </div>
              <div className="p-5 sm:p-6 flex justify-end">
                <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-60">
                  <Lock size={16} /> {savingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>

            <div className="rounded-2xl bg-amber-50 p-5 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-amber-900">
                <ShieldCheck size={18} /> Stay safe
              </p>
              <ul className="text-sm text-amber-900/90 space-y-1.5 list-disc pl-5">
                <li>Use at least 8 characters with upper and lower case letters and a number.</li>
                <li>Don't reuse a password from another site.</li>
                <li>Alumni Affairs and program chairs will never ask for your password.</li>
              </ul>
            </div>
            <SignInActivity />
          </div>
        ) : tab === 'notifications' ? (
          <NotificationsPanel userId={currentUser?.id} isAlumni={isAlumni} />
        ) : (
          <DataPanel currentUser={currentUser} isAlumni={isAlumni} />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  shown,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  shown: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-foreground mb-1.5">{label}</span>
      <div className="relative">
        <input
          type={shown ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${input} pr-11`}
        />
        <RevealButton shown={shown} onToggle={onToggle} />
      </div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl shadow-sm divide-y divide-border/70">
      <div className="p-5 sm:p-6">
        <h3 className="font-semibold text-lg">{title}</h3>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/** Last sign-in and a way to sign out every other device. */
function SignInActivity() {
  const [info, setInfo] = useState<{ last?: string; created?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setInfo({ last: data.user?.last_sign_in_at || undefined, created: data.user?.created_at || undefined }),
    );
  }, []);
  const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  const signOutOthers = async () => {
    const ok = await confirmDialog({
      title: 'Sign out other devices?',
      message: 'You will stay signed in here. Phones and computers where you are signed in will need to log in again.',
      confirmLabel: 'Sign out others',
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setBusy(false);
    if (error) toast.error(`Could not sign out other devices: ${error.message}`);
    else toast.success('Other devices have been signed out');
  };

  return (
    <div className="xl:col-start-1 bg-card rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock size={17} className="text-primary" /> Sign-in activity
      </h3>
      <dl className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Last sign-in</dt>
          <dd className="font-medium mt-0.5">{fmt(info?.last)}</dd>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">Account created</dt>
          <dd className="font-medium mt-0.5">{fmt(info?.created)}</dd>
        </div>
      </dl>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <p className="text-sm text-muted-foreground">Lost a phone or used a shared computer? Sign out everywhere else.</p>
        <button
          type="button"
          onClick={signOutOthers}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-sm font-semibold hover:bg-muted/70 disabled:opacity-60 shrink-0"
        >
          <LogOut size={16} /> {busy ? 'Signing out...' : 'Sign out other devices'}
        </button>
      </div>
    </div>
  );
}

/** Email preferences, saved as soon as a switch is flipped. */
function NotificationsPanel({ userId, isAlumni }: { userId?: string; isAlumni: boolean }) {
  const [prefs, setPrefs] = useState<{ email_jobs: boolean; email_announcements: boolean } | null>(null);
  React.useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('email_jobs, email_announcements')
      .eq('id', userId)
      .single()
      .then(({ data }) => setPrefs({ email_jobs: data?.email_jobs ?? true, email_announcements: data?.email_announcements ?? true }));
  }, [userId]);

  const toggle = async (key: 'email_jobs' | 'email_announcements') => {
    if (!prefs || !userId) return;
    const value = !prefs[key];
    setPrefs({ ...prefs, [key]: value });
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', userId);
    if (error) {
      setPrefs({ ...prefs });
      toast.error(`Could not save: ${error.message}`);
    } else toast.success(value ? 'Emails turned on' : 'Emails turned off');
  };

  const rows: { key: 'email_jobs' | 'email_announcements'; icon: React.ReactNode; title: string; text: string }[] = [
    {
      key: 'email_jobs',
      icon: <Briefcase size={18} />,
      title: 'New job openings',
      text: isAlumni ? 'When a job for your program (or for all programs) is posted on the Job Board.' : 'Job posts emailed to alumni (staff only receive these if they also have an alumni record).',
    },
    {
      key: 'email_announcements',
      icon: <Megaphone size={18} />,
      title: 'Announcements',
      text: 'Homecomings, seminars and notices from Alumni Affairs and your program chair.',
    },
  ];

  return (
    <Panel title="Notifications" sub="Choose which emails the OMSU Alumni Tracer sends you.">
      {!prefs ? (
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      ) : (
        rows.map((r) => (
          <div key={r.key} className="p-5 sm:p-6 flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{r.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </div>
            <Switch on={prefs[r.key]} onClick={() => toggle(r.key)} label={r.title} />
          </div>
        ))
      )}
      <p className="p-5 sm:p-6 text-xs text-muted-foreground">Account emails, like verification codes and password resets, are always sent.</p>
    </Panel>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

/** Data Privacy Act rights: get a copy of your data, or ask Alumni Affairs to delete it. */
function DataPanel({ currentUser, isAlumni }: { currentUser: CurrentUser | null; isAlumni: boolean }) {
  const contact = useContactInfo();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!currentUser) return;
    setBusy(true);
    const [{ data: profile }, { data: record }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
      supabase.from('alumni_records').select('course, batch, email, data, updated_at').eq('user_id', currentUser.id).maybeSingle(),
    ]);
    setBusy(false);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: profile, tracerRecord: record }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omsu-alumni-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Your data was downloaded');
  };

  const deletionMail = `mailto:${contact.email}?subject=${encodeURIComponent('Request to delete my OMSU Alumni Tracer account')}&body=${encodeURIComponent(
    `Hello Alumni Affairs,\n\nI would like my OMSU Alumni Tracer account and personal data deleted.\n\nName: ${`${currentUser?.givenName || ''} ${currentUser?.lastName || ''}`.trim()}\nAccount email: ${currentUser?.email || ''}\n\nThank you.`,
  )}`;

  return (
    <Panel title="Privacy & data" sub="Your rights under the Data Privacy Act of 2012 (RA 10173).">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Download size={18} />
        </span>
        <div className="flex-1">
          <p className="font-medium">Download my data</p>
          <p className="text-sm text-muted-foreground">A copy of your account{isAlumni ? ' and tracer record' : ''} as a file.</p>
        </div>
        <button type="button" onClick={download} disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
          <Download size={16} /> {busy ? 'Preparing...' : 'Download'}
        </button>
      </div>
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
          <UserX size={18} />
        </span>
        <div className="flex-1">
          <p className="font-medium">Delete my account</p>
          <p className="text-sm text-muted-foreground">Send a request to the Alumni Affairs Office. They will confirm before anything is removed.</p>
        </div>
        <a href={deletionMail} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100">
          <Mail size={16} /> Request deletion
        </a>
      </div>
    </Panel>
  );
}
