-- MLINO Core Foundation schema migration
-- Approved CCR: implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md
-- Approved artifact commit: fcddfc2ef2faf76a2d6f8ded7eb4f68ec07a71cb
-- Protected objects: every Core FK; C1-C5 indexes; C6-C11 CHECK constraints;
-- C12-C15 functions/triggers; external_workspace_link_active_unique.
-- DROP or RENAME of any protected object requires a new approved CCR.

-- CreateEnum
CREATE TYPE "OrganizationLifecycle" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationAttemptStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "BusinessProfileLifecycle" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CapabilityStatus" AS ENUM ('PLANNED', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "CapabilityAudience" AS ENUM ('INTERNAL', 'CUSTOMER_FACING');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('UNCONFIRMED', 'HUMAN_CONFIRMED');

-- CreateEnum
CREATE TYPE "OfferLifecycle" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "OfferShape" AS ENUM ('ITEM', 'BUNDLE', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "EvidenceSourceKind" AS ENUM ('HUMAN', 'SYSTEM', 'AI_INFERRED', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PublicationEventKind" AS ENUM ('PUBLISHED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "lifecycle_status" "OrganizationLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "archived_by_membership_id" TEXT,
    "archived_by_organization_id" TEXT,
    "archived_by_platform_identity_ref" VARCHAR(255),
    "archive_reason" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_identity_claims" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "identifier_type" VARCHAR(80) NOT NULL,
    "identifier_value" VARCHAR(300) NOT NULL,
    "claim_status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_by_membership_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(3),
    "valid_until" TIMESTAMPTZ(3),
    "status_changed_by_platform_identity_ref" VARCHAR(255),
    "status_change_reason" TEXT,
    "status_changed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_identity_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "method_key" VARCHAR(160) NOT NULL,
    "status" "VerificationAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_locator" JSONB,
    "reviewed_by_platform_identity_ref" VARCHAR(255),
    "decision_reason" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "identity_provider" VARCHAR(100) NOT NULL,
    "external_subject" VARCHAR(255) NOT NULL,
    "membership_status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by_membership_id" TEXT,
    "revoked_by_organization_id" TEXT,
    "revoked_by_platform_identity_ref" VARCHAR(255),
    "revocation_reason" TEXT,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_grants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "permission_key" VARCHAR(160) NOT NULL,
    "grant_status" "GrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "basis_key" VARCHAR(40) NOT NULL,
    "granted_by_membership_id" TEXT,
    "granted_by_organization_id" TEXT,
    "reason" TEXT,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by_membership_id" TEXT,
    "revoked_by_organization_id" TEXT,
    "revoked_by_platform_identity_ref" VARCHAR(255),
    "revocation_reason" TEXT,

    CONSTRAINT "permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "business_identity_claim_id" TEXT,
    "business_identity_claim_organization_id" TEXT,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "address_text" TEXT,
    "contact_information" JSONB,
    "links" JSONB,
    "business_hours" JSONB,
    "lifecycle_status" "BusinessProfileLifecycle" NOT NULL DEFAULT 'DRAFT',
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "content_revision" INTEGER NOT NULL DEFAULT 1,
    "published_content_revision" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "capability_key" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_description" TEXT,
    "category_key" VARCHAR(160) NOT NULL,
    "capability_status" "CapabilityStatus" NOT NULL DEFAULT 'PLANNED',
    "audience" "CapabilityAudience" NOT NULL DEFAULT 'INTERNAL',
    "confirmation_status" "ConfirmationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "confirmed_by_membership_id" TEXT,
    "confirmed_by_organization_id" TEXT,
    "confirmed_at" TIMESTAMPTZ(3),
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "content_revision" INTEGER NOT NULL DEFAULT 1,
    "published_content_revision" INTEGER,
    "fresh_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "offer_key" VARCHAR(160) NOT NULL,
    "lifecycle_status" "OfferLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMPTZ(3),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_description" TEXT,
    "offer_shape" "OfferShape" NOT NULL,
    "terms" JSONB,
    "price_amount" DECIMAL(12,2),
    "price_currency" VARCHAR(3),
    "on_request" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMPTZ(3) NOT NULL,
    "valid_until" TIMESTAMPTZ(3),
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "offer_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_version_capabilities" (
    "organization_id" TEXT NOT NULL,
    "offer_version_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,

    CONSTRAINT "offer_version_capability_pk" PRIMARY KEY ("offer_version_id","capability_id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "capability_id" TEXT,
    "capability_organization_id" TEXT,
    "offer_version_id" TEXT,
    "offer_version_organization_id" TEXT,
    "source_kind" "EvidenceSourceKind" NOT NULL,
    "source_ref" VARCHAR(255),
    "method_key" VARCHAR(160),
    "captured_at" TIMESTAMPTZ(3),
    "observed_at" TIMESTAMPTZ(3),
    "fresh_until" TIMESTAMPTZ(3),
    "confidence" DECIMAL(5,4),
    "confirmation_status" "ConfirmationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "confirmed_by_membership_id" TEXT,
    "confirmed_by_organization_id" TEXT,
    "confirmed_at" TIMESTAMPTZ(3),
    "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "business_profile_id" TEXT,
    "business_profile_organization_id" TEXT,
    "capability_id" TEXT,
    "capability_organization_id" TEXT,
    "offer_version_id" TEXT,
    "offer_version_organization_id" TEXT,
    "event_kind" "PublicationEventKind" NOT NULL,
    "content_revision" INTEGER,
    "performed_by_membership_id" TEXT NOT NULL,
    "permission_key" VARCHAR(160) NOT NULL,
    "gate_snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_lifecycle_created_idx" ON "organizations"("lifecycle_status", "created_at");

-- CreateIndex
CREATE INDEX "business_identity_claim_organization_status_idx" ON "business_identity_claims"("organization_id", "claim_status");

-- CreateIndex
CREATE INDEX "business_identity_claim_identifier_idx" ON "business_identity_claims"("identifier_type", "identifier_value");

-- CreateIndex
CREATE UNIQUE INDEX "business_identity_claim_id_organization_unique" ON "business_identity_claims"("id", "organization_id");

-- CreateIndex
CREATE INDEX "identity_verification_organization_status_idx" ON "identity_verifications"("organization_id", "status", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "identity_verification_id_organization_unique" ON "identity_verifications"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_verification_claim_attempt_unique" ON "identity_verifications"("claim_id", "attempt_number");

-- CreateIndex
CREATE INDEX "membership_organization_status_idx" ON "memberships"("organization_id", "membership_status");

-- CreateIndex
CREATE INDEX "membership_external_subject_idx" ON "memberships"("identity_provider", "external_subject");

-- CreateIndex
CREATE UNIQUE INDEX "membership_id_organization_unique" ON "memberships"("id", "organization_id");

-- CreateIndex
CREATE INDEX "permission_grant_member_status_idx" ON "permission_grants"("organization_id", "membership_id", "grant_status");

-- CreateIndex
CREATE INDEX "permission_grant_key_status_idx" ON "permission_grants"("organization_id", "permission_key", "grant_status");

-- CreateIndex
CREATE UNIQUE INDEX "permission_grant_id_organization_unique" ON "permission_grants"("id", "organization_id");

-- CreateIndex
CREATE INDEX "business_profile_organization_lifecycle_idx" ON "business_profiles"("organization_id", "lifecycle_status");

-- CreateIndex
CREATE INDEX "business_profile_publication_updated_idx" ON "business_profiles"("organization_id", "publication_status", "updated_at");

-- CreateIndex
CREATE INDEX "business_profile_publication_location_idx" ON "business_profiles"("publication_status", "latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "business_profile_id_organization_unique" ON "business_profiles"("id", "organization_id");

-- CreateIndex
CREATE INDEX "capability_organization_status_audience_idx" ON "capabilities"("organization_id", "capability_status", "audience");

-- CreateIndex
CREATE INDEX "capability_publication_category_idx" ON "capabilities"("organization_id", "publication_status", "category_key");

-- CreateIndex
CREATE INDEX "capability_freshness_idx" ON "capabilities"("organization_id", "fresh_until");

-- CreateIndex
CREATE UNIQUE INDEX "capability_id_organization_unique" ON "capabilities"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "capability_organization_key_unique" ON "capabilities"("organization_id", "capability_key");

-- CreateIndex
CREATE INDEX "offer_organization_lifecycle_idx" ON "offers"("organization_id", "lifecycle_status");

-- CreateIndex
CREATE UNIQUE INDEX "offer_id_organization_unique" ON "offers"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_organization_key_unique" ON "offers"("organization_id", "offer_key");

-- CreateIndex
CREATE INDEX "offer_version_offer_publication_idx" ON "offer_versions"("organization_id", "offer_id", "publication_status");

-- CreateIndex
CREATE INDEX "offer_version_validity_idx" ON "offer_versions"("organization_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "offer_version_publication_time_idx" ON "offer_versions"("organization_id", "publication_status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "offer_version_id_organization_unique" ON "offer_versions"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_version_number_unique" ON "offer_versions"("offer_id", "version_number");

-- CreateIndex
CREATE INDEX "offer_version_capability_reverse_idx" ON "offer_version_capabilities"("capability_id", "offer_version_id");

-- CreateIndex
CREATE INDEX "evidence_capability_status_fresh_idx" ON "evidence"("organization_id", "capability_id", "evidence_status", "fresh_until");

-- CreateIndex
CREATE INDEX "evidence_offer_version_status_fresh_idx" ON "evidence"("organization_id", "offer_version_id", "evidence_status", "fresh_until");

-- CreateIndex
CREATE INDEX "evidence_source_confirmation_idx" ON "evidence"("organization_id", "source_kind", "confirmation_status");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_id_organization_unique" ON "evidence"("id", "organization_id");

-- CreateIndex
CREATE INDEX "publication_business_profile_time_idx" ON "publications"("organization_id", "business_profile_id", "occurred_at");

-- CreateIndex
CREATE INDEX "publication_capability_time_idx" ON "publications"("organization_id", "capability_id", "occurred_at");

-- CreateIndex
CREATE INDEX "publication_offer_version_time_idx" ON "publications"("organization_id", "offer_version_id", "occurred_at");

-- CreateIndex
CREATE INDEX "publication_actor_time_idx" ON "publications"("organization_id", "performed_by_membership_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "publication_id_organization_unique" ON "publications"("id", "organization_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organization_archived_by_membership_fk" FOREIGN KEY ("archived_by_membership_id", "archived_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_identity_claims" ADD CONSTRAINT "business_identity_claim_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_identity_claims" ADD CONSTRAINT "claim_submitted_by_membership_fk" FOREIGN KEY ("submitted_by_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verification_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verification_claim_fk" FOREIGN KEY ("claim_id", "organization_id") REFERENCES "business_identity_claims"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "membership_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "membership_revoked_by_membership_fk" FOREIGN KEY ("revoked_by_membership_id", "revoked_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_membership_fk" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_granted_by_membership_fk" FOREIGN KEY ("granted_by_membership_id", "granted_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_revoked_by_membership_fk" FOREIGN KEY ("revoked_by_membership_id", "revoked_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profile_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profile_identity_claim_fk" FOREIGN KEY ("business_identity_claim_id", "business_identity_claim_organization_id") REFERENCES "business_identity_claims"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "capabilities" ADD CONSTRAINT "capability_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "capabilities" ADD CONSTRAINT "capability_confirmed_by_membership_fk" FOREIGN KEY ("confirmed_by_membership_id", "confirmed_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offer_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_version_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_version_offer_fk" FOREIGN KEY ("offer_id", "organization_id") REFERENCES "offers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_version_capabilities" ADD CONSTRAINT "offer_version_capability_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_version_capabilities" ADD CONSTRAINT "offer_version_capability_offer_version_fk" FOREIGN KEY ("offer_version_id", "organization_id") REFERENCES "offer_versions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_version_capabilities" ADD CONSTRAINT "offer_version_capability_capability_fk" FOREIGN KEY ("capability_id", "organization_id") REFERENCES "capabilities"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_capability_fk" FOREIGN KEY ("capability_id", "capability_organization_id") REFERENCES "capabilities"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_offer_version_fk" FOREIGN KEY ("offer_version_id", "offer_version_organization_id") REFERENCES "offer_versions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_confirmed_by_membership_fk" FOREIGN KEY ("confirmed_by_membership_id", "confirmed_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_business_profile_fk" FOREIGN KEY ("business_profile_id", "business_profile_organization_id") REFERENCES "business_profiles"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_capability_fk" FOREIGN KEY ("capability_id", "capability_organization_id") REFERENCES "capabilities"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_offer_version_fk" FOREIGN KEY ("offer_version_id", "offer_version_organization_id") REFERENCES "offer_versions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_performed_by_membership_fk" FOREIGN KEY ("performed_by_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

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
