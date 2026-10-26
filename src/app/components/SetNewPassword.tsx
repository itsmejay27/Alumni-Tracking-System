import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { PasswordStrength } from './PasswordStrength';
import { RevealButton } from './RevealButton';
import { passwordStrength } from '@/lib/programs';

/** Shown after someone opens a password-reset link from their email. */
export function SetNewPassword({ onDone, message }: { onDone: () => void | Promise<void>; message?: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (passwordStrength(password).label === 'Weak') {
      toast.error('Please choose a stronger password.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated.');
    await onDone();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-md space-y-5">
        <h1 className="text-xl font-black text-[#002060]">Set a new password</h1>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        {[{ v: password, set: setPassword, label: 'New Password' }, { v: confirm, set: setConfirm, label: 'Confirm Password' }].map((f) => (
          <div key={f.label}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{f.label}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={shown[f.label] ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#002060] text-sm"
              />
              <RevealButton shown={!!shown[f.label]} onToggle={() => setShown((s) => ({ ...s, [f.label]: !s[f.label] }))} />
            </div>
          </div>
        ))}
        <PasswordStrength password={password} />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-lg font-bold text-sm disabled:opacity-60"
        >
          {busy ? 'Saving...' : 'Save Password'}
        </button>
      </form>
    </div>
  );
}
