-- Job approval: jobs posted by anyone other than Alumni Affairs wait for approval before
-- they appear on the Job Board. Only the poster or Alumni Affairs can remove a job.
alter table public.jobs add column if not exists status text not null default 'approved';
alter table public.jobs alter column status set default 'pending';
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in ('pending', 'approved', 'rejected'));
-- Who the poster wanted to email once approved: 'everyone', 'department', or null for no email
alter table public.jobs add column if not exists email_audience text;
alter table public.jobs drop constraint if exists jobs_email_audience_check;
alter table public.jobs add constraint jobs_email_audience_check check (email_audience in ('everyone', 'department'));
alter table public.jobs add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.jobs add column if not exists reviewed_at timestamptz;
alter table public.jobs add column if not exists review_note text;
create index if not exists jobs_status_idx on public.jobs(status);

-- The database decides the status, so nobody can approve their own post
create or replace function public.jobs_guard_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  is_affairs boolean := coalesce(public.app_role(), '') = 'admin';
begin
  if tg_op = 'INSERT' then
    new.status := case when is_affairs then 'approved' else 'pending' end;
    new.reviewed_by := case when is_affairs then auth.uid() end;
    new.reviewed_at := case when is_affairs then now() end;
    new.review_note := null;
  elsif not is_affairs and auth.uid() is not null then
    new.status := old.status;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_note := old.review_note;
  end if;
  return new;
end $$;
revoke execute on function public.jobs_guard_status() from public, anon, authenticated;
drop trigger if exists jobs_guard_status on public.jobs;
create trigger jobs_guard_status before insert or update on public.jobs
  for each row execute function public.jobs_guard_status();

-- Approved jobs are visible to everyone; pending/rejected ones only to the poster and Alumni Affairs
drop policy if exists "jobs: read" on public.jobs;
create policy "jobs: read" on public.jobs for select to authenticated
  using (status = 'approved' or created_by = (select auth.uid()) or (select public.app_role()) = 'admin');
drop policy if exists "jobs: owner or admin delete" on public.jobs;
create policy "jobs: owner or admin delete" on public.jobs for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.app_role()) = 'admin');
drop policy if exists "jobs: owner or admin update" on public.jobs;
create policy "jobs: owner or admin update" on public.jobs for update to authenticated
  using (created_by = (select auth.uid()) or (select public.app_role()) = 'admin')
  with check (created_by = (select auth.uid()) or (select public.app_role()) = 'admin');
