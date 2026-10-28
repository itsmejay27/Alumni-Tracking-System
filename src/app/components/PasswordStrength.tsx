import React from 'react';
import { passwordStrength } from '@/lib/programs';

/** Weak / Medium / Strong meter shown under new-password fields. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { label, score } = passwordStrength(password);
  const bars = label === 'Weak' ? 1 : label === 'Medium' ? 2 : 3;
  const color = label === 'Weak' ? 'bg-red-500' : label === 'Medium' ? 'bg-amber-500' : 'bg-emerald-600';
  const text = label === 'Weak' ? 'text-red-600' : label === 'Medium' ? 'text-amber-700' : 'text-emerald-700';
  const hint =
    label === 'Strong'
      ? 'Good password.'
      : 'Use 12+ characters with upper and lower case letters, a number and a symbol.';
  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < bars ? color : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className="text-xs">
        <span className={`font-semibold ${text}`}>{label}</span>
        <span className="text-slate-500"> · {hint}</span>
        <span className="sr-only">score {score}</span>
      </p>
    </div>
  );
}
