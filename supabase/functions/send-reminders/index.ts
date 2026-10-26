// Lets a program chair (or Alumni Affairs) email their alumni a reminder to update
// their tracer record. Only alumni with an account (verified email) are contacted.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const COURSE_BY_ROLE: Record<string, string> = {
  'admin.bsit': 'BSIT',
  'admin.beed': 'BEED',
  'admin.bsba-fm': 'BSBA-FM',
  'admin.bsba-om': 'BSBA-OM',
  'admin.bsoa': 'BSOA',
};
const COURSES = ['BSIT', 'BEED', 'BSBA-FM', 'BSBA-OM', 'BSOA'];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Not signed in' }, 401);
  const { data: profile } = await admin.from('profiles').select('role, given_name, last_name, title').eq('id', caller.user.id).single();
  const role = profile?.role || '';
  if (!role.startsWith('admin')) return json({ error: 'Only program chairs can send reminders' }, 403);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const course = role === 'admin' ? String(body.course || '') : COURSE_BY_ROLE[role];
  if (!COURSES.includes(course)) return json({ error: 'Choose a program' }, 400);
  const minYears = Math.max(0, Math.min(5, Number(body.minYears ?? 1)));
  const note = String(body.message || '').slice(0, 1000);

  let query = admin.from('alumni_records').select('email, data').eq('course', course).not('user_id', 'is', null);
  if (minYears > 0) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - minYears);
    query = query.lt('updated_at', cutoff.toISOString());
  }
  const { data: rows, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const recipients = (rows || []).filter((r) => r.email);
  if (recipients.length === 0) return json({ ok: true, sent: 0 });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Email sending is not set up yet' }, 500);
  const from = Deno.env.get('RESEND_FROM') || 'OMSU Alumni Tracer <onboarding@resend.dev>';
  const site = Deno.env.get('SITE_URL') || '';
  const sender = `${profile?.given_name || ''} ${profile?.last_name || ''}`.trim() || 'Your Program Chair';
  const senderTitle = profile?.title || `${course} Program Chair`;

  const emails = recipients.map((r: any) => {
    const name = `${r.data?.givenName || ''} ${r.data?.lastName || ''}`.trim() || 'Alumnus';
    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6;max-width:640px">
  <p>Hello ${escapeHtml(name.toUpperCase())},</p>
  <p>The ${escapeHtml(course)} program of Occidental Mindoro State University is updating its graduate tracer records. Please take a few minutes to sign in and update your employment information.</p>
  ${note ? `<p style="padding:12px;background:#f3f4f6;border-radius:6px">${escapeHtml(note)}</p>` : ''}
  <p><a href="${escapeHtml(site)}" style="display:inline-block;padding:10px 18px;background:#002060;color:#fff;border-radius:6px;text-decoration:none">Update my tracer record</a></p>
  <p>Your answers are kept confidential and reported only in summary form.</p>
  <p>Thank you,<br/>${escapeHtml(sender)}<br/>${escapeHtml(senderTitle)}<br/>OCCIDENTAL MINDORO STATE UNIVERSITY</p>
</div>`;
    return { from, to: [r.email], subject: 'Please update your OMSU graduate tracer record', html };
  });

  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails.slice(i, i + 100)),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return json({ error: detail?.message || `Email service returned ${res.status}`, sent }, 502);
    }
    sent += emails.slice(i, i + 100).length;
  }

  await admin.from('reminder_log').insert({ course, sent_by: caller.user.id, recipients: sent, min_years: minYears });
  return json({ ok: true, sent });
});
