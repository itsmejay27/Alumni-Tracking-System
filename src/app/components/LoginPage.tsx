import React, { useEffect, useState } from 'react';
import { Req } from './RequiredMark';
import { User, Lock, X, Mail, KeyRound, ArrowLeft, Calendar, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { useContactInfo } from '@/lib/settings';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PasswordStrength } from './PasswordStrength';
import { RevealButton } from './RevealButton';
import { passwordStrength } from '@/lib/programs';
import { LegalDoc, LegalModal } from './Legal';

export type AuthMode = 'signin' | 'signup' | 'reset';
type Step = AuthMode | 'verify' | 'resetCode';

interface LoginPageProps {
  initialMode?: AuthMode;
  onClose: () => void;
  /** Called right before a password-reset code is verified, so the app shows "set new password" next. */
  onPasswordRecovery: (active: boolean) => void;
}

const inputClass =
  'w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 text-sm text-slate-900 autofill:shadow-[inset_0_0_0_1000px_#fff] autofill:[-webkit-text-fill-color:#0f172a]';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const COPY: Record<Step, { title: string; sub: string; button: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to update your tracer record.', button: 'Sign In' },
  signup: { title: 'Create your account', sub: 'For OMSU graduates. Your name, birthday and sex must match the University graduate records.', button: 'Create Account' },
  verify: { title: 'Verify your email', sub: '', button: 'Verify Email' },
  reset: { title: 'Forgot password', sub: "Enter your email and we'll send you a verification code.", button: 'Send Code' },
  resetCode: { title: 'Enter your code', sub: '', button: 'Continue' },
};

