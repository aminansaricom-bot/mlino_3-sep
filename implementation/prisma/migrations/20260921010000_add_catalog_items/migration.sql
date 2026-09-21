BEGIN;

-- Generated offline by Prisma 5.22.0 migrate diff; no datasource was contacted.
-- CreateEnum
CREATE TYPE "CatalogItemLifecycle" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "CatalogMediaType" AS ENUM ('AVIF', 'WEBP', 'JPEG', 'PNG');

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "item_key" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_description" TEXT,
    "price_amount" DECIMAL(12,2),
    "price_currency" VARCHAR(3),
    "on_request" BOOLEAN NOT NULL DEFAULT false,
    "grouping_label" VARCHAR(160),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "available_from" TIMESTAMPTZ(3),
    "available_until" TIMESTAMPTZ(3),
    "lifecycle_status" "CatalogItemLifecycle" NOT NULL DEFAULT 'DRAFT',
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "content_revision" INTEGER NOT NULL DEFAULT 1,
    "published_content_revision" INTEGER,
    "activated_at" TIMESTAMPTZ(3),
    "activated_by_membership_id" TEXT,
    "activated_by_organization_id" TEXT,
    "retired_at" TIMESTAMPTZ(3),
    "retired_by_membership_id" TEXT,
    "retired_by_organization_id" TEXT,
    "retirement_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_media" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "object_path" VARCHAR(255) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "media_type" "CatalogMediaType" NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "alt_text" VARCHAR(300) NOT NULL,
    "placeholder_kind" VARCHAR(80),
    "placeholder_value" VARCHAR(256),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalog_item_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_version_catalog_items" (
    "organization_id" TEXT NOT NULL,
    "offer_version_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,

    CONSTRAINT "offer_version_catalog_item_pk" PRIMARY KEY ("offer_version_id","catalog_item_id")
);

-- CreateIndex
CREATE INDEX "catalog_item_org_lifecycle_publication_order_idx" ON "catalog_items"("organization_id", "lifecycle_status", "publication_status", "display_order");

-- CreateIndex
CREATE INDEX "catalog_item_organization_availability_idx" ON "catalog_items"("organization_id", "available_from", "available_until");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_id_organization_unique" ON "catalog_items"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_organization_key_unique" ON "catalog_items"("organization_id", "item_key");

-- CreateIndex
CREATE INDEX "catalog_item_media_organization_item_idx" ON "catalog_item_media"("organization_id", "catalog_item_id");

