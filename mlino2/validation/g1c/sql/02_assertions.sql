\set ON_ERROR_STOP on
\set VERBOSITY verbose

INSERT INTO "organizations"("id") VALUES
  ('g1c-org-a'), ('g1c-org-b'), ('g1c-org-c');

INSERT INTO "memberships"(
  "id", "organization_id", "identity_provider", "external_subject"
) VALUES
  ('g1c-member-a', 'g1c-org-a', 'idp-main', 'subject-a'),
  ('g1c-member-b', 'g1c-org-b', 'idp-main', 'subject-b'),
  ('g1c-member-c', 'g1c-org-c', 'idp-main', 'subject-c');

UPDATE "organizations"
SET "founding_membership_id" = 'g1c-member-c',
    "founding_membership_organization_id" = 'g1c-org-c'
WHERE "id" = 'g1c-org-c';
\echo PASS_G1C_CIRCULAR_FK_VALID

DO $$
DECLARE state text;
BEGIN
  BEGIN
    UPDATE "organizations"
    SET "founding_membership_id" = 'g1c-member-b',
        "founding_membership_organization_id" = 'g1c-org-b'
    WHERE "id" = 'g1c-org-a';
    RAISE EXCEPTION 'accepted invalid founding membership';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23514' THEN RAISE EXCEPTION 'expected 23514, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_CIRCULAR_FK_TENANT_GUARD code=23514

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "memberships"(
      "id", "organization_id", "identity_provider", "external_subject"
    ) VALUES ('g1c-member-a-duplicate', 'g1c-org-a', 'idp-main', 'subject-a');
    RAISE EXCEPTION 'accepted duplicate active membership';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23505' THEN RAISE EXCEPTION 'expected 23505, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_C2_MEMBERSHIP_UNIQUENESS code=23505

INSERT INTO "memberships"(
  "id", "organization_id", "identity_provider", "external_subject", "lifecycle_status"
) VALUES
  ('g1c-member-other-idp', 'g1c-org-a', 'idp-secondary', 'subject-a', 'ACTIVE'),
  ('g1c-member-inactive', 'g1c-org-a', 'idp-main', 'subject-a', 'INACTIVE');
\echo PASS_G1C_C2_PROVIDER_AND_HISTORY_DIMENSIONS

INSERT INTO "permission_grants"(
  "id", "organization_id", "membership_id", "permission_key"
) VALUES ('g1c-grant-a', 'g1c-org-a', 'g1c-member-a', 'offer.publish');

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "permission_grants"(
      "id", "organization_id", "membership_id", "permission_key"
    ) VALUES ('g1c-grant-duplicate', 'g1c-org-a', 'g1c-member-a', 'offer.publish');
    RAISE EXCEPTION 'accepted duplicate active grant';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23505' THEN RAISE EXCEPTION 'expected 23505, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_C3_ACTIVE_GRANT_UNIQUENESS code=23505

UPDATE "permission_grants" SET "revoked_at" = now() WHERE "id" = 'g1c-grant-a';
INSERT INTO "permission_grants"(
  "id", "organization_id", "membership_id", "permission_key"
) VALUES ('g1c-grant-new', 'g1c-org-a', 'g1c-member-a', 'offer.publish');
\echo PASS_G1C_C3_REGRANT_AFTER_REVOCATION

