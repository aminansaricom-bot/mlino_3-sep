\set ON_ERROR_STOP on
BEGIN;
INSERT INTO publications
  (id, organization_id, offer_version_id, offer_version_organization_id,
   event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
VALUES
  ('concurrent-publication-2-a', 'org-a', 'offer-concurrent-2-v1', 'org-a',
   'PUBLISHED', 'member-a', 'publication.write', '{}'::jsonb,
   'concurrent session A');
SELECT pg_sleep(2);
COMMIT;