-- CreateIndex
CREATE INDEX "catalog_item_media_organization_sha256_idx" ON "catalog_item_media"("organization_id", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_media_id_organization_unique" ON "catalog_item_media"("id", "organization_id");

-- CreateIndex
ALTER TABLE "catalog_item_media" ADD CONSTRAINT "catalog_item_media_item_position_unique" UNIQUE ("catalog_item_id", "position") DEFERRABLE INITIALLY IMMEDIATE;

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_media_item_sha256_unique" ON "catalog_item_media"("catalog_item_id", "sha256");

-- CreateIndex
CREATE INDEX "offer_version_catalog_item_reverse_idx" ON "offer_version_catalog_items"("catalog_item_id", "offer_version_id");

-- Row-local integrity. All cross-row limits are guarded under a parent lock below.
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_price_check CHECK (
  (on_request = true AND price_amount IS NULL AND price_currency IS NULL)
  OR (on_request = false AND price_amount IS NOT NULL AND price_amount >= 0 AND price_currency IS NOT NULL)
);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_currency_check CHECK (price_currency IS NULL OR price_currency ~ '^[A-Z]{3}$');
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_availability_check CHECK (available_from IS NULL OR available_until IS NULL OR available_until > available_from);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_display_order_check CHECK (display_order >= 0);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_content_revision_positive_check CHECK (content_revision >= 1);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_lifecycle_audit_check CHECK (
  (lifecycle_status = 'DRAFT' AND activated_at IS NULL AND activated_by_membership_id IS NULL AND activated_by_organization_id IS NULL AND retired_at IS NULL AND retired_by_membership_id IS NULL AND retired_by_organization_id IS NULL AND retirement_reason IS NULL)
  OR (lifecycle_status = 'ACTIVE' AND activated_at IS NOT NULL AND activated_by_membership_id IS NOT NULL AND activated_by_organization_id IS NOT NULL AND activated_by_organization_id = organization_id AND retired_at IS NULL AND retired_by_membership_id IS NULL AND retired_by_organization_id IS NULL AND retirement_reason IS NULL)
  OR (lifecycle_status = 'RETIRED' AND activated_at IS NOT NULL AND activated_by_membership_id IS NOT NULL AND activated_by_organization_id IS NOT NULL AND activated_by_organization_id = organization_id AND retired_at IS NOT NULL AND retired_by_membership_id IS NOT NULL AND retired_by_organization_id IS NOT NULL AND retired_by_organization_id = organization_id AND retirement_reason IS NOT NULL AND length(btrim(retirement_reason)) > 0)
);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_publication_projection_check CHECK (
  (publication_status = 'UNPUBLISHED' AND published_content_revision IS NULL)
  OR (publication_status IN ('PUBLISHED','WITHDRAWN') AND published_content_revision IS NOT NULL AND published_content_revision BETWEEN 1 AND content_revision)
);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_position_check CHECK (position BETWEEN 0 AND 7);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_byte_size_check CHECK (byte_size BETWEEN 1 AND 1500000);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_dimensions_check CHECK (
  width_px BETWEEN 320 AND 4096 AND height_px BETWEEN 320 AND 4096 AND width_px::bigint * height_px::bigint <= 16000000
);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_alt_text_check CHECK (length(btrim(alt_text)) BETWEEN 1 AND 300);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_path_check CHECK (
  object_path ~ '^media/sha256/[0-9a-f]{2}/[0-9a-f]{64}\.(avif|webp|jpg|png)$'
  AND substring(object_path from '^media/sha256/([0-9a-f]{2})/') = substring(sha256 from 1 for 2)
  AND substring(object_path from 'media/sha256/[0-9a-f]{2}/([0-9a-f]{64})\.') = sha256
  AND ((media_type = 'AVIF' AND object_path LIKE '%.avif') OR (media_type = 'WEBP' AND object_path LIKE '%.webp') OR (media_type = 'JPEG' AND object_path LIKE '%.jpg') OR (media_type = 'PNG' AND object_path LIKE '%.png'))
);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_placeholder_check CHECK (
  (placeholder_kind IS NULL AND placeholder_value IS NULL)
  OR (placeholder_kind = 'mlino.blurhash.v1' AND placeholder_value IS NOT NULL AND length(btrim(placeholder_value)) BETWEEN 1 AND 256)
);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_activation_actor_pair_check CHECK (
  (activated_by_membership_id IS NULL AND activated_by_organization_id IS NULL)
  OR (activated_by_membership_id IS NOT NULL AND activated_by_organization_id IS NOT NULL AND activated_by_organization_id = organization_id)
);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_retirement_actor_pair_check CHECK (
  (retired_by_membership_id IS NULL AND retired_by_organization_id IS NULL)
  OR (retired_by_membership_id IS NOT NULL AND retired_by_organization_id IS NOT NULL AND retired_by_organization_id = organization_id)
);

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_item_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_item_activated_by_membership_fk" FOREIGN KEY ("activated_by_membership_id", "activated_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_item_retired_by_membership_fk" FOREIGN KEY ("retired_by_membership_id", "retired_by_organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "catalog_item_media" ADD CONSTRAINT "catalog_item_media_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "catalog_item_media" ADD CONSTRAINT "catalog_item_media_catalog_item_fk" FOREIGN KEY ("catalog_item_id", "organization_id") REFERENCES "catalog_items"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_version_catalog_items" ADD CONSTRAINT "offer_version_catalog_item_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_version_catalog_items" ADD CONSTRAINT "offer_version_catalog_item_offer_version_fk" FOREIGN KEY ("offer_version_id", "organization_id") REFERENCES "offer_versions"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "offer_version_catalog_items" ADD CONSTRAINT "offer_version_catalog_item_catalog_item_fk" FOREIGN KEY ("catalog_item_id", "organization_id") REFERENCES "catalog_items"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AlterTable
ALTER TABLE "publications" ADD COLUMN     "catalog_item_id" TEXT,
ADD COLUMN     "catalog_item_organization_id" TEXT;

-- CreateIndex
CREATE INDEX "publication_catalog_item_time_idx" ON "publications"("organization_id", "catalog_item_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publication_catalog_item_fk" FOREIGN KEY ("catalog_item_id", "catalog_item_organization_id") REFERENCES "catalog_items"("id", "organization_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE publications ADD CONSTRAINT publication_catalog_item_pair_check CHECK (
  (catalog_item_id IS NULL AND catalog_item_organization_id IS NULL)
  OR (catalog_item_id IS NOT NULL AND catalog_item_organization_id IS NOT NULL AND catalog_item_organization_id = organization_id)
);
ALTER TABLE publications DROP CONSTRAINT publication_target_xor_check;
ALTER TABLE publications ADD CONSTRAINT publication_target_xor_check CHECK (
  num_nonnulls(business_profile_id, capability_id, offer_version_id, catalog_item_id) = 1
);
ALTER TABLE publications DROP CONSTRAINT publication_content_revision_check;
ALTER TABLE publications ADD CONSTRAINT publication_content_revision_check CHECK (
  ((business_profile_id IS NOT NULL OR capability_id IS NOT NULL OR catalog_item_id IS NOT NULL) AND content_revision IS NOT NULL AND content_revision >= 1)
  OR (offer_version_id IS NOT NULL AND content_revision IS NULL)
);

CREATE FUNCTION core_catalog_item_lifecycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_status <> 'DRAFT' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='catalog item must start DRAFT'; END IF;
  ELSIF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    IF NOT ((OLD.lifecycle_status = 'DRAFT' AND NEW.lifecycle_status = 'ACTIVE') OR (OLD.lifecycle_status = 'ACTIVE' AND NEW.lifecycle_status = 'RETIRED' AND OLD.publication_status <> 'PUBLISHED')) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='invalid catalog lifecycle transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER catalog_item_lifecycle_guard BEFORE INSERT OR UPDATE OF lifecycle_status ON catalog_items FOR EACH ROW EXECUTE FUNCTION core_catalog_item_lifecycle_guard();

CREATE TRIGGER catalog_item_publication_initial_guard BEFORE INSERT ON catalog_items FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER catalog_item_publication_projection_guard BEFORE UPDATE OF publication_status, published_content_revision ON catalog_items FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE FUNCTION core_bump_catalog_item_content_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origin text;
BEGIN
  IF ROW(NEW.name, NEW.short_description, NEW.price_amount, NEW.price_currency, NEW.on_request, NEW.grouping_label, NEW.display_order, NEW.available_from, NEW.available_until)
     IS DISTINCT FROM ROW(OLD.name, OLD.short_description, OLD.price_amount, OLD.price_currency, OLD.on_request, OLD.grouping_label, OLD.display_order, OLD.available_from, OLD.available_until) THEN
    NEW.content_revision := OLD.content_revision + 1;
  ELSIF NEW.content_revision IS DISTINCT FROM OLD.content_revision THEN
    origin := current_setting('mlino.catalog_revision_origin', true);
    IF NOT (pg_trigger_depth() > 1 AND origin IN ('catalog_item_media_revision_after_change', 'offer_version_catalog_item_revision_after_change') AND NEW.content_revision = OLD.content_revision + 1) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='content revision requires a public field change';
    END IF;
  END IF;
  IF NEW.item_key IS DISTINCT FROM OLD.item_key THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='catalog item key is immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER catalog_item_content_revision_before_update BEFORE UPDATE OF name, short_description, price_amount, price_currency, on_request, grouping_label, display_order, available_from, available_until, content_revision, item_key ON catalog_items FOR EACH ROW EXECUTE FUNCTION core_bump_catalog_item_content_revision();

CREATE FUNCTION core_catalog_item_media_budget() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bytes_used bigint; media_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.catalog_item_id, NEW.organization_id) IS DISTINCT FROM (OLD.catalog_item_id, OLD.organization_id) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='catalog media owner is immutable';
    END IF;
  END IF;
  PERFORM 1 FROM catalog_items WHERE id = NEW.catalog_item_id AND organization_id = NEW.organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='catalog item not found in organization'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(sum(byte_size),0), count(*) INTO bytes_used, media_count FROM catalog_item_media WHERE catalog_item_id = NEW.catalog_item_id;
  ELSE
    SELECT COALESCE(sum(byte_size),0), count(*) INTO bytes_used, media_count FROM catalog_item_media WHERE catalog_item_id = NEW.catalog_item_id AND id <> OLD.id;
  END IF;
  IF bytes_used + NEW.byte_size > 8000000 OR media_count + 1 > 8 THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='catalog item media budget exceeded';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER catalog_item_media_budget_before_change BEFORE INSERT OR UPDATE ON catalog_item_media FOR EACH ROW EXECUTE FUNCTION core_catalog_item_media_budget();

CREATE FUNCTION core_catalog_item_media_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.organization_id, NEW.catalog_item_id, NEW.object_path, NEW.sha256, NEW.media_type, NEW.byte_size, NEW.width_px, NEW.height_px, NEW.alt_text, NEW.placeholder_kind, NEW.placeholder_value)
      IS DISTINCT FROM ROW(OLD.organization_id, OLD.catalog_item_id, OLD.object_path, OLD.sha256, OLD.media_type, OLD.byte_size, OLD.width_px, OLD.height_px, OLD.alt_text, OLD.placeholder_kind, OLD.placeholder_value) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='catalog media content is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER catalog_item_media_immutability_before_update BEFORE UPDATE ON catalog_item_media FOR EACH ROW EXECUTE FUNCTION core_catalog_item_media_immutability();

