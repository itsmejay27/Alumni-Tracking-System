import React, { useState } from 'react';
import { User, LogOut, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase } from '@/lib/supabase';

/** Shown to alumni whose account is not yet linked to a graduate record. */
export function LinkAlumniRecord({
  defaultGivenName,
  defaultLastName,
  onLinked,
}: {
  defaultGivenName: string;
  defaultLastName: string;
  onLinked: () => void;
}) {
  const [givenName, setGivenName] = useState(defaultGivenName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('link_alumni', {
      p_given: givenName.trim(),
      p_last: lastName.trim(),
      p_birth: birthDate,
      p_sex: sex,
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data === 'ok' || data === 'already_linked') {
      toast.success('Your account is now linked to your graduate record');
      onLinked();
    } else if (data === 'taken') {
      setError('This graduate record is already linked to another account. Contact your program chair or the Alumni Affairs Office.');
    } else {
      setError("We couldn't find a graduate with this name, birthday and sex. Check them against your school records, or contact your program chair or the Alumni Affairs Office.");
    }
  };

  const input =
    'w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 text-sm';
  const label = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="OMSU Logo" className="w-10 h-10 object-contain" />
          <span className="font-bold text-[#002060]">OMSU Alumni Track</span>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Confirm you're an OMSU graduate</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your name, birthday and sex as they appear in your school records to link your account to your graduate record.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>First name</span>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={input} />
            </div>
          </label>
          <label className="block">
            <span className={label}>Last name</span>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
            </div>
          </label>
          <label className="block">
            <span className={label}>Birthday</span>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} className={input} />
            </div>
          </label>
          <label className="block">
            <span className={label}>Sex</span>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select required value={sex} onChange={(e) => setSex(e.target.value)} className={`${input} appearance-none`}>
                <option value="" disabled>
                  Select
                </option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </label>
        </div>
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
