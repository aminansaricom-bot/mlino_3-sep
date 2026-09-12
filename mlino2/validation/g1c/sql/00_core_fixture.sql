CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED', 'EXPIRED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PublicationStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED', 'WITHDRAWN');
CREATE TYPE "PublicationEventKind" AS ENUM ('PUBLISHED', 'WITHDRAWN');

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "founding_membership_id" TEXT,
  "founding_membership_organization_id" TEXT,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "identity_provider" TEXT NOT NULL,
  "external_subject" TEXT NOT NULL,
  "lifecycle_status" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memberships_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "memberships_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_founding_membership_fkey"
  FOREIGN KEY ("founding_membership_id", "founding_membership_organization_id")
  REFERENCES "memberships"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "business_identity_claims" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "identifier_type" TEXT NOT NULL,
  "identifier_value" TEXT NOT NULL,
  "claim_status" "ClaimStatus" NOT NULL,
  "verified_at" TIMESTAMPTZ(3),
  CONSTRAINT "business_identity_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_identity_claims_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "business_identity_claims_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "identity_verifications" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "claim_id" TEXT NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" "VerificationStatus" NOT NULL,
  "platform_actor_ref" TEXT,
  "decided_at" TIMESTAMPTZ(3),
  "decision_reason" TEXT,
  CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "identity_verifications_claim_org_attempt_key"
    UNIQUE ("claim_id", "organization_id", "attempt_number"),
  CONSTRAINT "identity_verifications_claim_fkey"
    FOREIGN KEY ("claim_id", "organization_id")
    REFERENCES "business_identity_claims"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "business_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "identity_claim_id" TEXT,
  "identity_claim_organization_id" TEXT,
  CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_profiles_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "business_profiles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "business_profiles_identity_claim_fkey"
    FOREIGN KEY ("identity_claim_id", "identity_claim_organization_id")
    REFERENCES "business_identity_claims"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "permission_grants" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "membership_id" TEXT NOT NULL,
  "permission_key" TEXT NOT NULL,
  "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "permission_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "permission_grants_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "permission_grants_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "permission_grants_membership_fkey"
    FOREIGN KEY ("membership_id", "organization_id")
    REFERENCES "memberships"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "capabilities" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lifecycle_state" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "capabilities_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "capabilities_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "offers" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "capability_id" TEXT NOT NULL,
  CONSTRAINT "offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "offers_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "offers_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "offers_capability_fkey"
    FOREIGN KEY ("capability_id", "organization_id")
    REFERENCES "capabilities"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "offer_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "capability_id" TEXT NOT NULL,
  "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
  "published_at" TIMESTAMPTZ(3),
  "published_content_revision" INTEGER,
  "content" TEXT NOT NULL,
  CONSTRAINT "offer_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "offer_versions_id_organization_id_key" UNIQUE ("id", "organization_id"),
  CONSTRAINT "offer_versions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "offer_versions_offer_fkey"
    FOREIGN KEY ("offer_id", "organization_id")
    REFERENCES "offers"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "offer_versions_capability_fkey"
    FOREIGN KEY ("capability_id", "organization_id")
    REFERENCES "capabilities"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "publications" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "offer_version_id" TEXT NOT NULL,
  "event_kind" "PublicationEventKind" NOT NULL,
  "content_revision" INTEGER,
  "performed_by_membership_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "publications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "publications_offer_version_fkey"
    FOREIGN KEY ("offer_version_id", "organization_id")
    REFERENCES "offer_versions"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "publications_performer_membership_fkey"
    FOREIGN KEY ("performed_by_membership_id", "organization_id")
    REFERENCES "memberships"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

ALTER TABLE "external_workspace_links"
  ADD CONSTRAINT "external_workspace_links_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "profile_claim_match_simple_control" (
  "id" TEXT PRIMARY KEY,
  "identity_claim_id" TEXT,
  "identity_claim_organization_id" TEXT,
  CONSTRAINT "profile_claim_control_fkey"
    FOREIGN KEY ("identity_claim_id", "identity_claim_organization_id")
    REFERENCES "business_identity_claims"("id", "organization_id")
    MATCH SIMPLE ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "depth_offer_versions" (
  "id" TEXT PRIMARY KEY,
  "publication_status" TEXT NOT NULL DEFAULT 'UNPUBLISHED'
);

CREATE TABLE "depth_publications" (
  "id" TEXT PRIMARY KEY,
  "offer_version_id" TEXT NOT NULL REFERENCES "depth_offer_versions"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

