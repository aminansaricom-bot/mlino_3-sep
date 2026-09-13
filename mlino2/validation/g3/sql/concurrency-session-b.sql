\set ON_ERROR_STOP on
\set VERBOSITY verbose
SELECT pg_sleep(0.5);
INSERT INTO publications
  (id, organization_id, offer_version_id, offer_version_organization_id,
   event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
VALUES
  ('concurrent-publication-2-b', 'org-a', 'offer-concurrent-2-v2', 'org-a',
   'PUBLISHED', 'member-a', 'publication.write', '{}'::jsonb,
   'concurrent session B must lose');