INSERT INTO "business_identity_claims"(
  "id", "organization_id", "identifier_type", "identifier_value", "claim_status", "verified_at"
) VALUES
  ('g1c-claim-a', 'g1c-org-a', 'TAX', 'tax-g1c-a', 'VERIFIED', now()),
  ('g1c-claim-b', 'g1c-org-b', 'TAX', 'tax-g1c-b', 'VERIFIED', now());

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "business_identity_claims"(
      "id", "organization_id", "identifier_type", "identifier_value", "claim_status", "verified_at"
    ) VALUES ('g1c-claim-duplicate', 'g1c-org-b', 'TAX', 'tax-g1c-a', 'SUSPENDED', now());
    RAISE EXCEPTION 'accepted duplicate active claim';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23505' THEN RAISE EXCEPTION 'expected 23505, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_IDENTITY_CLAIM_UNIQUENESS code=23505

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "business_identity_claims"(
      "id", "organization_id", "identifier_type", "identifier_value", "claim_status"
    ) VALUES ('g1c-claim-no-verification', 'g1c-org-a', 'TAX', 'tax-g1c-invalid', 'VERIFIED');
    RAISE EXCEPTION 'accepted verified claim without verified_at';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23514' THEN RAISE EXCEPTION 'expected 23514, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_IDENTITY_ACTIVE_REQUIRES_VERIFIED_AT code=23514

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "identity_verifications"(
      "id", "organization_id", "claim_id", "attempt_number", "status"
    ) VALUES ('g1c-verification-cross', 'g1c-org-b', 'g1c-claim-a', 1, 'PENDING');
    RAISE EXCEPTION 'accepted cross-organization verification';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23503' THEN RAISE EXCEPTION 'expected 23503, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_VERIFICATION_COMPOSITE_FK code=23503

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "identity_verifications"(
      "id", "organization_id", "claim_id", "attempt_number", "status", "decided_at"
    ) VALUES ('g1c-verification-audit', 'g1c-org-a', 'g1c-claim-a', 1, 'APPROVED', now());
    RAISE EXCEPTION 'accepted incomplete platform verification audit';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23514' THEN RAISE EXCEPTION 'expected 23514, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_VERIFICATION_PLATFORM_AUDIT code=23514

INSERT INTO "identity_verifications"(
  "id", "organization_id", "claim_id", "attempt_number", "status",
  "platform_actor_ref", "decided_at", "decision_reason"
) VALUES (
  'g1c-verification-valid', 'g1c-org-a', 'g1c-claim-a', 2, 'APPROVED',
  'platform-identity:test-reviewer', now(), 'fixture verification'
);
\echo PASS_G1C_PLATFORM_ACTOR_USED_ONLY_FOR_VERIFICATION

INSERT INTO "profile_claim_match_simple_control"(
  "id", "identity_claim_id", "identity_claim_organization_id"
) VALUES ('g1c-control-half-pair', 'g1c-claim-a', NULL);
\echo PASS_G1C_MATCH_SIMPLE_ACCEPTS_HALF_PAIR_WITHOUT_C6

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "business_profiles"(
      "id", "organization_id", "name", "identity_claim_id", "identity_claim_organization_id"
    ) VALUES ('g1c-profile-half', 'g1c-org-a', 'half pair', 'g1c-claim-a', NULL);
    RAISE EXCEPTION 'accepted half-populated shadow pair';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23514' THEN RAISE EXCEPTION 'expected 23514, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_C6_REJECTS_HALF_PAIR code=23514

INSERT INTO "business_profiles"(
  "id", "organization_id", "name", "identity_claim_id", "identity_claim_organization_id"
) VALUES ('g1c-profile-a', 'g1c-org-a', 'Profile A', 'g1c-claim-a', 'g1c-org-a');

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "business_profiles"(
      "id", "organization_id", "name", "identity_claim_id", "identity_claim_organization_id"
    ) VALUES ('g1c-profile-duplicate', 'g1c-org-a', 'Duplicate', 'g1c-claim-a', 'g1c-org-a');
    RAISE EXCEPTION 'accepted duplicate profile claim';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23505' THEN RAISE EXCEPTION 'expected 23505, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_C4_PROFILE_CLAIM_UNIQUENESS code=23505

INSERT INTO "capabilities"("id", "organization_id") VALUES
  ('g1c-cap-a', 'g1c-org-a'),
  ('g1c-cap-alt', 'g1c-org-a'),
  ('g1c-cap-b', 'g1c-org-b');

INSERT INTO "offers"("id", "organization_id", "capability_id") VALUES
  ('g1c-offer-leak', 'g1c-org-a', 'g1c-cap-a'),
  ('g1c-offer-rollback', 'g1c-org-a', 'g1c-cap-a'),
  ('g1c-offer-replace', 'g1c-org-a', 'g1c-cap-a');

