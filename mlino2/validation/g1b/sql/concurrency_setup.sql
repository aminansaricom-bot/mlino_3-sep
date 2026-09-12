\set ON_ERROR_STOP on

INSERT INTO organizations(id) VALUES ('conc-org');
INSERT INTO offers(id, organization_id) VALUES ('conc-offer', 'conc-org');
INSERT INTO offer_versions(id, organization_id, offer_id, content) VALUES
  ('conc-old', 'conc-org', 'conc-offer', 'old'),
  ('conc-new', 'conc-org', 'conc-offer', 'new'),
  ('conc-rival', 'conc-org', 'conc-offer', 'rival');
INSERT INTO publications(
  id, organization_id, offer_version_id, event_kind, content_revision, platform_actor_ref
) VALUES ('conc-pub-old', 'conc-org', 'conc-old', 'PUBLISHED', 1, 'platform:setup');
