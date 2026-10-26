import React, { useEffect, useState } from 'react';
import { Pencil, Save, X, Plus, Trash2, Eye, Target, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { AboutInfo, saveAboutInfo, useAboutInfo } from '@/lib/settings';

const field =
  'w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:border-primary';

/** Lets Alumni Affairs edit the Vision, Mission and Core Values shown on the landing page. */
export function AboutEditor() {
  const info = useAboutInfo();
  const [current, setCurrent] = useState<AboutInfo>(info);
  const [draft, setDraft] = useState<AboutInfo>(info);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(info);
    setDraft(info);
  }, [info]);

  const save = async () => {
    const cleaned = { ...draft, goals: draft.goals.map((g) => g.trim()).filter(Boolean), coreValues: draft.coreValues.filter((v) => v.title.trim()) };
    setSaving(true);
    try {
      await saveAboutInfo(cleaned);
      setCurrent(cleaned);
      setDraft(cleaned);
      setEditing(false);
      toast.success('Vision, Mission, Goals and Core Values updated');
    } catch (err: any) {
      toast.error(`Could not save: ${err.message}`);
    }
    setSaving(false);
  };

  const setValue = (i: number, key: 'title' | 'text', v: string) =>
    setDraft({ ...draft, coreValues: draft.coreValues.map((c, j) => (j === i ? { ...c, [key]: v } : c)) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">Vision, Mission, Goals and Core Values</h3>
          <p className="text-muted-foreground mt-1 text-sm">Shown in the About OMSU section of the landing page.</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Pencil size={16} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Vision</span>
            <textarea rows={3} value={draft.vision} onChange={(e) => setDraft({ ...draft, vision: e.target.value })} className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Mission</span>
            <textarea rows={4} value={draft.mission} onChange={(e) => setDraft({ ...draft, mission: e.target.value })} className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Goals and Objectives (one per line)</span>
            <textarea
              rows={7}
              value={draft.goals.join('\n')}
              onChange={(e) => setDraft({ ...draft, goals: e.target.value.split('\n') })}
              className={field}
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">Core Values</span>
            {draft.coreValues.map((v, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input placeholder="Value" value={v.title} onChange={(e) => setValue(i, 'title', e.target.value)} className={field} />
                <textarea rows={2} placeholder="Description (optional)" value={v.text} onChange={(e) => setValue(i, 'text', e.target.value)} className={field} />
                <button
                  onClick={() => setDraft({ ...draft, coreValues: draft.coreValues.filter((_, j) => j !== i) })}
                  aria-label="Remove value"
                  className="p-2.5 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 justify-self-start"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setDraft({ ...draft, coreValues: [...draft.coreValues, { title: '', text: '' }] })}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <Plus size={16} /> Add value
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={() => {
                setDraft(current);
                setEditing(false);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card rounded-2xl p-6 shadow-sm space-y-2">
            <p className="flex items-center gap-2 font-semibold"><Eye size={16} className="text-primary" /> Vision</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{current.vision}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm space-y-2">
            <p className="flex items-center gap-2 font-semibold"><Target size={16} className="text-primary" /> Mission</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{current.mission}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm space-y-2 md:col-span-2">
            <p className="font-semibold">Goals and Objectives</p>
            <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
              {current.goals.map((g, i) => <li key={i}>{g}</li>)}
            </ol>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm space-y-2 md:col-span-2">
            <p className="flex items-center gap-2 font-semibold"><Heart size={16} className="text-primary" /> Core Values</p>
            <p className="text-sm text-muted-foreground">{current.coreValues.map((v) => v.title).join(' · ') || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