INSERT INTO "offer_versions"(
  "id", "organization_id", "offer_id", "capability_id", "content"
) VALUES
  ('g1c-leak-x', 'g1c-org-a', 'g1c-offer-leak', 'g1c-cap-a', 'x'),
  ('g1c-leak-y', 'g1c-org-a', 'g1c-offer-leak', 'g1c-cap-a', 'y'),
  ('g1c-rollback-x', 'g1c-org-a', 'g1c-offer-rollback', 'g1c-cap-a', 'x'),
  ('g1c-rollback-y', 'g1c-org-a', 'g1c-offer-rollback', 'g1c-cap-a', 'y'),
  ('g1c-replace-old', 'g1c-org-a', 'g1c-offer-replace', 'g1c-cap-a', 'old'),
  ('g1c-replace-new', 'g1c-org-a', 'g1c-offer-replace', 'g1c-cap-a', 'new');

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "publications"(
      "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
      "performed_by_membership_id", "reason"
    ) VALUES (
      'g1c-pub-wrong-member', 'g1c-org-a', 'g1c-leak-x', 'PUBLISHED', 1,
      'g1c-member-b', 'cross-tenant actor'
    );
    RAISE EXCEPTION 'accepted publication by other organization member';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23503' THEN RAISE EXCEPTION 'expected 23503, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_PUBLICATION_PERFORMER_MEMBERSHIP_TENANT code=23503

BEGIN;
INSERT INTO "publications"(
  "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
  "performed_by_membership_id", "reason"
) VALUES (
  'g1c-pub-leak-x', 'g1c-org-a', 'g1c-leak-x', 'PUBLISHED', 1,
  'g1c-member-a', 'same-transaction leak test'
);
DO $$
DECLARE state text;
BEGIN
  BEGIN
    UPDATE "offer_versions"
    SET "publication_status" = 'WITHDRAWN'
    WHERE "id" = 'g1c-leak-y';
    RAISE EXCEPTION 'C15 flag leaked to other target';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> 'P0001' THEN RAISE EXCEPTION 'expected P0001, got %', state; END IF;
  END;
END;
$$;
COMMIT;
\echo PASS_G1C_C15_NO_SAME_TRANSACTION_LEAK code=P0001

BEGIN;
SAVEPOINT before_publication;
INSERT INTO "publications"(
  "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
  "performed_by_membership_id", "reason"
) VALUES (
  'g1c-pub-rollback-x', 'g1c-org-a', 'g1c-rollback-x', 'PUBLISHED', 2,
  'g1c-member-a', 'savepoint rollback leak test'
);
ROLLBACK TO SAVEPOINT before_publication;
DO $$
DECLARE state text;
BEGIN
  BEGIN
    UPDATE "offer_versions"
    SET "publication_status" = 'WITHDRAWN'
    WHERE "id" = 'g1c-rollback-y';
    RAISE EXCEPTION 'C15 flag survived rollback to savepoint';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> 'P0001' THEN RAISE EXCEPTION 'expected P0001, got %', state; END IF;
  END;
  IF EXISTS (SELECT 1 FROM "publications" WHERE "id" = 'g1c-pub-rollback-x') THEN
    RAISE EXCEPTION 'publication survived rollback to savepoint';
  END IF;
END;
$$;
COMMIT;
\echo PASS_G1C_C15_NO_SAVEPOINT_LEAK code=P0001

INSERT INTO "depth_offer_versions"("id") VALUES ('g1c-depth-x'), ('g1c-depth-y');
BEGIN;
INSERT INTO "depth_publications"("id", "offer_version_id")
VALUES ('g1c-depth-pub-x', 'g1c-depth-x');
DO $$
DECLARE state text;
DECLARE projected text;
BEGIN
  SELECT "publication_status" INTO projected
  FROM "depth_offer_versions" WHERE "id" = 'g1c-depth-x';
  IF projected <> 'PUBLISHED' THEN RAISE EXCEPTION 'depth projection did not apply'; END IF;
  BEGIN
    UPDATE "depth_offer_versions"
    SET "publication_status" = 'WITHDRAWN'
    WHERE "id" = 'g1c-depth-y';
    RAISE EXCEPTION 'pg_trigger_depth guard leaked';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> 'P0001' THEN RAISE EXCEPTION 'expected P0001, got %', state; END IF;
  END;
END;
$$;
COMMIT;
\echo PASS_G1C_C15_PG_TRIGGER_DEPTH_VARIANT code=P0001

