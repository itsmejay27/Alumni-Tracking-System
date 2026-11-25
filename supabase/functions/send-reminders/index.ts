// Lets a program chair (or Alumni Affairs) email their graduates:
// - audience "accounts": alumni with an account are reminded to update their tracer record
// - audience "invite": graduates with an email on file but no account yet are invited to sign up
//   (at most once every 30 days per graduate)
// - audience "both": both of the above
// Records that staff removed (wrong entries) are skipped.
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
const INVITE_EVERY_DAYS = 30;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const isEmail = (s: unknown) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

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
  const audience = ['accounts', 'invite', 'both'].includes(body.audience) ? body.audience : 'accounts';

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Email sending is not set up yet' }, 500);
  const from = Deno.env.get('RESEND_FROM') || 'OMSU Alumni Track <onboarding@resend.dev>';
  const site = Deno.env.get('SITE_URL') || '';
  const sender = `${profile?.given_name || ''} ${profile?.last_name || ''}`.trim() || 'Your Program Chair';
  const senderTitle = profile?.title || `${course} Program Chair`;
  const noteHtml = note ? `<p style="padding:12px;background:#f3f4f6;border-radius:6px">${escapeHtml(note)}</p>` : '';
  const signature = `<p>Thank you,<br/>${escapeHtml(sender)}<br/>${escapeHtml(senderTitle)}<br/>OCCIDENTAL MINDORO STATE UNIVERSITY</p>`;
  const notRemoved = (r: any) => r.data?.archived !== true;

  type Mail = { from: string; to: string[]; subject: string; html: string };
  const emails: Mail[] = [];
  const invited: { record_id: string; course: string; email: string; sent_by: string }[] = [];

  // 1) Alumni with an account: reminder to update
  if (audience === 'accounts' || audience === 'both') {
    let query = admin.from('alumni_records').select('email, data').eq('course', course).not('user_id', 'is', null);
    if (minYears > 0) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - minYears);
      query = query.lt('updated_at', cutoff.toISOString());
    }
    const { data: rows, error } = await query;
    if (error) return json({ error: error.message }, 500);
    for (const r of (rows || []).filter(notRemoved).filter((x: any) => isEmail(x.email))) {
      const name = `${r.data?.givenName || ''} ${r.data?.lastName || ''}`.trim() || 'Alumnus';
      emails.push({
        from,
        to: [String(r.email).trim().toLowerCase()],
        subject: 'Please update your OMSU graduate tracer record',
        html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6;max-width:640px">
  <p>Hello ${escapeHtml(name.toUpperCase())},</p>
  <p>The ${escapeHtml(course)} program of Occidental Mindoro State University is updating its graduate tracer records. Please take a few minutes to sign in and update your employment information.</p>
  ${noteHtml}
  <p><a href="${escapeHtml(site)}" style="display:inline-block;padding:10px 18px;background:#002060;color:#fff;border-radius:6px;text-decoration:none">Update my tracer record</a></p>
  <p>Your answers are kept confidential and reported only in summary form.</p>
  ${signature}
</div>`,
      });
    }
  }

  // 2) Graduates with no account but an email on file: invitation to sign up
  let skippedRecent = 0;
  if (audience === 'invite' || audience === 'both') {
    const rows: any[] = [];
    for (let from_ = 0; ; from_ += 1000) {
      const { data, error } = await admin
        .from('alumni_records')
        .select('id, email, data')
        .eq('course', course)
        .is('user_id', null)
        .range(from_, from_ + 999);
      if (error) return json({ error: error.message }, 500);
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const candidates = rows.filter(notRemoved).map((r) => ({ ...r, mail: isEmail(r.email) ? r.email : isEmail(r.data?.email) ? r.data.email : null })).filter((r) => r.mail);
    const since = new Date(Date.now() - INVITE_EVERY_DAYS * 24 * 3600 * 1000).toISOString();
    const recent = new Set<string>();
    for (let i = 0; i < candidates.length; i += 300) {
      const { data } = await admin
        .from('graduate_invites')
        .select('record_id')
        .in('record_id', candidates.slice(i, i + 300).map((c) => c.id))
        .gte('sent_at', since);
      (data || []).forEach((d: { record_id: string }) => recent.add(d.record_id));
    }
    const seenEmails = new Set(emails.map((e) => e.to[0]));
    for (const r of candidates) {
      const to = String(r.mail).trim().toLowerCase();
      if (recent.has(r.id)) {
        skippedRecent++;
        continue;
      }
      if (seenEmails.has(to)) continue;
      seenEmails.add(to);
      const name = `${r.data?.givenName || ''} ${r.data?.lastName || ''}`.trim() || 'Graduate';
      emails.push({
        from,
        to: [to],
        subject: 'You are invited to the OMSU Alumni Track',
        html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6;max-width:640px">
  <p>Hello ${escapeHtml(name.toUpperCase())},</p>
  <p>You are listed as a graduate of the ${escapeHtml(course)} program of Occidental Mindoro State University. We invite you to create your account on the OMSU Alumni Track and answer the Graduate Tracer Study. It takes about five minutes.</p>
  <p>To sign up, use your first name, last name, birthday and sex exactly as they appear in your school records.</p>
  ${noteHtml}
  <p><a href="${escapeHtml(site)}" style="display:inline-block;padding:10px 18px;background:#002060;color:#fff;border-radius:6px;text-decoration:none">Create my account</a></p>
  <p>Your answers are kept confidential under the Data Privacy Act of 2012 and reported only in summary form. If you are not this graduate, or do not want these emails, just reply to tell us.</p>
  ${signature}
</div>`,
      });
      invited.push({ record_id: r.id, course, email: to, sent_by: caller.user.id });
    }
  }

  if (emails.length === 0) return json({ ok: true, sent: 0, invited: 0, skippedRecent });

  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails.slice(i, i + 100)),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      // Remember the invitations that did go out before the error
      const invitedSent = invited.filter((v) => emails.slice(0, sent).some((e) => e.to[0] === v.email));
      if (invitedSent.length) await admin.from('graduate_invites').insert(invitedSent);
      return json({ error: detail?.message || `Email service returned ${res.status}`, sent }, 502);
    }
    sent += emails.slice(i, i + 100).length;
  }

  if (invited.length) {
    for (let i = 0; i < invited.length; i += 500) await admin.from('graduate_invites').insert(invited.slice(i, i + 500));
  }
  await admin.from('reminder_log').insert({ course, sent_by: caller.user.id, recipients: sent, min_years: minYears });
  return json({ ok: true, sent, invited: invited.length, reminded: sent - invited.length, skippedRecent });
});
