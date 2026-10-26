// Creates an account for a staff member (program chair, director, etc.) with a
// temporary password, and emails them an invitation. Only the super admin may call it.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import nodemailer from 'npm:nodemailer@6.9.16';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES: Record<string, string> = {
  'admin': 'Super Admin',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Only the super admin may create accounts
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Not signed in' }, 401);
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.user.id).single();
  if (callerProfile?.role !== 'admin') return json({ error: 'Only the super admin can create accounts' }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
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

  // Send the invitation email: Resend if RESEND_API_KEY is set, otherwise SMTP (e.g. Gmail)
  let emailSent = false;
  let emailError: string | null = null;
  const message = invitationEmail({
    name: `${givenName} ${lastName}`,
    roleLabel: title,
    email,
    password,
    siteUrl,
  });
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
          to: [email],
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
        to: email,
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

  // The temporary password is returned once so the admin can share it if the email fails
  return json({ ok: true, userId: created.user.id, emailSent, emailError, tempPassword: password });
});
