\set ON_ERROR_STOP on
BEGIN;
INSERT INTO publications(
  id, organization_id, offer_version_id, event_kind, content_revision, platform_actor_ref
) VALUES ('conc-withdraw-old', 'conc-org', 'conc-old', 'WITHDRAWN', NULL, 'platform:t1');
SELECT pg_sleep(4);
INSERT INTO publications(
  id, organization_id, offer_version_id, event_kind, content_revision, platform_actor_ref
) VALUES ('conc-publish-new', 'conc-org', 'conc-new', 'PUBLISHED', 2, 'platform:t1');
COMMIT;
