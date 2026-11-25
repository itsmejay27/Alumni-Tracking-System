-- Sign-up fixes found when a graduate couldn't create an account.
--
-- 1) Two-word first names. Graduate lists write "MORALES, AVRIELLE JOY", and the import keeps
--    the last word as the middle name (given "AVRIELLE", middle "JOY"). Graduates type their full
--    first name ("AVRIELLE JOY"), so the first name now matches either the given name alone or the
--    given name followed by the middle name. Last name, birthday and sex rules are unchanged.
create or replace function public.find_alumni_record(p_given text, p_last text, p_birth text, p_sex text)
returns table(id text, user_id uuid)
language plpgsql stable security definer
set search_path to ''
as $function$
begin
  return query
  select r.id, r.user_id from public.alumni_records r
   where public.name_key(p_given) in (public.name_key(r.data->>'givenName'),
                                      public.name_key(coalesce(r.data->>'givenName', '') || coalesce(r.data->>'middleName', '')))
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
     where public.name_key(p_given) in (public.name_key(r.data->>'givenName'),
                                        public.name_key(coalesce(r.data->>'givenName', '') || coalesce(r.data->>'middleName', '')))
       and public.name_key(r.data->>'lastName') = public.name_key(p_last)
       and (coalesce(trim(r.data->>'dateOfBirth'), '') = '' or coalesce(trim(r.data->>'sex'), '') = '')
       and (coalesce(trim(r.data->>'dateOfBirth'), '') = '' or trim(r.data->>'dateOfBirth') = trim(coalesce(p_birth, '')))
       and (coalesce(trim(r.data->>'sex'), '') = '' or upper(trim(r.data->>'sex')) = upper(trim(coalesce(p_sex, ''))))
  ) x
  where x.n = 1;
end $function$;

-- 2) Broken birthdays. The old import cut text birthdays to 10 characters ("April 20,2", "September ")
--    and kept placeholders like 01/01/1900, so these graduates could never match. The unreadable
--    value is kept in dateOfBirthImported for staff, and the birthday is cleared: these graduates can
--    now sign up with name and sex, and the program chair approves the link (the existing safe path).
--    A data correction, not a user edit: history and activity-log triggers are skipped.
begin;
set local session_replication_role = replica;
update public.alumni_records
set data = jsonb_set(data - 'dateOfBirth', '{dateOfBirthImported}', to_jsonb(data->>'dateOfBirth'))
where coalesce(data->>'dateOfBirth', '') <> ''
  and data->>'dateOfBirth' !~ '^\d{4}-\d{2}-\d{2}$';
commit;
