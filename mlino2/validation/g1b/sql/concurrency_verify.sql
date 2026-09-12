\set ON_ERROR_STOP on

SELECT id, publication_status
FROM offer_versions
WHERE offer_id = 'conc-offer'
ORDER BY id;

DO $$
DECLARE published_count integer;
DECLARE rival_events integer;
DECLARE old_status "PublicationStatus";
DECLARE new_status "PublicationStatus";
DECLARE rival_status "PublicationStatus";
DECLARE successful_t1_events integer;
BEGIN
  SELECT count(*) INTO published_count
  FROM offer_versions
  WHERE offer_id = 'conc-offer' AND publication_status = 'PUBLISHED';

  SELECT count(*) INTO rival_events
  FROM publications
  WHERE id = 'conc-publish-rival';

  SELECT publication_status INTO old_status FROM offer_versions WHERE id = 'conc-old';
  SELECT publication_status INTO new_status FROM offer_versions WHERE id = 'conc-new';
  SELECT publication_status INTO rival_status FROM offer_versions WHERE id = 'conc-rival';
  SELECT count(*) INTO successful_t1_events
  FROM publications
  WHERE id IN ('conc-withdraw-old', 'conc-publish-new');

  IF published_count <> 1
     OR rival_events <> 0
     OR successful_t1_events <> 2
     OR old_status <> 'WITHDRAWN'
     OR new_status <> 'PUBLISHED'
     OR rival_status <> 'UNPUBLISHED' THEN
    RAISE EXCEPTION 'FAIL concurrent publish/withdraw consistency';
  END IF;
END;
$$;
\echo PASS_CONCURRENT_PUBLISH_WITHDRAW
