-- OMSU Alumni Tracer database schema (already applied to the Supabase project).
-- Run this on a fresh Supabase project to recreate the tables and security rules.

-- Profiles: one row per signed-up user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'alumni'
    check (role in ('alumni','admin','admin.bsit','admin.beed','admin.bsba-fm','admin.bsba-om','admin.bsoa')),
  given_name text not null default '',
  last_name text not null default '',
  middle_name text not null default '',
  mobile_no text not null default '',
  present_address text not null default '',
  permanent_address text not null default '',
  sex text not null default 'Male' check (sex in ('Male','Female')),
  date_of_birth text not null default '',
  civil_status text not null default 'Single' check (civil_status in ('Single','Married','Separated','Widowed')),
  facebook_name text not null default '',
  avatar_url text not null default '',
  title text not null default '',
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tracer survey records (imported records have no user until the alumnus signs up)
create table public.alumni_records (
  id text primary key default gen_random_uuid()::text,
  user_id uuid unique references auth.users(id) on delete set null,
  email text,
  course text not null check (course in ('BSIT','BEED','BSBA-FM','BSBA-OM','BSOA')),
  batch text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index alumni_records_course_idx on public.alumni_records(course);
create index alumni_records_email_idx on public.alumni_records(lower(email));

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'General' check (category in ('Event','Job Seminar','General','Homecoming')),
  course text check (course in ('BSIT','BEED','BSBA-FM','BSBA-OM','BSOA')),
  author text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null,
  type text not null check (type in ('full-time','part-time','contract','internship')),
  salary text,
  description text not null,
  requirements text[] not null default '{}',
  contact_email text not null,
  posted_by text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index jobs_created_by_idx on public.jobs(created_by);
create index announcements_created_by_idx on public.announcements(created_by);

-- Helpers (security definer so policies can read the caller's role without recursion)
create function public.app_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function public.admin_course() returns text
language sql stable security definer set search_path = '' as $$
  select case role
    when 'admin.bsit' then 'BSIT'
    when 'admin.beed' then 'BEED'
    when 'admin.bsba-fm' then 'BSBA-FM'
    when 'admin.bsba-om' then 'BSBA-OM'
    when 'admin.bsoa' then 'BSOA'
  end
  from public.profiles where id = (select auth.uid())
$$;

-- New sign-up -> profile row, and link any existing tracer record with the same email
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, given_name, last_name)
  values (
    new.id,
    lower(new.email),
    upper(coalesce(new.raw_user_meta_data->>'given_name', '')),
    upper(coalesce(new.raw_user_meta_data->>'last_name', ''))
  );
  update public.alumni_records
     set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only a super admin (or the dashboard/service role) can change roles or emails
create function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.email is distinct from old.email)
     and (select auth.uid()) is not null
     and coalesce(public.app_role(), '') <> 'admin' then
    raise exception 'Only the super admin can change roles';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.app_role() from public, anon;
revoke execute on function public.admin_course() from public, anon;
grant execute on function public.app_role() to authenticated;
grant execute on function public.admin_course() to authenticated;

-- Row level security
alter table public.profiles enable row level security;
alter table public.alumni_records enable row level security;
alter table public.announcements enable row level security;
alter table public.jobs enable row level security;

create policy "profiles: read own or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.app_role()) like 'admin%');
create policy "profiles: update own or super admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.app_role()) = 'admin')
  with check (id = (select auth.uid()) or (select public.app_role()) = 'admin');

create policy "records: read own or scoped admin" on public.alumni_records for select to authenticated
  using (user_id = (select auth.uid())
         or (select public.app_role()) = 'admin'
         or course = (select public.admin_course()));
create policy "records: insert own or super admin" on public.alumni_records for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.app_role()) = 'admin');
create policy "records: update own or scoped admin" on public.alumni_records for update to authenticated
  using (user_id = (select auth.uid())
         or (select public.app_role()) = 'admin'
         or course = (select public.admin_course()))
  with check (user_id = (select auth.uid())
         or (select public.app_role()) = 'admin'
         or course = (select public.admin_course()));
create policy "records: delete super admin" on public.alumni_records for delete to authenticated
  using ((select public.app_role()) = 'admin');

