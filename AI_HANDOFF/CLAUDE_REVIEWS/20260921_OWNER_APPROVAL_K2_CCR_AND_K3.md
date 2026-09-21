# ثبت تصویب مالک — CCR کاتالوگ، تصمیم‌های K-Q1 تا K-Q4 و مجوز K3 (ساخت در هسته)

**تاریخ:** ۲۱ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO
**مبنا:** `20260921_CLAUDE_REVIEW_K2_CATALOG_CCR.md` (commit `cf8ec8b`) · CCR در شاخه‌ی `codex/catalog-ccr` @ `bdd5543`

## ۱. متن تصویب مالک

> «CCR کاتالوگ تصویب شد؛ K-Q1=B، K-Q2=A، K-Q3=A، K-Q4=B؛ مرحله‌ی K3 (ساخت در هسته) مجاز است»

## ۲. اقدام نگهبان

شاخه‌ی CCR بدون تعارض در main ادغام شد (commit ادغام `d439e8e`). وضعیت سند در خودِ فایل هنوز DRAFT است و کدکس در K3 آن را به APPROVED تغییر می‌دهد.

## ۳. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **K-Q1 = B** | جداکننده‌ی امضای مستقل `MLINO-PUBLIC-CATALOG-V1\n` برای فایل کاتالوگ (اجرا در K4) |
| **K-Q2 = A** | placeholder در نسخه‌ی یک فقط `mlino.blurhash.v1` |
| **K-Q3 = A** | عنوان بخش متن آزاد تا ۱۶۰ نویسه · نویسه‌های کنترلی و `<` و `>` در سرویس رد شوند |
| **K-Q4 = B** | در فایل عمومی فقط پیوند به نسخه‌های پیشنهادی که در snapshot گره‌خورده‌ی همان کسب‌وکار واقعاً منتشر و قابل نمایش‌اند (اجرا در K4) |

## ۴. هشدارهای نگهبان برای K3

| # | هشدار |
|---|---|
| **K-W1** | K3 migration می‌سازد. کدکس هیچ migrationی را روی هیچ دیتابیسی اجرا نمی‌کند. پس از ادغام، **هیچ ساخت دوباره‌ی کانتینر** تا اعمال محلیِ کنترل‌شده با پشتیبان و اجازه‌ی جدای مالک |
| **K2-N1** | سازمان‌های موجود اجازه‌ی تازه را ندارند. K3 هیچ backfillی نمی‌سازد؛ صدور اجازه برای داده‌ی آزمایشی کار K6 است |
| **K2-N2** | نام فیلد پیوند در snapshot همان `offer_version_links` باشد تا با فایل عمومی یکی شود |
| **K2-N3** | استثنای revision از داخل trigger فقط برای triggerهای نام‌برده، با آزمون حذف |
| **K3-G1** | کدکس دیتابیس و داکر ندارد. آزمون‌های یکپارچه را می‌نویسد ولی اجرای آن‌ها با نگهبان روی دیتابیس دور‌ریختنی است |

## ۵. دستور کدکس — K3

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260921-K3-CATALOG-CORE-001
TARGET_HANDOFF_ID: HANDOFF-20260921-OWNER-APPROVAL-K3
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_K2_CCR_AND_K3.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION - a NEW branch codex/catalog-core from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/catalog-core. LOCAL commits only; do NOT push.
      No database, no Docker, no network. Never run any migration against any database.
PRECONDITION: GW2-P on the pinned record (cat-file -e, merge-base --is-ancestor, sha256 of `git show` bytes);
  record the outputs; any failure -> STOP. Never open any .env, GITHUB_TOKEN.txt or key file.
BASIS (binding): implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md
  as merged on main, plus the owner decisions K-Q1=B, K-Q2=A, K-Q3=A, K-Q4=B and Guardian notes K2-N1..N3 and
  K3-G1 in sections 3-4 of the pinned record. Where the CCR and this instruction differ, this instruction wins;
  anything the CCR leaves open -> choose the strictest option and list it in the report.