CREATE FUNCTION core_catalog_item_media_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior text; item_id text; org_id text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.position IS NOT DISTINCT FROM OLD.position THEN RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    item_id := OLD.catalog_item_id;
    org_id := OLD.organization_id;
  ELSE
    item_id := NEW.catalog_item_id;
    org_id := NEW.organization_id;
  END IF;
  prior := current_setting('mlino.catalog_revision_origin', true);
  PERFORM set_config('mlino.catalog_revision_origin', 'catalog_item_media_revision_after_change', true);
  UPDATE catalog_items SET content_revision = content_revision + 1 WHERE id = item_id AND organization_id = org_id;
  PERFORM set_config('mlino.catalog_revision_origin', COALESCE(prior, ''), true);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER catalog_item_media_revision_after_change AFTER INSERT OR UPDATE OR DELETE ON catalog_item_media FOR EACH ROW EXECUTE FUNCTION core_catalog_item_media_revision();

CREATE FUNCTION core_offer_version_catalog_item_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id text; org_id text; item_id text; prior text;
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='offer version catalog links cannot be updated'; END IF;
  IF TG_OP = 'DELETE' THEN
    version_id := OLD.offer_version_id;
    org_id := OLD.organization_id;
    item_id := OLD.catalog_item_id;
  ELSE
    version_id := NEW.offer_version_id;
    org_id := NEW.organization_id;
    item_id := NEW.catalog_item_id;
  END IF;
  PERFORM 1 FROM offer_versions WHERE id = version_id AND organization_id = org_id AND published_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='published offer version catalog links are immutable'; END IF;
  IF TG_WHEN = 'AFTER' THEN
    prior := current_setting('mlino.catalog_revision_origin', true);
    PERFORM set_config('mlino.catalog_revision_origin', 'offer_version_catalog_item_revision_after_change', true);
    UPDATE catalog_items SET content_revision = content_revision + 1 WHERE id = item_id AND organization_id = org_id;
    PERFORM set_config('mlino.catalog_revision_origin', COALESCE(prior, ''), true);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER offer_version_catalog_item_guard_before_change BEFORE INSERT OR UPDATE OR DELETE ON offer_version_catalog_items FOR EACH ROW EXECUTE FUNCTION core_offer_version_catalog_item_link_guard();