create policy "announcements: read" on public.announcements for select to authenticated using (true);
create policy "announcements: admins post" on public.announcements for insert to authenticated
  with check ((select public.app_role()) = 'admin'
              or (course is not distinct from (select public.admin_course()) and (select public.admin_course()) is not null));
create policy "announcements: admins delete" on public.announcements for delete to authenticated
  using ((select public.app_role()) = 'admin' or created_by = (select auth.uid()));

create policy "jobs: read" on public.jobs for select to authenticated using (true);
create policy "jobs: signed-in users post" on public.jobs for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "jobs: owner or admin delete" on public.jobs for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.app_role()) like 'admin%');

-- ---------------------------------------------------------------------------
-- Panel feedback additions
-- ---------------------------------------------------------------------------

-- Editable site info (Contact Us details), readable by everyone, editable by Alumni Affairs
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "settings: anyone reads" on public.site_settings for select to anon, authenticated using (true);
create policy "settings: alumni affairs writes" on public.site_settings for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy "settings: alumni affairs updates" on public.site_settings for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');

-- Job posts can target a program so alumni see best matches first
alter table public.jobs add column if not exists program text
  check (program in ('BSIT','BEED','BSBA-FM','BSBA-OM','BSOA'));
create policy "jobs: owner or admin update" on public.jobs for update to authenticated
  using (created_by = (select auth.uid()) or (select public.app_role()) like 'admin%')
  with check (created_by = (select auth.uid()) or (select public.app_role()) like 'admin%');

-- Enrollment and graduate totals per program and year
create table if not exists public.batch_totals (
  course text not null check (course in ('BSIT','BEED','BSBA-FM','BSBA-OM','BSOA')),
  year_graduated int not null check (year_graduated between 1966 and 2100),
  enrolled int check (enrolled >= 0),
  graduated int check (graduated >= 0),
  updated_at timestamptz not null default now(),
  primary key (course, year_graduated)
);
alter table public.batch_totals enable row level security;
create policy "batch totals: admins read" on public.batch_totals for select to authenticated
  using ((select public.app_role()) like 'admin%');
create policy "batch totals: scoped admin insert" on public.batch_totals for insert to authenticated
  with check ((select public.app_role()) = 'admin' or course = (select public.admin_course()));
create policy "batch totals: scoped admin update" on public.batch_totals for update to authenticated
  using ((select public.app_role()) = 'admin' or course = (select public.admin_course()))
  with check ((select public.app_role()) = 'admin' or course = (select public.admin_course()));
create policy "batch totals: scoped admin delete" on public.batch_totals for delete to authenticated
  using ((select public.app_role()) = 'admin' or course = (select public.admin_course()));

-- Log of update reminders sent by program chairs (written by the send-reminders function)
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  course text,
  sent_by uuid references auth.users(id) on delete set null,
  recipients int not null default 0,
  min_years int not null default 1,
  created_at timestamptz not null default now()
);
alter table public.reminder_log enable row level security;
create policy "reminders: admins read" on public.reminder_log for select to authenticated
  using ((select public.app_role()) = 'admin' or course = (select public.admin_course()));
create index if not exists reminder_log_sent_by_idx on public.reminder_log(sent_by);

-- Program chairs can import (CSV) records for their own program
create policy "records: program chair imports" on public.alumni_records for insert to authenticated
  with check (user_id is null and course = (select public.admin_course()));

