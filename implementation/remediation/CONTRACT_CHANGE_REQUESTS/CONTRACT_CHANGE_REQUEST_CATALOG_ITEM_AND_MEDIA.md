# CONTRACT_CHANGE_REQUEST — Catalog Item and Media

**وضعیت:** APPROVED

**تصمیم مالک (2026-09-21):** K-Q1=B، K-Q2=A، K-Q3=A، K-Q4=B؛ ثبت‌شده در `2786dfb9d169d50e41687d5a09a80e3beb697547:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_K2_CCR_AND_K3.md`.

**Instruction ID:** `CODEX-20260921-K2-CATALOG-CCR-001`

**Target Handoff:** `HANDOFF-20260921-OWNER-APPROVAL-K2`

**مبنای تصمیم:** `290eb35423e0658ff760b734ef04b8f82ec0b0a3:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_KD_DECISIONS_AND_K2.md`

**طرح مبنا:** `f02436f9ac0c48e6df42cf879b5d187ab7d31efc:mlino2/MLINO_CATALOG_MEDIA_DESIGN.md`

> این سند فقط diff proposal است. هیچ بخش آن schema، migration، service، exporter، V2 یا دیتابیس را تغییر نمی‌دهد. پیاده‌سازی هر slice به بازبینی Guardian و تصویب مستقل مالک نیاز دارد.

## 1. مسئله و تصمیم‌های مصوب

مالک K-D1 تا K-D14 و K-N1 را تصویب کرده است: CatalogItem یک entity عمومی Core است؛ lifecycle آن DRAFT → ACTIVE → RETIRED و publication status جداست؛ media در جدول مرتب جدا قرار می‌گیرد؛ OfferVersion می‌تواند پیش از نخستین انتشار به itemها متصل شود؛ خروجی یک artifact دوم با contract `mlino.v2.public-catalog.v1` است؛ media فقط AVIF/WebP/JPEG/PNG است؛ limits، private-original/public-derivative، retention، offline cache، permission مستقل، alt text و business-snapshot binding مطابق رکورد تصویب مالک الزامی‌اند.

Core فعلی Capability را organization-scoped و با composite uniqueness/FK نگه می‌دارد (`origin/main:implementation/prisma/schema.prisma:496-527`). OfferVersion نیز organization را در relationها حمل می‌کند و link table موجود از composite tenant FK استفاده می‌کند (`origin/main:implementation/prisma/schema.prisma:547-590`). Publication فعلی فقط BusinessProfile، Capability و OfferVersion را هدف می‌گیرد (`origin/main:implementation/prisma/schema.prisma:626-654`) و service فقط همین سه target را قبول می‌کند (`origin/main:implementation/core/publication-service.ts:85-95`). K2 تغییر دقیق لازم برای target چهارم را freeze می‌کند.

## 2. C1 — مدل فیزیکی پیشنهادی

### 2.1 قرارداد نام‌گذاری و FK

مدل‌ها PascalCase، fieldها camelCase با `@map` و جدول/ستون‌ها snake_case هستند. تمام FKها `ON DELETE RESTRICT ON UPDATE RESTRICT` خواهند بود. هر entity tenant-owned دارای `organization_id` و `@@unique([id, organizationId])` است و هر relation درون tenant زوج `(id, organization_id)` را reference می‌کند. این همان pattern فعلی Capability، OfferVersion و OfferVersionCapability است (`origin/main:implementation/prisma/schema.prisma:516-526,565-590`).

### 2.2 Prisma diff proposal دقیق

بلوک زیر پیشنهاد است و نباید در K2 به `schema.prisma` افزوده شود.

