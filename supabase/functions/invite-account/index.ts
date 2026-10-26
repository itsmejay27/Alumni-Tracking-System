// Creates an account for a staff member (program chair, director, etc.) with a
// temporary password, and emails them an invitation. Only Alumni Affairs may call it.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import nodemailer from 'npm:nodemailer@6.9.16';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES: Record<string, string> = {
  'admin': 'Alumni Affairs',
  'admin.bsit': 'BSIT Program Chair',
  'admin.beed': 'BEED Program Chair',
  'admin.bsba-fm': 'BSBA-FM Program Chair',
  'admin.bsba-om': 'BSBA-OM Program Chair',
  'admin.bsoa': 'BSOA Program Chair',
  'alumni': 'Alumni Member',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function tempPassword() {
  // No look-alike characters (0/O, 1/l/I) so it is easy to type from an email
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function invitationEmail(o: { name: string; roleLabel: string; email: string; password: string; siteUrl: string }) {
  const name = escapeHtml(o.name.toUpperCase());
  const site = escapeHtml(o.siteUrl);
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.6;max-width:640px">
  <p>Hello ${name},</p>
  <p>You have been given an account on the <b>OMSU Alumni Graduate Tracer</b> of Occidental Mindoro State University as <b>${escapeHtml(o.roleLabel)}</b>.</p>
  <p>You may now log in using the details below. For your security, you will be asked to change this temporary password the first time you sign in.</p>
  <table style="border-collapse:collapse;margin:12px 0">
    <tr><td style="padding:4px 12px 4px 0"><b>Login URL:</b></td><td><a href="${site}">${site}</a></td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Email:</b></td><td>${escapeHtml(o.email)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Temporary Password:</b></td><td style="font-family:monospace;font-size:15px">${escapeHtml(o.password)}</td></tr>
  </table>
  <p>This is a system generated e-mail. Please do not reply. If you did not expect this invitation, please contact the OMSU Alumni Affairs Office.</p>
  <p>Thank you,</p>
  <p>OCCIDENTAL MINDORO STATE UNIVERSITY<br/>Alumni Affairs Office</p>
</div>`;
  const text = `Hello ${o.name.toUpperCase()},

You have been given an account on the OMSU Alumni Graduate Tracer as ${o.roleLabel}.

Login URL: ${o.siteUrl}
Email: ${o.email}
Temporary Password: ${o.password}

You will be asked to change this temporary password the first time you sign in.

Thank you,
OCCIDENTAL MINDORO STATE UNIVERSITY - Alumni Affairs Office`;
  return { html, text };
}

/** Sends the invitation: Resend if RESEND_API_KEY is set, otherwise SMTP (e.g. Gmail). */
async function sendInvitation(o: { name: string; roleLabel: string; email: string; password: string; siteUrl: string }) {
  let emailSent = false;
  let emailError: string | null = null;
  const message = invitationEmail(o);
  const subject = 'Your OMSU Alumni Tracer account';
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  try {
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: Deno.env.get('RESEND_FROM') || 'OMSU Alumni Tracer <onboarding@resend.dev>',
          to: [o.email],
          subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.message || `Resend returned ${res.status}`);
      }
      emailSent = true;
    } else if (smtpUser && smtpPass) {
      const transport = nodemailer.createTransport({
        host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
        port: Number(Deno.env.get('SMTP_PORT') || 465),
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transport.sendMail({
        from: `"OMSU Alumni Tracer" <${Deno.env.get('SMTP_FROM') || smtpUser}>`,
        to: o.email,
        subject,
        html: message.html,
        text: message.text,
      });
      emailSent = true;
    } else {
      emailError = 'Email sending is not set up yet';
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
  }
  return { emailSent, emailError };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Only Alumni Affairs (super admin) may manage accounts
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Not signed in' }, 401);
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.user.id).single();
  if (callerProfile?.role !== 'admin') return json({ error: 'Only Alumni Affairs can manage accounts' }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Remove an account (also used to cancel a pending invitation)
  if (body.action === 'delete') {
    const userId = String(body.userId || '');
    if (!userId) return json({ error: 'Missing account' }, 400);
    if (userId === caller.user.id) return json({ error: "You can't remove your own account" }, 400);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }
  // Resend a pending invitation with a fresh temporary password
  if (body.action === 'resend') {
    const userId = String(body.userId || '');
    const { data: target } = await admin
      .from('profiles')
      .select('email, given_name, last_name, role, title, must_change_password')
      .eq('id', userId)
      .single();
    if (!target) return json({ error: 'Account not found' }, 404);
    if (!target.must_change_password) return json({ error: 'This person has already signed in and set their own password' }, 400);
    const password = tempPassword();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message }, 400);
    const siteUrl = String(Deno.env.get('SITE_URL') || body.siteUrl || '').trim();
    const name = `${target.given_name} ${target.last_name}`.trim();
    const result = await sendInvitation({ name, roleLabel: target.title || ROLES[target.role] || '', email: target.email, password, siteUrl });
    return json({ ok: true, ...result, tempPassword: password });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const givenName = String(body.givenName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const role = String(body.role || '');
  const title = String(body.title || '').trim() || ROLES[role] || '';
  const siteUrl = String(Deno.env.get('SITE_URL') || body.siteUrl || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address' }, 400);
  if (!givenName || !lastName) return json({ error: 'First and last name are required' }, 400);
  if (!ROLES[role]) return json({ error: 'Unknown role' }, 400);

  const password = tempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { given_name: givenName, last_name: lastName },
    // Marks staff accounts so the sign-up Student ID check does not apply to them
    app_metadata: { staff: true },
  });
  if (createError || !created.user) {
    const exists = /already/i.test(createError?.message || '');
    return json({ error: exists ? 'An account with this email already exists' : createError?.message || 'Could not create account' }, exists ? 409 : 400);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ role, title, must_change_password: true })
    .eq('id', created.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: `Could not set up profile: ${profileError.message}` }, 500);
  }

  const { emailSent, emailError } = await sendInvitation({ name: `${givenName} ${lastName}`, roleLabel: title, email, password, siteUrl });

  // The temporary password is returned once so the admin can share it if the email fails
  return json({ ok: true, userId: created.user.id, emailSent, emailError, tempPassword: password });
});
