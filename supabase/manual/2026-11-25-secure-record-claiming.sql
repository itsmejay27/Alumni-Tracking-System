-- Secure record claiming and record protection (panel: Data Privacy, Ma'am Faye / Sir Mon)
--
-- 1. A graduate record links instantly only when the birthday AND sex saved on the record match.
--    When the record has no birthday or sex on file (a name-only match), the account is linked
--    but the old details (phone, addresses, employer...) are held back in alumni_link_holds,
--    which only staff can read. Alumni Affairs or the program chair then approves or rejects it.
-- 2. Record history no longer shows an alumnus the versions saved before they linked.
-- 3. Alumni can no longer move their own record to another program or batch, or clear the
--    "waiting for verification" mark. Staff correct those.
-- 4. The Super Admin can read (not change) every record, as asked by the panel.
-- 5. Clearer error when someone tries to change an account email.
-- 6. Signed-out visitors and signed-in users lose table rights they never use (TRUNCATE etc.).

-- Held-back details of records claimed by name only
create table if not exists public.alumni_link_holds (
  record_id text primary key references public.alumni_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  held_data jsonb not null,
  held_email text,
  created_at timestamptz not null default now()
);
alter table public.alumni_link_holds enable row level security;
drop policy if exists "link holds: staff read" on public.alumni_link_holds;
create policy "link holds: staff read" on public.alumni_link_holds for select to authenticated
  using ((select public.app_role()) = 'admin' or course = (select public.admin_course()));
revoke insert, update, delete, truncate, references, trigger on public.alumni_link_holds from anon, authenticated;
revoke all on public.alumni_link_holds from anon;

-- History: skip the copy while a record is claimed by name only
create or replace function public.keep_record_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('app.skip_history', true), '') = 'on' then
    return new;
  end if;
  if new.data is distinct from old.data then
    insert into public.alumni_record_history (record_id, course, data, changed_by)
    values (old.id, old.course, old.data || jsonb_build_object('batch', old.batch), auth.uid());
  end if;
  return new;
end $$;
revoke execute on function public.keep_record_history() from public, anon, authenticated;

-- Alumni read only the history entries they saved themselves
drop policy if exists "history: alumni affairs, program chair, or owner reads" on public.alumni_record_history;
create policy "history: alumni affairs, program chair, or owner reads" on public.alumni_record_history
  for select to authenticated
  using (
    (select public.app_role()) in ('admin', 'superadmin')
    or course = (select public.admin_course())
    or (changed_by = (select auth.uid())
        and exists (select 1 from public.alumni_records r where r.id = record_id and r.user_id = (select auth.uid())))
  );

-- One place that links an account to a record (used by sign-up and by "Confirm you're a graduate")
create or replace function public.claim_alumni_record(p_record_id text, p_user uuid, p_email text, p_birth text, p_sex text)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.alumni_records; exact boolean;
begin
  select * into r from public.alumni_records where id = p_record_id for update;
  if not found then return 'not_found'; end if;
  if r.user_id is not null then return 'taken'; end if;

  exact := coalesce(trim(r.data->>'dateOfBirth'), '') <> ''
       and trim(r.data->>'dateOfBirth') = trim(coalesce(p_birth, ''))
       and coalesce(trim(r.data->>'sex'), '') <> ''
       and upper(trim(r.data->>'sex')) = upper(trim(coalesce(p_sex, '')));

  if exact then
    update public.alumni_records
       set user_id = p_user, email = lower(p_email),
           data = public.fill_missing_details(data, p_birth, p_sex) || jsonb_build_object('email', lower(p_email))
     where id = r.id;
    return 'ok';
  end if;

  insert into public.alumni_link_holds (record_id, user_id, course, held_data, held_email)
  values (r.id, p_user, r.course, r.data, r.email)
  on conflict (record_id) do update
    set user_id = excluded.user_id, held_data = excluded.held_data, held_email = excluded.held_email, created_at = now();

  perform set_config('app.skip_history', 'on', true);
  update public.alumni_records
     set user_id = p_user, email = lower(p_email),
         data = jsonb_strip_nulls(jsonb_build_object(
           'givenName', r.data->'givenName',
           'lastName', r.data->'lastName',
           'middleName', r.data->'middleName',
           'yearGraduated', r.data->'yearGraduated',
           'campus', r.data->'campus',
           'status', 'Not Tracked',
           'dateOfBirth', nullif(trim(coalesce(p_birth, '')), ''),
           'sex', case when upper(trim(coalesce(p_sex, ''))) in ('MALE', 'FEMALE') then initcap(trim(p_sex)) end,
           'email', lower(p_email),
           'verification', 'pending'))
   where id = r.id;
  perform set_config('app.skip_history', 'off', true);
  return 'pending';
end $$;
revoke execute on function public.claim_alumni_record(text, uuid, text, text, text) from public, anon, authenticated;

