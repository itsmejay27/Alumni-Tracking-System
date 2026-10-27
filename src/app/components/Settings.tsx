import React, { useEffect, useRef, useState } from 'react';
import { RequiredLabel } from './RequiredMark';
import {
  ShieldCheck,
  KeyRound,
  Save,
  User,
  Mail,
  Camera,
  ArrowRight,
  Lock,
  Bell,
  LogOut,
  Clock,
  Megaphone,
  Briefcase,
  UserX,
  Palette,
  Sun,
  Moon,
  Monitor,
  Languages,
  Smartphone,
  CheckCircle2,
  Loader2,
  AtSign,
  FileText,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { CurrentUser } from '../App';
import { supabase, passwordUpdateError, verifyPassword } from '@/lib/supabase';
import { PasswordStrength } from './PasswordStrength';
import { passwordStrength, roleLabel } from '@/lib/programs';
import { PhoneInput, isValidMobile } from './PhoneInput';
import { RevealButton } from './RevealButton';
import { useContactInfo } from '@/lib/settings';
import { confirmDialog } from './ConfirmDialog';
import { usePrefs, useT, ThemePref, Lang } from '@/lib/preferences';
import { LegalModal } from './Legal';

interface SettingsProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => Promise<void> | void;
  /** Alumni keep their full personal details in My Alumni Profile */
  onOpenProfile?: () => void;
}

type Tab = 'account' | 'security' | 'notifications' | 'appearance' | 'privacy';

const input =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60';
const btnSoft = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-sm font-semibold hover:bg-muted/70 disabled:opacity-60';