SCOPE K3 = Core only:
 S1 SCHEMA: add CatalogItemLifecycle, CatalogMediaType, CatalogItem, CatalogItemMedia, OfferVersionCatalogItem and
    the two Publication catalog columns to implementation/prisma/schema.prisma exactly as CCR section 2, with the
    composite organization-scoped relations and the constraint/index names given there.
 S2 MIGRATION: ONE new directory implementation/prisma/migrations/20260921010000_add_catalog_items/migration.sql,
    one transaction, in the CCR 7.1 order: enums, tables, uniques/indexes and row-local CHECKs (price mode identical
    to offer_version_price_check, media caps: position 0..7, byte_size 1..1500000, width/height 320..4096, total
    pixels <= 16000000, sha256 64 lowercase hex, object_path canonical content-addressed, alt_text non-empty,
    placeholder pair with schema 'mlino.blurhash.v1' only), RESTRICT FKs, publication columns + pair check + FK,
    drop/recreate publication_target_xor_check with FOUR targets under the SAME name, drop/recreate
    publication_content_revision_check under the SAME name, all triggers of CCR 3.4 (lifecycle audit, per-item
    total bytes <= 8000000 and count <= 8 under parent lock, content revision, media revision, link immutability
    after first OfferVersion publication, projection guards), and CREATE OR REPLACE core_apply_publication_projection
    with an explicit catalog branch. The media position unique is DEFERRABLE INITIALLY IMMEDIATE. The revision
    bypass is limited to the named media/link triggers (K2-N3), never depth alone. No backfill, no data change,
    no change to any existing migration file.
 S3 SERVICES: implementation/core/catalog-item-service.ts (create, updatePublicFields, activate, retire, addMedia,
    reorderMedia, removeMedia) in the style and validation order of capability-service.ts; grouping_label free
    text <= 160 chars rejecting control characters and '<' '>' (K-Q3); OfferService.linkCatalogItem/unlinkCatalogItem
    under offer.manage with lock order Organization -> Offer -> OfferVersion -> CatalogItem; PublicationService
    publish/withdraw for the catalog target under publication.manage writing the allowlisted snapshot of CCR 5 with
    the link field named offer_version_links (K2-N2), media ordered by position, links ordered by id.
 S4 PERMISSION: add 'catalog_item.manage' to CORE_PERMISSION_KEYS (append at the end). No backfill grant for
    existing organizations (K2-N1). Map every new DB error in error-adapter.ts to a stable Core code.
 S5 TESTS: new specs under implementation/test/core/ covering the whole K3 list of CCR section 9 (tenant, permission,
    lifecycle, price, media caps and ordering, concurrent reorder, links before/after first publish, four-target XOR,
    pair check, projection guard, publish/republish/withdraw, exact snapshot allowlist, K-W3). DB-backed specs must
    use the existing test DB guard and never a default or owner URL.
 S6 CCR STATUS: change the CCR header status from DRAFT to APPROVED and add one line recording the owner decisions
    K-Q1..K-Q4 with the date 2026-09-21. No other CCR edit.

VERIFY (offline only; report exact commands and outputs): npx prisma validate; npx prisma generate if the engine is
  available offline (else record NOT RUN with the error); npx tsc --noEmit -p tsconfig.json; jest ONLY for specs
  that need no database. Every DB-backed spec: record NOT RUN (K3-G1). The Guardian runs them on a disposable DB.
MUTATION PROOFS: list, per CCR section 9, which named test must fail for each mutation (organization dropped from a
  composite FK, catalog removed from the XOR, projection guard bypassed, total-byte trigger removed, permission
  check removed); the Guardian executes them.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260921_CODEX_K3_CATALOG_CORE_REPORT.md - changed files, the migration
  file LF sha256, GW2-P outputs, verification outputs, everything NOT RUN or NOT verified, and every open choice you
  made. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/prisma/schema.prisma; the ONE new migration directory; implementation/core/
  catalog-item-service.ts (new), offer-service.ts, publication-service.ts, permission-registry.ts, error-adapter.ts,
  errors.ts, repositories.ts and type declarations only if required; new specs under implementation/test/core/;
  the CCR header (S6); the report (new); mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: any existing migration file; public-export/**; distribution; the V2 app; tools/test-seed; any image;
  Docker; any database; network; main; _PUSH_STAGING; push; git config; any .env or key file.
```

## ۶. پس از K3

نگهبان کل مجموعه را روی دیتابیس دور‌ریختنی اجرا و آزمایش‌های حذف را تکرار می‌کند. برای بازبینی پایانی این مرحله، **استرا** پیشنهاد می‌شود، چون trigger و قید دیتابیس و سرویس به هم گره خورده‌اند. پس از ادغام، **اعمال migration روی دیتابیس محلی مالک فقط با پشتیبان و اجازه‌ی جداگانه** انجام می‌شود و تا آن زمان کانتینری دوباره ساخته نمی‌شود.

من کلاد هستم