create or replace function public.link_alumni(p_given text, p_last text, p_birth text, p_sex text)
returns text language plpgsql security definer set search_path = '' as $$
declare r record; uid uuid := auth.uid(); mail text;
begin
  if uid is null then return 'not_signed_in'; end if;
  if exists (select 1 from public.alumni_records where user_id = uid) then return 'already_linked'; end if;
  select * into r from public.find_alumni_record(p_given, p_last, p_birth, p_sex);
  if not found then return 'not_found'; end if;
  if r.user_id is not null then return 'taken'; end if;
  select email into mail from public.profiles where id = uid;
  return public.claim_alumni_record(r.id, uid, mail, p_birth, p_sex);
end $$;
revoke execute on function public.link_alumni(text, text, text, text) from public, anon;
grant execute on function public.link_alumni(text, text, text, text) to authenticated;

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
  end if;

  insert into public.profiles (id, email, given_name, last_name)
  values (new.id, lower(new.email), upper(coalesce(m->>'given_name', '')), upper(coalesce(m->>'last_name', '')));

  if rec_id is not null then
    perform public.claim_alumni_record(rec_id, new.id, new.email, m->>'birth_date', m->>'sex');
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Staff approve or reject a name-only claim
create or replace function public.review_record_link(p_record_id text, p_approve boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare h public.alumni_link_holds; r public.alumni_records; mine jsonb;
begin
  select * into h from public.alumni_link_holds where record_id = p_record_id for update;
  if not found then return 'not_pending'; end if;
  -- coalesce: for alumni admin_course() is null, and "not null" would let them through
  if not (coalesce(public.app_role(), '') = 'admin' or coalesce(h.course = public.admin_course(), false)) then
    raise exception 'Only Alumni Affairs or the program chair can verify this graduate';
  end if;
  select * into r from public.alumni_records where id = p_record_id for update;

  if p_approve then
    -- What the alumnus typed in wins; blanks and the placeholder status fall back to the held details
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into mine
      from jsonb_each(r.data - 'verification')
     where value not in ('""'::jsonb, 'null'::jsonb, '[]'::jsonb)
       and not (key = 'status' and value = '"Not Tracked"'::jsonb);
    update public.alumni_records set data = h.held_data || mine where id = p_record_id;
    perform public.write_activity('record', 'Graduate verified',
      trim(coalesce(h.held_data->>'givenName', '') || ' ' || coalesce(h.held_data->>'lastName', '')) || ' (' || h.course || ')');
  else
    update public.alumni_records set user_id = null, email = h.held_email, data = h.held_data where id = p_record_id;
    perform public.write_activity('record', 'Graduate link rejected',
      trim(coalesce(h.held_data->>'givenName', '') || ' ' || coalesce(h.held_data->>'lastName', '')) || ' (' || h.course || ')');
  end if;
  delete from public.alumni_link_holds where record_id = p_record_id;
  return case when p_approve then 'approved' else 'rejected' end;
end $$;
revoke execute on function public.review_record_link(text, boolean) from public, anon;
grant execute on function public.review_record_link(text, boolean) to authenticated;

-- Alumni can't move their record to another program or batch, or clear the verification mark
create or replace function public.protect_record_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
declare staff boolean := coalesce(public.app_role(), '') = 'admin' or public.admin_course() is not null;
begin
  -- Only an alumnus editing their own, already linked record is limited
  if auth.uid() is null or staff or old.user_id is distinct from auth.uid() then return new; end if;
  new.course := old.course;
  new.batch := old.batch;
  if old.data ? 'verification' then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object('verification', old.data->'verification');
  else
    new.data := coalesce(new.data, '{}'::jsonb) - 'verification';
  end if;
  return new;
end $$;
revoke execute on function public.protect_record_fields() from public, anon, authenticated;
drop trigger if exists alumni_records_protect_fields on public.alumni_records;
create trigger alumni_records_protect_fields
  before update on public.alumni_records
  for each row execute function public.protect_record_fields();

-- Alumni no longer create records of their own: every record comes from the graduate list
drop policy if exists "records: insert own or super admin" on public.alumni_records;
create policy "records: insert own or super admin" on public.alumni_records for insert to authenticated
  with check ((select public.app_role()) = 'admin');

-- Super Admin reads every record and proof (read only)
drop policy if exists "records: super admin reads" on public.alumni_records;
create policy "records: super admin reads" on public.alumni_records for select to authenticated
  using ((select public.app_role()) = 'superadmin');
drop policy if exists "employment proofs: super admin reads" on storage.objects;
create policy "employment proofs: super admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'employment-proofs' and (select public.app_role()) = 'superadmin');

-- Clear error messages
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if new.email is distinct from old.email and coalesce(public.app_role(), '') <> 'admin' then
      raise exception 'Only Alumni Affairs can change an account''s email address';
    end if;
    if new.role is distinct from old.role then
      if coalesce(public.app_role(), '') <> 'admin' then
        raise exception 'Only Alumni Affairs can change account roles';
      end if;
      if old.role in ('admin', 'superadmin') or new.role in ('admin', 'superadmin') then
        raise exception 'Only the Super Admin can give or remove Alumni Affairs access';
      end if;
    end if;
    if new.email_2fa is distinct from old.email_2fa and coalesce(public.app_role(), '') <> 'admin' then
      raise exception 'Use Settings to change two-step verification';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;

-- Table rights the app never uses
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
  end loop;
end $$;
