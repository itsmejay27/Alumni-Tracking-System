// Emails a new Job Board posting to alumni: those in the job's program, or everyone when the job
// has no program. Only the person who posted the job can trigger it, each job is emailed once,
// and people who turned off job emails in Settings are skipped.
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

// Alumni (not staff) may email at most this many job posts per day
const ALUMNI_DAILY_LIMIT = 3;

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
  const isStaff = (profile?.role || '').startsWith('admin');

  const { jobId } = await req.json().catch(() => ({}));
  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).single();
  if (!job) return json({ error: 'Job not found' }, 404);
  if (job.created_by !== caller.user.id) return json({ error: 'Only the person who posted this job can email it' }, 403);
  if (job.emailed_at) return json({ ok: true, sent: 0, note: 'Already emailed' });

  if (!isStaff) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', caller.user.id)
      .eq('action', 'job-email')
      .gte('created_at', since);
    if ((count ?? 0) >= ALUMNI_DAILY_LIMIT) {
      return json({ error: `You can email up to ${ALUMNI_DAILY_LIMIT} job posts a day. The job is posted, but no email was sent.` }, 429);
    }
  }

  // Recipients: alumni accounts in the job's program (or all), minus the poster and anyone opted out
  let q = admin.from('alumni_records').select('user_id').not('user_id', 'is', null);
  if (job.program) q = q.eq('course', job.program);
  const { data: recs, error } = await q;
  if (error) return json({ error: error.message }, 500);
  const ids = [...new Set((recs || []).map((r) => r.user_id as string))].filter((id) => id !== caller.user.id);

  const emails: string[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data: ps } = await admin.from('profiles').select('email, email_jobs').in('id', ids.slice(i, i + 500));
    emails.push(...(ps || []).filter((p) => p.email && p.email_jobs !== false).map((p) => p.email as string));
  }

  // Mark first so a retry can never send twice
  await admin.from('jobs').update({ emailed_at: new Date().toISOString() }).eq('id', job.id);
  if (!isStaff) await admin.from('ai_usage').insert({ user_id: caller.user.id, action: 'job-email' });
  if (!emails.length) return json({ ok: true, sent: 0 });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Email sending is not set up yet' }, 500);
  const from = Deno.env.get('RESEND_FROM') || 'OMSU Alumni Tracer <onboarding@resend.dev>';
  const site = Deno.env.get('SITE_URL') || 'https://omsualumnitrack.site';
  const logo = Deno.env.get('LOGO_URL') || 'https://omsualumnitrack.site/icon-192.png';
  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements.slice(0, 6) : [];
  const type = String(job.type || '').replace(/-/g, ' ');
  const html = `
<div style="background:#eef2fa;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border-collapse:separate">
  <tr><td style="background:#002060;padding:18px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px"><img src="${escapeHtml(logo)}" width="44" height="44" alt="OMSU" style="display:block;border:0" /></td>
      <td style="color:#fff"><div style="font-size:16px;font-weight:bold">New job on the OMSU Job Board</div>
      <div style="font-size:12px;color:#f5c400">${job.program ? `For ${escapeHtml(job.program)} graduates` : 'For all OMSU graduates'}</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px;font-size:14px;color:#222;line-height:1.6">
    <h2 style="margin:0 0 4px;color:#002060;font-size:20px">${escapeHtml(job.title)}</h2>
    <p style="margin:0 0 14px;color:#555">${escapeHtml(job.company)} · ${escapeHtml(job.location)} · ${escapeHtml(type)}${job.salary ? ` · ${escapeHtml(job.salary)}` : ''}</p>
    <p style="margin:0 0 14px;white-space:pre-wrap">${escapeHtml(String(job.description || '').slice(0, 600))}</p>
    ${requirements.length ? `<p style="margin:0 0 6px;font-weight:bold">Requirements</p><ul style="margin:0 0 14px;padding-left:18px">${requirements.map((r) => `<li>${escapeHtml(String(r))}</li>`).join('')}</ul>` : ''}
    <p><a href="${escapeHtml(site)}" style="display:inline-block;background:#002060;color:#fff;text-decoration:none;font-weight:bold;padding:10px 22px;border-radius:999px">View on the Job Board</a></p>
    <p style="font-size:12px;color:#888;margin-top:18px">Posted by ${escapeHtml(job.posted_by || 'OMSU')}. Never pay a fee to apply for a job. To stop job emails, turn them off in Settings → Notifications.</p>
  </td></tr>
</table>
</div>`;

  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map((to) => ({ from, to: [to], subject: `[OMSU Jobs] ${job.title} at ${job.company}`, html }));
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
