import React, { useState, useRef } from 'react';
import { ShieldCheck, KeyRound, Save, User, Mail, Camera, Trash2, ArrowRight, Lock } from 'lucide-react';
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

type Tab = 'account' | 'password';

const input =
  'w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm';

export function Settings({ currentUser, onUpdateProfile, onOpenProfile }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('account');

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
        <p className="text-muted-foreground text-sm mt-1">Manage your account and sign-in security</p>
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
            {navItem('account', <User size={16} />, 'Account', 'Name, photo and mobile')}
            {navItem('password', <KeyRound size={16} />, 'Password', 'Change your password')}
          </nav>
        </aside>

        {/* Right: the selected section */}
        {tab === 'account' ? (
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
        ) : (
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
          </div>
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