```prisma
// BEGIN CCR_CATALOG_ENUMS
enum CatalogItemLifecycle {
  DRAFT
  ACTIVE
  RETIRED
}

enum CatalogMediaType {
  AVIF
  WEBP
  JPEG
  PNG
}
// END CCR_CATALOG_ENUMS

// BEGIN CCR_CATALOG_MODELS
model CatalogItem {
  id                         String               @id @default(uuid()) @db.Text
  organizationId             String               @map("organization_id") @db.Text
  itemKey                    String               @map("item_key") @db.VarChar(160)
  name                       String               @db.VarChar(200)
  shortDescription           String?              @map("short_description") @db.Text
  priceAmount                Decimal?             @map("price_amount") @db.Decimal(12, 2)
  priceCurrency              String?              @map("price_currency") @db.VarChar(3)
  onRequest                  Boolean              @default(false) @map("on_request")
  groupingLabel              String?              @map("grouping_label") @db.VarChar(160)
  displayOrder               Int                  @default(0) @map("display_order")
  availableFrom              DateTime?            @map("available_from") @db.Timestamptz(3)
  availableUntil             DateTime?            @map("available_until") @db.Timestamptz(3)
  lifecycleStatus            CatalogItemLifecycle @default(DRAFT) @map("lifecycle_status")
  publicationStatus          PublicationStatus    @default(UNPUBLISHED) @map("publication_status")
  contentRevision            Int                  @default(1) @map("content_revision")
  publishedContentRevision   Int?                 @map("published_content_revision")
  activatedAt                DateTime?            @map("activated_at") @db.Timestamptz(3)
  activatedByMembershipId    String?              @map("activated_by_membership_id") @db.Text
  activatedByOrganizationId  String?              @map("activated_by_organization_id") @db.Text
  retiredAt                  DateTime?            @map("retired_at") @db.Timestamptz(3)
  retiredByMembershipId      String?              @map("retired_by_membership_id") @db.Text
  retiredByOrganizationId    String?              @map("retired_by_organization_id") @db.Text
  retirementReason           String?              @map("retirement_reason") @db.Text
  createdAt                  DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt                  DateTime             @updatedAt @map("updated_at") @db.Timestamptz(3)

  organization          Organization              @relation("OrganizationCatalogItems", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "catalog_item_organization_fk")
  activatedByMembership Membership?               @relation("CatalogItemActivatedByMembership", fields: [activatedByMembershipId, activatedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "catalog_item_activated_by_membership_fk")
  retiredByMembership   Membership?               @relation("CatalogItemRetiredByMembership", fields: [retiredByMembershipId, retiredByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "catalog_item_retired_by_membership_fk")
  media                 CatalogItemMedia[]        @relation("CatalogItemMedia")
  offerVersionLinks     OfferVersionCatalogItem[] @relation("CatalogItemOfferVersionLinks")
  publicationEvents     Publication[]             @relation("PublicationCatalogItem")

  @@unique([id, organizationId], map: "catalog_item_id_organization_unique")
  @@unique([organizationId, itemKey], map: "catalog_item_organization_key_unique")
  @@index([organizationId, lifecycleStatus, publicationStatus, displayOrder], map: "catalog_item_org_lifecycle_publication_order_idx")
  @@index([organizationId, availableFrom, availableUntil], map: "catalog_item_organization_availability_idx")
  @@map("catalog_items")
}

model CatalogItemMedia {
  id             String           @id @default(uuid()) @db.Text
  organizationId String           @map("organization_id") @db.Text
  catalogItemId  String           @map("catalog_item_id") @db.Text
  position       Int
  objectPath     String           @map("object_path") @db.VarChar(255)
  sha256         String           @db.VarChar(64)
  mediaType      CatalogMediaType @map("media_type")
  byteSize       Int              @map("byte_size")
  widthPx        Int              @map("width_px")
  heightPx       Int              @map("height_px")
  altText        String           @map("alt_text") @db.VarChar(300)
  placeholderKind  String?        @map("placeholder_kind") @db.VarChar(80)
  placeholderValue String?        @map("placeholder_value") @db.VarChar(256)
  createdAt      DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime         @updatedAt @map("updated_at") @db.Timestamptz(3)

  organization Organization @relation("OrganizationCatalogItemMedia", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "catalog_item_media_organization_fk")
  catalogItem  CatalogItem  @relation("CatalogItemMedia", fields: [catalogItemId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "catalog_item_media_catalog_item_fk")

  @@unique([id, organizationId], map: "catalog_item_media_id_organization_unique")
  @@unique([catalogItemId, position], map: "catalog_item_media_item_position_unique")
  @@unique([catalogItemId, sha256], map: "catalog_item_media_item_sha256_unique")
  @@index([organizationId, catalogItemId], map: "catalog_item_media_organization_item_idx")
  @@index([organizationId, sha256], map: "catalog_item_media_organization_sha256_idx")
  @@map("catalog_item_media")
}

model OfferVersionCatalogItem {
  organizationId String @map("organization_id") @db.Text
  offerVersionId String @map("offer_version_id") @db.Text
  catalogItemId  String @map("catalog_item_id") @db.Text

  organization Organization @relation("OrganizationOfferCatalogLinks", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_catalog_item_organization_fk")
  offerVersion OfferVersion @relation("OfferVersionCatalogItemLinks", fields: [offerVersionId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_catalog_item_offer_version_fk")
  catalogItem  CatalogItem  @relation("CatalogItemOfferVersionLinks", fields: [catalogItemId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_catalog_item_catalog_item_fk")

  @@id([offerVersionId, catalogItemId], map: "offer_version_catalog_item_pk")
  @@index([catalogItemId, offerVersionId], map: "offer_version_catalog_item_reverse_idx")
  @@map("offer_version_catalog_items")
}
// END CCR_CATALOG_MODELS
```

### 2.3 Diffهای relation روی مدل‌های موجود

```prisma
// Organization additions
catalogItems       CatalogItem[]             @relation("OrganizationCatalogItems")
catalogItemMedia   CatalogItemMedia[]        @relation("OrganizationCatalogItemMedia")
offerCatalogLinks  OfferVersionCatalogItem[] @relation("OrganizationOfferCatalogLinks")

// Membership additions
activatedCatalogItems CatalogItem[] @relation("CatalogItemActivatedByMembership")
retiredCatalogItems   CatalogItem[] @relation("CatalogItemRetiredByMembership")

// OfferVersion addition
catalogItemLinks OfferVersionCatalogItem[] @relation("OfferVersionCatalogItemLinks")

// Publication additions
catalogItemId                 String? @map("catalog_item_id") @db.Text
catalogItemOrganizationId     String? @map("catalog_item_organization_id") @db.Text
catalogItem CatalogItem? @relation("PublicationCatalogItem", fields: [catalogItemId, catalogItemOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "publication_catalog_item_fk")
@@index([organizationId, catalogItemId, occurredAt], map: "publication_catalog_item_time_idx")
```

