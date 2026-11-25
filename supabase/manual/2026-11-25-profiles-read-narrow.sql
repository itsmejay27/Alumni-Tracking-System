-- Privacy fix: program chairs could read every account's profile (including alumni of other
-- programs, with their personal details). No chair screen needs other people's profiles, so
-- reading is now limited to your own profile, plus Alumni Affairs ('admin') for account management
-- and the full backup. The Super Admin keeps its own separate policy for the top accounts.
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or alumni affairs" on public.profiles
  for select
  using (id = (select auth.uid()) or (select public.app_role()) = 'admin');
