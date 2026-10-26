# OMSU Alumni Tracer

Alumni graduate tracer system for **Occidental Mindoro State University (OMSU)**.
React + Vite frontend, Supabase for login and data, deployed on Vercel.

## Running locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and publishable (anon) key
   (Supabase dashboard → Project Settings → API).
3. `npm run dev`

## Accounts and roles

There are no built-in demo accounts. Everyone signs up with their own email from the
landing page and starts as an **alumni** account.

### Creating staff accounts (program chairs, directors)

Sign in as the super admin and open **Accounts** in the sidebar. Enter the person's name,
email and department, then click **Create Account & Send Invitation**. The system creates the
account with a temporary password and emails it to them. On their first sign-in they must
choose their own password. The temporary password is also shown to you once, in case the
email doesn't arrive.

You can change anyone's role from the same screen.

### Setting up invitation emails

The invitation is sent by the `invite-account` Supabase Edge Function. Add the secrets below in
Supabase → Edge Functions → Secrets. Use **either** Resend **or** Gmail.

**Option A – Resend (recommended)**

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | API key from resend.com → API Keys |
| `RESEND_FROM` | sender, e.g. `OMSU Alumni Tracer <noreply@omsualumnitrack.site>` (needs a domain verified in Resend) |
| `SITE_URL` | the live site address |

Without a verified domain, Resend only lets you send from `onboarding@resend.dev` to the
email address of your own Resend account, which is fine for testing only.

**Option B – Gmail**

| Name | Value |
| --- | --- |
| `SMTP_USER` | the Gmail address that sends the emails |
| `SMTP_PASS` | a Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords) |
| `SITE_URL` | the live site address |

If `RESEND_API_KEY` is set, Resend is used; otherwise Gmail.

### Sign-up verification codes and forgot password (Supabase Auth email)

Alumni confirm their email with a 6-digit code, and "Forgot password?" also uses a code.
These emails are sent by Supabase Auth, so set it up once:

1. **Use Resend to send Supabase's emails** (the built-in sender only delivers to your own team):
   Supabase → Authentication → Emails → **SMTP Settings** → enable custom SMTP:
   host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key,
   sender email `noreply@omsualumnitrack.site`, sender name `OMSU Alumni Tracer`.
2. **Templates:** Authentication → Emails → Templates. Paste
   `supabase/email-templates/confirm-signup.html` into **Confirm signup** (subject: *Your OMSU Alumni Tracer verification code*)
   and `supabase/email-templates/reset-password.html` into **Reset password** (subject: *Your OMSU password reset code*).
3. **Code length:** Authentication → Sign In / Providers → Email → *Email OTP Length* = `6`, and keep *Confirm email* on.

### The first Alumni Affairs account

The very first super admin has to be set by hand. Sign up on the site, then run this in the
Supabase SQL editor:

```sql
update public.profiles set role = 'admin', title = 'Campus Director' where email = 'person@example.com';
```

Sign out and back in to see the admin screens.

## Database

The schema lives in `supabase/schema.sql` (tables, row level security and triggers):

- `profiles` – one row per signed-up user, holds the role
- `alumni_records` – tracer survey answers; imported BSIT records are linked to an account
  automatically when an alumnus signs up with the same email
- `announcements`, `jobs`

The account-invitation function lives in `supabase/functions/invite-account/`.

## Deploying (Vercel)

Import the GitHub repo in Vercel (framework: Vite) and add the two environment variables
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. In Supabase → Authentication → URL
Configuration, set the **Site URL** to your Vercel URL so confirmation and password-reset
emails link back to the site.
