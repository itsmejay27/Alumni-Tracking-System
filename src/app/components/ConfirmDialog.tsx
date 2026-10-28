import React, { useEffect, useState } from 'react';
import { useT } from '@/lib/preferences';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let show: ((p: Pending) => void) | null = null;

/** In-app replacement for window.confirm. Resolves true when the user confirms. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) return resolve(window.confirm(options.message || options.title));
    show({ ...options, resolve });
  });
}

/** Mount once near the root of the app. */
export function ConfirmHost() {
  const t = useT();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    show = setPending;
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  if (!pending) return null;
  const { title, message, confirmLabel = t('Confirm'), cancelLabel = t('Cancel'), danger } = pending;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-slate-900/40 animate-in fade-in duration-150" onClick={() => close(false)} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 fade-in duration-150">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-50 text-red-600' : 'bg-[#002060]/10 text-[#002060]'}`}>
          {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
        </div>
        <h2 id="confirm-title" className="text-base font-semibold text-slate-900">{title}</h2>
        {message && <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{message}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => close(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200">
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#002060] hover:bg-[#001740]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
