-- The 2018-2020 tracer sheet has no "type of employer" column, so the import guessed "Private"
-- for every employed graduate. Records the graduate never updated themselves now say
-- "Not specified" instead of the guess. Old values stay in alumni_record_history.
update public.alumni_records r
   set data = (r.data || jsonb_build_object('employerType', 'Not specified'))
     || jsonb_build_object('employmentHistory', coalesce((
          select jsonb_agg(case when e->>'employerType' = 'Private' then e || '{"employerType":"Not specified"}'::jsonb else e end order by ord)
            from jsonb_array_elements(coalesce(r.data->'employmentHistory', '[]'::jsonb)) with ordinality as x(e, ord)), '[]'::jsonb))
 where r.data->>'status' in ('Employed', 'Self-Employed')
   and not (r.data ? 'respondedAt')
   and r.data->>'employerType' = 'Private';
