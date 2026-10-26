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

To make someone an administrator, run this in the Supabase SQL editor after they sign up:

```sql
-- Super admin (sees every program)
update public.profiles set role = 'admin', title = 'Campus Director' where email = 'person@example.com';

-- Program chair (sees only their program). Roles:
-- admin.bsit, admin.beed, admin.bsba-fm, admin.bsba-om, admin.bsoa
update public.profiles set role = 'admin.bsit', title = 'BSIT Program Chair' where email = 'person@example.com';
```

The user needs to sign out and back in to see the admin screens.

## Database

The schema lives in `supabase/schema.sql` (tables, row level security and triggers):

- `profiles` – one row per signed-up user, holds the role
- `alumni_records` – tracer survey answers; imported BSIT records are linked to an account
  automatically when an alumnus signs up with the same email
- `announcements`, `jobs`

## Deploying (Vercel)

Import the GitHub repo in Vercel (framework: Vite) and add the two environment variables
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. In Supabase → Authentication → URL
Configuration, set the **Site URL** to your Vercel URL so confirmation and password-reset
emails link back to the site.
