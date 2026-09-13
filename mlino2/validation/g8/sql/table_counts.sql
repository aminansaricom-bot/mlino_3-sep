\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'
SELECT tablename,
       (xpath('/row/c/text()', query_to_xml(
          format('SELECT count(*) AS c FROM public.%I', tablename),
          false, true, ''
       )))[1]::text::bigint
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
