-- Invite graduates who have no account yet (panel: every graduate should be reached, not only
-- those who signed in). Remembers each invitation so the same graduate is emailed at most once
-- every 30 days. Only staff can read it; only the send-reminders function writes it.
create table if not exists public.graduate_invites (
  id bigint generated always as identity primary key,
  record_id text not null references public.alumni_records(id) on delete cascade,
  course text not null,
  email text not null,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz not null default now()
);
create index if not exists graduate_invites_record_idx on public.graduate_invites(record_id, sent_at desc);
alter table public.graduate_invites enable row level security;
drop policy if exists "invites: staff read" on public.graduate_invites;
create policy "invites: staff read" on public.graduate_invites for select to authenticated
  using ((select public.app_role()) = 'admin' or course = (select public.admin_course()));
revoke insert, update, delete, truncate, references, trigger on public.graduate_invites from anon, authenticated;
revoke all on public.graduate_invites from anon;
