\set ON_ERROR_STOP on

SELECT 'PARTIAL_INDEX' AS object_type, indexname AS object_name, indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'external_workspace_link_active_unique',
    'claim_active_identifier_unique',
    'membership_active_unique',
    'permission_grant_active_unique',
    'business_profile_claim_unique',
    'offer_one_published_version_unique'
  )
UNION ALL
SELECT 'TRIGGER', tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
UNION ALL
SELECT 'FK', conname,
       pg_get_constraintdef(oid) || ' delete=' || confdeltype::text || ' update=' || confupdtype::text
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
UNION ALL
SELECT 'CHECK', conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY object_type, object_name;
