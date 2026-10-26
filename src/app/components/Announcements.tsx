import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Calendar, Tag, Trash2, Plus, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
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
}

interface AnnouncementsProps {
  userRole: string;
  authorName: string;
}

export function Announcements({ userRole, authorName }: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Event' | 'Job Seminar' | 'General' | 'Homecoming'>('General');
  const [targetCourse, setTargetCourse] = useState('all');

  const isAdmin = userRole.startsWith('admin');
  const adminCourse = courseScopeForRole(userRole);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, category, course, author, created_at')
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

    const course = userRole === 'admin' ? (targetCourse === 'all' ? null : targetCourse) : adminCourse;
    const { error } = await supabase.from('announcements').insert({
      title,
      content,
      category,
      course,
      author: `${authorName} · ${roleLabel(userRole)}`,
    });
    if (error) {
      toast.error(`Could not post announcement: ${error.message}`);
      return;
    }

    toast.success('Announcement posted.');
    setTitle('');
    setContent('');
    setCategory('General');
    setShowAddForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this announcement?', message: 'Alumni will no longer see it.', confirmLabel: 'Delete', danger: true }))) return;
    const { data, error } = await supabase.from('announcements').delete().eq('id', id).select('id');
    if (error || !data?.length) {
      toast.error(error ? `Could not delete: ${error.message}` : 'You can only delete announcements you posted.');
      return;
    }
    setAnnouncements((list) => list.filter((a) => a.id !== id));
  };

  // Course admins only see general announcements or ones for their course
  const filteredAnnouncements = announcements.filter((ann) => {
    if (adminCourse) return !ann.course || ann.course === adminCourse;
    return true;
  });

  const paged = usePaged(filteredAnnouncements, 8);

  if (loading) return <LoadingState label="Loading announcements..." />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements & Events</h2>
          <p className="text-muted-foreground mt-1">Stay updated with official university circulars and events</p>
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
              <label className="text-sm font-semibold">Title *</label>
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
              <label className="text-sm font-semibold">Category *</label>
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

            {userRole === 'admin' && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold">Target Audience (Course Scope)</label>
                <select
                  value={targetCourse}
                  onChange={(e) => setTargetCourse(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="all">All Alumni (Global)</option>
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
            <label className="text-sm font-semibold">Announcement Content *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
              placeholder="Write the details here..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all text-sm shadow-md"
          >
            Post Notice
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
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  ann.category === 'Event'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : ann.category === 'Job Seminar'
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    : ann.category === 'Homecoming'
                    ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                <Megaphone size={20} />
              </div>

              <div className="space-y-1 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      ann.category === 'Event'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : ann.category === 'Job Seminar'
                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        : ann.category === 'Homecoming'
                        ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    {ann.category}
                  </span>
                  {ann.course && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {ann.course} ONLY
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
                Posted by: <span className="font-semibold text-foreground">{ann.author}</span>
              </p>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                >
                  <Trash2 size={13} />
                  Delete Notice
                </button>
              )}
            </div>
          </div>
        ))}

        <Pagination {...paged} label="announcements" />

        {filteredAnnouncements.length === 0 && (
          <div className="bg-card border border-border/80 rounded-2xl p-16 text-center shadow-lg">
            <Megaphone className="mx-auto mb-4 text-muted-foreground/60" size={56} />
            <h3 className="font-bold text-xl mb-1 text-foreground">No Announcements</h3>
            <p className="text-muted-foreground text-sm">
              All quiet here! Updates and events will be posted by administrators.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
