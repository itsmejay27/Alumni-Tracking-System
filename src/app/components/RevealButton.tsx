import React from 'react';
import { tr } from '@/lib/preferences';
import { Eye, EyeOff } from 'lucide-react';

/** Eye button placed inside a password field to show or hide what was typed. */
export function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? tr('Hide password') : tr('Show password')}
      title={shown ? tr('Hide password') : tr('Show password')}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-[#002060] transition-colors"
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}
