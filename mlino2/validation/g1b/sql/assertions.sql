\set ON_ERROR_STOP on

INSERT INTO organizations(id) VALUES ('sql-org-a'), ('sql-org-b');
INSERT INTO offers(id, organization_id) VALUES ('sql-offer-a', 'sql-org-a');
INSERT INTO offers(id, organization_id) VALUES ('sql-offer-rollback', 'sql-org-a');
INSERT INTO offer_versions(id, organization_id, offer_id, content)
VALUES ('sql-version-a', 'sql-org-a', 'sql-offer-a', 'v1');

DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO offer_versions(id, organization_id, offer_id, content)
    VALUES ('sql-cross-tenant', 'sql-org-b', 'sql-offer-a', 'invalid');
  EXCEPTION WHEN foreign_key_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL composite tenant isolation'; END IF;
END;
$$;
\echo PASS_COMPOSITE_TENANT_ISOLATION

INSERT INTO business_identity_claims(
  id, organization_id, identifier_type, identifier_value, claim_status, verified_at
) VALUES ('sql-claim-a', 'sql-org-a', 'TAX', 'tax-sql-a', 'VERIFIED', now());

DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO business_identity_claims(
      id, organization_id, identifier_type, identifier_value, claim_status, verified_at
    ) VALUES ('sql-claim-b', 'sql-org-b', 'TAX', 'tax-sql-a', 'SUSPENDED', now());
  EXCEPTION WHEN unique_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL active claim uniqueness'; END IF;
END;
$$;
\echo PASS_ACTIVE_CLAIM_UNIQUENESS

DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO business_identity_claims(
      id, organization_id, identifier_type, identifier_value, claim_status
    ) VALUES ('sql-claim-invalid', 'sql-org-a', 'TAX', 'tax-invalid', 'VERIFIED');
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL active claim verification rule'; END IF;
END;
$$;
\echo PASS_ACTIVE_VERIFICATION_RULE

INSERT INTO publications(
  id, organization_id, offer_version_id, event_kind, content_revision, platform_actor_ref
) VALUES ('sql-pub-a', 'sql-org-a', 'sql-version-a', 'PUBLISHED', 1, 'platform:sql');

DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    UPDATE offer_versions SET publication_status = 'WITHDRAWN' WHERE id = 'sql-version-a';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL direct publication status mutation'; END IF;
END;
$$;
\echo PASS_DIRECT_PUBLICATION_STATUS_GUARD

DO $$
DECLARE before_status "PublicationStatus";
DECLARE after_status "PublicationStatus";
BEGIN
  INSERT INTO offer_versions(id, organization_id, offer_id, content)
  VALUES ('sql-version-rollback', 'sql-org-a', 'sql-offer-rollback', 'rollback');
  SELECT publication_status INTO before_status FROM offer_versions WHERE id = 'sql-version-rollback';
  BEGIN
    INSERT INTO publications(
      id, organization_id, offer_version_id, event_kind, content_revision, platform_actor_ref
    ) VALUES ('sql-pub-rollback', 'sql-org-a', 'sql-version-rollback', 'PUBLISHED', 2, 'platform:sql');
    RAISE EXCEPTION 'forced rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'forced rollback' THEN RAISE; END IF;
  END;
  SELECT publication_status INTO after_status FROM offer_versions WHERE id = 'sql-version-rollback';
  IF before_status IS DISTINCT FROM after_status
     OR EXISTS (SELECT 1 FROM publications WHERE id = 'sql-pub-rollback') THEN
    RAISE EXCEPTION 'FAIL publication rollback consistency';
  END IF;
END;
$$;
\echo PASS_PUBLICATION_ROLLBACK_CONSISTENCY

DO $$
DECLARE rejected_delete boolean := false;
DECLARE rejected_update boolean := false;
BEGIN
  BEGIN DELETE FROM organizations WHERE id = 'sql-org-a';
  EXCEPTION WHEN foreign_key_violation THEN rejected_delete := true; END;
  BEGIN UPDATE organizations SET id = 'sql-org-a-new' WHERE id = 'sql-org-a';
  EXCEPTION WHEN foreign_key_violation THEN rejected_update := true; END;
  IF NOT rejected_delete OR NOT rejected_update THEN
    RAISE EXCEPTION 'FAIL organization FK restrict';
  END IF;
END;
$$;
\echo PASS_ORGANIZATION_RESTRICT
