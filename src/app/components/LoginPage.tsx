import React, { useState } from 'react';
import { User, Lock, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AuthMode = 'signin' | 'signup' | 'reset';

interface LoginPageProps {
  initialMode?: AuthMode;
  onBack: () => void;
}

const inputClass =
  'w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#002060] focus:ring-1 focus:ring-[#002060] text-sm font-medium';
const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';

export function LoginPage({ initialMode = 'signin', onBack }: LoginPageProps) {
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

  const title = mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Alumni Account' : 'Reset Password';

  return (
    <div className="size-full min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#002060]"
        >
          <ArrowLeft size={16} /> Back to home
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-md">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow border border-slate-200 overflow-hidden p-1">
              <img src={logo} alt="OMSU Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-[#002060]">OMSU Alumni Graduate Tracer</h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-1.5">
              Occidental Mindoro State University
            </p>
            <p className="text-sm font-bold text-slate-700 mt-5">{title}</p>
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}
            {notice && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5">
                <p className="text-xs font-bold text-emerald-700">{notice}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-lg font-bold transition-colors text-sm shadow-sm disabled:opacity-60"
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
