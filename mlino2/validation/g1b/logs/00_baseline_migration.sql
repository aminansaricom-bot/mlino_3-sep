-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PublicationEventKind" AS ENUM ('PUBLISHED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "external_subject" TEXT NOT NULL,
    "lifecycle_status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_identity_claims" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "identifier_type" TEXT NOT NULL,
    "identifier_value" TEXT NOT NULL,
    "claim_status" "ClaimStatus" NOT NULL,
    "verified_at" TIMESTAMPTZ(3),

    CONSTRAINT "business_identity_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verifications" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "platform_actor_ref" TEXT,
    "decided_at" TIMESTAMPTZ(3),
    "decision_reason" TEXT,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "published_at" TIMESTAMPTZ(3),
    "published_content_revision" INTEGER,
    "content" TEXT NOT NULL,

    CONSTRAINT "offer_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "offer_version_id" TEXT NOT NULL,
    "event_kind" "PublicationEventKind" NOT NULL,
    "content_revision" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platform_actor_ref" TEXT NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_id_organization_id_key" ON "memberships"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_identity_claims_id_organization_id_key" ON "business_identity_claims"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_verifications_claim_id_attempt_number_key" ON "identity_verifications"("claim_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "offers_id_organization_id_key" ON "offers"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_versions_id_organization_id_key" ON "offer_versions"("id", "organization_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "business_identity_claims" ADD CONSTRAINT "business_identity_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "business_identity_claims"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_offer_id_organization_id_fkey" FOREIGN KEY ("offer_id", "organization_id") REFERENCES "offers"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_offer_version_id_organization_id_fkey" FOREIGN KEY ("offer_version_id", "organization_id") REFERENCES "offer_versions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

