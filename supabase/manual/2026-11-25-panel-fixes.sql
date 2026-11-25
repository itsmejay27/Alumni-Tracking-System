-- Panel fixes (Sir Ian, Sir Mon)

-- 1. Response rate: linking an account is not a response. Only a save by an alumnus whose
--    record was already linked counts (the claim itself no longer marks respondedAt).
create or replace function public.mark_alumni_response() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and auth.uid() = new.user_id
     and (tg_op = 'INSERT' or old.user_id is not distinct from new.user_id) then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object('respondedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  elsif tg_op = 'UPDATE' and old.user_id is not distinct from new.user_id
        and not (coalesce(new.data, '{}'::jsonb) ? 'respondedAt') and (old.data ? 'respondedAt') then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object('respondedAt', old.data->'respondedAt');
  end if;
  return new;
end $$;
revoke execute on function public.mark_alumni_response() from public, anon, authenticated;

-- 2. Job posts by Alumni Affairs and program chairs go live right away; only alumni posts wait for approval
create or replace function public.jobs_guard_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  is_staff boolean := coalesce(public.app_role(), '') = 'admin' or public.admin_course() is not null;
  is_affairs boolean := coalesce(public.app_role(), '') = 'admin';
begin
  if tg_op = 'INSERT' then
    new.status := case when is_staff then 'approved' else 'pending' end;
    new.reviewed_by := case when is_staff then auth.uid() end;
    new.reviewed_at := case when is_staff then now() end;
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
