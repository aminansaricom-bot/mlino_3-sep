-- C1..C5: partial uniqueness
CREATE UNIQUE INDEX business_identity_claim_active_identifier_unique
  ON business_identity_claims (identifier_type, identifier_value)
  WHERE claim_status IN ('VERIFIED', 'SUSPENDED');

CREATE UNIQUE INDEX membership_active_subject_unique
  ON memberships (organization_id, identity_provider, external_subject)
  WHERE membership_status = 'ACTIVE';

CREATE UNIQUE INDEX permission_grant_active_unique
  ON permission_grants (organization_id, membership_id, permission_key)
  WHERE grant_status = 'ACTIVE';

CREATE UNIQUE INDEX business_profile_claim_unique
  ON business_profiles (business_identity_claim_id)
  WHERE business_identity_claim_id IS NOT NULL;

CREATE UNIQUE INDEX offer_version_published_unique
  ON offer_versions (offer_id)
  WHERE publication_status = 'PUBLISHED';

-- C6: optional composite relation shadow pairs
ALTER TABLE organizations ADD CONSTRAINT organization_archive_actor_pair_check CHECK (
  (archived_by_membership_id IS NULL AND archived_by_organization_id IS NULL)
  OR (archived_by_membership_id IS NOT NULL AND archived_by_organization_id IS NOT NULL
      AND archived_by_organization_id = id)
);

ALTER TABLE memberships ADD CONSTRAINT membership_revocation_actor_pair_check CHECK (
  (revoked_by_membership_id IS NULL AND revoked_by_organization_id IS NULL)
  OR (revoked_by_membership_id IS NOT NULL AND revoked_by_organization_id IS NOT NULL
      AND revoked_by_organization_id = organization_id)
);

ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_grantor_pair_check CHECK (
  (granted_by_membership_id IS NULL AND granted_by_organization_id IS NULL)
  OR (granted_by_membership_id IS NOT NULL AND granted_by_organization_id IS NOT NULL
      AND granted_by_organization_id = organization_id)
);

ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_revoker_pair_check CHECK (
  (revoked_by_membership_id IS NULL AND revoked_by_organization_id IS NULL)
  OR (revoked_by_membership_id IS NOT NULL AND revoked_by_organization_id IS NOT NULL
      AND revoked_by_organization_id = organization_id)
);

ALTER TABLE business_profiles ADD CONSTRAINT business_profile_claim_pair_check CHECK (
  (business_identity_claim_id IS NULL AND business_identity_claim_organization_id IS NULL)
  OR (business_identity_claim_id IS NOT NULL AND business_identity_claim_organization_id IS NOT NULL
      AND business_identity_claim_organization_id = organization_id)
);

