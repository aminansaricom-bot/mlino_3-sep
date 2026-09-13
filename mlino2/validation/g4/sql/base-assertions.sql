\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION g3_expect_error(label text, expected_state text, statement text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> expected_state THEN
      RAISE EXCEPTION 'FAIL %: expected %, got % (%)', label, expected_state, SQLSTATE, SQLERRM;
    END IF;
    RAISE NOTICE 'PASS % SQLSTATE=%', label, SQLSTATE;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL %: statement succeeded; expected %', label, expected_state;
END;
$$;

INSERT INTO organizations (id, display_name, updated_at) VALUES
  ('org-a', 'Organization A', now()),
  ('org-b', 'Organization B', now());

INSERT INTO memberships
  (id, organization_id, identity_provider, external_subject)
VALUES
  ('member-a', 'org-a', 'test-idp', 'subject-a'),
  ('member-b', 'org-b', 'test-idp', 'subject-b');

INSERT INTO permission_grants
  (id, organization_id, membership_id, permission_key, basis_key)
VALUES
  ('grant-a', 'org-a', 'member-a', 'publication.write', 'founding');

INSERT INTO business_identity_claims
  (id, organization_id, identifier_type, identifier_value, claim_status,
   submitted_by_membership_id, status_changed_by_platform_identity_ref,
   status_change_reason, status_changed_at, verified_at, updated_at)
VALUES
  ('claim-a', 'org-a', 'registration', 'REG-001', 'VERIFIED', 'member-a',
   'platform-reviewer', 'verified for validation', now(), now(), now());

INSERT INTO business_identity_claims
  (id, organization_id, identifier_type, identifier_value,
   submitted_by_membership_id, updated_at)
VALUES
  ('claim-unused', 'org-a', 'registration', 'REG-UNUSED', 'member-a', now());

INSERT INTO business_profiles
  (id, organization_id, business_identity_claim_id,
   business_identity_claim_organization_id, name, updated_at)
VALUES
  ('profile-a', 'org-a', 'claim-a', 'org-a', 'Profile A', now());

INSERT INTO capabilities
  (id, organization_id, capability_key, name, category_key, updated_at)
VALUES
  ('cap-a', 'org-a', 'general-capability', 'Capability A', 'general', now()),
  ('cap-b', 'org-b', 'general-capability', 'Capability B', 'general', now());

INSERT INTO offers (id, organization_id, offer_key) VALUES
  ('offer-a', 'org-a', 'offer-a');

INSERT INTO offer_versions
  (id, organization_id, offer_id, version_number, name, offer_shape,
   on_request, valid_from)
VALUES
  ('offer-v1', 'org-a', 'offer-a', 1, 'Offer V1', 'ITEM', true, now()),
  ('offer-v2', 'org-a', 'offer-a', 2, 'Offer V2', 'ITEM', true, now());

-- C1..C5: partial unique indexes => 23505.
SELECT g3_expect_error('C1 active identity uniqueness', '23505', $q$
  INSERT INTO business_identity_claims
    (id, organization_id, identifier_type, identifier_value, claim_status,
     submitted_by_membership_id, status_changed_by_platform_identity_ref,
     status_change_reason, status_changed_at, verified_at, updated_at)
  VALUES ('claim-duplicate', 'org-a', 'registration', 'REG-001', 'VERIFIED',
          'member-a', 'platform-reviewer', 'duplicate', now(), now(), now())
$q$);

SELECT g3_expect_error('C2 active membership uniqueness', '23505', $q$
  INSERT INTO memberships
    (id, organization_id, identity_provider, external_subject)
  VALUES ('member-a-duplicate', 'org-a', 'test-idp', 'subject-a')
$q$);

SELECT g3_expect_error('C3 active permission uniqueness', '23505', $q$
  INSERT INTO permission_grants
    (id, organization_id, membership_id, permission_key, basis_key)
  VALUES ('grant-a-duplicate', 'org-a', 'member-a', 'publication.write', 'founding')
$q$);

SELECT g3_expect_error('C4 profile claim uniqueness', '23505', $q$
  INSERT INTO business_profiles
    (id, organization_id, business_identity_claim_id,
     business_identity_claim_organization_id, name, updated_at)
  VALUES ('profile-duplicate', 'org-a', 'claim-a', 'org-a', 'Duplicate', now())
$q$);

-- C6..C11: CHECK constraints => 23514.
SELECT g3_expect_error('C6 optional composite shadow pair', '23514', $q$
  INSERT INTO business_profiles
    (id, organization_id, business_identity_claim_id, name, updated_at)
  VALUES ('profile-bad-pair', 'org-a', 'claim-unused', 'Bad pair', now())
$q$);

SELECT g3_expect_error('C7 typed evidence owner XOR', '23514', $q$
  INSERT INTO evidence
    (id, organization_id, source_kind)
  VALUES ('evidence-no-owner', 'org-a', 'SYSTEM')
$q$);

SELECT g3_expect_error('C8 lifecycle audit completeness', '23514', $q$
  UPDATE organizations SET lifecycle_status = 'ARCHIVED' WHERE id = 'org-a'
$q$);

SELECT g3_expect_error('C9 grant basis', '23514', $q$
  INSERT INTO permission_grants
    (id, organization_id, membership_id, permission_key, basis_key)
  VALUES ('grant-bad-basis', 'org-a', 'member-a', 'bad.permission', 'unknown')
$q$);

SELECT g3_expect_error('C10 offer validity and price', '23514', $q$
  INSERT INTO offer_versions
    (id, organization_id, offer_id, version_number, name, offer_shape,
     on_request, price_amount, price_currency, valid_from, valid_until)
  VALUES ('offer-bad-range', 'org-a', 'offer-a', 99, 'Bad offer', 'ITEM',
          false, -1, 'IRR', now(), now() - interval '1 day')
$q$);

SELECT g3_expect_error('C11 confirmation is separate', '23514', $q$
  UPDATE capabilities
     SET confirmation_status = 'HUMAN_CONFIRMED', confirmed_at = now()
   WHERE id = 'cap-a'
$q$);

-- Cross-tenant composite FK => 23503.
SELECT g3_expect_error('tenant isolation direct scalar FK', '23503', $q$
  INSERT INTO business_identity_claims
    (id, organization_id, identifier_type, identifier_value,
     submitted_by_membership_id, updated_at)
  VALUES ('claim-cross-tenant', 'org-b', 'registration', 'REG-CROSS',
          'member-a', now())
$q$);

-- A valid publication is the only allowed path for projection state.
INSERT INTO publications
  (id, organization_id, offer_version_id, offer_version_organization_id,
   event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
VALUES
  ('publication-v1', 'org-a', 'offer-v1', 'org-a', 'PUBLISHED', 'member-a',
   'publication.write', '{}'::jsonb, 'initial publication');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM offer_versions
     WHERE id = 'offer-v1' AND publication_status = 'PUBLISHED'
       AND published_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'FAIL C15 valid publication did not update projection';
  END IF;
  RAISE NOTICE 'PASS C15 valid Publication event updated projection';
END;
$$;

-- C5 is enforced even when projection is written by the approved trigger.
SELECT g3_expect_error('C5 one published version per offer', '23505', $q$
  INSERT INTO publications
    (id, organization_id, offer_version_id, offer_version_organization_id,
     event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
  VALUES ('publication-v2-too-early', 'org-a', 'offer-v2', 'org-a', 'PUBLISHED',
          'member-a', 'publication.write', '{}'::jsonb, 'must fail before withdraw')
$q$);

-- C12..C15: trigger-enforced invariants => P0001.
SELECT g3_expect_error('C12 Publication append-only', 'P0001', $q$
  UPDATE publications SET reason = 'mutated' WHERE id = 'publication-v1'
$q$);

SELECT g3_expect_error('C13 OfferVersion immutable content', 'P0001', $q$
  UPDATE offer_versions SET name = 'mutated' WHERE id = 'offer-v1'
$q$);

INSERT INTO identity_verifications
  (id, organization_id, claim_id, attempt_number, method_key, status,
   reviewed_by_platform_identity_ref, decision_reason, decided_at)
VALUES
  ('verification-a', 'org-a', 'claim-a', 1, 'manual', 'VERIFIED',
   'platform-reviewer', 'verified', now());

SELECT g3_expect_error('C14 decided verification immutable', 'P0001', $q$
  UPDATE identity_verifications SET decision_reason = 'mutated'
   WHERE id = 'verification-a'
$q$);

SELECT g3_expect_error('C15 direct publication projection mutation', 'P0001', $q$
  UPDATE offer_versions SET publication_status = 'WITHDRAWN'
   WHERE id = 'offer-v1'
$q$);

-- Failed nested publication must not leak permission to a later direct write.
SAVEPOINT before_failed_nested_projection;
SELECT g3_expect_error('C15 failed nested transition', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, offer_version_id, offer_version_organization_id,
     event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
  VALUES ('publication-invalid-withdraw', 'org-a', 'offer-v2', 'org-a', 'WITHDRAWN',
          'member-a', 'publication.write', '{}'::jsonb, 'invalid transition')
$q$);
ROLLBACK TO SAVEPOINT before_failed_nested_projection;

SELECT g3_expect_error('C15 no trigger-depth leak after savepoint', 'P0001', $q$
  UPDATE offer_versions SET publication_status = 'WITHDRAWN'
   WHERE id = 'offer-v1'
$q$);

-- Approved replacement order: withdraw old, then publish new.
INSERT INTO publications
  (id, organization_id, offer_version_id, offer_version_organization_id,
   event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
VALUES
  ('withdraw-v1', 'org-a', 'offer-v1', 'org-a', 'WITHDRAWN', 'member-a',
   'publication.write', '{}'::jsonb, 'withdraw before replacement'),
  ('publish-v2', 'org-a', 'offer-v2', 'org-a', 'PUBLISHED', 'member-a',
   'publication.write', '{}'::jsonb, 'replacement after withdrawal');

DO $$
DECLARE
  bad_fk_count integer;
  published_count integer;
  trigger_count integer;
BEGIN
  SELECT count(*) INTO bad_fk_count
    FROM pg_constraint
   WHERE contype = 'f'
     AND connamespace = 'public'::regnamespace
     AND conrelid IN (
       'organizations'::regclass,
       'business_identity_claims'::regclass,
       'identity_verifications'::regclass,
       'memberships'::regclass,
       'permission_grants'::regclass,
       'business_profiles'::regclass,
       'capabilities'::regclass,
       'offers'::regclass,
       'offer_versions'::regclass,
       'offer_version_capabilities'::regclass,
       'evidence'::regclass,
       'publications'::regclass
     )
     AND (confdeltype <> 'r' OR confupdtype <> 'r');
  IF bad_fk_count <> 0 THEN
    RAISE EXCEPTION 'FAIL FK RESTRICT inventory: % non-restrictive FK(s)', bad_fk_count;
  END IF;
  RAISE NOTICE 'PASS all Core foreign keys use ON DELETE/UPDATE RESTRICT';

  SELECT count(*) INTO published_count
    FROM offer_versions
   WHERE offer_id = 'offer-a' AND publication_status = 'PUBLISHED';
  IF published_count <> 1 OR
     (SELECT publication_status FROM offer_versions WHERE id = 'offer-v1') <> 'WITHDRAWN' OR
     (SELECT publication_status FROM offer_versions WHERE id = 'offer-v2') <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'FAIL replacement ordering final state';
  END IF;
  RAISE NOTICE 'PASS withdraw-old-then-publish-new ordering';

  SELECT count(*) INTO trigger_count
    FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgname = 'publication_apply_projection_after_insert'
     AND tgrelid = 'public.publications'::regclass;
  IF trigger_count <> 1 THEN
    RAISE EXCEPTION 'FAIL C15 closed trigger allow-list inventory';
  END IF;
  RAISE NOTICE 'PASS C15 approved projection trigger inventory';
END;
$$;

DROP FUNCTION g3_expect_error(text, text, text);

COMMIT;