`Organization` فعلی relationهای tenant-owned را در یک aggregate نگه می‌دارد (`origin/main:implementation/prisma/schema.prisma:327-350`) و `Membership` relationهای audit actor را نام‌گذاری می‌کند (`origin/main:implementation/prisma/schema.prisma:406-434`). relationهای پیشنهادی همان الگو را ادامه می‌دهند.

## 3. C2 — Constraints و triggerها

### 3.1 CHECKهای row-local

```sql
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_price_check CHECK (
  (on_request = true AND price_amount IS NULL AND price_currency IS NULL)
  OR
  (on_request = false AND price_amount IS NOT NULL AND price_amount >= 0 AND price_currency IS NOT NULL)
);

ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_currency_check CHECK (
  price_currency IS NULL OR price_currency ~ '^[A-Z]{3}$'
);

ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_availability_check CHECK (
  available_until IS NULL OR available_from IS NULL OR available_until > available_from
);

ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_display_order_check CHECK (display_order >= 0);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_content_revision_positive_check CHECK (content_revision >= 1);

ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_position_check CHECK (position BETWEEN 0 AND 7);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_byte_size_check CHECK (byte_size BETWEEN 1 AND 1500000);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_dimensions_check CHECK (
  width_px BETWEEN 320 AND 4096
  AND height_px BETWEEN 320 AND 4096
  AND width_px::bigint * height_px::bigint <= 16000000
);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_alt_text_check CHECK (length(btrim(alt_text)) BETWEEN 1 AND 300);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_path_check CHECK (
  object_path ~ '^media/sha256/[0-9a-f]{2}/[0-9a-f]{64}\.(avif|webp|jpg|png)$'
  AND substring(object_path from '^media/sha256/([0-9a-f]{2})/') = substring(sha256 from 1 for 2)
  AND substring(object_path from 'media/sha256/[0-9a-f]{2}/([0-9a-f]{64})\.') = sha256
  AND (
    (media_type = 'AVIF' AND object_path LIKE '%.avif')
    OR (media_type = 'WEBP' AND object_path LIKE '%.webp')
    OR (media_type = 'JPEG' AND object_path LIKE '%.jpg')
    OR (media_type = 'PNG' AND object_path LIKE '%.png')
  )
);
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_placeholder_check CHECK (
  (placeholder_kind IS NULL AND placeholder_value IS NULL)
  OR (placeholder_kind IS NOT NULL AND placeholder_value IS NOT NULL AND length(btrim(placeholder_value)) BETWEEN 1 AND 256)
);
```

