import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { supabase } from '@/lib/supabase';
import { emailTwoStep } from '@/lib/emailTwoStep';

/** Second sign-in step for accounts with two-step verification: a 6-digit code from an authenticator app. */
export function MfaChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f) => f.status === 'verified');
    if (listError || !factor) {
      setBusy(false);
      setError('Could not find your authenticator. Please sign in again.');
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (verifyError) {
      setError('That code is not correct or has expired. Try the newest code in your app.');
      setCode('');
      return;
    }
    onVerified();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={verify} className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-7 space-y-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="w-10 h-10 object-contain" />
          <p className="font-bold text-[#002060]">OMSU Alumni Track</p>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-[#002060]" size={22} /> Two-step verification
          </h1>
          <p className="text-sm text-slate-600">Open your authenticator app and enter the 6-digit code for OMSU Alumni Track.</p>
        </div>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15"
        />
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-[#002060] text-white font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {busy && <Loader2 size={16} className="animate-spin" />} Verify
        </button>
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">Lost your phone? Contact the Alumni Affairs Office to turn off two-step verification for your account.</p>
          <button type="button" onClick={() => supabase.auth.signOut()} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#002060]">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </form>
    </div>
  );
}

/** Second sign-in step for accounts that chose email codes: a 6-digit code is emailed to them. */
export function EmailChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [wait, setWait] = useState(0);
  const sentOnce = useRef(false);

  const send = async () => {
    setError('');
    const res = await emailTwoStep({ action: 'send', purpose: 'signin' });
    if (res.error) {
      setError(res.error);
      if (res.wait) setWait(res.wait);
      return;
    }
    if (res.sentTo) setSentTo(res.sentTo);
    setWait(60);
  };

  // Send the first code as soon as this screen opens
  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    send();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const verify = async (value = code) => {
    setError('');
    if (value.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    const res = await emailTwoStep({ action: 'verify', code: value });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      setCode('');
      return;
    }
    onVerified();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-7 space-y-5"
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="w-10 h-10 object-contain" />
          <p className="font-bold text-[#002060]">OMSU Alumni Track</p>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-[#002060]" size={22} /> Check your email
          </h1>
          <p className="text-sm text-slate-600">
            {sentTo ? `We sent a 6-digit code to ${sentTo}.` : 'Sending a 6-digit code to your email...'} Type it below to finish signing in.
          </p>
        </div>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            if (v.length === 6) verify(v);
          }}
          placeholder="000000"
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15"
        />
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-[#002060] text-white font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {busy && <Loader2 size={16} className="animate-spin" />} Verify
        </button>
        <div className="text-center space-y-2">
          <button type="button" onClick={send} disabled={wait > 0} className="text-sm font-semibold text-[#002060] hover:underline disabled:text-slate-400 disabled:no-underline">
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
          <p className="text-xs text-slate-500">Not in your inbox? Check Spam or Promotions. The code expires in 10 minutes.</p>
          <button type="button" onClick={() => supabase.auth.signOut()} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#002060]">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </form>
    </div>
  );
}