export function Settings({ currentUser, onUpdateProfile, onOpenProfile }: SettingsProps) {
  const t = useT();
  const { theme, lang } = usePrefs();
  const isAlumni = currentUser?.role === 'alumni';
  // Alumni manage their name, photo and details in My Alumni Profile
  const [tab, setTab] = useState<Tab>(isAlumni ? 'security' : 'account');
  const [twoStepOn, setTwoStepOn] = useState<boolean | null>(null);

  const refreshTwoStep = () =>
    supabase.auth.mfa.listFactors().then(({ data }) => setTwoStepOn(!!data?.totp?.some((f) => f.status === 'verified')));
  useEffect(() => {
    refreshTwoStep();
  }, []);

  const initials = `${currentUser?.givenName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`.toUpperCase() || 'OM';
  const photoRef = useRef<HTMLInputElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const savePhoto = async (avatarUrl: string) => {
    if (!currentUser) return;
    setSavingPhoto(true);
    try {
      await onUpdateProfile({ ...currentUser, avatarUrl });
      toast.success(avatarUrl ? t('Photo updated.') : t('Photo removed.'));
    } catch (err: any) {
      toast.error(`${t('Could not save')}: ${err.message}`);
    }
    setSavingPhoto(false);
  };
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error(t('Image must be 2 MB or smaller.'));
    const reader = new FileReader();
    reader.onloadend = () => savePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };
  const name = `${currentUser?.givenName || ''} ${currentUser?.lastName || ''}`.trim();

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    ...(!isAlumni ? [{ id: 'account' as Tab, icon: <User size={16} />, label: t('Account') }] : []),
    { id: 'security', icon: <ShieldCheck size={16} />, label: t('Security') },
    { id: 'notifications', icon: <Bell size={16} />, label: t('Notifications') },
    { id: 'appearance', icon: <Palette size={16} />, label: t('Appearance & language') },
    { id: 'privacy', icon: <FileText size={16} />, label: t('Privacy') },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header card with who you are and a quick status summary */}
      <section className="relative overflow-hidden rounded-2xl bg-[#002060] text-white">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-5">
          {isAlumni ? (
            <div className="w-20 h-20 rounded-full ring-4 ring-white/20 bg-white/10 overflow-hidden flex items-center justify-center text-2xl font-black text-[#f5c400] shrink-0 self-center md:self-auto">
              {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
          ) : (
            <div className="relative shrink-0 self-center md:self-auto">
              <input type="file" ref={photoRef} accept="image/*" onChange={handlePhoto} className="hidden" />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={savingPhoto}
                title={t('Change photo')}
                className="group relative w-20 h-20 rounded-full ring-4 ring-white/20 bg-white/10 overflow-hidden flex items-center justify-center text-2xl font-black text-[#f5c400]"
              >
                {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
                <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </span>
              </button>
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#f5c400] text-[#002060] flex items-center justify-center ring-2 ring-[#002060]">
                <Camera size={14} />
              </span>
              {currentUser?.avatarUrl && (
                <button
                  type="button"
                  onClick={() => savePhoto('')}
                  disabled={savingPhoto}
                  className="block mx-auto mt-1.5 text-[11px] text-white/70 hover:text-white hover:underline"
                >
                  {t('Remove photo')}
                </button>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#f5c400]">{t('Settings')}</p>
            <h2 className="text-2xl font-extrabold truncate">{name || currentUser?.email}</h2>
            <p className="text-white/75 text-sm truncate">
              {currentUser?.email} · {roleLabel(currentUser?.role || '')}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-[26rem] shrink-0">
            <Chip label={t('Two-step')} value={twoStepOn == null ? '…' : twoStepOn ? t('On') : t('Off')} good={!!twoStepOn} />
            <Chip label={t('Theme')} value={t(theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light')} />
            <Chip label={t('Language')} value={lang === 'fil' ? 'Filipino' : 'English'} />
          </div>
        </div>
        {/* Tabs */}
        <nav className="relative flex gap-1 overflow-x-auto px-4 sm:px-6 border-t border-white/10" aria-label={t('Settings')}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === tb.id ? 'border-[#f5c400] text-white' : 'border-transparent text-white/65 hover:text-white'
              }`}
            >
              {tb.icon} {tb.label}
            </button>
          ))}
        </nav>
      </section>

      {tab === 'account' && !isAlumni && <AccountPanel currentUser={currentUser} onUpdateProfile={onUpdateProfile} />}
      {tab === 'security' && <SecurityPanel currentUser={currentUser} twoStepOn={twoStepOn} onTwoStepChange={refreshTwoStep} />}
      {tab === 'notifications' && <NotificationsPanel userId={currentUser?.id} isAlumni={isAlumni} />}
      {tab === 'appearance' && <AppearancePanel />}
      {tab === 'privacy' && <PrivacyPanel currentUser={currentUser} isAlumni={isAlumni} onOpenProfile={onOpenProfile} />}
    </div>
  );
}

function Chip({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5 text-center md:text-left">
      <p className="text-[11px] text-white/65">{label}</p>
      <p className={`text-sm font-bold truncate ${good ? 'text-emerald-300' : ''}`}>{value}</p>
    </div>
  );
}

function Card({ icon, title, sub, children, className = '' }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col ${className}`}>
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-base">{title}</h3>
          {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1.5"><RequiredLabel text={label} /></span>
      {children}
    </label>
  );
}

// ---------------- Account (staff only) ----------------

function AccountPanel({ currentUser, onUpdateProfile }: { currentUser: CurrentUser | null; onUpdateProfile: SettingsProps['onUpdateProfile'] }) {
  const t = useT();
  const [givenName, setGivenName] = useState(currentUser?.givenName || '');
  const [middleName, setMiddleName] = useState(currentUser?.middleName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [mobileNo, setMobileNo] = useState(currentUser?.mobileNo || '');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!givenName.trim() || !lastName.trim()) return toast.error(t('First and last name are required.'));
    if (mobileNo && !isValidMobile(mobileNo)) return toast.error(t('Enter an 11-digit mobile number starting with 09'));
    setSaving(true);
    try {
      await onUpdateProfile({
        ...currentUser,
        givenName: givenName.trim().toUpperCase(),
        middleName: middleName.trim().toUpperCase(),
        lastName: lastName.trim().toUpperCase(),
        mobileNo,
      });
      toast.success(t('Your account details have been saved.'));
    } catch (err: any) {
      toast.error(`${t('Could not save')}: ${err.message}`);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save}>
      <Card icon={<User size={18} />} title={t('Your details')} sub={t('How your name appears in the system.')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={`${t('First name')} *`}>
            <input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={`${input} uppercase`} />
          </Field>
          <Field label={t('Middle name')}>
            <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={`${input} uppercase`} />
          </Field>
          <Field label={`${t('Last name')} *`}>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${input} uppercase`} />
          </Field>
          <div className="md:col-span-2">
            <Field label={t('Email (used to sign in)')}>
              <input readOnly value={currentUser?.email || ''} className={`${input} bg-muted text-muted-foreground`} />
            </Field>
          </div>
          <Field label={t('Mobile number')}>
            <PhoneInput value={mobileNo} onChange={setMobileNo} className={input} />
          </Field>
        </div>
        <div className="flex justify-end mt-6">
          <button type="submit" disabled={saving} className={btnPrimary}>
            <Save size={16} /> {saving ? t('Saving...') : t('Save changes')}
          </button>
        </div>
      </Card>
    </form>
  );
}

// ---------------- Security ----------------

function SecurityPanel({ currentUser, twoStepOn, onTwoStepChange }: { currentUser: CurrentUser | null; twoStepOn: boolean | null; onTwoStepChange: () => void }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
      <PasswordCard email={currentUser?.email || ''} />
      <TwoStepCard enabled={twoStepOn} onChange={onTwoStepChange} />
      <LoginEmailCard email={currentUser?.email || ''} />
      <SignInActivityCard />
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <input type={shown ? 'text' : 'password'} required autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className={`${input} pr-11`} />
        <RevealButton shown={shown} onToggle={() => setShown((s) => !s)} />
      </div>
    </Field>
  );
}

function PasswordCard({ email }: { email: string }) {
  const t = useT();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8 || passwordStrength(next).label === 'Weak') return toast.error(t('Please choose a stronger password (at least 8 characters).'));
    if (next !== confirm) return toast.error(t('New passwords do not match.'));
    setBusy(true);
    if (!(await verifyPassword(email, current))) {
      setBusy(false);
      return toast.error(t('Current password is incorrect.'));
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return toast.error(await passwordUpdateError(error));
    toast.success(t('Your password has been changed.'));
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  return (
    <Card icon={<KeyRound size={18} />} title={t('Password')} sub={t('Use at least 8 characters with upper and lower case letters and a number.')}>
      <form onSubmit={save} className="space-y-4 flex-1 flex flex-col">
        <PasswordField label={`${t('Current password')} *`} value={current} onChange={setCurrent} autoComplete="current-password" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <PasswordField label={`${t('New password')} *`} value={next} onChange={setNext} autoComplete="new-password" />
            <PasswordStrength password={next} />
          </div>
          <PasswordField label={`${t('Confirm new password')} *`} value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </div>
        {confirm && next !== confirm && <p className="text-xs text-red-600">{t("Passwords don't match yet.")}</p>}
        <div className="flex justify-end mt-auto pt-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            <Lock size={16} /> {busy ? t('Updating...') : t('Update password')}
          </button>
        </div>
      </form>
    </Card>
  );
}

/** Authenticator-app two-step verification (Supabase TOTP). */
function TwoStepCard({ enabled, onChange }: { enabled: boolean | null; onChange: () => void }) {
  const t = useT();
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    // Clear any half-finished setup first
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all || []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) return toast.error(`${t('Could not start setup')}: ${error?.message}`);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const finish = async () => {
    if (!enroll) return;
    if (code.length !== 6) return toast.error(t('Enter the 6-digit code from your authenticator app.'));
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setBusy(false);
    if (error) return toast.error(t('That code is not correct. Try the newest code in your app.'));
    setEnroll(null);
    setCode('');
    toast.success(t('Two-step verification is on.'));
    onChange();
  };

  const cancel = async () => {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id });
    setEnroll(null);
    setCode('');
  };

  const turnOff = async () => {
    const ok = await confirmDialog({
      title: t('Turn off two-step verification?'),
      message: t('Your account will be protected by your password only.'),
      confirmLabel: t('Turn off'),
    });
    if (!ok) return;
    setBusy(true);
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.totp || []) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (error) {
        setBusy(false);
        return toast.error(`${t('Could not turn off')}: ${error.message}`);
      }
    }
    setBusy(false);
    toast.success(t('Two-step verification is off.'));
    onChange();
  };

  return (
    <Card icon={<Smartphone size={18} />} title={t('Two-step verification')} sub={t('After your password, enter a code from an authenticator app on your phone.')}>
      {enabled ? (
        <div className="flex-1 flex flex-col gap-4">
          <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-medium">
            <CheckCircle2 size={18} /> {t('On. You will be asked for a code each time you sign in.')}
          </p>
          <div className="flex justify-end mt-auto">
            <button type="button" onClick={turnOff} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
              {t('Turn off')}
            </button>
          </div>
        </div>
      ) : enroll ? (
        <div className="space-y-4">
          <ol className="text-sm space-y-1 list-decimal pl-5 text-muted-foreground">
            <li>{t('Install Google Authenticator, Microsoft Authenticator or Authy on your phone.')}</li>
            <li>{t('Scan this QR code with the app (or type the key).')}</li>
            <li>{t('Enter the 6-digit code the app shows.')}</li>
          </ol>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img src={enroll.qr} alt={t('QR code for your authenticator app')} className="w-40 h-40 rounded-xl bg-white p-2 ring-1 ring-border" />
            <div className="flex-1 w-full space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('Setup key')}</p>
                <code className="block text-xs break-all rounded-lg bg-muted px-3 py-2 font-mono select-all">{enroll.secret}</code>
              </div>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className={`${input} text-center tracking-[0.4em] font-mono text-lg`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className={btnSoft}>
              {t('Cancel')}
            </button>
            <button type="button" onClick={finish} disabled={busy} className={btnPrimary}>
              {busy && <Loader2 size={16} className="animate-spin" />} {t('Verify and turn on')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          <p className="rounded-xl bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            {t('Off. Turning this on is strongly recommended for Alumni Affairs and program chair accounts.')}
          </p>
          <div className="flex justify-end mt-auto">
            <button type="button" onClick={start} disabled={busy || enabled == null} className={btnPrimary}>
              {busy && <Loader2 size={16} className="animate-spin" />} {t('Set up')}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Change the sign-in email: a 6-digit code is sent to the new address. */
function LoginEmailCard({ email }: { email: string }) {
  const t = useT();
  const [newEmail, setNewEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return toast.error(t('Enter a valid email address'));
    if (target === email.toLowerCase()) return toast.error(t('That is already your email.'));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: target });
    setBusy(false);
    if (error) return toast.error(/already|registered|exists/i.test(error.message) ? t('Another account already uses that email.') : error.message);
    setSentTo(target);
    toast.success(t('We sent a code to {email}', { email: target }));
  };

  const confirmCode = async () => {
    if (code.length < 6) return toast.error(t('Enter the code from the email.'));
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: code, type: 'email_change' });
    setBusy(false);
    if (error) return toast.error(t('That code is not correct or has expired.'));
    toast.success(t('Your sign-in email is now {email}', { email: sentTo }));
    setSentTo('');
    setNewEmail('');
    setCode('');
    // Reload so every screen shows the new email
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <Card icon={<AtSign size={18} />} title={t('Sign-in email')} sub={t('The email you use to log in and receive messages.')}>
      <p className="text-sm mb-4">
        {t('Current')}: <span className="font-semibold break-all">{email}</span>
      </p>
      {!sentTo ? (
        <form onSubmit={send} className="flex flex-col sm:flex-row gap-2 mt-auto">
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t('New email address')} className={input} />
          <button type="submit" disabled={busy} className={`${btnPrimary} shrink-0`}>
            <Mail size={16} /> {busy ? t('Sending...') : t('Send code')}
          </button>
        </form>
      ) : (
        <div className="space-y-3 mt-auto">
          <p className="text-sm text-muted-foreground">{t('Enter the code we sent to {email}.', { email: sentTo })}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="000000"
              className={`${input} tracking-[0.3em] font-mono`}
            />
            <button type="button" onClick={confirmCode} disabled={busy} className={`${btnPrimary} shrink-0`}>
              {busy ? t('Checking...') : t('Confirm')}
            </button>
          </div>
          <button type="button" onClick={() => setSentTo('')} className="text-xs font-medium text-primary hover:underline">
            {t('Use a different email')}
          </button>
        </div>
      )}
    </Card>
  );
}

function SignInActivityCard() {
  const t = useT();
  const { lang } = usePrefs();
  const [info, setInfo] = useState<{ last?: string; created?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setInfo({ last: data.user?.last_sign_in_at || undefined, created: data.user?.created_at || undefined }));
  }, []);
  const fmt = (d?: string) => (d ? new Date(d).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  const signOutOthers = async () => {
    const ok = await confirmDialog({
      title: t('Sign out other devices?'),
      message: t('You will stay signed in here. Phones and computers where you are signed in will need to log in again.'),
      confirmLabel: t('Sign out others'),
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setBusy(false);
    if (error) toast.error(`${t('Could not sign out other devices')}: ${error.message}`);
    else toast.success(t('Other devices have been signed out'));
  };

  return (
    <Card icon={<Clock size={18} />} title={t('Sign-in activity')} sub={t('Lost a phone or used a shared computer? Sign out everywhere else.')}>
      <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="rounded-xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">{t('Last sign-in')}</dt>
          <dd className="font-medium mt-0.5">{fmt(info?.last)}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">{t('Account created')}</dt>
          <dd className="font-medium mt-0.5">{fmt(info?.created)}</dd>
        </div>
      </dl>
      <div className="flex justify-end mt-auto">
        <button type="button" onClick={signOutOthers} disabled={busy} className={btnSoft}>
          <LogOut size={16} /> {busy ? t('Signing out...') : t('Sign out other devices')}
        </button>
      </div>
    </Card>
  );
}

// ---------------- Notifications ----------------

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'] as const;
const JOB_TYPE_LABEL: Record<string, string> = { 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', internship: 'Internship' };

interface NotifyPrefs {
  email_jobs: boolean;
  email_announcements: boolean;
  job_alert_types: string[];
  job_alert_remote_only: boolean;
  job_alert_min_salary: number;
}

function NotificationsPanel({ userId, isAlumni }: { userId?: string; isAlumni: boolean }) {
  const t = useT();
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null);
  const [saved, setSaved] = useState<NotifyPrefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('email_jobs, email_announcements, job_alert_types, job_alert_remote_only, job_alert_min_salary')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        const p: NotifyPrefs = {
          email_jobs: data?.email_jobs ?? true,
          email_announcements: data?.email_announcements ?? true,
          job_alert_types: data?.job_alert_types ?? [],
          job_alert_remote_only: data?.job_alert_remote_only ?? false,
          job_alert_min_salary: data?.job_alert_min_salary ?? 0,
        };
        setPrefs(p);
        setSaved(p);
      });
  }, [userId]);

  // Email on/off switches save right away
  const toggle = async (key: 'email_jobs' | 'email_announcements') => {
    if (!prefs || !userId) return;
    const value = !prefs[key];
    setPrefs({ ...prefs, [key]: value });
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', userId);
    if (error) {
      setPrefs(prefs);
      toast.error(`${t('Could not save')}: ${error.message}`);
    } else {
      setSaved((s) => (s ? { ...s, [key]: value } : s));
      toast.success(value ? t('Emails turned on') : t('Emails turned off'));
    }
  };

  const filtersDirty =
    !!prefs &&
    !!saved &&
    (JSON.stringify([...prefs.job_alert_types].sort()) !== JSON.stringify([...saved.job_alert_types].sort()) ||
      prefs.job_alert_remote_only !== saved.job_alert_remote_only ||
      prefs.job_alert_min_salary !== saved.job_alert_min_salary);

  const saveFilters = async () => {
    if (!prefs || !userId) return;
    setBusy(true);
    const patch = {
      job_alert_types: prefs.job_alert_types,
      job_alert_remote_only: prefs.job_alert_remote_only,
      job_alert_min_salary: Math.max(0, Math.round(prefs.job_alert_min_salary || 0)),
    };
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    setBusy(false);
    if (error) return toast.error(`${t('Could not save')}: ${error.message}`);
    setSaved({ ...prefs, ...patch });
    toast.success(t('Job alert filters saved'));
  };

  if (!prefs) return <p className="text-sm text-muted-foreground p-6">{t('Loading...')}</p>;

  const rows: { key: 'email_jobs' | 'email_announcements'; icon: React.ReactNode; title: string; text: string }[] = [
    {
      key: 'email_jobs',
      icon: <Briefcase size={18} />,
      title: t('New job openings'),
      text: isAlumni ? t('When a job for your program (or for all programs) is posted on the Job Board.') : t('Job posts emailed to alumni.'),
    },
    { key: 'email_announcements', icon: <Megaphone size={18} />, title: t('Announcements'), text: t('Homecomings, seminars and notices from Alumni Affairs and your program chair.') },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
      <Card icon={<Bell size={18} />} title={t('Email notifications')} sub={t('Choose which emails the OMSU Alumni Track sends you.')}>
        <div className="divide-y divide-border/70 -my-2">
          {rows.map((r) => (
            <div key={r.key} className="py-4 flex items-start gap-4">
              <span className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
              <Switch on={prefs[r.key]} onClick={() => toggle(r.key)} label={r.title} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-auto pt-4">{t('Account emails, like verification codes and password resets, are always sent.')}</p>
      </Card>

      <Card icon={<Filter size={18} />} title={t('Job alert filters')} sub={t('Only email me the jobs that match.')}>
        <fieldset disabled={!prefs.email_jobs} className="space-y-5 disabled:opacity-50">
          <div>
            <p className="text-sm font-medium mb-2">{t('Job types')}</p>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((jt) => {
                const on = prefs.job_alert_types.includes(jt);
                return (
                  <button
                    key={jt}
                    type="button"
                    onClick={() =>
                      setPrefs({ ...prefs, job_alert_types: on ? prefs.job_alert_types.filter((x) => x !== jt) : [...prefs.job_alert_types, jt] })
                    }
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
                  >
                    {t(JOB_TYPE_LABEL[jt])}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{t('None selected = all job types.')}</p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t('Remote jobs only')}</p>
              <p className="text-xs text-muted-foreground">{t('Work from home or online jobs.')}</p>
            </div>
            <Switch on={prefs.job_alert_remote_only} onClick={() => setPrefs({ ...prefs, job_alert_remote_only: !prefs.job_alert_remote_only })} label={t('Remote jobs only')} />
          </div>
          <Field label={t('Minimum monthly pay (₱)')}>
            <input
              inputMode="numeric"
              value={prefs.job_alert_min_salary || ''}
              onChange={(e) => setPrefs({ ...prefs, job_alert_min_salary: Number(e.target.value.replace(/\D/g, '').slice(0, 7)) || 0 })}
              placeholder={t('Any salary')}
              className={input}
            />
            <span className="block text-xs text-muted-foreground mt-1.5">{t('Jobs that do not state a salary are skipped when this is set. Hourly and dollar pay are converted to a monthly peso estimate.')}</span>
          </Field>
        </fieldset>
        <div className="flex justify-end mt-auto pt-5">
          <button type="button" onClick={saveFilters} disabled={busy || !filtersDirty} className={btnPrimary}>
            <Save size={16} /> {busy ? t('Saving...') : filtersDirty ? t('Save filters') : t('Saved')}
          </button>
        </div>
      </Card>
    </div>
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
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-[var(--switch-background)]'}`}
    >
      <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ---------------- Appearance & language ----------------

function AppearancePanel() {
  const t = useT();
  const { theme, setTheme, lang, setLang } = usePrefs();
  const themes: { id: ThemePref; icon: React.ReactNode; label: string; preview: string }[] = [
    { id: 'light', icon: <Sun size={16} />, label: t('Light'), preview: 'bg-[#f8f9fa]' },
    { id: 'dark', icon: <Moon size={16} />, label: t('Dark'), preview: 'bg-[#0b1221]' },
    { id: 'system', icon: <Monitor size={16} />, label: t('System'), preview: 'bg-gradient-to-r from-[#f8f9fa] from-50% to-[#0b1221] to-50%' },
  ];
  const langs: { id: Lang; label: string; sample: string }[] = [
    { id: 'en', label: 'English', sample: 'Welcome back! Update your tracer record.' },
    { id: 'fil', label: 'Filipino', sample: 'Maligayang pagbabalik! I-update ang iyong tracer record.' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
      <Card icon={<Palette size={18} />} title={t('Theme')} sub={t('Saved on this device.')}>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => setTheme(th.id)}
              aria-pressed={theme === th.id}
              className={`rounded-2xl p-2 text-left transition ring-2 ${theme === th.id ? 'ring-primary' : 'ring-transparent hover:ring-border'}`}
            >
              <div className={`h-20 rounded-xl ${th.preview} ring-1 ring-border overflow-hidden p-2 flex gap-1.5`}>
                <div className="w-5 rounded-md bg-[#002060]" />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3 rounded ${th.id === 'dark' ? 'bg-[#121b2f]' : 'bg-white'} ring-1 ring-black/5`} />
                  <div className={`h-6 rounded ${th.id === 'dark' ? 'bg-[#121b2f]' : 'bg-white'} ring-1 ring-black/5`} />
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold inline-flex items-center gap-1.5">
                {th.icon} {th.label}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <Card icon={<Languages size={18} />} title={t('Language')} sub={t('Menus, buttons and labels in the app. Your data stays as you typed it.')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {langs.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              className={`rounded-2xl p-4 text-left transition ring-2 ${lang === l.id ? 'ring-primary bg-primary/5' : 'ring-border hover:ring-primary/40'}`}
            >
              <p className="font-semibold flex items-center justify-between">
                {l.label} {lang === l.id && <CheckCircle2 size={18} className="text-primary" />}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{l.sample}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------- Privacy ----------------

function PrivacyPanel({ currentUser, isAlumni, onOpenProfile }: { currentUser: CurrentUser | null; isAlumni: boolean; onOpenProfile?: () => void }) {
  const t = useT();
  const contact = useContactInfo();
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null);
  const deletionMail = `mailto:${contact.email}?subject=${encodeURIComponent('Request to delete my OMSU Alumni Track account')}&body=${encodeURIComponent(
    `Hello Alumni Affairs,\n\nI would like my OMSU Alumni Track account and personal data deleted.\n\nName: ${`${currentUser?.givenName || ''} ${currentUser?.lastName || ''}`.trim()}\nAccount email: ${currentUser?.email || ''}\n\nThank you.`,
  )}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
      <Card icon={<FileText size={18} />} title={t('Your privacy')} sub={t('Your rights under the Data Privacy Act of 2012 (RA 10173).')}>
        <ul className="text-sm space-y-2 list-disc pl-5 text-muted-foreground mb-5">
          <li>{t('Only Alumni Affairs and your program chair can see your tracer record.')}</li>
          <li>{t('Results are published in summary form only.')}</li>
          <li>{t('You can correct your details any time in My Alumni Profile.')}</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-auto">
          <button type="button" onClick={() => setLegal('privacy')} className={btnSoft}>
            {t('Privacy Policy')}
          </button>
          <button type="button" onClick={() => setLegal('terms')} className={btnSoft}>
            {t('Terms of Use')}
          </button>
          {isAlumni && onOpenProfile && (
            <button type="button" onClick={onOpenProfile} className={btnSoft}>
              {t('My Alumni Profile')} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </Card>
      <Card icon={<UserX size={18} />} title={t('Delete my account')} sub={t('Send a request to the Alumni Affairs Office. They will confirm before anything is removed.')}>
        <p className="text-sm text-muted-foreground mb-5">
          {t('Deleting your account removes your sign-in. Alumni Affairs may keep summary statistics that do not identify you.')}
        </p>
        <div className="flex justify-end mt-auto">
          <a href={deletionMail} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100">
            <Mail size={16} /> {t('Request deletion')}
          </a>
        </div>
      </Card>
      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
