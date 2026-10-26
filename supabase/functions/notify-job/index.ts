// Emails a new Job Board posting to everyone, or only the job's program (its alumni and chair),
// as the poster chose. Called by the poster (Alumni Affairs posts go live at once) or by Alumni
// Affairs when approving someone else's job. Each job is emailed once, only after approval, and
// people who turned off job emails in Settings are skipped.
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

const USD_TO_PHP = 58;

/**
 * Rough monthly pay in pesos from free text like "$8 to $9 an hour", "₱25,000 - ₱35,000/month"
 * or "PHP 800 per day". Uses the highest number in a range. Returns null when no pay is stated.
 */
export function monthlyPhp(salary: string | null | undefined): number | null {
  if (!salary) return null;
  const s = salary.toLowerCase().replace(/,/g, '');
  const nums = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g)].map((m) => Number(m[1]) * (m[2] ? 1000 : 1)).filter((n) => n > 0);
  if (!nums.length) return null;
  let amount = Math.max(...nums);
  if (/\$|usd|dollar/.test(s)) amount *= USD_TO_PHP;
  if (/hour|hr\b|\/h\b|per h/.test(s)) amount *= 40 * 4.33;
  else if (/day|daily/.test(s)) amount *= 22;
  else if (/week/.test(s)) amount *= 4.33;
  else if (/year|annual|annum/.test(s)) amount /= 12;
  return Math.round(amount);
}

const isRemote = (location: string) => /remote|work from home|wfh|home[- ]based|online|anywhere/i.test(location || '');

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
  const isAffairs = profile?.role === 'admin';

  const { jobId, audience } = await req.json().catch(() => ({}));
  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).single();
  if (!job) return json({ error: 'Job not found' }, 404);
  if (job.created_by !== caller.user.id && !isAffairs) return json({ error: 'Only the person who posted this job can email it' }, 403);
  if (job.status && job.status !== 'approved') return json({ error: 'This job is waiting for approval. It is emailed once approved.' }, 409);
  if (job.emailed_at) return json({ ok: true, sent: 0, note: 'Already emailed' });

  if (!isStaff && job.created_by === caller.user.id) {
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

  // Recipients: everyone, or only the job's program (its alumni and chair), as the poster chose
  const wanted = job.email_audience || audience;
  const department = wanted === 'department' && job.program ? job.program : null;
  let ids: string[];
  try {
    ids = (await recipientIds(admin, department)).filter((id) => id !== caller.user.id);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }

  // Each person's job alert filters from Settings
  const pay = monthlyPhp(job.salary);
  const remote = isRemote(job.location);
  const wantsJob = (p: { email_jobs?: boolean; job_alert_types?: string[]; job_alert_remote_only?: boolean; job_alert_min_salary?: number }) => {
    if (p.email_jobs === false) return false;
    if (p.job_alert_types?.length && !p.job_alert_types.includes(job.type)) return false;
    if (p.job_alert_remote_only && !remote) return false;
    if ((p.job_alert_min_salary || 0) > 0 && (pay == null || pay < (p.job_alert_min_salary || 0))) return false;
    return true;
  };

  const emails: string[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data: ps } = await admin
      .from('profiles')
      .select('email, email_jobs, job_alert_types, job_alert_remote_only, job_alert_min_salary')
      .in('id', ids.slice(i, i + 500));
    emails.push(...(ps || []).filter((p) => p.email && wantsJob(p)).map((p) => p.email as string));
  }
  // The poster always gets a copy as confirmation (also when Alumni Affairs approved it)
  let posterEmail = job.created_by === caller.user.id ? caller.user.email : null;
  if (!posterEmail && job.created_by) {
    const { data: poster } = await admin.from('profiles').select('email').eq('id', job.created_by).maybeSingle();
    posterEmail = poster?.email || null;
  }
  if (posterEmail && !emails.includes(posterEmail.toLowerCase())) emails.push(posterEmail.toLowerCase());

  // Mark first so a retry can never send twice
  await admin.from('jobs').update({ emailed_at: new Date().toISOString() }).eq('id', job.id);
  if (!isStaff && job.created_by === caller.user.id) await admin.from('ai_usage').insert({ user_id: caller.user.id, action: 'job-email' });
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
      <div style="font-size:12px;color:#f5c400">${department ? `For the ${escapeHtml(department)} department` : 'For everyone at OMSU Alumni Tracer'}</div></td>
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
  return json({ ok: true, sent, audience: department ? 'department' : 'everyone' });
});
