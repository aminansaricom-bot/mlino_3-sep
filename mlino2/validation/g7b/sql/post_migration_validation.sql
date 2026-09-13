\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'

SELECT 'MIGRATION', migration_name,
       CASE WHEN finished_at IS NOT NULL THEN 'finished' ELSE 'unfinished' END,
       CASE WHEN rolled_back_at IS NULL THEN 'not_rolled_back' ELSE 'rolled_back' END
FROM "_prisma_migrations"
ORDER BY started_at;

SELECT 'TABLECOUNT', tablename,
       (xpath('/row/c/text()', query_to_xml(
          format('SELECT count(*) AS c FROM public.%I', tablename),
          false, true, ''
       )))[1]::text::bigint
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'INDEX', indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'business_identity_claim_active_identifier_unique',
    'membership_active_subject_unique',
    'permission_grant_active_unique',
    'business_profile_claim_unique',
    'offer_version_published_unique',
    'external_workspace_link_active_unique'
  )
ORDER BY indexname;

SELECT 'CHECK', conname
FROM pg_constraint
WHERE contype = 'c'
  AND connamespace = 'public'::regnamespace
ORDER BY conname;

SELECT 'TRIGGER', event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

SELECT 'CORE_FK', con.conname, con.confdeltype, con.confupdtype
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE con.contype = 'f'
  AND nsp.nspname = 'public'
  AND rel.relname IN (
    'organizations',
    'business_identity_claims',
    'identity_verifications',
    'memberships',
    'permission_grants',
    'business_profiles',
    'capabilities',
    'offers',
    'offer_versions',
    'offer_version_capabilities',
    'evidence',
    'publications'
  )
ORDER BY con.conname;
