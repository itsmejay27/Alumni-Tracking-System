// Emails a newly posted announcement to the alumni it is meant for (everyone, or one
// program). Only alumni with an account (verified email) are contacted.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const COURSE_BY_ROLE: Record<string, string> = {
  'admin.bsit': 'BSIT',
  'admin.beed': 'BEED',
  'admin.bsba-fm': 'BSBA-FM',
  'admin.bsba-om': 'BSBA-OM',
  'admin.bsoa': 'BSOA',
};

/**
 * Accounts to email. With a program: that program's alumni plus its program chair.
 * Without one: every account (all alumni, program chairs and Alumni Affairs).
 */
async function recipientIds(admin: any, program: string | null): Promise<string[]> {
  const ids = new Set<string>();
  if (!program) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from('profiles').select('id').range(from, from + 999);
      if (error) throw error;
      (data || []).forEach((p: { id: string }) => ids.add(p.id));
      if (!data || data.length < 1000) break;
    }
    return [...ids];
  }
  const { data: recs, error } = await admin.from('alumni_records').select('user_id').not('user_id', 'is', null).eq('course', program);
  if (error) throw error;
  (recs || []).forEach((r: { user_id: string }) => ids.add(r.user_id));
  const { data: chairs } = await admin.from('profiles').select('id').eq('role', `admin.${program.toLowerCase()}`);
  (chairs || []).forEach((p: { id: string }) => ids.add(p.id));
  return [...ids];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Not signed in' }, 401);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', caller.user.id).single();
  const role = profile?.role || '';
  if (!role.startsWith('admin')) return json({ error: 'Only staff can send announcements' }, 403);

  const { announcementId } = await req.json().catch(() => ({}));
  const { data: ann } = await admin.from('announcements').select('*').eq('id', announcementId).single();
  if (!ann) return json({ error: 'Announcement not found' }, 404);
  // Program chairs may email everyone or their own program, but only for announcements they posted
  if (role !== 'admin' && (ann.created_by !== caller.user.id || (ann.course && ann.course !== COURSE_BY_ROLE[role])))
    return json({ error: 'Not allowed' }, 403);

  // Recipients follow the announcement's audience: everyone, or one program (its alumni and chair)
  let ids: string[];
  try {
    ids = (await recipientIds(admin, ann.course || null)).filter((id) => id !== caller.user.id);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }

  const emails: string[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data: ps } = await admin.from('profiles').select('email, email_announcements').in('id', ids.slice(i, i + 500));
    // Skip people who turned off announcement emails in Settings
    emails.push(...(ps || []).filter((p) => p.email_announcements !== false).map((p) => p.email).filter(Boolean));
  }
  // The poster always gets a copy as confirmation
  if (caller.user.email && !emails.includes(caller.user.email.toLowerCase())) emails.push(caller.user.email.toLowerCase());

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Email sending is not set up yet' }, 500);
  const from = Deno.env.get('RESEND_FROM') || 'OMSU Alumni Track <onboarding@resend.dev>';
  const site = Deno.env.get('SITE_URL') || '';
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6;max-width:640px">
  <p style="font-size:12px;color:#6b7280;margin:0">${escapeHtml(ann.category)}${ann.course ? ` · ${escapeHtml(ann.course)}` : ''}</p>
  <h2 style="color:#002060;margin:6px 0 14px">${escapeHtml(ann.title)}</h2>
  <div style="white-space:pre-wrap">${escapeHtml(ann.content)}</div>
  <p style="margin-top:18px;color:#6b7280">Posted by ${escapeHtml(ann.author || 'OMSU Alumni Affairs')}</p>
  <p><a href="${escapeHtml(site)}" style="display:inline-block;padding:10px 18px;background:#002060;color:#fff;border-radius:6px;text-decoration:none">Open the OMSU Alumni Track</a></p>
  <p style="font-size:12px;color:#9ca3af">You received this because you have an OMSU Alumni Track account. To stop these emails, turn them off in Settings → Notifications.</p>
</div>`;

  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map((to) => ({ from, to: [to], subject: `[OMSU] ${ann.title}`, html }));
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return json({ error: detail?.message || `Email service returned ${res.status}`, sent }, 502);
    }
    sent += batch.length;
  }
  return json({ ok: true, sent });
});
