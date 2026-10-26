import React, { useState } from 'react';
import { User, Lock, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PasswordStrength } from './PasswordStrength';
import { passwordStrength } from '@/lib/programs';

export type AuthMode = 'signin' | 'signup' | 'reset';

interface LoginPageProps {
  initialMode?: AuthMode;
  onClose: () => void;
}

const inputClass =
  'w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 text-sm';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

/** Sign-in / sign-up form shown in a panel that slides in from the right of the landing page. */
export function LoginPage({ initialMode = 'signin', onClose }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!isSupabaseConfigured) {
      setError('The app is not connected to the database yet. Please contact the administrator.');
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    setBusy(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        setError(
          error.message === 'Email not confirmed'
            ? 'Please confirm your email first. Check your inbox for the confirmation link.'
            : 'Incorrect email or password.'
        );
      }
      // On success, App picks up the new session automatically.
    } else if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
      } else if (passwordStrength(password).label === 'Weak') {
        setError('Please choose a stronger password.');
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
        if (error) {
          setError(error.message);
        } else if (!data.session) {
          setNotice('Account created! Check your email and click the confirmation link, then sign in.');
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          toast.success('Welcome to the OMSU Alumni Tracer!');
        }
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setNotice('If an account exists for that email, a password reset link has been sent.');
    }

    setBusy(false);
  };

  const title = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create Alumni Account' : 'Reset Password';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
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
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900">
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'signin'
                ? 'Sign in to update your tracer record.'
                : mode === 'signup'
                ? 'For graduates of Occidental Mindoro State University.'
                : "We'll email you a link to set a new password."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
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

            {mode !== 'reset' && (
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                {mode === 'signup' && <PasswordStrength password={password} />}
              </div>
            )}

            {mode === 'signup' && (
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
              disabled={busy}
              className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-xl font-semibold transition-colors text-sm shadow-sm disabled:opacity-60"
            >
              {busy
                ? 'Please wait...'
                : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm space-y-2">
            {mode === 'signin' && (
              <>
                <p className="text-slate-600">
                  New here?{' '}
                  <button onClick={() => switchMode('signup')} className="font-bold text-[#002060] hover:underline">
                    Create an alumni account
                  </button>
                </p>
                <button onClick={() => switchMode('reset')} className="text-xs font-semibold text-slate-500 hover:underline">
                  Forgot your password?
                </button>
              </>
            )}
            {mode !== 'signin' && (
              <p className="text-slate-600">
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} className="font-bold text-[#002060] hover:underline">
                  Sign in
                </button>
              </p>
            )}
            <p className="text-[11px] text-slate-400 pt-2">
              Administrator and program chair accounts are set up by the OMSU Alumni Office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
