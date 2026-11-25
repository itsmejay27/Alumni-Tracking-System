-- Post a job for several programs (panel: Post a job > allow to select multiple programs).
-- "program" keeps the first one so older screens keep working.
alter table public.jobs add column if not exists programs text[] not null default '{}';
alter table public.jobs drop constraint if exists jobs_programs_check;
alter table public.jobs add constraint jobs_programs_check
  check (programs <@ array['BSIT','BEED','BSBA-FM','BSBA-OM','BSOA']::text[]);
update public.jobs set programs = array[program] where program is not null and programs = '{}';
