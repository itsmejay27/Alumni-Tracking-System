-- Only Alumni Affairs can delete announcements (program chairs can no longer delete, even their own)
drop policy if exists "announcements: admins delete" on public.announcements;
create policy "announcements: admins delete" on public.announcements for delete to authenticated
  using ((select public.app_role()) = 'admin');
