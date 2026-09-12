\set ON_ERROR_STOP on
SELECT pg_sleep(1);
BEGIN;
INSERT INTO publications(
  id, organization_id, offer_version_id, event_kind, content_revision, platform_actor_ref
) VALUES ('conc-publish-rival', 'conc-org', 'conc-rival', 'PUBLISHED', 3, 'platform:t2');
COMMIT;
