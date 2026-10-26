import React, { useEffect, useState } from 'react';
import { User, Lock, X, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PasswordStrength } from './PasswordStrength';
import { passwordStrength } from '@/lib/programs';

export type AuthMode = 'signin' | 'signup' | 'reset';
type Step = AuthMode | 'verify' | 'resetCode';

interface LoginPageProps {
  initialMode?: AuthMode;
  onClose: () => void;
  /** Called right before a password-reset code is verified, so the app shows "set new password" next. */
  onPasswordRecovery: (active: boolean) => void;
}

const inputClass =
  'w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 text-sm';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const COPY: Record<Step, { title: string; sub: string; button: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to update your tracer record.', button: 'Sign In' },
  signup: { title: 'Create your account', sub: 'For graduates of Occidental Mindoro State University.', button: 'Create Account' },
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
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        if (error.message === 'Email not confirmed') {
          // Send a fresh code and ask for it
          await supabase.auth.resend({ type: 'signup', email: cleanEmail });
          go('verify');
          setNotice('Your email is not verified yet. We sent you a new code.');
          setCooldown(60);
        } else setError('Incorrect email or password.');
      }
      // On success, App picks up the new session automatically.
    } else if (step === 'signup') {
      if (passwordStrength(password).label === 'Weak' || password.length < 8) {
        setError('Please choose a stronger password (at least 8 characters).');
      } else if (password !== confirmPassword) {
        setError('Passwords do not match.');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { given_name: givenName.trim(), last_name: lastName.trim() },
          },
        });
        if (error) setError(error.message);
        else if (data.user && data.user.identities?.length === 0) setError('An account with this email already exists. Try signing in.');
        else if (!data.session) {
          go('verify');
          setCooldown(60);
        } else toast.success('Welcome to the OMSU Alumni Tracer!');
      }
    } else if (step === 'verify') {
      const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: 'email' });
      if (error) setError('That code is wrong or has expired. Check the latest email or send a new code.');
      else toast.success('Email verified. Welcome to the OMSU Alumni Tracer!');
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

  const copy = COPY[step];
  const codeStep = step === 'verify' || step === 'resetCode';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative h-full w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OMSU Logo" className="w-9 h-9 object-contain" />
            <span className="text-sm font-bold text-[#002060]">OMSU Alumni Tracer</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 sm:px-8 pt-8 pb-10">
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
                  <label className={labelClass}>First Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={inputClass} placeholder="Juan" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Dela Cruz" />
                  </div>
                </div>
              </div>
            )}

            {!codeStep && (
              <div>
                <label className={labelClass}>Email Address</label>
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
                  <label className={labelClass}>Password</label>
                  {step === 'signin' && (
                    <button type="button" onClick={() => go('reset')} className="text-xs font-semibold text-[#002060] hover:underline mb-1.5">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                {step === 'signup' && <PasswordStrength password={password} />}
              </div>
            )}

            {step === 'signup' && (
              <div>
                <label className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {codeStep && (
              <div>
                <label className={labelClass}>Verification code</label>
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
              className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-xl font-semibold transition-colors text-sm disabled:opacity-60"
            >
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
            <p className="text-[11px] text-slate-400 pt-2">
              Alumni Affairs and program chair accounts are created by the OMSU Alumni Affairs Office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
