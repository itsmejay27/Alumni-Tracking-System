import React from 'react';
import { Toaster } from 'sonner';

/** One clean, consistent style for every notification in the app. */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-xl !border !border-slate-200 !bg-white !text-slate-800 !shadow-lg !px-4 !py-3 !gap-3 !font-sans',
          title: '!text-sm !font-medium',
          description: '!text-xs !text-slate-500',
          success: '[&_[data-icon]]:!text-emerald-600',
          error: '[&_[data-icon]]:!text-red-600',
          info: '[&_[data-icon]]:!text-[#002060]',
          warning: '[&_[data-icon]]:!text-amber-600',
          closeButton: '!bg-white !border-slate-200 !text-slate-500',
        },
      }}
    />
  );
}
