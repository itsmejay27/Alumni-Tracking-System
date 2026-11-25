-- Removes the old Student ID data and functions. Sign-up no longer uses them.
drop function if exists public.check_student_id(text, text);
drop function if exists public.link_student_id(text, text);
drop index if exists public.alumni_records_student_id_unique;
drop index if exists public.alumni_records_student_id_idx;
update public.alumni_records set data = data - 'studentId' where data ? 'studentId';
update public.alumni_record_history set data = data - 'studentId' where data ? 'studentId';
