\set ON_ERROR_STOP on
INSERT INTO offers (id, organization_id, offer_key)
VALUES ('offer-concurrent-2', 'org-a', 'offer-concurrent-2');

INSERT INTO offer_versions
  (id, organization_id, offer_id, version_number, name, offer_shape,
   on_request, valid_from)
VALUES
  ('offer-concurrent-2-v1', 'org-a', 'offer-concurrent-2', 1,
   'Concurrent V1', 'ITEM', true, now()),
  ('offer-concurrent-2-v2', 'org-a', 'offer-concurrent-2', 2,
   'Concurrent V2', 'ITEM', true, now());
