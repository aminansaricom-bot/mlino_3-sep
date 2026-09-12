\set ON_ERROR_STOP on

CREATE UNIQUE INDEX claim_active_identifier_unique
  ON business_identity_claims(identifier_type, identifier_value)
  WHERE claim_status IN ('VERIFIED', 'SUSPENDED');

CREATE UNIQUE INDEX membership_active_unique
  ON memberships(organization_id, external_subject)
  WHERE lifecycle_status = 'ACTIVE';

CREATE UNIQUE INDEX offer_one_published_version_unique
  ON offer_versions(offer_id)
  WHERE publication_status = 'PUBLISHED';

ALTER TABLE business_identity_claims
  ADD CONSTRAINT claim_active_requires_verified_at
  CHECK ((claim_status IN ('VERIFIED', 'SUSPENDED')) = (verified_at IS NOT NULL));

ALTER TABLE identity_verifications
  ADD CONSTRAINT verification_decision_audit_complete
  CHECK (
    (status IN ('APPROVED', 'REJECTED')) = (decided_at IS NOT NULL)
    AND (decided_at IS NULL OR (platform_actor_ref IS NOT NULL AND decision_reason IS NOT NULL))
  );

ALTER TABLE offer_versions
  ADD CONSTRAINT published_version_projection_complete
  CHECK (
    publication_status <> 'PUBLISHED'
    OR (published_at IS NOT NULL AND published_content_revision IS NOT NULL)
  );

ALTER TABLE publications
  ADD CONSTRAINT publication_revision_required
  CHECK (event_kind = 'WITHDRAWN' OR content_revision IS NOT NULL);

CREATE OR REPLACE FUNCTION reject_publication_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Publication is append-only' USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER publications_append_only
  BEFORE UPDATE OR DELETE ON publications
  FOR EACH ROW EXECUTE FUNCTION reject_publication_mutation();

CREATE OR REPLACE FUNCTION reject_direct_projection_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('mlino_g1b.publication_projection', true), 'off') <> 'on' THEN
    IF NEW.publication_status IS DISTINCT FROM OLD.publication_status
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.published_content_revision IS DISTINCT FROM OLD.published_content_revision THEN
      RAISE EXCEPTION 'publication projection must be changed by Publication event' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offer_version_projection_guard
  BEFORE UPDATE ON offer_versions
  FOR EACH ROW EXECUTE FUNCTION reject_direct_projection_update();

CREATE OR REPLACE FUNCTION apply_publication_projection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('mlino_g1b.publication_projection', 'on', true);
  IF NEW.event_kind = 'PUBLISHED' THEN
    UPDATE offer_versions
       SET publication_status = 'PUBLISHED',
           published_at = NEW.created_at,
           published_content_revision = NEW.content_revision
     WHERE id = NEW.offer_version_id;
  ELSE
    UPDATE offer_versions
       SET publication_status = 'WITHDRAWN'
     WHERE id = NEW.offer_version_id;
  END IF;
  PERFORM set_config('mlino_g1b.publication_projection', 'off', true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER publication_projection_after_insert
  AFTER INSERT ON publications
  FOR EACH ROW EXECUTE FUNCTION apply_publication_projection();

CREATE OR REPLACE FUNCTION immutable_published_offer_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL AND (
    NEW.content IS DISTINCT FROM OLD.content
    OR NEW.offer_id IS DISTINCT FROM OLD.offer_id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
  ) THEN
    RAISE EXCEPTION 'published OfferVersion content is immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offer_version_immutable_guard
  BEFORE UPDATE ON offer_versions
  FOR EACH ROW EXECUTE FUNCTION immutable_published_offer_version();

CREATE OR REPLACE FUNCTION immutable_decided_verification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.decided_at IS NOT NULL THEN
    RAISE EXCEPTION 'decided IdentityVerification is immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER verification_immutable_guard
  BEFORE UPDATE OR DELETE ON identity_verifications
  FOR EACH ROW EXECUTE FUNCTION immutable_decided_verification();