Price mode عمداً همان منطق `offer_version_price_check` است (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:690-694`). `position BETWEEN 0 AND 7` همراه unique `(catalog_item_id, position)` بیش از ۸ تصویر را ناممکن می‌کند. مجموع `byte_size` نیز با قفل parent و trigger قبل از INSERT/UPDATE بررسی می‌شود؛ یک writer دیگر نمی‌تواند بودجهٔ همان item را هم‌زمان دور بزند. service باید همان parent را پیش از media mutation قفل کند و این trigger دفاع لایهٔ دوم است.

```sql
-- Replace Prisma's immediate unique with the same mapped name and deferred checking for one-statement reorder.
ALTER TABLE catalog_item_media DROP CONSTRAINT catalog_item_media_item_position_unique;
ALTER TABLE catalog_item_media ADD CONSTRAINT catalog_item_media_item_position_unique
  UNIQUE (catalog_item_id, position) DEFERRABLE INITIALLY IMMEDIATE;

CREATE FUNCTION core_enforce_catalog_item_media_budget() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  total_bytes bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND
     (NEW.catalog_item_id, NEW.organization_id) IS DISTINCT FROM
     (OLD.catalog_item_id, OLD.organization_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'catalog media owner is immutable';
  END IF;
  PERFORM 1 FROM catalog_items
   WHERE id = NEW.catalog_item_id AND organization_id = NEW.organization_id
   FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(sum(byte_size), 0) INTO total_bytes
      FROM catalog_item_media
     WHERE catalog_item_id = NEW.catalog_item_id AND organization_id = NEW.organization_id;
  ELSE
    SELECT COALESCE(sum(byte_size), 0) INTO total_bytes
      FROM catalog_item_media
     WHERE catalog_item_id = NEW.catalog_item_id AND organization_id = NEW.organization_id
       AND id <> OLD.id;
  END IF;
  IF total_bytes + NEW.byte_size > 8000000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'catalog item media byte budget exceeded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER catalog_item_media_budget_before_change
BEFORE INSERT OR UPDATE ON catalog_item_media
FOR EACH ROW EXECUTE FUNCTION core_enforce_catalog_item_media_budget();
```

Database می‌تواند declared metadata، ordering، caps و path/hash spelling را enforce کند؛ service باید bytes واقعی را برای SHA-256، magic bytes، decoded dimensions، animated-content rejection و aspect-ratio warning بررسی کند. Database به فایل private/public دسترسی ندارد و نباید آن را بخواند.

### 3.2 lifecycle audit

```sql
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_lifecycle_audit_check CHECK (
  (lifecycle_status = 'DRAFT'
    AND activated_at IS NULL AND activated_by_membership_id IS NULL AND activated_by_organization_id IS NULL
    AND retired_at IS NULL AND retired_by_membership_id IS NULL AND retired_by_organization_id IS NULL
    AND retirement_reason IS NULL)
  OR
  (lifecycle_status = 'ACTIVE'
    AND activated_at IS NOT NULL AND activated_by_membership_id IS NOT NULL
    AND activated_by_organization_id = organization_id
    AND retired_at IS NULL AND retired_by_membership_id IS NULL AND retired_by_organization_id IS NULL
    AND retirement_reason IS NULL)
  OR
  (lifecycle_status = 'RETIRED'
    AND activated_at IS NOT NULL AND activated_by_membership_id IS NOT NULL
    AND activated_by_organization_id = organization_id
    AND retired_at IS NOT NULL AND retired_by_membership_id IS NOT NULL
    AND retired_by_organization_id = organization_id
    AND length(btrim(retirement_reason)) > 0)
);
```

این شکل از الگوی audit completeness موجود برای Organization و Membership پیروی می‌کند (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:595-607,632-656`). Service فقط DRAFT→ACTIVE و ACTIVE→RETIRED را مجاز می‌کند. retire وقتی publication status هنوز PUBLISHED است رد می‌شود.

### 3.3 publication target چهارم — K-W2

قید فعلی دقیقاً `num_nonnulls(business_profile_id, capability_id, offer_version_id) = 1` است (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:586-593`). migration پیشنهادی در یک transaction:

```sql
ALTER TABLE publications
  ADD COLUMN catalog_item_id TEXT,
  ADD COLUMN catalog_item_organization_id TEXT;

ALTER TABLE publications ADD CONSTRAINT publication_catalog_item_pair_check CHECK (
  (catalog_item_id IS NULL AND catalog_item_organization_id IS NULL)
  OR (catalog_item_id IS NOT NULL
      AND catalog_item_organization_id IS NOT NULL
      AND catalog_item_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_catalog_item_fk
  FOREIGN KEY (catalog_item_id, catalog_item_organization_id)
  REFERENCES catalog_items(id, organization_id)
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE publications DROP CONSTRAINT publication_target_xor_check;
ALTER TABLE publications ADD CONSTRAINT publication_target_xor_check CHECK (
  num_nonnulls(business_profile_id, capability_id, offer_version_id, catalog_item_id) = 1
);
```

نام constraint حفظ می‌شود و معنی آن همچنان «دقیقاً یک target» است؛ فقط مجموعهٔ targetها چهارعضوی می‌شود. pair check تضمین می‌کند target چهارم متعلق به organization همان Publication است.

قید content revision فعلی Profile/Capability را revisioned و OfferVersion را بدون revision می‌داند (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:726-732`). آن قید باید با همین نام بازنویسی شود:

```sql
ALTER TABLE publications DROP CONSTRAINT publication_content_revision_check;
ALTER TABLE publications ADD CONSTRAINT publication_content_revision_check CHECK (
  ((business_profile_id IS NOT NULL OR capability_id IS NOT NULL OR catalog_item_id IS NOT NULL)
    AND content_revision IS NOT NULL AND content_revision >= 1)
  OR
  (offer_version_id IS NOT NULL AND content_revision IS NULL)
);
```

قید `publication_published_content_event_kind_check` بدون تغییر باقی می‌ماند؛ PUBLISHED باید object دارای `snapshot_version` و `content` و WITHDRAWN باید SQL NULL باشد (`origin/main:implementation/prisma/migrations/20260914010000_add_publication_published_content/migration.sql:15-33`).

### 3.4 projection، revision و link immutability

Migration باید موارد زیر را با نام‌های ثابت اضافه کند:

- `catalog_item_publication_projection_check`: UNPUBLISHED با published revision تهی؛ PUBLISHED/WITHDRAWN با revision بین 1 و content revision، همان الگوی Profile/Capability.
- `catalog_item_publication_initial_guard` و `catalog_item_publication_projection_guard`: direct projection write را با `core_require_nested_publication_projection()` رد کنند. closed writer فعلی فقط trigger Publication است (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:892-929`).
- branch صریح `ELSIF NEW.catalog_item_id IS NOT NULL` در `core_apply_publication_projection()`: publish فقط ACTIVE item را در revision دقیق به PUBLISHED ببرد؛ withdraw فقط revision منتشرشده را به WITHDRAWN ببرد. function فعلی affected-row را دقیقاً 1 می‌خواهد و در غیر این صورت `invalid publication transition` می‌دهد (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:931-1009`).
- `catalog_item_content_revision_before_update`: تغییر واقعی name، short_description، price fields، on_request، grouping_label، display_order یا availability، revision را یک واحد بالا ببرد؛ تغییر مستقیم revision را رد کند. این رفتار الگوی D6 موجود است (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:846-890`). `item_key` پس از create immutable است.
- `catalog_item_media_revision_after_change`: بعد از هر INSERT/UPDATE/DELETE واقعی، parent را قفل و `content_revision` را یک واحد بالا ببرد. اگر UPDATE فقط مقدارهای برابر بنویسد، bump نکند. Service باید reorder را در یک transaction انجام دهد؛ جابه‌جایی چند row ممکن است revision را چند واحد بالا ببرد و این مجاز است، چون revision فقط باید افزایشی و بازتاب‌دهندهٔ تمام تغییرها باشد.
- `offer_version_catalog_item_immutable_before_change`: UPDATE link را رد کند؛ INSERT/DELETE parent OfferVersion را `FOR UPDATE` قفل کند و اگر `published_at IS NOT NULL` باشد تغییر را رد کند. این همان «فقط پیش از نخستین انتشار» است و از الگوی link فعلی پیروی می‌کند (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:791-826`). هر link mutation، CatalogItem مربوط را نیز revision-bump می‌کند.

Unique position باید در SQL به `DEFERRABLE INITIALLY IMMEDIATE` تبدیل شود تا reorder transaction بتواند `SET CONSTRAINTS catalog_item_media_item_position_unique DEFERRED` و یک UPDATE نهایی انجام دهد. نام constraint با `@@unique(..., map:)` یکسان می‌ماند؛ drift behavior آن باید در migration-stability test بررسی شود.

قید projection دقیق:

```sql
ALTER TABLE catalog_items ADD CONSTRAINT catalog_item_publication_projection_check CHECK (
  (publication_status = 'UNPUBLISHED' AND published_content_revision IS NULL)
  OR
  (publication_status IN ('PUBLISHED', 'WITHDRAWN')
    AND published_content_revision BETWEEN 1 AND content_revision)
);
```

`core_enforce_catalog_item_media_immutability` هر UPDATE غیر از `position` را رد می‌کند؛ تغییر bytes/metadata با remove+add انجام می‌شود. `core_bump_catalog_item_content_revision` تغییر public field را مانند D6 فعلی یک واحد بالا می‌برد و revision-only update مستقیم را رد می‌کند، مگر nested update از trigger مشخص media/link با `pg_trigger_depth() > 1` و دقیقاً `NEW.content_revision = OLD.content_revision + 1`. این استثنا باید به triggerهای نام‌برده محدود و در DB validation آزموده شود؛ تنها depth بدون provenance کافی نیست. هر media/link row mutation یک تغییر عمومی مستقل است و revision را بالا می‌برد.

## 4. C3 — Serviceها و Permission

### 4.1 `CatalogItemService`

سطح پیشنهادی:

```ts
create(context, { organizationId, itemKey, name, shortDescription?, priceAmount?, priceCurrency?, onRequest,
  groupingLabel?, displayOrder?, availableFrom?, availableUntil? })
updatePublicFields(context, catalogItemId, { name?, shortDescription?, priceAmount?, priceCurrency?, onRequest?,
  groupingLabel?, displayOrder?, availableFrom?, availableUntil? })
activate(context, catalogItemId)
retire(context, catalogItemId, reason)
addMedia(context, catalogItemId, mediaInput)
reorderMedia(context, catalogItemId, orderedMediaIds)
removeMedia(context, catalogItemId, mediaId)
```

تمام methodها ابتدا AuthContext و input type/allowlist را پیش از DB validate می‌کنند، سپس organization را قفل و permission را بررسی می‌کنند. الگوی فعلی Capability همین ترتیب و explicit allowlist را اجرا می‌کند (`origin/main:implementation/core/capability-service.ts:27-70`). `organizationId` فقط scalar مستقیم از context است؛ cross-org ID نتیجهٔ یکسان `VALIDATION_FAILED`/`TENANT_MISMATCH` مطابق قرارداد Core می‌دهد.

- create/update/activate/retire/media mutations: `catalog_item.manage`.
- publish/withdraw: permission موجود `publication.manage`؛ PublicationService اکنون grant فعال همین permission را می‌خواهد (`origin/main:implementation/core/publication-service.ts:30-39`).
- `OfferService.linkCatalogItem` و `unlinkCatalogItem`: `offer.manage`، با lock order Organization → Offer → OfferVersion → CatalogItem؛ فقط قبل از نخستین publication OfferVersion.

### 4.2 Registry و K-W3

`catalog_item.manage` به `CORE_PERMISSION_KEYS` در `implementation/core/permission-registry.ts` افزوده می‌شود. Registry فعلی یک readonly tuple است و validation را با `includes` انجام می‌دهد (`origin/main:implementation/core/permission-registry.ts:1-9`). Bootstrap فقط با `for ... of` روی تمام کلیدها founding grant می‌سازد (`origin/main:implementation/core/bootstrap-service.ts:7,25-42`). PermissionGrantService فقط membership را با `isCorePermissionKey` بررسی می‌کند (`origin/main:implementation/core/permission-grant-service.ts:6,12-24`).

بررسی repo-wide انجام شد:

```text
git grep -n 'CORE_PERMISSION_KEYS\|CorePermissionKey' origin/main -- implementation
git grep -n 'CORE_PERMISSION_KEYS\.length\|CORE_PERMISSION_KEYS\[\|sort.*CORE_PERMISSION_KEYS\|indexOf.*CORE_PERMISSION_KEYS' origin/main -- implementation
git grep -n 'CORE_PERMISSION_KEYS' origin/main -- implementation/test
```

نتیجه: مصرف‌های اجرایی فقط registry، bootstrap iteration و membership validation بالا بودند؛ هیچ match برای length، index، sort یا test-order dependency وجود نداشت. افزودن کلید، ترتیب یا معنای کلیدهای قبلی را تغییر نمی‌دهد، ولی bootstrap سازمان‌های جدید از آن پس founding grant تازه را نیز صادر می‌کند.

## 5. C4 — Publication snapshot

PublicationService فعلی target را `FOR UPDATE` قفل می‌کند و snapshot allowlist‌شده را در همان transaction داخل `published_content` می‌نویسد (`origin/main:implementation/core/publication-service.ts:30-54,89-138`). Catalog target نیز باید همان رفتار را داشته باشد و هیچ spread از row یا live-row read در exporter مجاز نیست.

snapshot پیشنهادی، با media مرتب‌شده بر اساس position و linkها مرتب‌شده بر اساس ID:

```json
{
  "snapshot_version": "core-publication-snapshot-v1",
  "content": {
    "item_key": "stable-key",
    "name": "display name",
    "short_description": null,
    "price_amount": "120000.00",
    "price_currency": "IRR",
    "on_request": false,
    "grouping_label": "section",
    "display_order": 10,
    "available_from": null,
    "available_until": null,
    "offer_version_link_ids": ["uuid"],
    "media": [
      {
        "position": 0,
        "path": "media/sha256/aa/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp",
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "media_type": "image/webp",
        "byte_size": 120000,
        "width": 1200,
        "height": 900,
        "alt_text": "متن جایگزین",
        "placeholder": null
      }
    ]
  }
}
```

`media_type` در snapshot از enum DB به MIME canonical نگاشت می‌شود. `placeholder` یا null است یا `{ "schema_version": string, "value": string }`. PUBLISHED snapshot ثابت می‌ماند؛ edit item/media/link فقط content revision جاری را بالا می‌برد و تا republish در خروجی عمومی دیده نمی‌شود. Exporter Catalog فقط آخرین Publication معتبر را می‌خواند و content fields را صرفاً از `published_content.content` می‌گیرد. eligibility زنده فقط می‌تواند content را مخفی کند، نه field تازه بیفزاید؛ builder موجود نیز content و eligibility را جدا نگه می‌دارد (`origin/main:implementation/public-export/builder.ts:157-180,191-218`).

## 6. C5 — schema کامل Public Catalog artifact

### 6.1 Envelope و record

```ts
type PublicCatalogExportV1 = {
  contract_version: 'mlino.v2.public-catalog.v1';
  generated_at: string; // canonical UTC ISO-8601 milliseconds
  snapshot_id: string;  // sha256 of canonical {contract_version, records}
  signature: { algorithm: 'Ed25519'; key_id: string; value: string };
  records: PublicCatalogRecordV1[];
};

type PublicCatalogRecordV1 = {
  organization_id: string;
  business_snapshot_id: string;
  business_publication_id: string;
  items: Array<{
    catalog_item_id: string;
    item_key: string;
    name: string;
    short_description: string | null;
    price_amount: string | null;
    price_currency: string | null;
    on_request: boolean;
    grouping_label: string | null;
    display_order: number;
    available_from: string | null;
    available_until: string | null;
    offer_version_links: string[];
    media: Array<{
      position: number;
      path: string;
      sha256: string;
      media_type: 'image/avif' | 'image/webp' | 'image/jpeg' | 'image/png';
      byte_size: number;
      width: number;
      height: number;
      alt_text: string;
      placeholder: null | { schema_version: string; value: string };
    }>;
    published_at: string;
    publication_id: string;
    source_revision: number;
  }>;
};
```

هر record به organization خود محدود است. `business_snapshot_id` باید دقیقاً snapshot_id artifact پذیرفته‌شدهٔ `public-business.v1` باشد و `business_publication_id` باید publication ID همان organization در آن snapshot باشد. mismatch هرکدام فقط Catalog همان organization را پنهان می‌کند؛ business record همچنان نمایش داده می‌شود. itemها با `display_order`, سپس `item_key`, سپس `catalog_item_id` و media با `position`, سپس `sha256` مرتب می‌شوند.

### 6.2 Canonical JSON و امضا

قواعد canonical باید همان implementation موجود باشد: stringها NFC، keyها با Unicode scalar order، number محدود به safe integer یا حداکثر ۶ رقم اعشار، `-0` برابر 0، undefined/NaN/Infinity ممنوع (`origin/main:implementation/public-export/canonical.ts:3-49`). `snapshot_id` نیز hash canonical `{contract_version, records}` است (`origin/main:implementation/public-export/canonical.ts:52-54`).

**سؤال باز K-Q1:** domain separator موجود `MLINO-PUBLIC-BUSINESS-V1\n` است (`origin/main:implementation/public-export/signing.ts:4-21`). توصیهٔ این CCR، separator مستقل `MLINO-PUBLIC-CATALOG-V1\n` است تا signature یک protocol به protocol دیگر قابل replay نباشد. این انتخاب به تصویب مالک نیاز دارد و باید با test fixture مشترک producer/consumer freeze شود.

### 6.3 بودجهٔ اندازه

Distribution فعلی artifact را در 2,000,000 bytes cap می‌کند (`origin/main:implementation/public-export/distribution/distribute.ts:7-9,80-100`). `public-catalog.v1.json` نیز همین hard cap را دارد. bytes تصویر بیرون artifact است؛ فقط metadata داخل artifact می‌آید. Producer پیش از sign و distributor پیش از replace اندازهٔ canonical bytes را بررسی می‌کنند. overflow باید build/distribution را fail کند و artifact قبلی را نگه دارد؛ truncation یا pagination ضمنی ممنوع است. sharding فقط در contract version آینده مجاز است.

## 7. C6 — Migration، rollback و K-W1

### 7.1 ترتیب forward migration

یک migration تازه و مستقل، در یک transaction، به این ترتیب:

1. create enumهای `CatalogItemLifecycle` و `CatalogMediaType`.
2. create `catalog_items`.
3. create `catalog_item_media`.
4. create `offer_version_catalog_items`.
5. create unique/indexها و تمام CHECKهای row-local.
6. add FKهای organization-scoped با RESTRICT.
7. add دو ستون Catalog target به `publications`، pair check، composite FK و time index.
8. drop/recreate همان `publication_target_xor_check` با چهار target و همان معنی «دقیقاً یکی».
9. drop/recreate `publication_content_revision_check` با CatalogItem به‌عنوان target revisioned.
10. add lifecycle audit، total media bytes، content revision، media revision، link immutability و projection guard triggerها.
11. `CREATE OR REPLACE FUNCTION core_apply_publication_projection()` با branch صریح CatalogItem؛ سپس trigger موجود بدون تغییر نام همان function را صدا می‌زند.
12. validate schema drift، نام constraintها و trigger allowlist؛ سپس Prisma Client فقط در مرحلهٔ implementation تولید شود.

Migration برای ردیف‌های موجود backfill ندارد: جدول‌های تازه خالی‌اند، ستون‌های target تازه nullable هستند و سه target قبلی معنای خود را حفظ می‌کنند. بازنویسی XOR در همان transaction انجام می‌شود، پس state میانی برای transaction دیگر قابل مشاهده نیست.

### 7.2 rollback

Prisma down migration ندارد؛ rollback یک **forward migration تازه** است. ابتدا hard preflight باید ثابت کند:

- هیچ CatalogItem، media یا OfferVersionCatalogItem وجود ندارد؛
- هیچ Publication با `catalog_item_id` وجود ندارد؛
- permission grant فعال یا تاریخی با `catalog_item.manage` وجود ندارد.

اگر هرکدام وجود داشت، rollback destructive ممنوع و فقط roll-forward مجاز است. اگر همه صفر بودند، forward rollback به ترتیب trigger/functionهای Catalog، publication FK/index/pair، XOR چهارهدفه، Catalog columns، XOR سه‌هدفه، content-revision constraint قبلی، link/media/item tableها و enumها را حذف/بازمی‌گرداند. registry/code نیز در commit جدا revert می‌شود. `_prisma_migrations` تاریخ اعمال و rollback-forward را حفظ می‌کند؛ row قبلی پاک یا rewrite نمی‌شود.

### 7.3 K-W1 — توقف rebuild

پس از merge شدن migration اجرایی، `docker compose up --build` می‌تواند migration تازه را بدون backup روی دیتابیس محلی اعمال کند. بنابراین از لحظهٔ merge migration تا پایان local apply کنترل‌شده با backup verified، هر container rebuild/restart که migrate را اجرا کند **ممنوع و hard stop** است. K2 migrationی ایجاد نمی‌کند؛ K3/K4 باید این guard را در Handoff و runbook تکرار کنند.

## 8. C7 — Rollout بدون شکست build قدیمی

1. **K2:** این CCR review و توسط مالک APPROVED شود.
2. **K3 Core:** schema/migration/service/publication target در branch جدا ساخته و فقط روی PostgreSQL disposable آزموده شود.
3. **Controlled local apply:** پس از merge migration، backup verified، migrate status با دقیقاً یک pending و deploy یک‌باره؛ تا آن زمان rebuild ممنوع.
4. **K4 export/distribution:** producer `public-business.v1` و `public-catalog.v1` را از asOf سازگار بسازد؛ media bytes ابتدا verify و publish شوند، سپس business artifact bound، و **catalog artifact آخر** با rename اتمیک منتشر شود.
5. **Host routes:** route catalog و media پیش از فایل‌ها deploy شوند و نبود فایل 404 واقعی بدهد.
6. **K5 consumer/AR:** consumer جدید artifact دوم را strict verify کند؛ 404 یعنی Catalog خالی. mismatch business snapshot/publication فقط Catalog همان organization را مخفی کند.
7. **Feature enable:** پس از smoke test signature/hash/404/cache، cards و AR stack فعال شوند.
8. **K6 sample data:** itemها و mediaهای deterministic آزمایشی از service رسمی ساخته و با withdraw/retire جمع شوند.

Build قدیمی فقط `public-business.v1.json` را می‌شناسد. چون آن contract هیچ field تازه‌ای نمی‌گیرد و artifact دوم route جدا دارد، build قدیمی نه parser error می‌گیرد و نه media را fetch می‌کند. Consumer فعلی unknown record field را fail-closed رد می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/mapping.ts:27-32,126-146`)؛ artifact دوم این incompatibility را دور نمی‌زند، بلکه contract را جدا نگه می‌دارد.

## 9. C8 — Test plan به تفکیک slice

### K3 — Core/schema/service

- Prisma validate/generate و migrate deploy روی PostgreSQL 16 disposable.
- schema drift پس از deploy صفر؛ constraint/index/FK names دقیق.
- tenant tests: cross-org item/media/link/publication همگی رد شوند.
- permission tests: نبود `catalog_item.manage` برای همهٔ mutations؛ `publication.manage` برای publish/withdraw؛ founding bootstrap key تازه را می‌گیرد.
- K-W3 tests: registry membership، grant issue/revoke و bootstrap بدون وابستگی به ترتیب.
- lifecycle table-driven: فقط DRAFT→ACTIVE→RETIRED؛ retire PUBLISHED رد شود؛ audit fields atomic rollback.
- price, currency, availability, display order و revision trigger tests.
- media: position، ۸ تصویر، 1.5MB، مجموع 8MB، dimensions، 16MP، path/hash/type، alt text، placeholder pair.
- concurrent reorder/add tests زیر parent lock؛ position unique و total bytes deterministic.
- link tests: tenant safety، duplicate، add/remove قبل از publish، mutation پس از first publish رد، revision bump.
- publication tests: XOR چهار target، pair check، direct projection guard، publish/idempotent/republish/withdraw/re-withdraw و snapshot exact allowlist.
- mutation proofs: حذف organization از composite FK، حذف Catalog از XOR، دورزدن projection guard، حذف total-byte trigger و حذف permission check باید آزمون نام‌دار را fail کند.

### K4 — Export/distribution

- builder فقط `published_content` را می‌خواند؛ mutation live row خروجی را تغییر ندهد.
- catalog eligibility برای organization/item lifecycle، availability و withdraw fail-closed باشد.
- ordering و snapshot ID deterministic؛ canonical fixture بین V1/V2 برابر.
- distinct domain separator test پس از تصمیم K-Q1.
- artifact 1,999,999 bytes پذیرفته و 2,000,001 رد شود.
- media-before-catalog fault injection: شکست یک media artifact فعلی را نگه دارد.
- hash/path/type/dimension mismatch، existing poisoned file، traversal و symlink رد شوند.
- rename retry، rollback prevention، 404 و immutable cache route tests.
- GC فقط unreferenced در current + دو retained و بعد از ۷ روز؛ missing/corrupt artifact GC را متوقف کند.

### K5 — Consumer/AR

- strict envelope/record/media unknown-field rejection.
- signature با catalog domain، key revocation، TTL و snapshot ID.
- business snapshot و publication binding؛ mismatch فقط Catalog همان organization را مخفی کند.
- streaming size cap، SHA-256 exact bytes، magic/type/dimensions و canonical path.
- offline cache فقط verified bytes keyed by hash؛ poisoned/partial cache رد شود.
- lazy load و swipe order؛ missing media قاب خنثی و هرگز unverified fallback.
- old build regression: `public-business.v1` fixture بدون تغییر همچنان پذیرفته شود.

### K6 — Sample data و end-to-end

- generator محلی deterministic، بدون network، تصویر دارای TEST marker و hash تکرارپذیر.
- seed rerun idempotent؛ withdraw/retire بدون DELETE/TRUNCATE/DROP.
- end-to-end: CatalogItem + media با service ساخته، activate و publish شود؛ producer artifact و media را بسازد؛ distributor media را قبل از artifact منتشر کند؛ consumer امضا، binding و hash را verify کند؛ item و تصویر در card و AR test fixture دیده شوند؛ سپس withdraw از artifact بعدی حذفشان کند.
- کل V1/Core و V2 suite در سه اجرای متوالی سبز؛ integration DB فقط tmpfs/disposable و بدون owner DB.

## 10. C9 — سؤال‌های باز مالک

تصمیم‌های K-D1 تا K-D14 و K-N1 بسته‌اند. چهار جزئیات زیر هنوز در آن تصمیم‌ها مقدار نهایی ندارند:

1. **K-Q1 — domain separator:** A) reuse business separator؛ B) `MLINO-PUBLIC-CATALOG-V1\n`. **توصیه: B** برای جداسازی protocol و جلوگیری از cross-artifact replay.
2. **K-Q2 — placeholder v1:** A) فقط `mlino.blurhash.v1`؛ B) هر schema string با allowlist قابل گسترش؛ C) بدون placeholder در v1. **توصیه: A**؛ parser و cap ساده و قطعی می‌مانند.
3. **K-Q3 — grouping label:** A) free display label حداکثر 160 نویسه؛ B) module vocabulary key؛ C) حذف از v1. **توصیه: A**؛ صرفاً presentation است و معنای vertical ایجاد نمی‌کند. control characters/angle brackets در service رد شوند.
4. **K-Q4 — Offer links در artifact:** A) تمام link IDها؛ B) فقط OfferVersionهایی که در business artifact bound همان snapshot واقعاً منتشر و قابل‌نمایش‌اند. **توصیه: B**؛ dangling link عمومی تولید نمی‌شود.

K3 فقط پس از تصمیم صریح K-Q1 تا K-Q4 و APPROVED شدن این CCR مجاز است.

## 11. فایل‌های پیاده‌سازی آینده و حدود تغییر

فهرست مورد انتظار پس از مجوز آینده: `implementation/prisma/schema.prisma`، یک migration تازه، `implementation/core/catalog-item-service.ts`، `implementation/core/offer-service.ts` برای linkها، `implementation/core/publication-service.ts`، `implementation/core/permission-registry.ts`، error adapter، type declarations و testهای Core. Export/distribution، V2 consumer/AR و sample data هرکدام slice جدا دارند و در K3 وارد نمی‌شوند.

این CCR هیچ Clinic table، Session/Intent/Consent persistence، payment، inventory، appointment، capacity، image bytes یا network storage به Core اضافه نمی‌کند.

من کدکس هستم