DO $$
DECLARE state text;
BEGIN
  BEGIN
    DELETE FROM "publications" WHERE "id" = 'g1c-pub-leak-x';
    RAISE EXCEPTION 'accepted Publication delete';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> 'P0001' THEN RAISE EXCEPTION 'expected P0001, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_PUBLICATION_DELETE_APPEND_ONLY code=P0001

DO $$
DECLARE state text;
BEGIN
  BEGIN
    UPDATE "offer_versions"
    SET "capability_id" = 'g1c-cap-alt'
    WHERE "id" = 'g1c-leak-x';
    RAISE EXCEPTION 'accepted published capability relink';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> 'P0001' THEN RAISE EXCEPTION 'expected P0001, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_FY2_PUBLISHED_LINK_IMMUTABLE code=P0001

INSERT INTO "publications"(
  "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
  "performed_by_membership_id", "reason"
) VALUES (
  'g1c-pub-replace-old', 'g1c-org-a', 'g1c-replace-old', 'PUBLISHED', 1,
  'g1c-member-a', 'initial publication'
);

DO $$
DECLARE state text;
BEGIN
  BEGIN
    INSERT INTO "publications"(
      "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
      "performed_by_membership_id", "reason"
    ) VALUES (
      'g1c-pub-replace-wrong-order', 'g1c-org-a', 'g1c-replace-new', 'PUBLISHED', 2,
      'g1c-member-a', 'wrong order'
    );
    RAISE EXCEPTION 'accepted replacement before withdrawal';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    IF state <> '23505' THEN RAISE EXCEPTION 'expected 23505, got %', state; END IF;
  END;
END;
$$;
\echo PASS_G1C_WRONG_ORDER_REPLACEMENT code=23505

INSERT INTO "publications"(
  "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
  "performed_by_membership_id", "reason"
) VALUES (
  'g1c-withdraw-replace-old', 'g1c-org-a', 'g1c-replace-old', 'WITHDRAWN', NULL,
  'g1c-member-a', 'withdraw before replacement'
);
INSERT INTO "publications"(
  "id", "organization_id", "offer_version_id", "event_kind", "content_revision",
  "performed_by_membership_id", "reason"
) VALUES (
  'g1c-pub-replace-new', 'g1c-org-a', 'g1c-replace-new', 'PUBLISHED', 2,
  'g1c-member-a', 'publish replacement after withdrawal'
);
\echo PASS_G1C_WITHDRAW_THEN_REPLACE

DO $$
DECLARE bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
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
    AND (confdeltype <> 'r' OR confupdtype <> 'r');
  IF bad_count <> 0 THEN
    RAISE EXCEPTION 'non-RESTRICT FK found: %', bad_count;
  END IF;
END;
$$;
\echo PASS_G1C_FK07_DELETE_UPDATE_RESTRICT code=r/r

DO $$
DECLARE idx_count integer;
BEGIN
  SELECT count(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'external_workspace_link_active_unique'
    AND indexdef LIKE '%WHERE (status = %ACTIVE%';
  IF idx_count <> 1 THEN
    RAISE EXCEPTION 'external workspace partial index missing'; END IF;
END;
$$;
\echo PASS_G1C_EXTERNAL_WORKSPACE_PARTIAL_INDEX

DO $$
DECLARE delete_state text;
DECLARE update_state text;
BEGIN
  BEGIN
    DELETE FROM "organizations" WHERE "id" = 'g1c-org-a';
    RAISE EXCEPTION 'accepted organization delete';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS delete_state = RETURNED_SQLSTATE;
    IF delete_state <> '23503' THEN RAISE EXCEPTION 'expected delete 23503, got %', delete_state; END IF;
  END;
  BEGIN
    UPDATE "organizations" SET "id" = 'g1c-org-a-new' WHERE "id" = 'g1c-org-a';
    RAISE EXCEPTION 'accepted organization key update';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS update_state = RETURNED_SQLSTATE;
    IF update_state <> '23503' THEN RAISE EXCEPTION 'expected update 23503, got %', update_state; END IF;
  END;
END;
$$;
\echo PASS_G1C_ORGANIZATION_RESTRICT code=23503
