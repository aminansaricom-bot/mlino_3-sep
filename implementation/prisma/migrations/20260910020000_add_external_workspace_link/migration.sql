-- CCR «ExternalWorkspaceLink» — مصوب مالک محصول (۱۰ سپتامبر ۲۰۲۶)
-- مرجع: implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md
-- معماری: mlino_book/adr/ADR-0004-workspace-organization-mapping.md
--
-- نگاشت هویت کسب‌وکار بین V1 و سیستم‌های بیرونی. هیچ جدول موجودی تغییر
-- نمی‌کند؛ فقط یک جدول و سه enum جدید اضافه می‌شود.

CREATE TYPE "ExternalSystem"     AS ENUM ('CONTENT_STUDIO');
CREATE TYPE "ExternalLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "ExternalLinkBasis"  AS ENUM ('MANUAL', 'SYSTEM_MIGRATION', 'ADMIN_ACTION', 'INTEGRATION');

CREATE TABLE "external_workspace_links" (
    "id"                     TEXT                 NOT NULL,
    "organization_id"        TEXT                 NOT NULL,
    "system"                 "ExternalSystem"     NOT NULL,
    "external_workspace_id"  TEXT                 NOT NULL,
    "status"                 "ExternalLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "basis"                  "ExternalLinkBasis"  NOT NULL,
    "linked_at"              TIMESTAMP(3)         NOT NULL,
    "linked_by_actor_id"     TEXT                 NOT NULL,
    "revoked_at"             TIMESTAMP(3),
    "revoked_by_actor_id"    TEXT,
    "note"                   TEXT,

    CONSTRAINT "external_workspace_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_workspace_links_organization_id_idx"
    ON "external_workspace_links"("organization_id");

CREATE INDEX "external_workspace_links_system_external_workspace_id_idx"
    ON "external_workspace_links"("system", "external_workspace_id");

-- ─────────────────────────────────────────────────────────────────────────
-- ناوردای اصلی — چرا اینجا SQL خام لازم است
-- ─────────────────────────────────────────────────────────────────────────
--
-- ناوردایی که اجبار می‌شود:
--   «به‌ازای هر (system, external_workspace_id)، حداکثر یک ردیف با
--    status = 'ACTIVE' وجود دارد.»
--
-- یعنی یک workspace بیرونی در هر لحظه حداکثر به یک سازمان MLINO وصل است،
-- ولی می‌تواند هر تعداد ردیف REVOKED تاریخی داشته باشد.
--
-- محدودیت Prisma:
--   `@@unique([system, externalWorkspaceId])` این ناوردا را بیان نمی‌کند —
--   آن یکتایی را روی *همه‌ی* ردیف‌ها اعمال می‌کند و در نتیجه دومین پیوند
--   تاریخی روی همان workspace را غیرممکن می‌سازد. یعنی یا ناوردا را
--   می‌شکند یا تاریخچه را، و هر دو غیرقابل‌قبول‌اند.
--
--   Prisma تا این نسخه ایندکس یکتای *جزئی* (partial / با WHERE) را در
--   زبان شِما پشتیبانی نمی‌کند. بنابراین این تنها راه بیان درست ناوردا در
--   خودِ دیتابیس است.
--
-- چرا بررسی سطح‌اپلیکیشن جایگزین نمی‌شود:
--   یک بررسی «اول بخوان بعد بنویس» در برابر همزمانی امن نیست — دو تراکنش
--   می‌توانند هم‌زمان خالی‌بودن را ببینند و هر دو یک پیوند فعال بسازند.
--   نتیجه: دو سازمان مالک یک workspace، که مستقیماً مرز AC-2 را می‌شکند.
--   قید در سطح دیتابیس تنها جایی است که در برابر همزمانی واقعی مقاوم است.
--
-- رفتار بازگشت (Rollback):
--   پیش از هر داده‌ی واقعی → DROP INDEX/TABLE/TYPE، بازگشت کامل و بی‌هزینه.
--   پس از داده‌ی واقعی → جدول حذف نمی‌شود؛ پیوندها REVOKED می‌شوند و رابط
--   resolve غیرفعال می‌گردد. حذف جدولی که تاریخچه‌ی «چه کسی چه چیزی را کِی
--   به چه کسی وصل کرد» دارد، همان ممیزی‌پذیری‌ای را نابود می‌کند که هدف
--   این مدل بود. (CCR بند ۱۳)

CREATE UNIQUE INDEX "external_workspace_link_active_unique"
    ON "external_workspace_links"("system", "external_workspace_id")
    WHERE "status" = 'ACTIVE';
