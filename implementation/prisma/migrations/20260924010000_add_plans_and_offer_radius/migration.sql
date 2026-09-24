-- D-76: plan tiers (entitlement, not authority). D-77: offer visibility radius (CCR on Offer).
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'MAX');

CREATE TABLE "organization_plans" (
    "organization_id" TEXT NOT NULL,
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "change_basis" VARCHAR(40) NOT NULL,
    "changed_by_membership_id" TEXT,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_plans_pkey" PRIMARY KEY ("organization_id")
);
ALTER TABLE "organization_plans" ADD CONSTRAINT "organization_plan_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "organization_plans" ADD CONSTRAINT "organization_plan_basis_check" CHECK ("change_basis" IN ('demo_switch', 'payment', 'platform_grant', 'downgrade'));

ALTER TABLE "offer_versions" ADD COLUMN "visibility_radius_meters" INTEGER;
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_version_radius_check" CHECK ("visibility_radius_meters" IS NULL OR "visibility_radius_meters" BETWEEN 100 AND 20000);
