\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION g3b_expect_error(label text, expected_state text, statement text)
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

-- T1: valid Profile publication.
INSERT INTO business_profiles (id, organization_id, name, updated_at)
VALUES ('profile-t1', 'org-a', 'Profile T1', now());

INSERT INTO publications
  (id, organization_id, business_profile_id, business_profile_organization_id,
   event_kind, content_revision, performed_by_membership_id, permission_key,
   gate_snapshot, reason)
VALUES
  ('publication-profile-t1-r1', 'org-a', 'profile-t1', 'org-a', 'PUBLISHED', 1,
   'member-a', 'publication.write', '{}'::jsonb, 'T1 profile publication');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM business_profiles
     WHERE id = 'profile-t1' AND publication_status = 'PUBLISHED'
       AND content_revision = 1 AND published_content_revision = 1
  ) THEN RAISE EXCEPTION 'FAIL T1'; END IF;
  RAISE NOTICE 'PASS T1 Profile publication at matching revision';
END;
$$;

-- T2: mismatched Profile revision.
INSERT INTO business_profiles (id, organization_id, name, updated_at)
VALUES ('profile-t2', 'org-a', 'Profile T2', now());

SELECT g3b_expect_error('T2 Profile mismatched revision', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, business_profile_id, business_profile_organization_id,
     event_kind, content_revision, performed_by_membership_id, permission_key,
     gate_snapshot, reason)
  VALUES ('publication-profile-t2-r2', 'org-a', 'profile-t2', 'org-a',
          'PUBLISHED', 2, 'member-a', 'publication.write', '{}'::jsonb,
          'T2 mism fail')
$q$);

-- T3 / D6-A: every listed Profile public field increments exactly once.
UPDATE business_profiles SET name = 'Profile T1 updated' WHERE id = 'profile-t1';
UPDATE business_profiles SET description = 'Description' WHERE id = 'profile-t1';
UPDATE business_profiles SET latitude = 35.700001 WHERE id = 'profile-t1';
UPDATE business_profiles SET longitude = 51.400001 WHERE id = 'profile-t1';
UPDATE business_profiles SET address_text = 'Address' WHERE id = 'profile-t1';
UPDATE business_profiles SET contact_information = '{"phone":"test"}'::jsonb WHERE id = 'profile-t1';
UPDATE business_profiles SET links = '{"site":"test"}'::jsonb WHERE id = 'profile-t1';
UPDATE business_profiles SET business_hours = '{"day":"test"}'::jsonb WHERE id = 'profile-t1';
UPDATE business_profiles
   SET business_identity_claim_id = 'claim-unused',
       business_identity_claim_organization_id = 'org-a'
 WHERE id = 'profile-t1';

DO $$
DECLARE visible_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM business_profiles
     WHERE id = 'profile-t1' AND content_revision = 10
       AND published_content_revision = 1
  ) THEN RAISE EXCEPTION 'FAIL T3 revision increments'; END IF;
  SELECT count(*) INTO visible_count
    FROM business_profiles
   WHERE id = 'profile-t1'
     AND publication_status = 'PUBLISHED'
     AND content_revision = published_content_revision;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'FAIL T3 stale content remained visible'; END IF;
  RAISE NOTICE 'PASS T3 all Profile public fields increment revision; stale content hidden';
END;
$$;

SELECT g3b_expect_error('T3 direct Profile revision mutation', 'P0001', $q$
  UPDATE business_profiles SET content_revision = 99 WHERE id = 'profile-t1'
$q$);

-- T4: direct projection writes are blocked for all three target shapes.
SELECT g3b_expect_error('T4 Profile published_content_revision guard', 'P0001', $q$
  UPDATE business_profiles SET published_content_revision = content_revision
   WHERE id = 'profile-t1'
$q$);

-- T5: Profile republish only with a greater revision.
INSERT INTO publications
  (id, organization_id, business_profile_id, business_profile_organization_id,
   event_kind, content_revision, performed_by_membership_id, permission_key,
   gate_snapshot, reason)
VALUES
  ('publication-profile-t1-r10', 'org-a', 'profile-t1', 'org-a', 'PUBLISHED', 10,
   'member-a', 'publication.write', '{}'::jsonb, 'T5 greater revision');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM business_profiles
     WHERE id = 'profile-t1' AND publication_status = 'PUBLISHED'
       AND content_revision = 10 AND published_content_revision = 10
  ) THEN RAISE EXCEPTION 'FAIL T5 greater revision republish'; END IF;
  RAISE NOTICE 'PASS T5 Profile republished at greater revision';
