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

The invitation is sent by the `invite-account` Supabase Edge Function using a Gmail account.
In Supabase → Edge Functions → Secrets, add:

| Name | Value |
| --- | --- |
| `SMTP_USER` | the Gmail address that sends the emails |
| `SMTP_PASS` | a Gmail **App Password** for that account (Google Account → Security → 2-Step Verification → App passwords) |
| `SITE_URL` | the live site address, e.g. `https://omsu-alumni-tracer-itsmejay27s-projects.vercel.app` |

Optional: `SMTP_HOST` / `SMTP_PORT` (defaults `smtp.gmail.com` / `465`) and `SMTP_FROM`.

### The first super admin

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
