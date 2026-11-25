-- In-app notifications (panel: not only email; on/off in the system and for email).
-- Each person can turn the bell off, and the time they last opened it marks what is new.
alter table public.profiles add column if not exists app_notifications boolean not null default true;
alter table public.profiles add column if not exists notifications_seen_at timestamptz;