END;
$$;

SELECT g3b_expect_error('T5 Profile equal revision republish', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, business_profile_id, business_profile_organization_id,
     event_kind, content_revision, performed_by_membership_id, permission_key,
     gate_snapshot, reason)
  VALUES ('publication-profile-t1-equal', 'org-a', 'profile-t1', 'org-a',
          'PUBLISHED', 10, 'member-a', 'publication.write', '{}'::jsonb,
          'equal revision must fail')
$q$);

SELECT g3b_expect_error('T5 Profile smaller revision republish', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, business_profile_id, business_profile_organization_id,
     event_kind, content_revision, performed_by_membership_id, permission_key,
     gate_snapshot, reason)
  VALUES ('publication-profile-t1-smaller', 'org-a', 'profile-t1', 'org-a',
          'PUBLISHED', 9, 'member-a', 'publication.write', '{}'::jsonb,
          'smaller revision must fail')
$q$);

-- T6: Capability paths mirror Profile paths.
INSERT INTO capabilities
  (id, organization_id, capability_key, name, category_key, updated_at)
VALUES
  ('cap-t6', 'org-a', 'cap-t6', 'Capability T6', 'general', now()),
  ('cap-t6-mismatch', 'org-a', 'cap-t6-mismatch', 'Capability mismatch', 'general', now()),
  ('cap-link-two', 'org-a', 'cap-link-two', 'Link capability two', 'general', now());

INSERT INTO publications
  (id, organization_id, capability_id, capability_organization_id,
   event_kind, content_revision, performed_by_membership_id, permission_key,
   gate_snapshot, reason)
VALUES
  ('publication-cap-t6-r1', 'org-a', 'cap-t6', 'org-a', 'PUBLISHED', 1,
   'member-a', 'publication.write', '{}'::jsonb, 'T6 initial publish');

SELECT g3b_expect_error('T6 Capability mismatched revision', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, capability_id, capability_organization_id,
     event_kind, content_revision, performed_by_membership_id, permission_key,
     gate_snapshot, reason)
  VALUES ('publication-cap-mismatch', 'org-a', 'cap-t6-mismatch', 'org-a',
          'PUBLISHED', 2, 'member-a', 'publication.write', '{}'::jsonb,
          'mismatched revision must fail')
$q$);

UPDATE capabilities SET name = 'Capability T6 updated' WHERE id = 'cap-t6';
UPDATE capabilities SET short_description = 'Description' WHERE id = 'cap-t6';
UPDATE capabilities SET category_key = 'updated-category' WHERE id = 'cap-t6';
UPDATE capabilities SET audience = 'CUSTOMER_FACING' WHERE id = 'cap-t6';

DO $$
DECLARE visible_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM capabilities
     WHERE id = 'cap-t6' AND content_revision = 5
       AND published_content_revision = 1
  ) THEN RAISE EXCEPTION 'FAIL T6 revision increments'; END IF;
  SELECT count(*) INTO visible_count
    FROM capabilities
   WHERE id = 'cap-t6'
     AND publication_status = 'PUBLISHED'
     AND content_revision = published_content_revision;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'FAIL T6 stale content remained visible'; END IF;
  RAISE NOTICE 'PASS T6 Capability publication, revision increment and visibility';
END;
$$;

SELECT g3b_expect_error('T4 Capability published_content_revision guard', 'P0001', $q$
  UPDATE capabilities SET published_content_revision = content_revision
   WHERE id = 'cap-t6'
$q$);

INSERT INTO publications
  (id, organization_id, capability_id, capability_organization_id,
   event_kind, content_revision, performed_by_membership_id, permission_key,
   gate_snapshot, reason)
VALUES
  ('publication-cap-t6-r5', 'org-a', 'cap-t6', 'org-a', 'PUBLISHED', 5,
   'member-a', 'publication.write', '{}'::jsonb, 'T6 greater revision');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM capabilities
     WHERE id = 'cap-t6' AND publication_status = 'PUBLISHED'
       AND content_revision = 5 AND published_content_revision = 5
  ) THEN RAISE EXCEPTION 'FAIL T6 greater revision republish'; END IF;
  RAISE NOTICE 'PASS T6 Capability republished at greater revision';