-- Staff directory visible to signed-in users (names, titles and emails of staff only)
create or replace function public.staff_directory()
returns table (id uuid, given_name text, last_name text, middle_name text, role text, title text, email text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.given_name, p.last_name, p.middle_name, p.role, p.title, p.email, p.avatar_url
  from public.profiles p
  where p.role like 'admin%' and p.must_change_password = false
  order by case when p.role = 'admin' then 0 else 1 end, p.role, p.last_name
$$;
revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- Student ID sign-up: alumni can only create an account for an existing record
-- (Student ID + last name). Staff accounts are flagged by the invite function in
-- app metadata ({"staff": true}), which users cannot set themselves.
-- ---------------------------------------------------------------------------
create index if not exists alumni_records_student_id_idx on public.alumni_records (upper(trim(data->>'studentId')));
create unique index if not exists alumni_records_student_id_unique
  on public.alumni_records (upper(trim(data->>'studentId')))
  where coalesce(trim(data->>'studentId'), '') <> '';

create or replace function public.check_student_id(p_student_id text, p_last_name text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  select user_id into r from public.alumni_records
   where upper(trim(data->>'studentId')) = upper(trim(p_student_id))
     and upper(trim(data->>'lastName')) = upper(trim(p_last_name))
   limit 1;
  if not found then return 'not_found'; end if;
  if r.user_id is not null then return 'taken'; end if;
  return 'ok';
end $$;
revoke execute on function public.check_student_id(text, text) from public;
grant execute on function public.check_student_id(text, text) to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rec_id text;
begin
  if coalesce(new.raw_app_meta_data->>'staff', '') <> 'true' then
    select id into rec_id from public.alumni_records
     where upper(trim(data->>'studentId')) = upper(trim(coalesce(new.raw_user_meta_data->>'student_id', '')))
       and upper(trim(data->>'lastName')) = upper(trim(coalesce(new.raw_user_meta_data->>'last_name', '')))
       and user_id is null
     limit 1
     for update;
    if rec_id is null then
      raise exception 'STUDENT_ID_NOT_FOUND';
    end if;
  end if;
  insert into public.profiles (id, email, given_name, last_name)
  values (new.id, lower(new.email),
          upper(coalesce(new.raw_user_meta_data->>'given_name', '')),
          upper(coalesce(new.raw_user_meta_data->>'last_name', '')));
  if rec_id is not null then
    update public.alumni_records
       set user_id = new.id, email = lower(new.email),
           data = data || jsonb_build_object('email', lower(new.email))
     where id = rec_id;
  end if;
  return new;
end $$;

create or replace function public.link_student_id(p_student_id text, p_last_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare rec_id text; uid uuid := auth.uid();
begin
  if uid is null then return 'not_signed_in'; end if;
  if exists (select 1 from public.alumni_records where user_id = uid) then return 'already_linked'; end if;
  select id into rec_id from public.alumni_records
   where upper(trim(data->>'studentId')) = upper(trim(p_student_id))
     and upper(trim(data->>'lastName')) = upper(trim(p_last_name))
     and user_id is null
   limit 1
   for update;
  if rec_id is null then return 'not_found'; end if;
  update public.alumni_records
     set user_id = uid,
         email = (select email from public.profiles where id = uid),
         data = data || jsonb_build_object('email', (select email from public.profiles where id = uid))
   where id = rec_id;
  return 'ok';
end $$;
revoke execute on function public.link_student_id(text, text) from public, anon;
grant execute on function public.link_student_id(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Record history: every change to a tracer record keeps the previous version
-- ---------------------------------------------------------------------------
create table if not exists public.alumni_record_history (
  id uuid primary key default gen_random_uuid(),
  record_id text not null references public.alumni_records(id) on delete cascade,
  course text not null,
  data jsonb not null,
  changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  changed_at timestamptz not null default now()
);
create index if not exists alumni_record_history_record_idx on public.alumni_record_history(record_id, changed_at desc);
create index if not exists alumni_record_history_changed_by_idx on public.alumni_record_history(changed_by);
alter table public.alumni_record_history enable row level security;
create policy "history: alumni affairs, program chair, or owner reads" on public.alumni_record_history
  for select to authenticated
  using (
    (select public.app_role()) = 'admin'
    or course = (select public.admin_course())
    or exists (select 1 from public.alumni_records r where r.id = record_id and r.user_id = (select auth.uid()))
  );

create or replace function public.keep_record_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.data is distinct from old.data then
    insert into public.alumni_record_history (record_id, course, data, changed_by)
    values (old.id, old.course, old.data || jsonb_build_object('batch', old.batch), auth.uid());
  end if;
  return new;
end $$;
revoke execute on function public.keep_record_history() from public, anon, authenticated;
create trigger alumni_records_keep_history
  before update on public.alumni_records
  for each row execute function public.keep_record_history();

-- Staff invites: Supabase applies app_metadata after inserting the user, so handle_new_user
-- can't see {staff:true} yet. The invite-account function adds the email here first.
create table if not exists public.staff_invites (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rec_id text; is_staff boolean;
begin
  is_staff := coalesce(new.raw_app_meta_data->>'staff', '') = 'true'
    or exists (select 1 from public.staff_invites
                where email = lower(new.email) and created_at > now() - interval '15 minutes');

  if not is_staff then
    select id into rec_id from public.alumni_records
     where upper(trim(data->>'studentId')) = upper(trim(coalesce(new.raw_user_meta_data->>'student_id', '')))
       and upper(trim(data->>'lastName')) = upper(trim(coalesce(new.raw_user_meta_data->>'last_name', '')))
       and user_id is null
     limit 1
     for update;
    if rec_id is null then
      raise exception 'STUDENT_ID_NOT_FOUND';
    end if;
  end if;

  insert into public.profiles (id, email, given_name, last_name)
  values (
    new.id,
    lower(new.email),
    upper(coalesce(new.raw_user_meta_data->>'given_name', '')),
    upper(coalesce(new.raw_user_meta_data->>'last_name', ''))
  );

  if rec_id is not null then
    update public.alumni_records
       set user_id = new.id, email = lower(new.email),
           data = data || jsonb_build_object('email', lower(new.email))
     where id = rec_id;
  end if;
  return new;
end $$;

-- AI Job Assistant: one row per request, for the daily per-user limit (service role only)
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;

-- Email preferences (Settings → Notifications) and one-time job alerts
alter table public.profiles add column if not exists email_jobs boolean not null default true;
alter table public.profiles add column if not exists email_announcements boolean not null default true;
alter table public.jobs add column if not exists emailed_at timestamptz;

-- Job alert filters (Settings → Notifications): empty types = all; min salary is monthly PHP, 0 = any
alter table public.profiles add column if not exists job_alert_types text[] not null default '{}';
alter table public.profiles add column if not exists job_alert_remote_only boolean not null default false;
alter table public.profiles add column if not exists job_alert_min_salary integer not null default 0;

-- Email sync on sign-in email change, and database-enforced two-step verification
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
drop policy if exists "announcements: admins post" on public.announcements;
create policy "announcements: admins post" on public.announcements for insert to authenticated
  with check ((select public.app_role()) = 'admin'
              or ((select public.admin_course()) is not null
                  and (course is null or course = (select public.admin_course()))));
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
drop policy if exists "announcements: admins delete" on public.announcements;
create policy "announcements: admins delete" on public.announcements for delete to authenticated
  using ((select public.app_role()) = 'admin');

-- Turns "Dela Cruz", "DE LA CRUZ" and "dela-cruz" into the same text so small typing
-- differences in spacing, dots or dashes don't block a real graduate
create or replace function public.name_key(t text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(upper(coalesce(t, '')), '[^A-ZÑ]', '', 'g')
$$;

-- Finds the graduate record for a name + birthday + sex (unclaimed or not)
create or replace function public.find_alumni_record(p_given text, p_last text, p_birth text, p_sex text)
returns table (id text, user_id uuid)
language sql stable security definer set search_path = '' as $$
  select r.id, r.user_id from public.alumni_records r
   where public.name_key(r.data->>'givenName') = public.name_key(p_given)
     and public.name_key(r.data->>'lastName') = public.name_key(p_last)
     and nullif(trim(r.data->>'dateOfBirth'), '') = nullif(trim(p_birth), '')
     and upper(trim(r.data->>'sex')) = upper(trim(p_sex))
   order by (r.user_id is null) desc
   limit 1
$$;
revoke execute on function public.find_alumni_record(text, text, text, text) from public, anon, authenticated;

-- Sign-up pre-check: 'ok', 'not_found' or 'taken'
create or replace function public.check_alumni(p_given text, p_last text, p_birth text, p_sex text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  select * into r from public.find_alumni_record(p_given, p_last, p_birth, p_sex);
  if not found then return 'not_found'; end if;
  if r.user_id is not null then return 'taken'; end if;
  return 'ok';
end $$;
grant execute on function public.check_alumni(text, text, text, text) to anon, authenticated;

-- For alumni who are signed in but not yet linked to their graduate record
create or replace function public.link_alumni(p_given text, p_last text, p_birth text, p_sex text) returns text
language plpgsql security definer set search_path = '' as $$
declare r record; uid uuid := auth.uid(); mail text;
begin
  if uid is null then return 'not_signed_in'; end if;
  if exists (select 1 from public.alumni_records where user_id = uid) then return 'already_linked'; end if;
  select * into r from public.find_alumni_record(p_given, p_last, p_birth, p_sex);
  if not found then return 'not_found'; end if;
  if r.user_id is not null then return 'taken'; end if;
  select email into mail from public.profiles where id = uid;
  update public.alumni_records
     set user_id = uid, email = mail, data = data || jsonb_build_object('email', mail)
   where id = r.id and user_id is null;
  return 'ok';
end $$;
grant execute on function public.link_alumni(text, text, text, text) to authenticated;

-- New accounts: staff skip the check; alumni must match a graduate record
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rec_id text; rec_user uuid; is_staff boolean; m jsonb := new.raw_user_meta_data;
begin
  is_staff := coalesce(new.raw_app_meta_data->>'staff', '') = 'true'
    or exists (select 1 from public.staff_invites
                where email = lower(new.email) and created_at > now() - interval '15 minutes');

  if not is_staff then
    select f.id, f.user_id into rec_id, rec_user
      from public.find_alumni_record(m->>'given_name', m->>'last_name', m->>'birth_date', m->>'sex') f;
    if rec_id is null or rec_user is not null then
      raise exception 'ALUMNI_RECORD_NOT_FOUND';
    end if;
    perform 1 from public.alumni_records where id = rec_id for update;
  end if;

  insert into public.profiles (id, email, given_name, last_name)
  values (new.id, lower(new.email), upper(coalesce(m->>'given_name', '')), upper(coalesce(m->>'last_name', '')));

  if rec_id is not null then
    update public.alumni_records
       set user_id = new.id, email = lower(new.email),
           data = data || jsonb_build_object('email', lower(new.email))
     where id = rec_id;
  end if;
  return new;
end $$;

-- Remove Student IDs completely
drop function if exists public.check_student_id(text, text);
drop function if exists public.link_student_id(text, text);
drop index if exists public.alumni_records_student_id_unique;
drop index if exists public.alumni_records_student_id_idx;
update public.alumni_records set data = data - 'studentId' where data ? 'studentId';
update public.alumni_record_history set data = data - 'studentId' where data ? 'studentId';

-- Invitations: the temporary password is kept (encrypted, readable only by the server) for
-- 1 hour, so pressing "Resend" again sends the SAME password instead of a new one
create table if not exists public.staff_invite_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  secret text not null,
  created_at timestamptz not null default now()
);
alter table public.staff_invite_secrets enable row level security;
-- No policies on purpose: only the server (service role) can read or write it

-- Directory: each person only sees Alumni Affairs and the chair of their own program
-- (a BSIT graduate sees the BSIT chair and Alumni Affairs, and so on). Alumni Affairs sees everyone.
create or replace function public.staff_directory()
returns table (id uuid, given_name text, last_name text, middle_name text, role text, title text, email text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select coalesce(
      public.admin_course(),
      (select r.course from public.alumni_records r where r.user_id = (select auth.uid()) limit 1)
    ) as program,
    public.app_role() = 'admin' as is_affairs
  )
  select p.id, p.given_name, p.last_name, p.middle_name, p.role, p.title, p.email, p.avatar_url
  from public.profiles p, me
  where p.role like 'admin%' and p.must_change_password = false
    and (me.is_affairs or p.role = 'admin' or p.role = 'admin.' || lower(coalesce(me.program, '')))
  order by case when p.role = 'admin' then 0 else 1 end, p.role, p.last_name
$$;
revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;

-- Sign-up also accepts records imported without a birthday or sex (name must match, and only one
-- such record); the details entered at sign-up are then saved to the record.
create or replace function public.find_alumni_record(p_given text, p_last text, p_birth text, p_sex text)
returns table (id text, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
  select r.id, r.user_id from public.alumni_records r
   where public.name_key(r.data->>'givenName') = public.name_key(p_given)
     and public.name_key(r.data->>'lastName') = public.name_key(p_last)
     and nullif(trim(r.data->>'dateOfBirth'), '') = nullif(trim(p_birth), '')
     and upper(trim(r.data->>'sex')) = upper(trim(p_sex))
   order by (r.user_id is null) desc
   limit 1;
  if found then return; end if;

  return query
  select x.id, x.user_id from (
    select r.id, r.user_id, count(*) over () as n
      from public.alumni_records r
     where public.name_key(r.data->>'givenName') = public.name_key(p_given)
       and public.name_key(r.data->>'lastName') = public.name_key(p_last)
       and (coalesce(trim(r.data->>'dateOfBirth'), '') = '' or coalesce(trim(r.data->>'sex'), '') = '')
       and (coalesce(trim(r.data->>'dateOfBirth'), '') = '' or trim(r.data->>'dateOfBirth') = trim(coalesce(p_birth, '')))
       and (coalesce(trim(r.data->>'sex'), '') = '' or upper(trim(r.data->>'sex')) = upper(trim(coalesce(p_sex, ''))))
  ) x
  where x.n = 1;
end $$;
revoke execute on function public.find_alumni_record(text, text, text, text) from public, anon, authenticated;

create or replace function public.fill_missing_details(d jsonb, p_birth text, p_sex text) returns jsonb
language sql immutable set search_path = '' as $$
  select d
    || case when coalesce(trim(d->>'dateOfBirth'), '') = '' and coalesce(trim(p_birth), '') <> ''
            then jsonb_build_object('dateOfBirth', trim(p_birth)) else '{}'::jsonb end
    || case when coalesce(trim(d->>'sex'), '') = '' and upper(trim(coalesce(p_sex, ''))) in ('MALE', 'FEMALE')
            then jsonb_build_object('sex', initcap(trim(p_sex))) else '{}'::jsonb end
$$;
-- link_alumni and handle_new_user now save data = public.fill_missing_details(data, birth, sex) || {email}

-- Analytics response: the database marks respondedAt whenever a graduate saves their own record,
-- and keeps an earlier mark if someone else (or an old open page) saves without it
create or replace function public.mark_alumni_response() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and auth.uid() = new.user_id then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object('respondedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  elsif tg_op = 'UPDATE' and not (coalesce(new.data, '{}'::jsonb) ? 'respondedAt') and (old.data ? 'respondedAt') then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object('respondedAt', old.data->'respondedAt');
  end if;
  return new;
end $$;
revoke execute on function public.mark_alumni_response() from public, anon, authenticated;
create or replace trigger alumni_records_mark_response
  before insert or update on public.alumni_records
  for each row execute function public.mark_alumni_response();

-- Sign-in lockout: 3 wrong passwords lock that email for 30 minutes (applied 2026-10-27)
create table if not exists public.login_lockouts (
  email text primary key,
  failed_count int not null default 0,
  first_failed_at timestamptz,
  locked_until timestamptz
);
alter table public.login_lockouts enable row level security;

create or replace function public.login_lock_status(p_email text) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select locked_until from public.login_lockouts
   where email = lower(trim(p_email)) and locked_until > now()
$$;
revoke execute on function public.login_lock_status(text) from public;
grant execute on function public.login_lock_status(text) to anon, authenticated;

create or replace function public.login_failed(p_email text) returns json
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, ''))); r public.login_lockouts;
begin
  if e = '' or length(e) > 320 then return json_build_object('attemptsLeft', 3); end if;
  insert into public.login_lockouts as l (email, failed_count, first_failed_at)
  values (e, 1, now())
  on conflict (email) do update set
    failed_count = case
      when l.locked_until > now() then l.failed_count
      when l.locked_until is not null or l.first_failed_at < now() - interval '30 minutes' then 1
      else l.failed_count + 1 end,
    first_failed_at = case
      when l.locked_until > now() then l.first_failed_at
      when l.locked_until is not null or l.first_failed_at < now() - interval '30 minutes' then now()
      else l.first_failed_at end,
    locked_until = case when l.locked_until > now() then l.locked_until else null end
  returning * into r;
  if r.locked_until is null and r.failed_count >= 3 then
    update public.login_lockouts set locked_until = now() + interval '30 minutes' where email = e returning * into r;
  end if;
  return json_build_object('attemptsLeft', greatest(0, 3 - r.failed_count), 'lockedUntil', r.locked_until);
end $$;
revoke execute on function public.login_failed(text) from public;
grant execute on function public.login_failed(text) to anon, authenticated;

create or replace function public.login_succeeded() returns void
language sql security definer set search_path = '' as $$
  delete from public.login_lockouts
   where email = (select lower(email) from auth.users where id = (select auth.uid()))
$$;
revoke execute on function public.login_succeeded() from public, anon;
grant execute on function public.login_succeeded() to authenticated;
