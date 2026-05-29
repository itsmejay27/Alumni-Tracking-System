import React, { useState } from 'react';
import { Megaphone, Calendar, Tag, Trash2, Plus, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

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
}

export function Announcements({ userRole }: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Event' | 'Job Seminar' | 'General' | 'Homecoming'>('General');
  const [targetCourse, setTargetCourse] = useState('all');

  const isAdmin = userRole.startsWith('admin');

  // Course Admin scope detection
  const getCourseScope = () => {
    if (userRole === 'admin') return 'Super Admin';
    if (userRole === 'admin.beed') return 'BEED';
    if (userRole === 'admin.bsit') return 'BSIT';
    if (userRole === 'admin.bsba-fm') return 'BSBA-FM';
    if (userRole === 'admin.bsba-om') return 'BSBA-OM';
    if (userRole === 'admin.bsoa') return 'BSOA';
    return '';
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const newAnnouncement: Announcement = {
      id: String(announcements.length + 1),
      title,
      content,
      category,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: getCourseScope() + ' Admin',
      course: targetCourse === 'all' ? undefined : targetCourse,
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setTitle('');
    setContent('');
    setCategory('General');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  // Filtering: Alumni should only see general announcements or announcements matching their course
  const filteredAnnouncements = announcements.filter((ann) => {
    if (userRole.startsWith('admin.')) {
      const course = userRole.split('.')[1].toUpperCase();
      return !ann.course || ann.course === course;
    }
    return true; // Super Admin or Alumni sees all applicable
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Announcements & Events</h2>
          <p className="text-muted-foreground mt-1">Stay updated with official college circulars and events</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 active:scale-[0.99] font-semibold transition-all shadow-md shadow-primary/10"
          >
            <Plus size={18} />
            Post Announcement
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300"
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
                className="w-full px-4 py-2.5 bg-input-background border-2 border-border/70 rounded-xl focus:outline-none focus:border-primary text-sm"
                placeholder="e.g. 2026 Grand Alumni Homecoming"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-input-background border-2 border-border/70 rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
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
                  className="w-full px-4 py-2.5 bg-input-background border-2 border-border/70 rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
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
              className="w-full px-4 py-2.5 bg-input-background border-2 border-border/70 rounded-xl focus:outline-none focus:border-primary text-sm"
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
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className="bg-card border border-border/80 rounded-2xl p-6 shadow-md transition-all hover:shadow-lg relative overflow-hidden flex flex-col justify-between"
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

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'OMSC Annual Grand Alumni Homecoming 2026',
    content: `We are delighted to invite all graduates of Occidental Mindoro State College to the 2026 Grand Alumni Homecoming!\n\nTheme: "OMSC Alumni: Bridging Milestones, Igniting Futures"\nDate: December 12, 2026\nVenue: OMSC Main Campus Gymnasium, San Jose, Occidental Mindoro\n\nActivities include networking dinners, academic panel updates, outstanding alumni awards, and a live band. Registration details and t-shirt orders will be available in early November. Save the date!`,
    category: 'Homecoming',
    date: 'Sep 12, 2026',
    author: 'Super Admin',
  },
  {
    id: '2',
    title: 'Upcoming Tech Seminar: Industry Expectations for IT Graduates',
    content: `The BSIT Department is hosting a virtual seminar focusing on modern software development standards. Guest speakers from GCash, Accenture, and Oracle will share critical industry trends.\n\nDate: October 15, 2026 (Thursday) at 1:30 PM via Zoom.\nThis event is open to all BSIT Alumni and senior students. Certificates of Attendance will be provided. Register via the Job Board link!`,
    category: 'Job Seminar',
    date: 'Sep 25, 2026',
    author: 'BSIT Admin',
    course: 'BSIT',
  },
  {
    id: '3',
    title: 'Curriculum Advisory Board Meeting: Call for Alumni Delegates',
    content: `We are seeking 2 delegates from our BEED alumni to participate in our Curriculum Advisory Board. Your feedback on teaching practices and board exam outcomes will help us optimize future BEED instruction.\n\nInterested parties, please send an expression of interest to the Office of the Dean.`,
    category: 'General',
    date: 'Oct 02, 2026',
    author: 'BEED Admin',
    course: 'BEED',
  },
];