END;
$$;

SELECT g3b_expect_error('T6 Capability equal revision republish', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, capability_id, capability_organization_id,
     event_kind, content_revision, performed_by_membership_id, permission_key,
     gate_snapshot, reason)
  VALUES ('publication-cap-equal', 'org-a', 'cap-t6', 'org-a', 'PUBLISHED', 5,
          'member-a', 'publication.write', '{}'::jsonb, 'equal must fail')
$q$);

SELECT g3b_expect_error('T6 Capability smaller revision republish', 'P0001', $q$
  INSERT INTO publications
    (id, organization_id, capability_id, capability_organization_id,
     event_kind, content_revision, performed_by_membership_id, permission_key,
     gate_snapshot, reason)
  VALUES ('publication-cap-smaller', 'org-a', 'cap-t6', 'org-a', 'PUBLISHED', 4,
          'member-a', 'publication.write', '{}'::jsonb, 'smaller must fail')
$q$);

SELECT g3b_expect_error('T4 OfferVersion published_at guard', 'P0001', $q$
  UPDATE offer_versions SET published_at = now() + interval '1 day'
   WHERE id = 'offer-v2'
$q$);

-- T7: no new Capability link may be added to a published OfferVersion.
SELECT g3b_expect_error('T7 INSERT link on published OfferVersion', 'P0001', $q$
  INSERT INTO offer_version_capabilities
    (organization_id, offer_version_id, capability_id)
  VALUES ('org-a', 'offer-v2', 'cap-a')
$q$);

INSERT INTO offers (id, organization_id, offer_key)
VALUES ('offer-published-links', 'org-a', 'offer-published-links');
INSERT INTO offer_versions
  (id, organization_id, offer_id, version_number, name, offer_shape,
   on_request, valid_from)
VALUES
  ('offer-published-links-v1', 'org-a', 'offer-published-links', 1,
   'Published links', 'ITEM', true, now());
INSERT INTO offer_version_capabilities
  (organization_id, offer_version_id, capability_id)
VALUES ('org-a', 'offer-published-links-v1', 'cap-a');
INSERT INTO publications
  (id, organization_id, offer_version_id, offer_version_organization_id,
   event_kind, performed_by_membership_id, permission_key, gate_snapshot, reason)
VALUES
  ('publication-offer-links', 'org-a', 'offer-published-links-v1', 'org-a',
   'PUBLISHED', 'member-a', 'publication.write', '{}'::jsonb,
   'publish version before immutable delete test');

SELECT g3b_expect_error('T7 DELETE link on published OfferVersion', 'P0001', $q$
  DELETE FROM offer_version_capabilities
   WHERE offer_version_id = 'offer-published-links-v1' AND capability_id = 'cap-a'
$q$);

-- T8/T9: draft links may be inserted/deleted; UPDATE is always rejected.
INSERT INTO offers (id, organization_id, offer_key)
VALUES ('offer-draft-links', 'org-a', 'offer-draft-links');
INSERT INTO offer_versions
  (id, organization_id, offer_id, version_number, name, offer_shape,
   on_request, valid_from)
VALUES
  ('offer-draft-links-v1', 'org-a', 'offer-draft-links', 1,
   'Draft links', 'ITEM', true, now());

INSERT INTO offer_version_capabilities
  (organization_id, offer_version_id, capability_id)
VALUES ('org-a', 'offer-draft-links-v1', 'cap-a');
DELETE FROM offer_version_capabilities
 WHERE offer_version_id = 'offer-draft-links-v1' AND capability_id = 'cap-a';

INSERT INTO offer_version_capabilities
  (organization_id, offer_version_id, capability_id)
VALUES ('org-a', 'offer-draft-links-v1', 'cap-a');

SELECT g3b_expect_error('T9 UPDATE draft link always rejected', 'P0001', $q$
  UPDATE offer_version_capabilities SET capability_id = 'cap-link-two'
   WHERE offer_version_id = 'offer-draft-links-v1' AND capability_id = 'cap-a'
$q$);

DO $$ BEGIN RAISE NOTICE 'PASS T8 draft link INSERT and DELETE'; END $$;

