# بازبینی نگهبان معماری — G8: rebuild کنترل‌شده‌ی API محلی V1

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G8_V1_RUNTIME_REBUILD_REPORT.md`
**دستور اجراشده:** `CODEX-20260913-G8-V1-RUNTIME-REBUILD-001`
**تصویب مالک:** `AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G8_RUNTIME_REBUILD.md` (کامیت `789aa67`)

| commit | کار |
|---|---|
| `134aa09` | شواهد در `mlino2/validation/g8/**` |
| `669a992` | گزارش و ورودی Handoff (فقط افزودنی) |

## حکم: `APPROVED_NEXT_STEP`

**G8 بسته شد.** image تازه‌ی API از `main` ساخته و اجرا شد. Prisma Client این image مدل‌های Core را هم دارد و روی همان پایگاه داده‌ی migrate‌شده اجرا می‌شود. داده، schema و volume تغییر نکرده‌اند.

همه‌ی ادعاهای گزارش را مستقل با git، docker و پرس‌وجوهای فقط‌خواندنی metadata و شمارش بررسی کردم. همه درست بودند.

---

## ۱. راستی‌آزمایی مستقل

| ادعای گزارش | روش بررسی | نتیجه |
|---|---|---|
| **image تازه‌ی read-api** | `docker inspect` | ✅ `sha256:a07858b3…`، ساخته‌شده در `12:54:36Z`، running، `Restarts=0` |
| **image پیشین حفظ شده** | `docker images` | ✅ `mlino-v1-read-api:pre-g8` = `6e092dddeeec`، همان لنگر ثبت‌شده در سند تصویب |
| **DB بازسازی نشد** | `docker inspect` + log compose | ✅ `StartedAt=2026-09-12T21:34:05.613Z` (بدون تغییر) · `Created=2026-09-06` · healthy · `Restarts=0` · در log compose فقط `v1-migrate` و `v1-read-api` بازسازی شده‌اند |
| **volume ثابت** | `docker inspect` Mounts | ✅ `implementation_mlino_v1_local_db_data -> /var/lib/postgresql/data` |
| **`v1-migrate` بی‌اثر بود** | log در شواهد + `_prisma_migrations` | ✅ `No pending migrations to apply` · شش migration، همه finished و بدون rollback · آخرین مورد همچنان `20260913010000_add_core_foundation` است |
| **شمار ردیف‌ها بدون تغییر** | `count(*)` دقیق روی ۲۲ جدول | ✅ `domain_signal_producer_registry=4` · `_prisma_migrations=6` · بقیه ۰ · ۱۲ جدول Core خالی · برابر با pre-state و با G7b |
| **schema دست نخورده** | `pg_trigger` و `pg_constraint` | ✅ ۱۳ trigger غیرداخلی · ۳۰ FK از نوع RESTRICT/RESTRICT (از جمله ۲۶ FK جدول‌های Core) و ۲ FK قدیمی V1 از نوع CASCADE؛ همان وضعیت G7b |
| **پاسخ API بدون احراز هویت** | `curl localhost:3000/` | ✅ `401` |
| **log سرویس بدون خطای Prisma** | `docker logs` | ✅ فقط `listening on 3000 — local bridge, not production` |
| **پشتیبان سالم** | `sha256sum` روی میزبان + header | ✅ `103407` بایت · header از نوع `PGDMP` · `88e22257…0570f` = مقدار داخل کانتینر = گزارش · `pg_restore --list` ۲۱۵ شیء را فهرست کرد |
| **فایل موقت dump در کانتینر نمانده** | `ls /tmp` داخل کانتینر | ✅ خالی |
| **worktree موقت پاک شد** | `git worktree list` + `%TEMP%` | ✅ `mlino-g8-main` حذف و prune شده است |
| **منبع build** | log `worktree-setup` | ✅ `HEAD=789aa677…` (همان origin/main) · `STATUS_COUNT=0` |
| **دامنه‌ی git** | `git diff 0e35d36..669a992` | ✅ فقط `mlino2/validation/g8/**` · گزارش · افزودن به Handoff (فقط insertion) · بدون تغییر در `implementation/**` |
| **main و V2 تغییر نکرده‌اند** | `git rev-parse` | ✅ main=`789aa67` (آخرین commit نگهبان) · V2=`f4d326f` |
| **dump در هیچ مخزنی نیست** | `git ls-files` + `find` | ✅ هیچ `.dump`ی در سه clone وجود ندارد |
| **شواهد بدون credential** | `git grep` الگوهای URL/password | ✅ هیچ موردی پیدا نشد |
| **hash گزارش** | `git show … \| sha256sum` | ✅ `7150ce18…78f1` = `REPORT_SHA256` در Handoff (LF-canonical) |

**دو incident ثبت‌شده:** یکی خطای quoting در PowerShell بود و دیگری offset نادرست در تجزیه‌ی log. هر دو فقط‌خواندنی بودند و روی پایگاه داده اثری نداشتند. به‌درستی با برچسب «شاهد اعتبارسنجی نیست» جدا شده‌اند.

## ۲. بررسی معماری

| محور | نتیجه |
|---|---|
| **ADR-0001 (V1 ستون فقرات است)** | ✅ runtime V1 اکنون روی schema مشترک Core اجرا می‌شود و رفتار عمومی‌اش تغییر نکرده است (پاسخ 401 و فقط‌خواندنی) |
| **مرز Core و Module (ADR-0011)** | ✅ هیچ کد service یا repository یا Module اضافه نشده است؛ Client تازه فقط مدل‌ها را در دسترس گذاشته است |
| **امنیت و مجوز (ADR-0009 و ADR-0010)** | ✅ مرز احراز هویت سالم است. هنوز هیچ مسیر نوشتنی برای مدل‌های Core وجود ندارد، پس W1 هنوز جایی برای نقض شدن ندارد و باید در طراحی لایه‌ی service الزامی شود (بخش ۴) |
| **ایمنی migration** | ✅ اجرای `migrate deploy` بی‌اثر بود. ریسک migration ضمنی از G7b به بعد بسته است |
| **امکان بازگشت** | ✅ image `pre-g8` و دو پشتیبان (پیش از Core و پیش از G8) موجودند |

## ۳. بدهی و مشاهدات (مانع نیستند)

1. **هشدارهای وابستگی npm در build:**
   - `glob@7.2.3` (همراه یادداشت آسیب‌پذیری)، `inflight@1.0.6` و `uuid@9`. این‌ها وابستگی‌های گذرای V1 هستند و G8 آن‌ها را نساخته است.
   - به‌عنوان بدهی فنی ثبت می‌شوند. به‌روزرسانی‌شان فقط از مسیر یک CCR جداگانه‌ی V1 مجاز است.
2. **نگه‌داری پشتیبان‌ها و tag:**
   - دو فایل dump حاوی داده (`pre_core` و `pre_g8`) و image `pre-g8` نگه داشته شده‌اند.
   - سیاست نگه‌داری و حذف با مالک است. پیشنهاد من: دست‌کم تا پایان فاز service حذف نشوند.
3. **worktreeهای کهنه در `_PUSH_STAGING`:** `astra_check`، `wt_field` و `wt_stage1` از کارهای قبلی مانده‌اند و به G8 ربطی ندارند. پاک‌سازی آن‌ها کاری جداگانه است و در این مرحله انجام نمی‌شود.
4. **فایل‌های untracked در clone V2:** سه سند `mlino2/MLINO_FIRST_VALUE_PATH_PLAN.md` و `MLINO_PHASE_0_*`، با تاریخ ۱۱ سپتامبر. پیش از G8 ساخته شده‌اند و به آن ربطی ندارند. تصمیم درباره‌ی commit یا کنار گذاشتنشان با مالک است.
5. **بخش ۸ گزارش:** hash commit نهایی را «بعداً اعلام می‌شود» نوشته است. این اجتناب‌ناپذیر است، چون گزارش نمی‌تواند hash commit خودش را داشته باشد. در Handoff، `669a992` از روی git قابل تشخیص است.

---

## ۴. گام بعدی

**Next Task: G9 — پیش‌نویس طراحی لایه‌ی service و repository هسته (فقط سند، بدون کد).**

**دلیل:** زیرساخت داده‌ی Core کامل است (G1 تا G8)، اما هیچ مسیر نوشتنی برای آن وجود ندارد. تصمیم‌های امنیتی مهم در همین لایه گرفته می‌شوند:
- W1 الزامی است و W2 اختیاری.
- مدل مجوز (ADR-0009 و ADR-0010).
- قطعیت انتشار (Publication منبع حقیقت است و projection در همان تراکنش نوشته می‌شود).
- پیش از هر کدی باید طراحی تصویب شود.

این گام فقط سند تولید می‌کند و به runtime، پایگاه داده یا کد دست نمی‌زند، پس به تصویب مالک برای اجرا نیاز ندارد. **تصویب محتوای طراحی** بعداً با مالک است.

```
INSTRUCTION_ID: CODEX-20260913-G9-CORE-SERVICE-LAYER-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G8_V1_RUNTIME_REBUILD.md
DECISION: APPROVED_NEXT_STEP (G8 closed; Core Foundation G1–G8 complete)
MODE: DOCUMENT ONLY — no code, no Prisma generate, no Docker, no database access.

Goal:
Draft the design spec for the Core service/repository layer on top of the 12 Core models already
migrated (organizations … external_workspace_links). The spec must be reviewable by the Guardian
and decidable by the owner. It implements nothing.

Deliverable (Core branch):
  mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md   (Persian prose; code identifiers in English)

Required sections:
 1. Scope and non-scope. Only Core models; no Module or vertical logic (ADR-0011). Name what stays in V1.
 2. Layering. Repository (Prisma access only) → Service (rules, transactions) → caller boundary.
    State where the layer lives (package/path proposal) and why. Show how it respects ADR-0002 and ADR-0011.
 3. Tenant context — W1 MANDATORY:
    organizationId comes only from the authenticated context, passed as a direct scalar. It is never taken
    from request bodies or payloads, and never inferred from related rows. Every repository method takes it
    explicitly. Show the signature pattern and how cross-tenant access is impossible by construction.
    Also state:
      - how the composite (id, organization_id) FKs back this up
      - the MATCH SIMPLE caveat
    W2 is OPTIONAL: describe it only as an option, with its cost.
 4. Permission model (ADR-0009, ADR-0010):
    - role ≠ permission
    - where permission_grants are checked
    - the platform executes but does not authorize
    - list, per write operation, the permission it requires
 5. Write operations per aggregate, with transaction boundaries:
    - Organization, Membership, PermissionGrant
    - BusinessProfile, BusinessIdentityClaim with the five claim statuses, IdentityVerification
    - Capability, Offer, OfferVersion, OfferVersionCapability
    - Publication as the source of truth, with the publication_status projection in the same
      transaction, content_revision auto-incremented by the DB (D6=A), and republish only at a
      higher revision
    - ExternalWorkspaceLink, which has no FK to Organization (D4)
 6. Interaction with the 13 DB triggers and the pg_trigger_depth() guard (B1). For each operation,
    state which guard it relies on and which DB error it must translate. Services must never try to
    bypass or pre-empt a trigger.
 7. Error model: map DB/Prisma errors (P2002, P2003, trigger RAISE) to domain errors. No raw DB text
    leaks to callers.
 8. Audit fields. Only the last audit fields are kept; history applies only to Verification and
    Publication, as the schema already defines.
 9. Test strategy for the future implementation. Disposable tmpfs PostgreSQL only; the V1 jest global
    table cleanup must never touch mlino-v1-local-db; every W1 and permission branch has a negative test.
10. Open decisions for the owner, as a numbered list with options and a recommendation (S1..Sn).
11. Compliance matrix: ADR-0001..0012 × this design (✅/⚠️ with one line each).

Evidence rules:
- Cite schema facts only from origin/main implementation/prisma/schema.prisma and migration
  20260913010000_add_core_foundation, with file:line references.
- Any SHA-256 you report is computed over `git show` bytes (LF).

Report: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9_CORE_SERVICE_LAYER_DESIGN_REPORT.md
Handoff: append only to mlino2/HANDOFF/HANDOFF_STATE.md
Then STOP and wait for the Guardian review.

ALLOWED FILES (Core branch only):
  mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (new)
  AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9_CORE_SERVICE_LAYER_DESIGN_REPORT.md (new)
  mlino2/HANDOFF/HANDOFF_STATE.md (append only)

FORBIDDEN:
- any source code, test, script or config file; implementation/**; schema.prisma; migrations;
  shared-contracts/types.ts
- prisma generate, migrate, db push; any Docker command; any database connection
- removing the pre-g8 image or any backup
- changes to main, the V2 branch, _PUSH_STAGING, the root AI_HANDOFF files, ADRs or mlino_book/**
- deciding any open design choice yourself: list it as an owner decision instead
- starting implementation after the spec, without a Guardian review and owner approval
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G1 تا G7 | اعتبارسنجی، CCR، migration، سازگاری، ادغام، اعمال محلی | ✅ بسته |
| **G8** | **rebuild runtime V1** | ✅ **بسته — این بازبینی** |
| G9 | طراحی لایه‌ی service و repository هسته (سند) | ▶️ صادر شد |
| G10 | پیاده‌سازی لایه‌ی service | ⏳ پس از بازبینی G9 و تصویب مالک |

من کلاد هستم
