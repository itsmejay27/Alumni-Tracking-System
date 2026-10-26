import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Globe, Clock, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { ContactInfo, saveContactInfo, useContactInfo } from '@/lib/settings';

const FIELDS: { key: keyof ContactInfo; label: string; multiline?: boolean }[] = [
  { key: 'email', label: 'Email address' },
  { key: 'emailNote', label: 'Email note' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'location', label: 'Office location', multiline: true },
  { key: 'officeDays', label: 'Office days' },
  { key: 'officeHours', label: 'Office hours' },
];

/** Alumni Affairs contact details. Alumni see it read-only; Alumni Affairs can edit it live. */
export function Contact({ editable = false }: { editable?: boolean }) {
  const info = useContactInfo();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContactInfo>(info);
  const [current, setCurrent] = useState<ContactInfo>(info);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(info);
    setDraft(info);
  }, [info]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveContactInfo(draft);
      setCurrent(draft);
      setEditing(false);
      toast.success('Contact details updated');
    } catch (err: any) {
      toast.error(`Could not save: ${err.message}`);
    }
    setSaving(false);
  };

  const website = current.website.replace(/^https?:\/\//, '');

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{editable ? 'Contact Info' : 'Contact Us'}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {editable
              ? 'These details appear on the Contact Us page and the landing page.'
              : 'Get in touch with the OMSU Alumni Affairs Office'}
          </p>
        </div>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Pencil size={16} /> Edit details
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={`space-y-1.5 ${f.multiline ? 'md:col-span-2' : ''}`}>
                <span className="text-sm font-medium text-foreground">{f.label}</span>
                {f.multiline ? (
                  <textarea
                    rows={2}
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:border-primary"
                  />
                ) : (
                  <input
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:border-primary"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="font-semibold text-foreground">Office channels</h3>
            <InfoRow icon={<Mail size={18} />} label="Email" value={current.email} note={current.emailNote} />
            <InfoRow icon={<Phone size={18} />} label="Phone" value={current.phone} />
            <InfoRow
              icon={<Globe size={18} />}
              label="Website"
              value={
                <a href={current.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {website}
                </a>
              }
            />
          </div>
          <div className="bg-card rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="font-semibold text-foreground">Visit us</h3>
            <InfoRow icon={<MapPin size={18} />} label="Office location" value={current.location} />
            <InfoRow icon={<Clock size={18} />} label="Office hours" value={current.officeDays} note={current.officeHours} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-primary/8 text-primary rounded-xl shrink-0 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{value}</p>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  );
}
