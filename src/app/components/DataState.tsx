import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export function LoadingState({ label = 'Loading records...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
      <AlertCircle className="text-red-600 shrink-0" size={20} />
      <div>
        <p className="font-bold text-red-700 text-sm">Could not load data</p>
        <p className="text-xs text-red-600 mt-1">{message}</p>
      </div>
    </div>
  );
}