CREATE TRIGGER offer_version_catalog_item_revision_after_change AFTER INSERT OR DELETE ON offer_version_catalog_items FOR EACH ROW EXECUTE FUNCTION core_offer_version_catalog_item_link_guard();

CREATE OR REPLACE FUNCTION core_apply_publication_projection() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE affected_rows integer;
BEGIN
  IF NEW.business_profile_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE business_profiles SET publication_status='PUBLISHED', published_content_revision=NEW.content_revision, updated_at=NEW.occurred_at
       WHERE id=NEW.business_profile_id AND organization_id=NEW.organization_id AND content_revision=NEW.content_revision
         AND (publication_status IN ('UNPUBLISHED','WITHDRAWN') OR (publication_status='PUBLISHED' AND NEW.content_revision>published_content_revision));
    ELSE
      UPDATE business_profiles SET publication_status='WITHDRAWN', updated_at=NEW.occurred_at
       WHERE id=NEW.business_profile_id AND organization_id=NEW.organization_id AND publication_status='PUBLISHED' AND published_content_revision=NEW.content_revision;
    END IF;
  ELSIF NEW.capability_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE capabilities SET publication_status='PUBLISHED', published_content_revision=NEW.content_revision, updated_at=NEW.occurred_at
       WHERE id=NEW.capability_id AND organization_id=NEW.organization_id AND content_revision=NEW.content_revision
         AND (publication_status IN ('UNPUBLISHED','WITHDRAWN') OR (publication_status='PUBLISHED' AND NEW.content_revision>published_content_revision));
    ELSE
      UPDATE capabilities SET publication_status='WITHDRAWN', updated_at=NEW.occurred_at
       WHERE id=NEW.capability_id AND organization_id=NEW.organization_id AND publication_status='PUBLISHED' AND published_content_revision=NEW.content_revision;
    END IF;
  ELSIF NEW.catalog_item_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE catalog_items SET publication_status='PUBLISHED', published_content_revision=NEW.content_revision, updated_at=NEW.occurred_at
       WHERE id=NEW.catalog_item_id AND organization_id=NEW.organization_id AND lifecycle_status='ACTIVE' AND content_revision=NEW.content_revision
         AND (publication_status IN ('UNPUBLISHED','WITHDRAWN') OR (publication_status='PUBLISHED' AND NEW.content_revision>published_content_revision));
    ELSE
      UPDATE catalog_items SET publication_status='WITHDRAWN', updated_at=NEW.occurred_at
       WHERE id=NEW.catalog_item_id AND organization_id=NEW.organization_id AND publication_status='PUBLISHED' AND published_content_revision=NEW.content_revision;
    END IF;
  ELSE
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE offer_versions SET publication_status='PUBLISHED', published_at=NEW.occurred_at
       WHERE id=NEW.offer_version_id AND organization_id=NEW.organization_id AND publication_status IN ('UNPUBLISHED','WITHDRAWN');
    ELSE
      UPDATE offer_versions SET publication_status='WITHDRAWN'
       WHERE id=NEW.offer_version_id AND organization_id=NEW.organization_id AND publication_status='PUBLISHED';
    END IF;
  END IF;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='invalid publication transition'; END IF;
  RETURN NEW;
END;
$$;

COMMIT;
