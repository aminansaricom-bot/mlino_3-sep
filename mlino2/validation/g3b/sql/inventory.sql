\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
SELECT 'FK|' || conname || '|' || confdeltype::text || '|' || confupdtype::text
  FROM pg_constraint
 WHERE contype = 'f' AND connamespace = 'public'::regnamespace
 ORDER BY conname;
SELECT 'INDEX|' || indexname || '|' || indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
 ORDER BY indexname;
SELECT 'CHECK|' || conname || '|' || pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE contype = 'c' AND connamespace = 'public'::regnamespace
 ORDER BY conname;
SELECT 'TRIGGER|' || tgname || '|' || pg_get_triggerdef(oid)
  FROM pg_trigger
 WHERE NOT tgisinternal AND tgrelid IN (
   SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace
 )
 ORDER BY tgname;
