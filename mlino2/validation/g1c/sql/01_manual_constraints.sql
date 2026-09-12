CREATE UNIQUE INDEX "claim_active_identifier_unique"
  ON "business_identity_claims"("identifier_type", "identifier_value")
  WHERE "claim_status" IN ('VERIFIED', 'SUSPENDED');

CREATE UNIQUE INDEX "membership_active_unique"
  ON "memberships"("organization_id", "identity_provider", "external_subject")
  WHERE "lifecycle_status" = 'ACTIVE';

CREATE UNIQUE INDEX "permission_grant_active_unique"
  ON "permission_grants"("organization_id", "membership_id", "permission_key")
  WHERE "revoked_at" IS NULL;

CREATE UNIQUE INDEX "business_profile_claim_unique"
  ON "business_profiles"("identity_claim_id", "identity_claim_organization_id")
  WHERE "identity_claim_id" IS NOT NULL;

CREATE UNIQUE INDEX "offer_one_published_version_unique"
  ON "offer_versions"("offer_id")
  WHERE "publication_status" = 'PUBLISHED';

ALTER TABLE "organizations"
  ADD CONSTRAINT "organization_founding_membership_pair_complete"
  CHECK (num_nonnulls("founding_membership_id", "founding_membership_organization_id") IN (0, 2));

ALTER TABLE "organizations"
  ADD CONSTRAINT "organization_founding_membership_same_org"
  CHECK (
    "founding_membership_organization_id" IS NULL
    OR "founding_membership_organization_id" = "id"
  );

ALTER TABLE "business_identity_claims"
  ADD CONSTRAINT "claim_active_requires_verified_at"
  CHECK (("claim_status" IN ('VERIFIED', 'SUSPENDED')) = ("verified_at" IS NOT NULL));

ALTER TABLE "identity_verifications"
  ADD CONSTRAINT "verification_decision_audit_complete"
  CHECK (
    ("status" IN ('APPROVED', 'REJECTED')) = ("decided_at" IS NOT NULL)
    AND ("decided_at" IS NULL OR ("platform_actor_ref" IS NOT NULL AND "decision_reason" IS NOT NULL))
  );

ALTER TABLE "business_profiles"
  ADD CONSTRAINT "business_profile_identity_claim_pair_complete"
  CHECK (num_nonnulls("identity_claim_id", "identity_claim_organization_id") IN (0, 2));

ALTER TABLE "offer_versions"
  ADD CONSTRAINT "published_version_projection_complete"
  CHECK (
    "publication_status" <> 'PUBLISHED'
    OR ("published_at" IS NOT NULL AND "published_content_revision" IS NOT NULL)
  );

ALTER TABLE "publications"
  ADD CONSTRAINT "publication_revision_required"
  CHECK ("event_kind" = 'WITHDRAWN' OR "content_revision" IS NOT NULL);

CREATE OR REPLACE FUNCTION "reject_publication_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Publication is append-only' USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER "publications_append_only"
  BEFORE UPDATE OR DELETE ON "publications"
  FOR EACH ROW EXECUTE FUNCTION "reject_publication_mutation"();

CREATE OR REPLACE FUNCTION "reject_direct_projection_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('mlino_g1c.publication_projection', true), 'off') <> 'on'
     AND (
       NEW."publication_status" IS DISTINCT FROM OLD."publication_status"
       OR NEW."published_at" IS DISTINCT FROM OLD."published_at"
       OR NEW."published_content_revision" IS DISTINCT FROM OLD."published_content_revision"
     ) THEN
    RAISE EXCEPTION 'publication projection must be changed by Publication event' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "offer_version_projection_guard"
  BEFORE UPDATE ON "offer_versions"
  FOR EACH ROW EXECUTE FUNCTION "reject_direct_projection_update"();

CREATE OR REPLACE FUNCTION "apply_publication_projection"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('mlino_g1c.publication_projection', 'on', true);
  IF NEW."event_kind" = 'PUBLISHED' THEN
    UPDATE "offer_versions"
       SET "publication_status" = 'PUBLISHED',
           "published_at" = NEW."occurred_at",
           "published_content_revision" = NEW."content_revision"
     WHERE "id" = NEW."offer_version_id"
       AND "organization_id" = NEW."organization_id";
  ELSE
    UPDATE "offer_versions"
       SET "publication_status" = 'WITHDRAWN'
     WHERE "id" = NEW."offer_version_id"
       AND "organization_id" = NEW."organization_id";
  END IF;
  PERFORM set_config('mlino_g1c.publication_projection', 'off', true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER "publication_projection_after_insert"
  AFTER INSERT ON "publications"
  FOR EACH ROW EXECUTE FUNCTION "apply_publication_projection"();

CREATE OR REPLACE FUNCTION "immutable_published_offer_version"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."published_at" IS NOT NULL AND (
    NEW."content" IS DISTINCT FROM OLD."content"
    OR NEW."offer_id" IS DISTINCT FROM OLD."offer_id"
    OR NEW."capability_id" IS DISTINCT FROM OLD."capability_id"
    OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id"
  ) THEN
    RAISE EXCEPTION 'published OfferVersion links and content are immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "offer_version_immutable_guard"
  BEFORE UPDATE ON "offer_versions"
  FOR EACH ROW EXECUTE FUNCTION "immutable_published_offer_version"();

CREATE OR REPLACE FUNCTION "immutable_decided_verification"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."decided_at" IS NOT NULL THEN
    RAISE EXCEPTION 'decided IdentityVerification is immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "verification_immutable_guard"
  BEFORE UPDATE OR DELETE ON "identity_verifications"
  FOR EACH ROW EXECUTE FUNCTION "immutable_decided_verification"();

CREATE OR REPLACE FUNCTION "reject_depth_direct_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() <= 1
     AND NEW."publication_status" IS DISTINCT FROM OLD."publication_status" THEN
    RAISE EXCEPTION 'depth projection must be changed by Publication event' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "depth_projection_guard"
  BEFORE UPDATE ON "depth_offer_versions"
  FOR EACH ROW EXECUTE FUNCTION "reject_depth_direct_update"();

CREATE OR REPLACE FUNCTION "apply_depth_projection"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "depth_offer_versions"
     SET "publication_status" = 'PUBLISHED'
   WHERE "id" = NEW."offer_version_id";
  RETURN NEW;
END;
$$;

CREATE TRIGGER "depth_publication_after_insert"
  AFTER INSERT ON "depth_publications"
  FOR EACH ROW EXECUTE FUNCTION "apply_depth_projection"();
