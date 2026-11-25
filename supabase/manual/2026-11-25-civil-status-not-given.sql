-- The graduate-list import filled in "Single" for every record because the source lists have no
-- civil status column (all 1,910 records said "Single"). For graduates who never answered
-- (no account, no response), the value is removed so it shows as "Not given" and is not counted.
-- Records a graduate saved themselves are left as they are.
-- A data correction, not a user edit: skip the history and activity-log triggers.
begin;
set local session_replication_role = replica;
update public.alumni_records
set data = data - 'civilStatus'
where user_id is null
  and data->>'respondedAt' is null
  and data->>'civilStatus' = 'Single';
commit;