/** Sign-in / sign-up / forgot-password panel that slides in from the right of the landing page. */
export function LoginPage({ initialMode = 'signin', onClose, onPasswordRecovery }: LoginPageProps) {
  const [step, setStep] = useState<Step>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const go = (next: Step) => {
    setStep(next);
    setError('');
    setNotice('');
    setCode('');
  };

  const cleanEmail = email.toLowerCase().trim();

  const resendCode = async () => {
    setError('');
    const { error } =
      step === 'verify'
        ? await supabase.auth.resend({ type: 'signup', email: cleanEmail })
        : await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) setError(error.message);
    else {
      setNotice('A new code has been sent.');
      setCooldown(60);
    }
  };

  /** Sign-up is only for graduates already in the records: full name + birthday + sex must match. */
  const alumniRecordOk = async () => {
    const { data, error } = await supabase.rpc('check_alumni', {
      p_given: givenName.trim(),
      p_last: lastName.trim(),
      p_birth: birthDate,
      p_sex: sex,
    });
    if (error) {
      setError(error.message);
      return false;
    }
    if (data === 'not_found') {
      setError(
        "We couldn't find a graduate with this name, birthday and sex. Type your first and last name exactly as in your school records, check your birthday, or contact your program chair or the Alumni Affairs Office."
      );
      return false;
    }
    if (data === 'taken') {
      setError('An account already exists for this graduate. Sign in instead, or use "Forgot password?".');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!isSupabaseConfigured) {
      setError('The app is not connected to the database yet. Please contact the administrator.');
      return;
    }
    setBusy(true);

    if (step === 'signin') {
      // 3 wrong passwords lock the email for 30 minutes
      const lockedText = (until: string) =>
        `Too many wrong passwords. This account is locked until ${new Date(until).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}. You can wait, or use "Forgot password?" to reset it.`;
      const { data: lockedUntil } = await supabase.rpc('login_lock_status', { p_email: cleanEmail });
      if (lockedUntil) {
        setError(lockedText(lockedUntil as string));
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        if (error.message === 'Email not confirmed') {
          // Send a fresh code and ask for it
          await supabase.auth.resend({ type: 'signup', email: cleanEmail });
          go('verify');
          setNotice('Your email is not verified yet. We sent you a new code.');
          setCooldown(60);
        } else if (/invalid login credentials/i.test(error.message)) {
          const { data: tally } = await supabase.rpc('login_failed', { p_email: cleanEmail });
          const t = (tally || {}) as { attemptsLeft?: number; lockedUntil?: string | null };
          if (t.lockedUntil) setError(lockedText(t.lockedUntil));
          else if (typeof t.attemptsLeft === 'number')
            setError(`Incorrect email or password. ${t.attemptsLeft} attempt${t.attemptsLeft === 1 ? '' : 's'} left before the account is locked for 30 minutes.`);
          else setError('Incorrect email or password.');
        } else if (/banned/i.test(error.message) || (error as any).code === 'user_banned') {
          setError('This account has been deactivated. Please contact the OMSU Alumni Affairs Office.');
        } else setError(error.message);
      } else {
        // Correct password: start counting from zero again
        await supabase.rpc('login_succeeded');
      }
      // On success, App picks up the new session automatically.
    } else if (step === 'signup') {
      if (passwordStrength(password).label === 'Weak' || password.length < 8) {
        setError('Please choose a stronger password (at least 8 characters).');
      } else if (password !== confirmPassword) {
        setError('Passwords do not match.');
      } else if (!agreed) {
        setError('Please agree to the Terms of Use and Privacy Policy.');
      } else if (!birthDate || !sex) {
        setError('Please enter your birthday and sex.');
      } else if (!(await alumniRecordOk())) {
        // message already set
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { given_name: givenName.trim(), last_name: lastName.trim(), birth_date: birthDate, sex },
          },
        });
        if (error) setError(/database error|alumni_record/i.test(error.message) ? 'Your name, birthday and sex do not match our graduate records.' : error.message);
        else if (data.user && data.user.identities?.length === 0) setError('An account with this email already exists. Try signing in.');
        else if (!data.session) {
          go('verify');
          setCooldown(60);
        } else toast.success('Welcome to the OMSU Alumni Track!');
      }
    } else if (step === 'verify') {
      const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: 'email' });
      if (error) setError('That code is wrong or has expired. Check the latest email or send a new code.');
      else toast.success('Email verified. Welcome to the OMSU Alumni Track!');
    } else if (step === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) setError(error.message);
      else {
        go('resetCode');
        setCooldown(60);
      }
    } else if (step === 'resetCode') {
      onPasswordRecovery(true);
      const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: 'recovery' });
      if (error) {
        onPasswordRecovery(false);
        setError('That code is wrong or has expired. Check the latest email or send a new code.');
      }
    }

    setBusy(false);
  };

  const contact = useContactInfo();
  const [capsLock, setCapsLock] = useState(false);
  const copy = COPY[step];
  const codeStep = step === 'verify' || step === 'resetCode';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative h-full w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OMSU Logo" className="w-9 h-9 object-contain" />
            <span className="text-sm font-bold text-[#002060]">OMSU Alumni Track</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Form sits in the middle of the panel; help and links stay at the bottom */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 py-8">
          {(step === 'reset' || codeStep) && (
            <button onClick={() => go(step === 'verify' ? 'signup' : 'signin')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#002060]">
              <ArrowLeft size={15} /> Back
            </button>
          )}

          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900">{copy.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {codeStep ? (
                <>
                  We sent a verification code to <span className="font-semibold text-slate-700">{cleanEmail}</span>. Enter it below.
                </>
              ) : (
                copy.sub
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name <Req /></label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={inputClass} placeholder="Juan" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Last Name <Req /></label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Dela Cruz" />
                  </div>
                </div>
              </div>
            )}

            {step === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Birthday <Req /></label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="date"
                      value={birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Sex <Req /></label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select required value={sex} onChange={(e) => setSex(e.target.value)} className={`${inputClass} appearance-none`}>
                      <option value="" disabled>
                        Select
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <p className="sm:col-span-2 -mt-2 text-xs text-slate-500">
                  Use the name, birthday and sex in your OMSU school records. We use them to find your graduate record.
                </p>
              </div>
            )}

            {!codeStep && (
              <div>
                <label className={labelClass}>Email Address <Req /></label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            )}

            {(step === 'signin' || step === 'signup') && (
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Password <Req /></label>
                  {step === 'signin' && (
                    <button type="button" onClick={() => go('reset')} className="text-xs font-semibold text-[#002060] hover:underline mb-1.5">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                    onBlur={() => setCapsLock(false)}
                    className={`${inputClass} pr-11`}
                    placeholder="••••••••"
                  />
                  <RevealButton shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
                {capsLock && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-600">
                    <AlertTriangle size={13} /> Caps Lock is on
                  </p>
                )}
                {step === 'signup' && <PasswordStrength password={password} />}
              </div>
            )}

            {step === 'signup' && (
              <div>
                <label className={labelClass}>Confirm Password <Req /></label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                    placeholder="••••••••"
                  />
                  <RevealButton shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                </div>
              </div>
            )}

            {step === 'signup' && (
              <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#002060] shrink-0"
                />
                <span>
                  I agree to the{' '}
                  <button type="button" onClick={() => setLegal('terms')} className="font-semibold text-[#002060] hover:underline">Terms of Use</button>{' '}
                  and{' '}
                  <button type="button" onClick={() => setLegal('privacy')} className="font-semibold text-[#002060] hover:underline">Privacy Policy</button>, and I
                  consent to OMSU processing my data for the Graduate Tracer Study.
                </span>
              </label>
            )}

            {codeStep && (
              <div>
                <label className={labelClass}>Verification code <Req /></label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`${inputClass} tracking-[0.4em] font-mono text-lg`}
                    placeholder="000000"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>Check your spam folder if you don't see it.</span>
                  <button type="button" disabled={cooldown > 0} onClick={resendCode} className="font-semibold text-[#002060] disabled:text-slate-400 hover:underline">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {notice && (
              <div className="bg-emerald-50 rounded-xl px-4 py-3">
                <p className="text-sm text-emerald-800">{notice}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || (codeStep && code.length < 6)}
              className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-xl font-semibold transition-colors text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? 'Please wait...' : copy.button}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm space-y-2">
            {step === 'signin' ? (
              <p className="text-slate-600">
                New here?{' '}
                <button onClick={() => go('signup')} className="font-bold text-[#002060] hover:underline">
                  Create an alumni account
                </button>
              </p>
            ) : (
              <p className="text-slate-600">
                Already have an account?{' '}
                <button onClick={() => go('signin')} className="font-bold text-[#002060] hover:underline">
                  Sign in
                </button>
              </p>
            )}
            <p className="text-xs text-slate-400 pt-1">
              Alumni Affairs and program chair accounts are created by the OMSU Alumni Affairs Office.
            </p>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-5 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-700">Need help signing in?</p>
          <p className="flex items-start gap-2">
            <Mail size={14} className="mt-0.5 shrink-0" />
            <a href={`mailto:${contact.email}`} className="hover:text-[#002060] hover:underline break-all">
              {contact.email}
            </a>
          </p>
          <p className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 shrink-0" />
            <span>{contact.officeHours}</span>
          </p>
          <p className="pt-1">
            <button type="button" onClick={() => setLegal('terms')} className="text-xs hover:text-[#002060] hover:underline">Terms of Use</button>
            <span className="mx-2">·</span>
            <button type="button" onClick={() => setLegal('privacy')} className="text-xs hover:text-[#002060] hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
