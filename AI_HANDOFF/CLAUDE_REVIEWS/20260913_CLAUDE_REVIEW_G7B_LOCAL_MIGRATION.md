# بازبینی نگهبان معماری — G7b: پشتیبان‌گیری و اعمال migration Core روی V1 محلی

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G7B_APPLY_CORE_MIGRATION_REPORT.md`
**Commitها:** `b62546e` (شواهد) · `0e35d36` (گزارش و Handoff) — شاخه‌ی `codex/core-prisma-foundation`
**دستور اجراشده:** `CODEX-20260913-G7B-APPLY-CORE-MIGRATION-LOCAL-RETRY-001`

---

## تصمیم

# `APPROVED_NEXT_STEP`

- **G7 — PASS و بسته.**
- migration `20260913010000_add_core_foundation` روی `mlino-v1-local-db` اعمال شد:
  - با پشتیبان معتبر پیش از آن
  - بدون تغییر در هیچ داده‌ی موجود
  - بدون restart
- **زنجیره‌ی دروازه‌های Core Foundation (G1 تا G7) کامل است.**
- **ریسک «G7 ناخواسته از راه `docker compose up --build`» از بین رفت:** migration اعمال شده است و `migrate deploy` بعدی اثری ندارد.

---

## ۱. راستی‌آزمایی مستقل — مستقیم روی پشتیبان و پایگاه داده (فقط‌خواندنی)

**نگهبان این بار علاوه بر شواهد Codex، وضعیت واقعی را مستقیم سنجید.** فقط پرس‌وجوی فراداده و شمارش — **بدون خواندن داده‌ی ردیفی و بدون هیچ نوشتن.**

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| **فایل پشتیبان** | `ls` · `sha256sum` روی میزبان · سرآیند فایل | ✅ `C:\Users\galexy\mlino-backups\mlino_v1_pre_core_20260913T121927Z.dump` · ۲۲٬۲۴۲ بایت · SHA-256 **`f3d2208a…3c09`** = مقدار درون container = گزارش · سرآیند **`PGDMP`** (قالب custom معتبر PostgreSQL) · `pg_restore --list`: ۶۸ خط شیء (شواهد B4) |
| فایل موقت درون container | `ls /tmp/*.dump` | ✅ صفر — B6 انجام شده |
| **دفتر migration** | `select … from _prisma_migrations` | ✅ **شش migration**، همه `finished`، هیچ‌کدام `rolled_back` |
| **داده‌ی موجود دست‌نخورده** | شمارش همه‌ی جدول‌های `public` | ✅ `domain_signal_producer_registry` = ۴ — **همان پیش از کار** · بقیه‌ی جدول‌های V1 = ۰ مثل قبل · `_prisma_migrations` ۵ → ۶ |
| **۱۲ جدول Core** | همان شمارش | ✅ همه موجود و **خالی** |
| FKهای Core | `pg_constraint` | ✅ **۳۰ از ۳۰** `RESTRICT/RESTRICT` |
| Triggerها | `pg_trigger` غیرداخلی | ✅ **۱۳** (۱۲ فهرست بسته + تغییرناپذیری Verification) |
| اشیای دستی | `pg_indexes` · CHECKها | ✅ پنج یکتای جزئی C1 تا C5 + `external_workspace_link_active_unique` · ۲۹ CHECK |
| **containerها** | `docker inspect` | ✅ `mlino-v1-local-db` و `mlino-v1-read-api`: `StartedAt` بدون تغییر، `Restarts=0` · DB healthy |
| API | شواهد | ✅ درخواست بدون token → **401** (مرز احراز هویت سالم) |
| دامنه‌ی مخزن | `git diff 7aa9b33..0e35d36` | ✅ فقط ۳۸ فایل `g7b`، گزارش، Handoff (صفر خط حذف) · `g7` دست‌نخورده · **هیچ فایل dump در مخزن** · هیچ اعتبارنامه |
| `_PUSH_STAGING` · `main` · V2 · worktreeها | status · اثر انگشت | ✅ دست‌نخورده · اثر انگشت برابر مبنا · worktree موقت نمانده |

**حادثه‌های ثبت‌شده — همه بی‌اثر و فقط‌خواندنی:**
1. `migrate status` نخست به پورت داخلی `5432` به‌جای پورت منتشرشده‌ی `5435` زد — فرمان فقط‌خواندنی، شاهد حساب نشد
2. و ۳. PATH ابزار اثر انگشت در Git Bash — پیش از hash شکست خورد
3. محافظ `dubious ownership` در پیش‌بررسی حذف worktree؛ حذف از مخزن مادر انجام و ثبت شد

**`deploy` فقط یک بار اجرا شد** (exit صفر، دقیقاً یک اعمال). exit `1` در `migrate status` پیش از deploy، رفتار عادی Prisma برای «migration معلق» است.

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ |
| ۲ | مشخصات مصوب | ✅ دقیقاً CCR `fcddfc2` روی پایگاه داده |
| ۳ | Core و ماژول | ✅ هیچ FK به جدول‌های V1 (D4) |
| ۴ | چند Vertical | ✅ |
| ۵ | امنیت و اجازه | ✅ اعتبارنامه فقط در env · API همچنان fail-closed (401) |
| ۶ | ایمنی migration | ✅ پشتیبان تأییدشده پیش از اعمال · فقط یک migration · شمارش پیش و پس برابر · rollback لازم نشد |
| ۷ | بدهی فنی | ✅ — دو یادآوری در بند ۳ |

---

## ۳. یادآوری‌ها — بدون مانع

- **فایل پشتیبان داده دارد:** بیرون از مخزن و با دسترسی محدود نگه داشته شود. **پیشنهاد:** تا پایان پیاده‌سازی سرویس‌های Core نگه‌داری شود.
- **`mlino-v1-read-api` هنوز image پیش از Core را اجرا می‌کند.** سالم است، چون Client قدیمی فقط مدل‌های قدیمی را می‌خواند. ولی **بسته شدن کامل حلقه‌ی runtime** (image تازه با Client تازه روی همین پایگاه داده) هنوز انجام نشده است → **G8 اختیاری.**

---

## ۴. گام بعد — انتخاب مالک

| گزینه | موضوع | نظر نگهبان |
|---|---|---|
| **G8 — rebuild کنترل‌شده‌ی stack V1** | ساخت image تازه از `main` و اجرای `mlino-v1-read-api` با Client تازه؛ `v1-migrate` بی‌اثر است | **پیشنهاد به‌عنوان گام بعدی کوتاه:** حلقه‌ی runtime را می‌بندد؛ دستور دقیق در زیر |
| **فاز بعد — سرویس و Repository روی مدل‌های Core** | Organization، Claim، Membership، Grant، Profile، Capability، Offer، Publication | نیاز به **مشخصات طراحی** پیش از کد · **W1 قاعده‌ی الزامی** · Claude در صورت درخواست مالک پیش‌نویس مشخصات را تهیه می‌کند |

### Next Task
**G8 (اختیاری، با تصویب مالک)** — rebuild و راه‌اندازی دوباره‌ی کنترل‌شده‌ی `mlino-v1-read-api` روی `main` فعلی.

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G8-V1-RUNTIME-REBUILD-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md
OWNER_APPROVAL: ________   (owner must state: "G8 approved: rebuild the V1 read API image from main and restart it")
DECISION: APPROVED_NEXT_STEP (G7 closed)

TASK:
Rebuild the local V1 stack images from the current origin/main and restart only mlino-v1-read-api with the new
Prisma Client, keeping mlino-v1-local-db, its volume and its data unchanged. Rollback-ready.

SAFETY (non-negotiable):
- NEVER docker compose down -v, docker volume rm, DROP, TRUNCATE, DELETE; NEVER run V1 tests on this database.
- Credentials only via environment variables; never logged or committed.
- Never write in C:\mlino code\_PUSH_STAGING.

STEPS:
0. git fetch origin; read the review via git show origin/main:<path>. If OWNER_APPROVAL is blank: STOP.
1. Pre-state (read-only): docker inspect for mlino-v1-local-db and mlino-v1-read-api (Image ID, StartedAt, health);
   _prisma_migrations (expect six, all finished); row counts of every public table (names and counts only).
2. Fresh backup with the robust method B1-B6 (same as G7b): pg_dump -Fc -f inside the container, docker cp to
   C:\Users\galexy\mlino-backups\mlino_v1_pre_g8_<UTC>.dump, SHA-256 match, pg_restore --list > 0.
3. Rollback anchor: docker tag <current read-api image ID> mlino-v1-read-api:pre-g8. Record it.
4. Temporary detached worktree of origin/main OUTSIDE the repo. From its implementation/ directory run:
   docker compose -p implementation up -d --build v1-read-api
   (the project name MUST be "implementation" so the existing db container and volume
   implementation_mlino_v1_local_db_data are reused; v1-migrate will run and must report no pending migrations).
5. Verify:
   a) v1-migrate exit code 0 and output contains no applied migration (already up to date)
   b) _prisma_migrations still six; every public-table row count identical to step 1
   c) mlino-v1-local-db: same container (StartedAt unchanged) or, if recreated, same volume and identical counts
   d) mlino-v1-read-api: new Image ID, running, no Prisma or startup errors in its logs
   e) unauthenticated HTTP request returns 401 (auth boundary intact)
6. On failure of a)-e): stop the new read-api container, run the pre-g8 image in its place with the same compose
   configuration (or docker compose with the image override), re-verify step-1 state, report and STOP.
7. Remove the temp worktree; git worktree prune. Evidence (no credentials, no row data, not the dump) in
   mlino2/validation/g8/ on codex/core-prisma-foundation. Report
   AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G8_V1_RUNTIME_REBUILD_REPORT.md. Append to mlino2/HANDOFF/HANDOFF_STATE.md.
   Push that branch. STOP. Await Architecture Guardian review.
```

### Allowed changes
- **Docker:** build imageهای stack V1 از `main` · جایگزینی container `mlino-v1-read-api` · اجرای بی‌اثر `v1-migrate` · tag `mlino-v1-read-api:pre-g8`
- **پشتیبان تازه** در `C:\Users\galexy\mlino-backups\`
- **شاخه‌ی Core:** `mlino2/validation/g8/**` · گزارش G8 · Handoff فقط افزودنی

### Forbidden changes
- هر تغییر در داده، schema یا volume پایگاه داده · `down -v` · حذف volume یا image `pre-g8`
- هر تغییر در `main`، V2، `implementation/**` یا `_PUSH_STAGING`
- اجرای آزمون‌های V1 روی این پایگاه داده
- هر گام پس از گزارش G8 بدون بازبینی نگهبان

---

## ۵. وضعیت دروازه‌ها — Core Foundation

| دروازه | موضوع | وضعیت |
|---|---|---|
| G1 | اعتبارسنجی PostgreSQL | ✅ با شرط بسته |
| G2 | شاخه‌ی Core از `main` | ✅ |
| G3 | CCR — تصویب مالک | ✅ |
| G4 | `schema.prisma` + migration | ✅ |
| G5 | سازگاری V1 (۲۴۹/۲۴۹) | ✅ |
| G6 | ادغام در `main` (`f40a3f5`) | ✅ |
| **G7** | **migration روی V1 محلی، با پشتیبان** | ✅ **بسته** |
| G8 | rebuild runtime V1 | ⏳ اختیاری — تصویب مالک |
| فاز بعد | سرویس و Repository Core | ⏳ مشخصات طراحی لازم |

من کلاد هستم
