BEGIN;

LOCK TABLE publications IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM publications LIMIT 1) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'published_content migration requires an empty publications table';
  END IF;
END;
$$;

ALTER TABLE publications
  ADD COLUMN published_content JSONB;

ALTER TABLE publications
  ADD CONSTRAINT publication_published_content_event_kind_check
  CHECK (
    (
      event_kind = 'PUBLISHED'
      AND published_content IS NOT NULL
      AND jsonb_typeof(published_content) = 'object'
      AND published_content ? 'snapshot_version'
      AND published_content ? 'content'
    )
    OR
    (
      event_kind = 'WITHDRAWN'
      AND published_content IS NULL
    )
  );

COMMIT;
