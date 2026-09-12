\set ON_ERROR_STOP on

DO $$
DECLARE partial_indexes integer;
DECLARE validation_triggers integer;
DECLARE restrictive_fks integer;
DECLARE manual_checks integer;
DECLARE followup_column integer;
BEGIN
  SELECT count(*) INTO partial_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'claim_active_identifier_unique',
      'membership_active_unique',
      'offer_one_published_version_unique'
    );

  SELECT count(*) INTO validation_triggers
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND t.tgname IN (
      'publications_append_only',
      'offer_version_projection_guard',
      'publication_projection_after_insert',
      'offer_version_immutable_guard',
      'verification_immutable_guard'
    );

  SELECT count(*) INTO restrictive_fks
  FROM pg_constraint
  WHERE contype = 'f'
    AND connamespace = 'public'::regnamespace
    AND confdeltype = 'r'
    AND confupdtype = 'r';

  SELECT count(*) INTO manual_checks
  FROM pg_constraint
  WHERE contype = 'c'
    AND connamespace = 'public'::regnamespace
    AND conname IN (
      'claim_active_requires_verified_at',
      'verification_decision_audit_complete',
      'published_version_projection_complete',
      'publication_revision_required'
    );

  SELECT count(*) INTO followup_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'validation_note';

  IF partial_indexes <> 3
     OR validation_triggers <> 5
     OR restrictive_fks <> 8
     OR manual_checks <> 4
     OR followup_column <> 1 THEN
    RAISE EXCEPTION 'FAIL migration stability: indexes %, triggers %, fks %, checks %, column %',
      partial_indexes, validation_triggers, restrictive_fks, manual_checks, followup_column;
  END IF;
END;
$$;

\echo PASS_PRISMA_MIGRATION_PRESERVED_MANUAL_OBJECTS
