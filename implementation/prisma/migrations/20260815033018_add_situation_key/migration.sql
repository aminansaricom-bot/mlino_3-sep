-- AlterTable
ALTER TABLE "event_log" ADD COLUMN     "situation_key" TEXT;

-- CreateIndex
CREATE INDEX "event_log_organization_id_domain_tag_situation_key_idx" ON "event_log"("organization_id", "domain_tag", "situation_key");