-- T10: Publication delete is forbidden.
SELECT g3b_expect_error('T10 Publication DELETE', 'P0001', $q$
  DELETE FROM publications WHERE id = 'publication-profile-t1-r1'
$q$);

-- T11: complete lifecycle actor audit checks.
SELECT g3b_expect_error('T11 Claim SUSPENDED without platform actor', '23514', $q$
  INSERT INTO business_identity_claims
    (id, organization_id, identifier_type, identifier_value, claim_status,
     submitted_by_membership_id, status_change_reason, status_changed_at,
     verified_at, updated_at)
  VALUES ('claim-t11', 'org-a', 'registration', 'T11', 'SUSPENDED', 'member-a',
          'missing actor', now(), now(), now())
$q$);

SELECT g3b_expect_error('T11 Membership REVOKED without actor', '23514', $q$
  INSERT INTO memberships
    (id, organization_id, identity_provider, external_subject,
     membership_status, revoked_at, revocation_reason)
  VALUES ('member-t11-none', 'org-a', 'test-idp', 'subject-t11-none',
          'REVOKED', now(), 'missing actor')
$q$);

SELECT g3b_expect_error('T11 Membership REVOKED with two actors', '23514', $q$
  INSERT INTO memberships
    (id, organization_id, identity_provider, external_subject,
     membership_status, revoked_at, revoked_by_membership_id,
     revoked_by_organization_id, revoked_by_platform_identity_ref,
     revocation_reason)
  VALUES ('member-t11-two', 'org-a', 'test-idp', 'subject-t11-two',
          'REVOKED', now(), 'member-a', 'org-a', 'platform-reviewer', 'two actors')
$q$);

SELECT g3b_expect_error('T11 Grant REVOKED without actor', '23514', $q$
  INSERT INTO permission_grants
    (id, organization_id, membership_id, permission_key, grant_status,
     basis_key, revoked_at, revocation_reason)
  VALUES ('grant-t11-none', 'org-a', 'member-a', 't11.none', 'REVOKED',
          'founding', now(), 'missing actor')
$q$);

SELECT g3b_expect_error('T11 Grant REVOKED with two actors', '23514', $q$
  INSERT INTO permission_grants
    (id, organization_id, membership_id, permission_key, grant_status,
     basis_key, revoked_at, revoked_by_membership_id,
     revoked_by_organization_id, revoked_by_platform_identity_ref,
     revocation_reason)
  VALUES ('grant-t11-two', 'org-a', 'member-a', 't11.two', 'REVOKED',
          'founding', now(), 'member-a', 'org-a', 'platform-reviewer', 'two actors')
$q$);

-- T12: exact non-internal trigger set on the five sensitive tables.
DO $$
DECLARE mismatch_count integer;
BEGIN
  WITH expected(table_name, trigger_name) AS (
    VALUES
      ('publications', 'publication_apply_projection_after_insert'),
      ('publications', 'publication_immutable_before_change'),
      ('business_profiles', 'business_profile_content_revision_before_update'),
      ('business_profiles', 'business_profile_publication_initial_guard'),
      ('business_profiles', 'business_profile_publication_projection_guard'),
      ('capabilities', 'capability_content_revision_before_update'),
      ('capabilities', 'capability_publication_initial_guard'),
      ('capabilities', 'capability_publication_projection_guard'),
      ('offer_versions', 'offer_version_immutable_before_change'),
      ('offer_versions', 'offer_version_publication_initial_guard'),
      ('offer_versions', 'offer_version_publication_projection_guard'),
      ('offer_version_capabilities', 'offer_version_capability_immutable_before_change')
  ), actual AS (
    SELECT c.relname::text AS table_name, t.tgname::text AS trigger_name
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE NOT t.tgisinternal
       AND n.nspname = 'public'
       AND c.relname IN (
         'publications', 'business_profiles', 'capabilities',
         'offer_versions', 'offer_version_capabilities'
       )
  ), differences AS (
    (SELECT * FROM expected EXCEPT SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT SELECT * FROM expected)
  )
  SELECT count(*) INTO mismatch_count FROM differences;
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'FAIL T12 exact trigger allow-list: % differences', mismatch_count;
  END IF;
  RAISE NOTICE 'PASS T12 exact trigger allow-list (12/12)';
END;
$$;

DROP FUNCTION g3b_expect_error(text, text, text);
COMMIT;