ALTER TABLE capabilities ADD CONSTRAINT capability_confirmer_pair_check CHECK (
  (confirmed_by_membership_id IS NULL AND confirmed_by_organization_id IS NULL)
  OR (confirmed_by_membership_id IS NOT NULL AND confirmed_by_organization_id IS NOT NULL
      AND confirmed_by_organization_id = organization_id)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_capability_pair_check CHECK (
  (capability_id IS NULL AND capability_organization_id IS NULL)
  OR (capability_id IS NOT NULL AND capability_organization_id IS NOT NULL
      AND capability_organization_id = organization_id)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_offer_version_pair_check CHECK (
  (offer_version_id IS NULL AND offer_version_organization_id IS NULL)
  OR (offer_version_id IS NOT NULL AND offer_version_organization_id IS NOT NULL
      AND offer_version_organization_id = organization_id)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_confirmer_pair_check CHECK (
  (confirmed_by_membership_id IS NULL AND confirmed_by_organization_id IS NULL)
  OR (confirmed_by_membership_id IS NOT NULL AND confirmed_by_organization_id IS NOT NULL
      AND confirmed_by_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_business_profile_pair_check CHECK (
  (business_profile_id IS NULL AND business_profile_organization_id IS NULL)
  OR (business_profile_id IS NOT NULL AND business_profile_organization_id IS NOT NULL
      AND business_profile_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_capability_pair_check CHECK (
  (capability_id IS NULL AND capability_organization_id IS NULL)
  OR (capability_id IS NOT NULL AND capability_organization_id IS NOT NULL
      AND capability_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_offer_version_pair_check CHECK (
  (offer_version_id IS NULL AND offer_version_organization_id IS NULL)
  OR (offer_version_id IS NOT NULL AND offer_version_organization_id IS NOT NULL
      AND offer_version_organization_id = organization_id)
);

-- C7: typed-owner/target XOR
ALTER TABLE evidence ADD CONSTRAINT evidence_owner_xor_check CHECK (
  num_nonnulls(capability_id, offer_version_id) = 1
);

ALTER TABLE publications ADD CONSTRAINT publication_target_xor_check CHECK (
  num_nonnulls(business_profile_id, capability_id, offer_version_id) = 1
);

-- C8: lifecycle audit completeness
ALTER TABLE organizations ADD CONSTRAINT organization_archive_audit_check CHECK (
  (lifecycle_status = 'ACTIVE'
    AND archived_at IS NULL
    AND archived_by_membership_id IS NULL
    AND archived_by_platform_identity_ref IS NULL
    AND archive_reason IS NULL)
  OR
  (lifecycle_status = 'ARCHIVED'
    AND archived_at IS NOT NULL
    AND archive_reason IS NOT NULL
    AND num_nonnulls(archived_by_membership_id, archived_by_platform_identity_ref) = 1)
);

ALTER TABLE business_identity_claims ADD CONSTRAINT business_identity_claim_status_audit_check CHECK (
  (claim_status = 'PENDING'
    AND status_changed_by_platform_identity_ref IS NULL
    AND status_change_reason IS NULL
    AND status_changed_at IS NULL
    AND verified_at IS NULL)
  OR
  (claim_status IN ('VERIFIED', 'SUSPENDED')
    AND status_changed_by_platform_identity_ref IS NOT NULL
    AND status_change_reason IS NOT NULL
    AND status_changed_at IS NOT NULL
    AND verified_at IS NOT NULL)
  OR
  (claim_status = 'REJECTED'
    AND status_changed_by_platform_identity_ref IS NOT NULL
    AND status_change_reason IS NOT NULL
    AND status_changed_at IS NOT NULL)
  OR
  (claim_status = 'EXPIRED'
    AND status_change_reason IS NOT NULL
    AND status_changed_at IS NOT NULL)
);

ALTER TABLE memberships ADD CONSTRAINT membership_revocation_audit_check CHECK (
  (membership_status = 'ACTIVE'
    AND revoked_at IS NULL
    AND revoked_by_membership_id IS NULL
    AND revoked_by_platform_identity_ref IS NULL
    AND revocation_reason IS NULL)
  OR
  (membership_status = 'REVOKED'
    AND revoked_at IS NOT NULL
    AND revocation_reason IS NOT NULL
    AND num_nonnulls(revoked_by_membership_id, revoked_by_platform_identity_ref) = 1)
);

ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_revocation_audit_check CHECK (
  (grant_status = 'ACTIVE'
    AND revoked_at IS NULL
    AND revoked_by_membership_id IS NULL
    AND revoked_by_platform_identity_ref IS NULL
    AND revocation_reason IS NULL)
  OR
  (grant_status = 'REVOKED'
    AND revoked_at IS NOT NULL
    AND revocation_reason IS NOT NULL
    AND num_nonnulls(revoked_by_membership_id, revoked_by_platform_identity_ref) = 1)
);

ALTER TABLE identity_verifications ADD CONSTRAINT identity_verification_decision_audit_check CHECK (
  (status IN ('PENDING', 'UNDER_REVIEW')
    AND reviewed_by_platform_identity_ref IS NULL
    AND decision_reason IS NULL
    AND decided_at IS NULL)
  OR
  (status IN ('VERIFIED', 'REJECTED')
    AND reviewed_by_platform_identity_ref IS NOT NULL
    AND decision_reason IS NOT NULL
    AND decided_at IS NOT NULL)
  OR
  (status = 'EXPIRED'
    AND decision_reason IS NOT NULL
    AND decided_at IS NOT NULL)
);

-- C9: grant basis
ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_basis_check CHECK (
  (basis_key = 'founding'
    AND granted_by_membership_id IS NULL
    AND granted_by_organization_id IS NULL)
  OR
  (basis_key = 'member_grant'
    AND granted_by_membership_id IS NOT NULL
    AND granted_by_organization_id = organization_id)
);

-- C10: ranges, prices, confidence, revisions and projected publication state
ALTER TABLE offer_versions ADD CONSTRAINT offer_version_validity_check CHECK (
  valid_until IS NULL OR valid_until > valid_from
);

ALTER TABLE offer_versions ADD CONSTRAINT offer_version_price_check CHECK (
  (on_request = true AND price_amount IS NULL AND price_currency IS NULL)
  OR
  (on_request = false AND price_amount IS NOT NULL AND price_amount >= 0 AND price_currency IS NOT NULL)
);

ALTER TABLE offer_versions ADD CONSTRAINT offer_version_publication_projection_check CHECK (
  (publication_status = 'UNPUBLISHED' AND published_at IS NULL)
  OR
  (publication_status IN ('PUBLISHED', 'WITHDRAWN') AND published_at IS NOT NULL)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_confidence_check CHECK (
  confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
);

ALTER TABLE business_profiles ADD CONSTRAINT business_profile_revision_check CHECK (
  content_revision >= 1
  AND (
    (publication_status = 'UNPUBLISHED' AND published_content_revision IS NULL)
    OR
    (publication_status IN ('PUBLISHED', 'WITHDRAWN')
      AND published_content_revision BETWEEN 1 AND content_revision)
  )
);

ALTER TABLE capabilities ADD CONSTRAINT capability_revision_check CHECK (
  content_revision >= 1
  AND (
    (publication_status = 'UNPUBLISHED' AND published_content_revision IS NULL)
    OR
    (publication_status IN ('PUBLISHED', 'WITHDRAWN')
      AND published_content_revision BETWEEN 1 AND content_revision)
  )
);

ALTER TABLE publications ADD CONSTRAINT publication_content_revision_check CHECK (
  ((business_profile_id IS NOT NULL OR capability_id IS NOT NULL)
    AND content_revision IS NOT NULL
    AND content_revision >= 1)
  OR
  (offer_version_id IS NOT NULL AND content_revision IS NULL)
);

-- C11: human confirmation is separate from provenance/confidence
ALTER TABLE capabilities ADD CONSTRAINT capability_confirmation_check CHECK (
  (confirmation_status = 'UNCONFIRMED'
    AND confirmed_by_membership_id IS NULL
    AND confirmed_by_organization_id IS NULL
    AND confirmed_at IS NULL)
  OR
  (confirmation_status = 'HUMAN_CONFIRMED'
    AND confirmed_by_membership_id IS NOT NULL
    AND confirmed_by_organization_id = organization_id
    AND confirmed_at IS NOT NULL)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_confirmation_check CHECK (
  (confirmation_status = 'UNCONFIRMED'
    AND confirmed_by_membership_id IS NULL
    AND confirmed_by_organization_id IS NULL
    AND confirmed_at IS NULL)
  OR
  (confirmation_status = 'HUMAN_CONFIRMED'
    AND confirmed_by_membership_id IS NOT NULL
    AND confirmed_by_organization_id = organization_id
    AND confirmed_at IS NOT NULL)
);

-- C12: Publication is append-only
CREATE FUNCTION core_reject_publication_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'publications are append-only';
END;
$$;

CREATE TRIGGER publication_immutable_before_change
BEFORE UPDATE OR DELETE ON publications
FOR EACH ROW EXECUTE FUNCTION core_reject_publication_mutation();

-- C13: OfferVersion content and its capability links are immutable
CREATE FUNCTION core_enforce_offer_version_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'offer versions cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'publication_status' - 'published_at')
       IS DISTINCT FROM
     (to_jsonb(OLD) - 'publication_status' - 'published_at') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'offer version content is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offer_version_immutable_before_change
BEFORE UPDATE OR DELETE ON offer_versions
FOR EACH ROW EXECUTE FUNCTION core_enforce_offer_version_immutability();

CREATE FUNCTION core_enforce_offer_version_capability_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_published_at timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'offer version capability links cannot be updated';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT published_at INTO parent_published_at
      FROM offer_versions
     WHERE id = NEW.offer_version_id
       AND organization_id = NEW.organization_id
     FOR UPDATE;
    IF parent_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'published offer version capability links are immutable';
    END IF;
    RETURN NEW;
  END IF;

  SELECT published_at INTO parent_published_at
    FROM offer_versions
   WHERE id = OLD.offer_version_id
     AND organization_id = OLD.organization_id
   FOR UPDATE;
  IF parent_published_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'published offer version capability links are immutable';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER offer_version_capability_immutable_before_change
BEFORE INSERT OR UPDATE OR DELETE ON offer_version_capabilities
FOR EACH ROW EXECUTE FUNCTION core_enforce_offer_version_capability_immutability();

-- C14: decided verification history is read-only
CREATE FUNCTION core_enforce_verification_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('VERIFIED', 'REJECTED', 'EXPIRED') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'decided identity verification is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER identity_verification_decided_immutable_before_change
BEFORE UPDATE OR DELETE ON identity_verifications
FOR EACH ROW EXECUTE FUNCTION core_enforce_verification_immutability();

-- D6 = A: public-field changes increment content_revision in the database.
CREATE FUNCTION core_bump_business_profile_content_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(
       NEW.name, NEW.description, NEW.latitude, NEW.longitude, NEW.address_text,
       NEW.contact_information, NEW.links, NEW.business_hours,
       NEW.business_identity_claim_id
     ) IS DISTINCT FROM ROW(
       OLD.name, OLD.description, OLD.latitude, OLD.longitude, OLD.address_text,
       OLD.contact_information, OLD.links, OLD.business_hours,
       OLD.business_identity_claim_id
     ) THEN
    NEW.content_revision := OLD.content_revision + 1;
  ELSIF NEW.content_revision IS DISTINCT FROM OLD.content_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'content revision requires a public field change';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_profile_content_revision_before_update
BEFORE UPDATE OF name, description, latitude, longitude, address_text,
  contact_information, links, business_hours, business_identity_claim_id,
  content_revision ON business_profiles
FOR EACH ROW EXECUTE FUNCTION core_bump_business_profile_content_revision();

CREATE FUNCTION core_bump_capability_content_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.name, NEW.short_description, NEW.category_key, NEW.audience)
       IS DISTINCT FROM
     ROW(OLD.name, OLD.short_description, OLD.category_key, OLD.audience) THEN
    NEW.content_revision := OLD.content_revision + 1;
  ELSIF NEW.content_revision IS DISTINCT FROM OLD.content_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'content revision requires a public field change';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capability_content_revision_before_update
BEFORE UPDATE OF name, short_description, category_key, audience,
  content_revision ON capabilities
FOR EACH ROW EXECUTE FUNCTION core_bump_capability_content_revision();

-- C15 / D1 = B1: direct projection writes are forbidden.
-- Closed projection-writer allow-list: publication_apply_projection_after_insert only.
CREATE FUNCTION core_require_nested_publication_projection() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.publication_status <> 'UNPUBLISHED' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'initial publication status must be UNPUBLISHED';
    END IF;
    RETURN NEW;
  END IF;
  IF pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'publication projection requires Publication event';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_profile_publication_initial_guard
BEFORE INSERT ON business_profiles
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER business_profile_publication_projection_guard
BEFORE UPDATE OF publication_status, published_content_revision ON business_profiles
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE TRIGGER capability_publication_initial_guard
BEFORE INSERT ON capabilities
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER capability_publication_projection_guard
BEFORE UPDATE OF publication_status, published_content_revision ON capabilities
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE TRIGGER offer_version_publication_initial_guard
BEFORE INSERT ON offer_versions
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER offer_version_publication_projection_guard
BEFORE UPDATE OF publication_status, published_at ON offer_versions
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE FUNCTION core_apply_publication_projection() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  affected_rows integer;
BEGIN
  IF NEW.business_profile_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE business_profiles
         SET publication_status = 'PUBLISHED',
             published_content_revision = NEW.content_revision,
             updated_at = NEW.occurred_at
       WHERE id = NEW.business_profile_id
         AND organization_id = NEW.organization_id
         AND content_revision = NEW.content_revision
         AND (
           publication_status IN ('UNPUBLISHED', 'WITHDRAWN')
           OR (publication_status = 'PUBLISHED'
               AND NEW.content_revision > published_content_revision)
         );
    ELSE
      UPDATE business_profiles
         SET publication_status = 'WITHDRAWN',
             updated_at = NEW.occurred_at
       WHERE id = NEW.business_profile_id
         AND organization_id = NEW.organization_id
         AND publication_status = 'PUBLISHED'
         AND published_content_revision = NEW.content_revision;
    END IF;
  ELSIF NEW.capability_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE capabilities
         SET publication_status = 'PUBLISHED',
             published_content_revision = NEW.content_revision,
             updated_at = NEW.occurred_at
       WHERE id = NEW.capability_id
         AND organization_id = NEW.organization_id
         AND content_revision = NEW.content_revision
         AND (
           publication_status IN ('UNPUBLISHED', 'WITHDRAWN')
           OR (publication_status = 'PUBLISHED'
               AND NEW.content_revision > published_content_revision)
         );
    ELSE
      UPDATE capabilities
         SET publication_status = 'WITHDRAWN',
             updated_at = NEW.occurred_at
       WHERE id = NEW.capability_id
         AND organization_id = NEW.organization_id
         AND publication_status = 'PUBLISHED'
         AND published_content_revision = NEW.content_revision;
    END IF;
  ELSE
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE offer_versions
         SET publication_status = 'PUBLISHED',
             published_at = NEW.occurred_at
       WHERE id = NEW.offer_version_id
         AND organization_id = NEW.organization_id
         AND publication_status IN ('UNPUBLISHED', 'WITHDRAWN');
    ELSE
      UPDATE offer_versions
         SET publication_status = 'WITHDRAWN'
       WHERE id = NEW.offer_version_id
         AND organization_id = NEW.organization_id
         AND publication_status = 'PUBLISHED';
    END IF;
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid publication transition';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publication_apply_projection_after_insert
AFTER INSERT ON publications
FOR EACH ROW EXECUTE FUNCTION core_apply_publication_projection();
