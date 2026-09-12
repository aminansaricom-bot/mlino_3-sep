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
CREATE TABLE "organization_memberships" (
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

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "membership_organization_status_idx" ON "organization_memberships"("organization_id", "membership_status");

-- CreateIndex
CREATE INDEX "membership_external_subject_idx" ON "organization_memberships"("identity_provider", "external_subject");

-- CreateIndex
CREATE UNIQUE INDEX "membership_id_organization_unique" ON "organization_memberships"("id", "organization_id");

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
ALTER TABLE "organizations" ADD CONSTRAINT "organization_archived_by_membership_fk" FOREIGN KEY ("archived_by_membership_id", "archived_by_organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_identity_claims" ADD CONSTRAINT "business_identity_claim_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_identity_claims" ADD CONSTRAINT "claim_submitted_by_membership_fk" FOREIGN KEY ("submitted_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verification_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verification_claim_fk" FOREIGN KEY ("claim_id", "organization_id") REFERENCES "business_identity_claims"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "membership_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "membership_revoked_by_membership_fk" FOREIGN KEY ("revoked_by_membership_id", "revoked_by_organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_membership_fk" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_granted_by_membership_fk" FOREIGN KEY ("granted_by_membership_id", "granted_by_organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grant_revoked_by_membership_fk" FOREIGN KEY ("revoked_by_membership_id", "revoked_by_organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profile_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profile_identity_claim_fk" FOREIGN KEY ("business_identity_claim_id", "business_identity_claim_organization_id") REFERENCES "business_identity_claims"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "capabilities" ADD CONSTRAINT "capability_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "capabilities" ADD CONSTRAINT "capability_confirmed_by_membership_fk" FOREIGN KEY ("confirmed_by_membership_id", "confirmed_by_organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

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
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_confirmed_by_membership_fk" FOREIGN KEY ("confirmed_by_membership_id", "confirmed_by_organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_business_profile_fk" FOREIGN KEY ("business_profile_id", "business_profile_organization_id") REFERENCES "business_profiles"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_capability_fk" FOREIGN KEY ("capability_id", "capability_organization_id") REFERENCES "capabilities"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_offer_version_fk" FOREIGN KEY ("offer_version_id", "offer_version_organization_id") REFERENCES "offer_versions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_performed_by_membership_fk" FOREIGN KEY ("performed_by_membership_id", "organization_id") REFERENCES "organization_memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
