// Two-step verification by email. When it is on, each sign-in needs a 6-digit code sent to the
// account's email. Turning it on or off also needs a code, so only the email's owner can change it.
//   { action: 'status' }                                  → { enabled, needed, authenticator }
//   { action: 'send', purpose: 'signin'|'enable'|'disable' } → emails a code
//   { action: 'verify', code }                            → checks the code and finishes the step
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const CODE_MINUTES = 10;
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;

async function hash(userId: string, code: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${code}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The sign-in session id inside the (already verified) access token. */
function sessionIdOf(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)));
    return typeof payload.session_id === 'string' ? payload.session_id : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  const user = caller?.user;
  if (!user) return json({ error: 'Not signed in' }, 401);
  const sessionId = sessionIdOf(token);
  if (!sessionId) return json({ error: 'Please sign in again.' }, 401);

  const body = await req.json().catch(() => ({}));
  const { data: profile } = await admin.from('profiles').select('email, email_2fa').eq('id', user.id).single();
  const enabled = !!profile?.email_2fa;
  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  const authenticator = !!factors?.factors?.some((f: { status: string }) => f.status === 'verified');
  const { data: verifiedRow } = await admin.from('email_2fa_sessions').select('session_id').eq('session_id', sessionId).maybeSingle();
  const needed = enabled && !verifiedRow;

  if (body.action === 'status') return json({ enabled, needed, authenticator });

  if (body.action === 'send') {
    const purpose = body.purpose;
    if (purpose === 'signin' && !needed) return json({ ok: true, note: 'Not needed' });
    if (purpose === 'enable' && enabled) return json({ error: 'Email codes are already on.' }, 409);
    if (purpose === 'enable' && authenticator) return json({ error: 'Turn off the authenticator app first, then choose email codes.' }, 409);
    if (purpose === 'disable' && (!enabled || needed)) return json({ error: 'Email codes are not on for this sign-in.' }, 409);
    if (!['signin', 'enable', 'disable'].includes(purpose)) return json({ error: 'Unknown request' }, 400);

    const { data: last } = await admin.from('email_2fa_codes').select('sent_at').eq('user_id', user.id).maybeSingle();
    const wait = last ? RESEND_SECONDS - Math.floor((Date.now() - new Date(last.sent_at).getTime()) / 1000) : 0;
    if (wait > 0) return json({ error: `Please wait ${wait} seconds before asking for a new code.`, wait }, 429);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'Email sending is not set up yet' }, 500);
    const to = profile?.email || user.email;
    if (!to) return json({ error: 'This account has no email address.' }, 400);

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    await admin.from('email_2fa_codes').upsert({
      user_id: user.id,
      code_hash: await hash(user.id, code),
      purpose,
      expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
      attempts: 0,
      sent_at: new Date().toISOString(),
    });

    const from = Deno.env.get('RESEND_FROM') || 'OMSU Alumni Track <onboarding@resend.dev>';
    const logo = Deno.env.get('LOGO_URL') || 'https://omsualumnitrack.site/icon-192.png';
    const what =
      purpose === 'enable' ? 'turn on two-step verification' : purpose === 'disable' ? 'turn off two-step verification' : 'finish signing in';
    const html = `
<div style="background:#eef2fa;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#002060;padding:16px 22px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px"><img src="${logo}" width="40" height="40" alt="OMSU" style="display:block;border:0" /></td>
      <td style="color:#fff;font-size:16px;font-weight:bold">OMSU Alumni Track</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 22px;font-size:14px;color:#222;line-height:1.6">
    <p style="margin:0 0 12px">Your code to ${what}:</p>
    <p style="margin:0 0 16px;font-size:30px;font-weight:bold;letter-spacing:8px;color:#002060">${code}</p>
    <p style="margin:0 0 8px">It expires in ${CODE_MINUTES} minutes.</p>
    <p style="margin:0;font-size:12px;color:#888">If you did not try to sign in, someone may know your password. Change it in Settings → Security. Never share this code with anyone.</p>
  </td></tr>
</table>
</div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: `${code} is your OMSU Alumni Track code`, html }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      // Let them try again right away
      await admin.from('email_2fa_codes').delete().eq('user_id', user.id);
      return json({ error: detail?.message || `Email service returned ${res.status}` }, 502);
    }
    const [name, domain] = to.split('@');
    return json({ ok: true, sentTo: `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}` });
  }

  if (body.action === 'verify') {
    const code = String(body.code || '').replace(/\D/g, '');
    const { data: row } = await admin.from('email_2fa_codes').select('*').eq('user_id', user.id).maybeSingle();
    if (!row || new Date(row.expires_at).getTime() < Date.now()) return json({ error: 'The code has expired. Send a new one.' }, 400);
    if (row.attempts >= MAX_ATTEMPTS) return json({ error: 'Too many wrong codes. Send a new one.' }, 429);
    if (code.length !== 6 || (await hash(user.id, code)) !== row.code_hash) {
      await admin.from('email_2fa_codes').update({ attempts: row.attempts + 1 }).eq('user_id', user.id);
      return json({ error: 'That code is not correct.' }, 400);
    }
    await admin.from('email_2fa_codes').delete().eq('user_id', user.id);

    if (row.purpose === 'disable') {
      await admin.from('profiles').update({ email_2fa: false }).eq('id', user.id);
      await admin.from('email_2fa_sessions').delete().eq('user_id', user.id);
      return json({ ok: true, enabled: false });
    }
    await admin.from('email_2fa_sessions').upsert({ session_id: sessionId, user_id: user.id });
    // Old verified sessions are no longer needed after a month
    await admin.from('email_2fa_sessions').delete().eq('user_id', user.id).lt('verified_at', new Date(Date.now() - 30 * 86400_000).toISOString());
    if (row.purpose === 'enable') await admin.from('profiles').update({ email_2fa: true }).eq('id', user.id);
    return json({ ok: true, enabled: row.purpose === 'enable' ? true : enabled });
  }

  return json({ error: 'Unknown request' }, 400);
});
