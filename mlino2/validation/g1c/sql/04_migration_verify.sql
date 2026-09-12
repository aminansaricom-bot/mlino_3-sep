\set ON_ERROR_STOP on

DO $$
DECLARE
  partial_indexes integer;
  validation_triggers integer;
  restrictive_core_fks integer;
  manual_checks integer;
  followup_column integer;
  external_index integer;
BEGIN
  SELECT count(*) INTO partial_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'external_workspace_link_active_unique',
      'claim_active_identifier_unique',
      'membership_active_unique',
      'permission_grant_active_unique',
      'business_profile_claim_unique',
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
      'verification_immutable_guard',
      'depth_projection_guard',
      'depth_publication_after_insert'
    );

  SELECT count(*) INTO restrictive_core_fks
  FROM pg_constraint
  WHERE contype = 'f'
    AND connamespace = 'public'::regnamespace
    AND conname IN (
      'memberships_organization_id_fkey',
      'organizations_founding_membership_fkey',
      'business_identity_claims_organization_id_fkey',
      'identity_verifications_claim_fkey',
      'business_profiles_organization_id_fkey',
      'business_profiles_identity_claim_fkey',
      'permission_grants_organization_id_fkey',
      'permission_grants_membership_fkey',
      'capabilities_organization_id_fkey',
      'offers_organization_id_fkey',
      'offers_capability_fkey',
      'offer_versions_organization_id_fkey',
      'offer_versions_offer_fkey',
      'offer_versions_capability_fkey',
      'publications_organization_id_fkey',
      'publications_offer_version_fkey',
      'publications_performer_membership_fkey',
      'external_workspace_links_organization_id_fkey'
    )
    AND confdeltype = 'r'
    AND confupdtype = 'r';

  SELECT count(*) INTO manual_checks
  FROM pg_constraint
  WHERE contype = 'c'
    AND connamespace = 'public'::regnamespace
    AND conname IN (
      'organization_founding_membership_pair_complete',
      'organization_founding_membership_same_org',
      'claim_active_requires_verified_at',
      'verification_decision_audit_complete',
      'business_profile_identity_claim_pair_complete',
      'published_version_projection_complete',
      'publication_revision_required'
    );

  SELECT count(*) INTO followup_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'validation_note';

  SELECT count(*) INTO external_index
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'external_workspace_link_active_unique';

  IF partial_indexes <> 6
     OR validation_triggers <> 7
     OR restrictive_core_fks <> 18
     OR manual_checks <> 7
     OR followup_column <> 1
     OR external_index <> 1 THEN
    RAISE EXCEPTION
      'migration stability failed: indexes %, triggers %, restrictive fks %, checks %, followup %, external %',
      partial_indexes, validation_triggers, restrictive_core_fks, manual_checks,
      followup_column, external_index;
  END IF;
END;
$$;

\echo PASS_G1C_MIGRATION_PRESERVED_MANUAL_OBJECTS
\echo PASS_G1C_DR03_EXTERNAL_WORKSPACE_INDEX_SURVIVED
\echo PASS_G1C_FK07_RESTRICT_SURVIVED

