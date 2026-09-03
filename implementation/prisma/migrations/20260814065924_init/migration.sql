-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('Individual', 'Interaction');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('OCCURRENCE', 'AMENDMENT', 'RETRACTION');

-- CreateEnum
CREATE TYPE "ProducerType" AS ENUM ('external', 'internal');

-- CreateEnum
CREATE TYPE "ProducerKind" AS ENUM ('value_engine', 'interaction_layer');

-- CreateEnum
CREATE TYPE "OpportunityState" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('SEEN', 'ACKNOWLEDGED', 'DISMISSED');

-- CreateTable
CREATE TABLE "core_entities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "domain_tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_log" (
    "id" TEXT NOT NULL,
    "unique_key" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "ingestion_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_ref" TEXT NOT NULL,
    "producer_type" "ProducerType" NOT NULL,
    "producer_id" TEXT,
    "kernel_version" TEXT NOT NULL,
    "confidence_level" DOUBLE PRECISION NOT NULL,
    "domain_tag" TEXT NOT NULL,
    "causal_links" JSONB,
    "amends_event_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_observability" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "producer_id" TEXT,
    "domain_tag" TEXT,
    "raw_payload" JSONB NOT NULL,
    "rejection_reason" TEXT NOT NULL,
    "rejected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_observability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_signal_producer_registry" (
    "producer_id" TEXT NOT NULL,
    "producer_kind" "ProducerKind" NOT NULL,
    "allowed_domain_tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_signal_producer_registry_pkey" PRIMARY KEY ("producer_id")
);

-- CreateTable
CREATE TABLE "opportunity_current_state" (
    "opportunity_correlation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain_tag" TEXT NOT NULL,
    "state" "OpportunityState" NOT NULL,
    "materiality_score" DOUBLE PRECISION NOT NULL,
    "materiality_basis" TEXT NOT NULL,
    "intended_audience" TEXT NOT NULL,
    "evidence_refs" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3),
    "latest_event_id" TEXT NOT NULL,
    "last_computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_current_state_pkey" PRIMARY KEY ("opportunity_correlation_id")
);

-- CreateTable
CREATE TABLE "opportunity_interaction_state" (
    "opportunity_correlation_id" TEXT NOT NULL,
    "actor_core_entity_id" TEXT NOT NULL,
    "interaction_type" "InteractionType" NOT NULL,
    "latest_event_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_interaction_state_pkey" PRIMARY KEY ("opportunity_correlation_id","actor_core_entity_id")
);

-- CreateTable
CREATE TABLE "revenue_recovery_raw_aggregate" (
    "organization_id" TEXT NOT NULL,
    "domain_tag" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "open_count" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_recovery_raw_aggregate_pkey" PRIMARY KEY ("organization_id","domain_tag","period_start","period_end")
);

-- CreateTable
CREATE TABLE "_EventCoreEntities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "core_entities_organization_id_entity_type_idx" ON "core_entities"("organization_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "event_log_unique_key_key" ON "event_log"("unique_key");

-- CreateIndex
CREATE INDEX "event_log_organization_id_domain_tag_event_time_idx" ON "event_log"("organization_id", "domain_tag", "event_time");

-- CreateIndex
CREATE INDEX "event_log_amends_event_id_idx" ON "event_log"("amends_event_id");

-- CreateIndex
CREATE INDEX "opportunity_current_state_organization_id_domain_tag_state_idx" ON "opportunity_current_state"("organization_id", "domain_tag", "state");

-- CreateIndex
CREATE INDEX "opportunity_current_state_organization_id_state_expires_at_idx" ON "opportunity_current_state"("organization_id", "state", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "_EventCoreEntities_AB_unique" ON "_EventCoreEntities"("A", "B");

-- CreateIndex
CREATE INDEX "_EventCoreEntities_B_index" ON "_EventCoreEntities"("B");

-- AddForeignKey
ALTER TABLE "_EventCoreEntities" ADD CONSTRAINT "_EventCoreEntities_A_fkey" FOREIGN KEY ("A") REFERENCES "core_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventCoreEntities" ADD CONSTRAINT "_EventCoreEntities_B_fkey" FOREIGN KEY ("B") REFERENCES "event_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
