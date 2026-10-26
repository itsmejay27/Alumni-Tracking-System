import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Copy, Mail, ShieldCheck, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { LoadingState, ErrorState } from './DataState';

const ROLE_OPTIONS = [
  { value: 'admin.bsit', label: 'BSIT Program Chair' },
  { value: 'admin.beed', label: 'BEED Program Chair' },
  { value: 'admin.bsba-fm', label: 'BSBA-FM Program Chair' },
  { value: 'admin.bsba-om', label: 'BSBA-OM Program Chair' },
  { value: 'admin.bsoa', label: 'BSOA Program Chair' },
  { value: 'admin', label: 'Super Admin' },
  { value: 'alumni', label: 'Alumni Member' },
];
const roleLabel = (r: string) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r;

interface Account {
  id: string;
  email: string;
  role: string;
  given_name: string;
  last_name: string;
  title: string;
  must_change_password: boolean;
  created_at: string;
}

interface InviteResult {
  email: string;
  tempPassword: string;
  emailSent: boolean;
  emailError: string | null;
}

const inputClass =
  'w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm';

export function AccountsManager({ currentUserId }: { currentUserId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showStaffOnly, setShowStaffOnly] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [givenName, setGivenName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin.bsit');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, given_name, last_name, title, must_change_password, created_at')
      .order('created_at', { ascending: false });
    if (error) setLoadError(error.message);
    else {
      setLoadError(null);
      setAccounts(data as Account[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { data, error } = await supabase.functions.invoke('invite-account', {
      body: {
        email,
        givenName,
        lastName,
        role,
        title: title || roleLabel(role),
        siteUrl: window.location.origin,
      },
    });
    setSending(false);

    if (error) {
      // The function puts a readable message in the response body
      let message = error.message;
      try {
        const body = await (error as any).context?.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep default message */
      }
      toast.error(message);
      return;
    }

    setResult({ email, tempPassword: data.tempPassword, emailSent: data.emailSent, emailError: data.emailError });
    toast.success(data.emailSent ? `Invitation sent to ${email}` : `Account created for ${email}`);
    setGivenName('');
    setLastName('');
    setEmail('');
    setTitle('');
    setShowForm(false);
    load();
  };

  const handleRoleChange = async (acc: Account, newRole: string) => {
    if (acc.id === currentUserId) {
      toast.error("You can't change your own role.");
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, title: roleLabel(newRole) })
      .eq('id', acc.id);
    if (error) {
      toast.error(`Could not change role: ${error.message}`);
      return;
    }
    toast.success(`${acc.email} is now ${roleLabel(newRole)}. They need to sign in again to see the change.`);
    load();
  };

  const visible = accounts.filter((a) => {
    if (showStaffOnly && !a.role.startsWith('admin')) return false;
    const q = search.toLowerCase();
    return !q || a.email.includes(q) || `${a.given_name} ${a.last_name}`.toLowerCase().includes(q);
  });

  if (loading) return <LoadingState label="Loading accounts..." />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Manage Accounts</h2>
          <p className="text-muted-foreground mt-1">Create accounts for program chairs and staff, and assign their roles</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-sm hover:bg-primary/95"
        >
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          {showForm ? 'Cancel' : 'Create Account'}
        </button>
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-emerald-800">Account created for {result.email}</p>
                <p className="text-sm text-emerald-700 mt-1">
                  {result.emailSent
                    ? 'An invitation email with the temporary password has been sent.'
                    : `The invitation email was not sent (${result.emailError}). Share the temporary password below with the person directly.`}
                </p>
              </div>
            </div>
            <button onClick={() => setResult(null)} className="text-emerald-700 hover:text-emerald-900">
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white border border-emerald-200 rounded-lg px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Temporary password</span>
            <code className="font-mono text-base text-slate-900">{result.tempPassword}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.tempPassword);
                toast.success('Copied');
              }}
              className="ml-auto flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Copy size={14} /> Copy
            </button>
          </div>
          <p className="text-xs text-emerald-700">
            This password is shown only once. The person will be asked to choose a new password the first time they sign in.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleInvite} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Mail size={18} className="text-primary" />
            <h3 className="font-bold">Invite a new account</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">First Name *</label>
              <input required value={givenName} onChange={(e) => setGivenName(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Last Name *</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Email Address *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Role / Department *</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold">Position Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder={roleLabel(role)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A temporary password will be generated and emailed to this person. They will be asked to change it when they first sign in.
          </p>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm disabled:opacity-60"
          >
            {sending ? 'Creating account...' : 'Create Account & Send Invitation'}
          </button>
        </form>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-border">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full pl-9 pr-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={showStaffOnly} onChange={(e) => setShowStaffOnly(e.target.checked)} />
            Staff accounts only
          </label>
        </div>

        <div className="divide-y divide-border">
          {visible.map((a) => (
            <div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">
                  {`${a.given_name} ${a.last_name}`.trim() || '(no name)'}
                  {a.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-sm text-muted-foreground truncate">{a.email}</p>
                {a.must_change_password && (
                  <p className="text-xs text-amber-600 font-semibold mt-0.5">Invitation pending — has not changed temporary password yet</p>
                )}
              </div>
              <select
                value={a.role}
                disabled={a.id === currentUserId}
                onChange={(e) => handleRoleChange(a, e.target.value)}
                className="px-3 py-2 bg-input-background border border-border rounded-lg text-sm font-medium disabled:opacity-60 md:w-56"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {visible.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No accounts found.</p>}
        </div>
      </div>
    </div>
  );
}
