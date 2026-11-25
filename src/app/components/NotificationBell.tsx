import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Briefcase, Megaphone, CheckCircle2, XCircle, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/preferences';
import { mdy } from '@/lib/dates';

interface Item {
  id: string;
  kind: 'job' | 'announcement' | 'approved' | 'rejected';
  title: string;
  sub: string;
  at: string;
  tab: 'jobs' | 'announcements';
}

/**
 * In-app notifications (panel: not only by email). Lists new announcements, new jobs and
 * decisions on your own job posts. "New" means after the last time you opened the bell,
 * which is saved on your account so it is the same on every device. It can be turned off in
 * Settings → Notifications.
 */
export function NotificationBell({ userId, onOpenTab, tone = 'light' }: { userId: string; onOpenTab: (tab: string) => void; tone?: 'light' | 'dark' }) {
  const t = useT();
  const [enabled, setEnabled] = useState(true);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data: me } = await supabase.from('profiles').select('app_notifications, notifications_seen_at, created_at').eq('id', userId).maybeSingle();
    if (me && me.app_notifications === false) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    // First time: count only what was posted after the account was made
    setSeenAt(me?.notifications_seen_at || me?.created_at || null);
    const [ann, jobs, mine] = await Promise.all([
      supabase.from('announcements').select('id, title, category, created_at, created_by').order('created_at', { ascending: false }).limit(10),
      supabase.from('jobs').select('id, title, company, created_at, created_by, status').eq('status', 'approved').order('created_at', { ascending: false }).limit(10),
      supabase.from('jobs').select('id, title, status, reviewed_at').eq('created_by', userId).not('reviewed_at', 'is', null).order('reviewed_at', { ascending: false }).limit(5),
    ]);
    const list: Item[] = [
      ...(ann.data || []).filter((a) => a.created_by !== userId).map((a) => ({
        id: `a-${a.id}`, kind: 'announcement' as const, title: a.title, sub: a.category || t('Announcement'), at: a.created_at, tab: 'announcements' as const,
      })),
      ...(jobs.data || []).filter((j) => j.created_by !== userId).map((j) => ({
        id: `j-${j.id}`, kind: 'job' as const, title: j.title, sub: j.company, at: j.created_at, tab: 'jobs' as const,
      })),
      ...(mine.data || []).filter((j) => j.status === 'approved' || j.status === 'rejected').map((j) => ({
        id: `m-${j.id}`,
        kind: (j.status === 'approved' ? 'approved' : 'rejected') as Item['kind'],
        title: j.title,
        sub: j.status === 'approved' ? t('Your job post was approved and is now on the Job Board') : t('Your job post was not approved'),
        at: j.reviewed_at as string,
        tab: 'jobs' as const,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
    setItems(list);
  }, [userId, t]);

  // Load now, every 2 minutes, and when the window gets focus again
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 120000);
    window.addEventListener('focus', load);
    window.addEventListener('omsu-notifications-changed', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener('omsu-notifications-changed', load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) {
        setOpen(false);
        load(); // picks up the new "seen" time so the count clears
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open, load]);

  if (!enabled) return null;
  const unread = items.filter((i) => !seenAt || i.at > seenAt).length;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      const now = new Date().toISOString();
      // Keep the dots while the list is open; the count clears
      await supabase.from('profiles').update({ notifications_seen_at: now }).eq('id', userId);
    }
    if (!next) load();
  };

  const icon = (k: Item['kind']) =>
    k === 'job' ? <Briefcase size={16} /> : k === 'announcement' ? <Megaphone size={16} /> : k === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? t('Notifications ({n} new)', { n: unread }) : t('Notifications')}
        aria-expanded={open}
        className={`relative p-2 rounded-lg transition-colors ${tone === 'dark' ? 'border border-white/20 hover:bg-white/10 text-white' : 'bg-card border border-border shadow-sm hover:bg-muted text-foreground'}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-card text-foreground border border-border rounded-2xl shadow-2xl z-50" role="dialog" aria-label={t('Notifications')}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">{t('Notifications')}</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenTab('settings');
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <SettingsIcon size={13} /> {t('Settings')}
            </button>
          </div>
          {!items.length ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">{t('Nothing new yet. New jobs and announcements show here.')}</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((i) => {
                const isNew = !seenAt || i.at > seenAt;
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        load();
                        onOpenTab(i.tab);
                      }}
                      className="w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/60"
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i.kind === 'rejected' ? 'bg-red-50 text-red-700' : i.kind === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                        {icon(i.kind)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{i.title}</span>
                        <span className="block text-xs text-muted-foreground truncate">{i.kind === 'job' ? `${t('New job')} · ${i.sub}` : i.sub}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">{mdy(i.at)}</span>
                      </span>
                      {isNew && <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" aria-label={t('New')} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
