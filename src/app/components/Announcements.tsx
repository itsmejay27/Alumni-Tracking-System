import React, { useCallback, useEffect, useState } from 'react';
import { Req } from './RequiredMark';
import { useT } from '@/lib/preferences';
import { Megaphone, Calendar, Tag, Trash2, Plus, AlertCircle, FileText, CheckCircle2, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from './ConfirmDialog';
import { Pagination, usePaged } from './Pagination';
import { supabase } from '@/lib/supabase';
import { courseScopeForRole } from '@/lib/alumni';
import { roleLabel } from '@/lib/programs';
import { LoadingState, ErrorState } from './DataState';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Event' | 'Job Seminar' | 'General' | 'Homecoming';
  date: string;
  author: string;
  course?: string;
  createdBy?: string;
}

interface AnnouncementsProps {
  userRole: string;
  authorName: string;
}

export function Announcements({ userRole, authorName }: AnnouncementsProps) {
  const t = useT();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Event' | 'Job Seminar' | 'General' | 'Homecoming'>('General');
  const [targetCourse, setTargetCourse] = useState('all');
  const [emailAlumni, setEmailAlumni] = useState(true);
  const [posting, setPosting] = useState(false);

  const isAdmin = userRole.startsWith('admin');
  const adminCourse = courseScopeForRole(userRole);
  // Program chairs choose: everyone, or their own department only
  const [chairAudience, setChairAudience] = useState<'department' | 'everyone'>('department');
  const [myId, setMyId] = useState<string | null>(null);
  // Announcements this person hid for themselves (others still see them)
  const [hidden, setHidden] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const hiddenKey = myId ? `omsu-hidden-announcements:${myId}` : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);
  useEffect(() => {
    if (!hiddenKey) return;
    try {
      setHidden(JSON.parse(localStorage.getItem(hiddenKey) || '[]'));
    } catch {
      setHidden([]);
    }
  }, [hiddenKey]);
  const setHiddenList = (next: string[]) => {
    setHidden(next);
    try {
      if (hiddenKey) localStorage.setItem(hiddenKey, JSON.stringify(next));
    } catch {
      /* private mode: hiding just lasts until reload */
    }
  };

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, category, course, author, created_at, created_by')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setAnnouncements(
        data.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          category: a.category,
          course: a.course || undefined,
          author: a.author,
          createdBy: a.created_by || undefined,
          date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const course =
      userRole === 'admin' ? (targetCourse === 'all' ? null : targetCourse) : chairAudience === 'everyone' ? null : adminCourse;
    setPosting(true);
    const { data: created, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        category,
        course,
        author: `${authorName} · ${roleLabel(userRole)}`,
      })
      .select('id')
      .single();
    if (error) {
      setPosting(false);
      toast.error(
        /row-level security/i.test(error.message) && !course
          ? t('Posting to everyone is not enabled yet. Ask the admin to run the latest database update, or choose your department only.')
          : `Could not post announcement: ${error.message}`
      );
      return;
    }

    if (emailAlumni) {
      const { data: mail, error: mailError } = await supabase.functions.invoke('notify-announcement', {
        body: { announcementId: created.id },
      });
      if (mailError) toast.warning('Announcement posted, but the email could not be sent.');
      else toast.success(t('Announcement posted and emailed to {n} people (including your copy).', { n: mail?.sent ?? 0 }));
    } else {
      toast.success('Announcement posted.');
    }
    setPosting(false);
    setTitle('');
    setContent('');
    setCategory('General');
    setShowAddForm(false);
    load();
  };

  // Only Alumni Affairs can delete announcements, and deleting removes them for everyone
  const canDelete = userRole === 'admin';
  const handleDelete = async (ann: Announcement) => {
    const ok = await confirmDialog({
      title: t('Delete this announcement?'),
      message: t('It will be removed for every account.'),
      confirmLabel: t('Delete'),
      danger: true,
    });
    if (!ok) return;
    const { data, error } = await supabase.from('announcements').delete().eq('id', ann.id).select('id');
    if (error || !data?.length) {
      toast.error(error ? `Could not delete: ${error.message}` : t('Only Alumni Affairs can delete announcements.'));
      return;
    }
    setAnnouncements((list) => list.filter((a) => a.id !== ann.id));
    toast.success(t('Announcement deleted.'));
  };

  const toggleHidden = (id: string) => {
    if (hidden.includes(id)) setHiddenList(hidden.filter((h) => h !== id));
    else {
      setHiddenList([...hidden, id]);
      toast.success(t('Hidden from your list only. Others still see it.'));
    }
  };

  // Course admins only see general announcements or ones for their course
  const filteredAnnouncements = announcements.filter((ann) => {
    if (adminCourse && ann.course && ann.course !== adminCourse) return false;
    return showHidden ? hidden.includes(ann.id) : !hidden.includes(ann.id);
  });

  const paged = usePaged(filteredAnnouncements, 8);

  if (loading) return <LoadingState label={t('Loading announcements...')} />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('Announcements & Events')}</h2>
          <p className="text-muted-foreground mt-1">{t('Stay updated with official university circulars and events')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 active:scale-[0.99] font-semibold transition-all"
          >
            <Plus size={18} />
            Post Announcement
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="bg-card rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Post New Announcement</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-muted-foreground hover:text-foreground text-sm font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Title <Req /></label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                placeholder="e.g. 2026 Grand Alumni Homecoming"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Category <Req /></label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
              >
                <option value="General">General Notice</option>
                <option value="Event">Event</option>
                <option value="Job Seminar">Job Seminar</option>
                <option value="Homecoming">Homecoming</option>
              </select>
            </div>

            {userRole !== 'admin' && adminCourse && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold">{t('Who is this for?')}</label>
                <select
                  value={chairAudience}
                  onChange={(e) => setChairAudience(e.target.value as 'department' | 'everyone')}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="department">{t('{program} department only', { program: adminCourse })}</option>
                  <option value="everyone">{t('Everyone')}</option>
                </select>
              </div>
            )}
            {userRole === 'admin' && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold">Target Audience (Course Scope)</label>
                <select
                  value={targetCourse}
                  onChange={(e) => setTargetCourse(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="all">Everyone (all alumni, chairs and Alumni Affairs)</option>
                  <option value="BSIT">BSIT Only</option>
                  <option value="BEED">BEED Only</option>
                  <option value="BSBA-FM">BSBA Major in Financial Management Only</option>
                  <option value="BSBA-OM">BSBA Major in Operation Management Only</option>
                  <option value="BSOA">BSOA Only</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Announcement Content <Req /></label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
              placeholder="Write the details here..."
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={emailAlumni} onChange={(e) => setEmailAlumni(e.target.checked)} className="w-4 h-4" />
            <span>
              {(userRole === 'admin' ? targetCourse === 'all' : chairAudience === 'everyone')
                ? t('Also email this to everyone (alumni, program chairs and Alumni Affairs)')
                : t('Also email this to {program} alumni and the {program} chair', { program: userRole === 'admin' ? targetCourse : adminCourse || '' })}
              <span className="block text-xs text-muted-foreground">{t('You also get a copy. People who turned off announcement emails are skipped.')}</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={posting}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all text-sm disabled:opacity-60"
          >
            {posting ? 'Posting...' : 'Post Notice'}
          </button>
        </form>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {paged.pageItems.map((ann) => (
          <div
            key={ann.id}
            className="bg-card rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                <Megaphone size={20} />
              </div>

              <div className="space-y-1 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-border text-muted-foreground">
                    {t(ann.category)}
                  </span>
                  {ann.course && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                      {t('{program} only', { program: ann.course })}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                    <Calendar size={12} />
                    {ann.date}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-foreground mt-2">{ann.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('Posted by')}: <span className="font-semibold text-foreground">{ann.author}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleHidden(ann.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                  title={t('Only hides it for you')}
                >
                  {hidden.includes(ann.id) ? <Eye size={13} /> : <EyeOff size={13} />}
                  {hidden.includes(ann.id) ? t('Unhide') : t('Hide for me')}
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(ann)}
                    className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    <Trash2 size={13} />
                    {t('Delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <Pagination {...paged} label={t('announcements')} />

        {(hidden.length > 0 || showHidden) && (
          <div className="text-center">
            <button onClick={() => setShowHidden(!showHidden)} className="text-xs font-semibold text-primary hover:underline">
              {showHidden ? t('Back to announcements') : t('Show hidden announcements ({n})', { n: hidden.length })}
            </button>
          </div>
        )}

        {filteredAnnouncements.length === 0 && (
          <div className="bg-card border border-border/80 rounded-2xl p-16 text-center shadow-lg">
            <Megaphone className="mx-auto mb-4 text-muted-foreground/60" size={56} />
            <h3 className="font-bold text-xl mb-1 text-foreground">{t('No Announcements')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('All quiet here! Updates and events will be posted by administrators.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
