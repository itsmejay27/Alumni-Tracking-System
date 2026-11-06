-- Run once in Supabase Dashboard → SQL Editor.
-- 1) Keep profile and tracer record emails in step when someone changes their sign-in email.
create or replace function public.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = lower(new.email) where id = new.id;
    update public.alumni_records
       set email = lower(new.email), data = data || jsonb_build_object('email', lower(new.email))
     where user_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.sync_user_email() from public, anon, authenticated;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_user_email();

-- 2) Two-step verification enforced by the database: people who turned it on must have entered
--    their authenticator code (session level aal2) before they can read or change these tables.
create or replace function public.two_step_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors
         where user_id = (select auth.uid()) and status = 'verified'
      );
$$;
revoke execute on function public.two_step_ok() from public, anon;
grant execute on function public.two_step_ok() to authenticated;

drop policy if exists "two-step: profiles" on public.profiles;
create policy "two-step: profiles" on public.profiles as restrictive for all to authenticated
  using ((select public.two_step_ok())) with check ((select public.two_step_ok()));
drop policy if exists "two-step: records" on public.alumni_records;
create policy "two-step: records" on public.alumni_records as restrictive for all to authenticated
  using ((select public.two_step_ok())) with check ((select public.two_step_ok()));
drop policy if exists "two-step: record history" on public.alumni_record_history;
create policy "two-step: record history" on public.alumni_record_history as restrictive for all to authenticated
  using ((select public.two_step_ok())) with check ((select public.two_step_ok()));
