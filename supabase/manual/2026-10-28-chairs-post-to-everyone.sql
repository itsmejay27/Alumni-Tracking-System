-- Lets program chairs post announcements to everyone (course = null) as well as their own program.
drop policy if exists "announcements: admins post" on public.announcements;
create policy "announcements: admins post" on public.announcements for insert to authenticated
  with check ((select public.app_role()) = 'admin'
              or ((select public.admin_course()) is not null
                  and (course is null or course = (select public.admin_course()))));
