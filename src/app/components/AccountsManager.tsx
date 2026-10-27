import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Copy, Mail, X, Search, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from './ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { LoadingState, ErrorState } from './DataState';
import { Pagination, usePaged } from './Pagination';

const ROLE_OPTIONS = [
  { value: 'admin.bsit', label: 'BSIT Program Chair' },
  { value: 'admin.beed', label: 'BEED Program Chair' },
  { value: 'admin.bsba-fm', label: 'BSBA-FM Program Chair' },
  { value: 'admin.bsba-om', label: 'BSBA-OM Program Chair' },
  { value: 'admin.bsoa', label: 'BSOA Program Chair' },
  { value: 'admin', label: 'Alumni Affairs' },
  { value: 'alumni', label: 'Alumni Member' },
];
// Alumni sign up themselves (checked against the graduate records), so only staff roles can be created here
const STAFF_ROLE_OPTIONS = ROLE_OPTIONS.filter((o) => o.value !== 'alumni');
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

const actionBtn =
  'w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card text-sm font-medium disabled:opacity-50';

const inputClass =
  'w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm';

export function AccountsManager({ currentUserId }: { currentUserId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('staff');
  const [statusFilter, setStatusFilter] = useState('all');
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

    if (data.emailSent) toast.success(`Invitation sent to ${email}`);
    // Only when the email could not be sent do we show the password, so it can be shared another way
    else setResult({ email, tempPassword: data.tempPassword, emailSent: false, emailError: data.emailError });
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

  const invokeError = async (error: any) => {
    let message = error.message;
    try {
      const body = await error.context?.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default message */
    }
    return message as string;
  };

  const [resending, setResending] = useState<string | null>(null);
  const handleResend = async (acc: Account) => {
    setResending(acc.id);
    const { data, error } = await supabase.functions.invoke('invite-account', {
      body: { action: 'resend', userId: acc.id, siteUrl: window.location.origin },
    });
    setResending(null);
    if (error) {
      toast.error(await invokeError(error));
      return;
    }
    const until = data.expiresAt ? new Date(data.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    if (data.emailSent)
      toast.success(
        data.samePassword
          ? `Invitation sent again to ${acc.email} with the same temporary password (it stays the same until ${until}).`
          : `Invitation sent to ${acc.email} with a new temporary password${until ? ` (resending before ${until} keeps the same one)` : ''}.`
      );
    else setResult({ email: acc.email, tempPassword: data.tempPassword, emailSent: false, emailError: data.emailError });
  };

  const handleRemove = async (acc: Account) => {
    const pending = acc.must_change_password;
    const name = `${acc.given_name} ${acc.last_name}`.trim() || acc.email;
    const ok = await confirmDialog(
      pending
        ? {
            title: `Cancel the invitation for ${name}?`,
            message: 'Their account will be deleted and the temporary password will stop working.',
            confirmLabel: 'Cancel invitation',
            cancelLabel: 'Keep',
            danger: true,
          }
        : {
            title: `Remove ${name}'s account?`,
            message: 'They will no longer be able to sign in. Their tracer record, if any, is kept.',
            confirmLabel: 'Remove account',
            danger: true,
          }
    );
    if (!ok) return;
    const { error } = await supabase.functions.invoke('invite-account', { body: { action: 'delete', userId: acc.id } });
    if (error) {
      toast.error(await invokeError(error));
      return;
    }
    toast.success(pending ? 'Invitation cancelled' : 'Account removed');
    setAccounts((list) => list.filter((a) => a.id !== acc.id));
  };

  const visible = accounts.filter((a) => {
    if (roleFilter === 'staff' && !a.role.startsWith('admin')) return false;
    if (roleFilter !== 'staff' && roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (statusFilter === 'pending' && !a.must_change_password) return false;
    if (statusFilter === 'active' && a.must_change_password) return false;
    const q = search.toLowerCase();
    return !q || a.email.includes(q) || `${a.given_name} ${a.last_name}`.toLowerCase().includes(q);
  });
  const paged = usePaged(visible, 10);
  const filtersOn = roleFilter !== 'staff' || statusFilter !== 'all' || !!search;

  if (loading) return <LoadingState label="Loading accounts..." />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Accounts</h2>
          <p className="text-muted-foreground mt-1">Create accounts for program chairs and staff, and assign their roles</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/95"
        >
          <UserPlus size={18} />
          Create Account
        </button>
      </div>

      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setResult(null)} />
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">The invitation email could not be sent</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The account for {result.email} is ready. Share this temporary password with them directly. ({result.emailError})
                </p>
              </div>
              <button onClick={() => setResult(null)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
              <code className="font-mono text-base">{result.tempPassword}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.tempPassword);
                  toast.success('Copied');
                }}
                className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <p className="text-xs text-muted-foreground">This is shown only once. They will choose their own password on first sign-in.</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create account">
          <div className="absolute inset-0 bg-slate-900/40 animate-in fade-in duration-150" onClick={() => !sending && setShowForm(false)} />
        <form onSubmit={handleInvite} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 fade-in duration-150">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="font-semibold">Create account</h3>
                <p className="text-xs text-muted-foreground">They'll get an email with a temporary password.</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
              <X size={18} />
            </button>
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
                {STAFF_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Staff accounts are created here. Alumni create their own accounts with their name, birthday and sex, which must match the graduate records.
              </p>
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
            They will be asked to change the temporary password the first time they sign in.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {sending ? 'Creating...' : 'Create & send invitation'}
            </button>
          </div>
        </form>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm">
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
<select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select sm:w-52" aria-label="Filter by role">
            <option value="staff">All staff</option>
            {STAFF_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value="alumni">Alumni members</option>
            <option value="all">Everyone</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select sm:w-44" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Invitation pending</option>
          </select>
          {filtersOn && (
            <button
              onClick={() => {
                setRoleFilter('staff');
                setStatusFilter('all');
                setSearch('');
              }}
              className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="divide-y divide-border">
          {paged.pageItems.map((a) => (
            <div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">
                  {`${a.given_name} ${a.last_name}`.trim() || '(no name)'}
                  {a.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-sm text-muted-foreground truncate">{a.email}</p>
                {a.must_change_password && (
                  <span className="inline-block mt-1 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">Invitation pending</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                <select
                  value={a.role}
                  disabled={a.id === currentUserId}
                  onChange={(e) => handleRoleChange(a, e.target.value)}
                  className="h-9 px-3 bg-input-background border border-border rounded-lg text-sm disabled:opacity-60 w-full md:w-56"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {/* Two fixed-width action slots so every row lines up */}
                <div className="w-[7.5rem]">
                  {a.must_change_password && (
                    <button
                      onClick={() => handleResend(a)}
                      disabled={resending === a.id}
                      title="Send a new invitation with a new temporary password"
                      className={actionBtn + ' text-primary border-primary/25 hover:bg-primary/5'}
                    >
                      <RefreshCw size={14} className={resending === a.id ? 'animate-spin' : ''} />
                      {resending === a.id ? 'Sending' : 'Resend'}
                    </button>
                  )}
                </div>
                <div className="w-[7.5rem]">
                  {a.id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(a)}
                      title={a.must_change_password ? 'Cancel invitation' : 'Remove account'}
                      className={actionBtn + ' text-red-600 border-red-200 hover:bg-red-50'}
                    >
                      {a.must_change_password ? <X size={14} /> : <Trash2 size={14} />}
                      {a.must_change_password ? 'Cancel' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No accounts found.</p>}
        </div>
        <div className="px-4 border-t border-border">
          <Pagination {...paged} label="accounts" />
        </div>
      </div>
    </div>
  );
}
