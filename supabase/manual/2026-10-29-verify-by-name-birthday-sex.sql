-- Alumni sign-up is now verified with full name + birthday + sex instead of a Student ID,
-- because OMSU's graduate tracer sheets don't collect Student IDs. Student IDs are removed.

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
