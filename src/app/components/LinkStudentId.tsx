import React, { useState } from 'react';
import { IdCard, User, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase } from '@/lib/supabase';

/** Shown to alumni whose account is not yet linked to a graduate record. */
export function LinkStudentId({ defaultLastName, onLinked }: { defaultLastName: string; onLinked: () => void }) {
  const [studentId, setStudentId] = useState('');
  const [lastName, setLastName] = useState(defaultLastName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('link_student_id', { p_student_id: studentId.trim(), p_last_name: lastName.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    if (data === 'ok' || data === 'already_linked') {
      toast.success('Your account is now linked to your graduate record');
      onLinked();
    } else {
      setError("We couldn't find an unclaimed graduate record with this Student ID and last name. Check both, or contact your program chair or the Alumni Affairs Office.");
    }
  };

  const input =
    'w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 text-sm';

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="OMSU Logo" className="w-10 h-10 object-contain" />
          <span className="font-bold text-[#002060]">OMSU Alumni Track</span>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Confirm you're an OMSU graduate</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your Student ID and last name to link your account to your graduate record.</p>
        </div>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Student ID</span>
          <div className="relative">
            <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={input} placeholder="e.g. IT-2018-0001" />
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Last name</span>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
          </div>
        </label>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-xl font-semibold text-sm disabled:opacity-60">
          {busy ? 'Checking...' : 'Link my record'}
        </button>
        <button type="button" onClick={() => supabase.auth.signOut()} className="w-full inline-flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <LogOut size={15} /> Sign out
        </button>
      </form>
    </div>
  );
}
