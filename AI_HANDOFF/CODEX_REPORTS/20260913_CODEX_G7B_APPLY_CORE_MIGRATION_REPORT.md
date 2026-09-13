# گزارش اجرای G7b — پشتیبان‌گیری و اعمال migration بنیاد Core روی V1 محلی

**تاریخ:** ۲۰۲۶-۰۹-۱۳
**INSTRUCTION_ID:** `CODEX-20260913-G7B-APPLY-CORE-MIGRATION-LOCAL-RETRY-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
**REVIEW_REFERENCE:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7_BACKUP_HARD_STOP.md@eb9b72b24ba8b343051c5e0365a04dfe77bb8b39`
**BASE_INSTRUCTION:** `CODEX-20260913-G7-APPLY-CORE-MIGRATION-LOCAL-001`
**OWNER_APPROVAL:** G7 با دامنهٔ بدون تغییر تصویب شده است.
**EVIDENCE_COMMIT:** `b62546ec2e1aafd009a2cf80c654ac78d495619b`

## ۱. Task اجراشده

اجرای G7 از ابتدا و با روش پشتیبان‌گیری اصلاح‌شدهٔ B1 تا B6 انجام شد. پیش از هر نوشتن، وضعیت پایگاه با شواهد G7 تطبیق داده شد؛ پشتیبان معتبر بیرون از مخزن ساخته شد؛ سپس فقط migration `20260913010000_add_core_foundation` روی `mlino-v1-local-db` اعمال و تمام کنترل‌های الزامی پس از migration اجرا شد.

وضعیت نهایی: **PASS — migration اعمال شد و rollback لازم نشد.**

## ۲. اسناد منبع استفاده‌شده

- `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7_BACKUP_HARD_STOP.md` در Commit `eb9b72b24ba8b343051c5e0365a04dfe77bb8b39`
- `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G6_MERGE.md`
- `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G7_LOCAL_MIGRATION.md`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md`
- `implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql`
- شواهد تغییرناپذیر `mlino2/validation/g7/**`
- Handoff زندهٔ `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

## ۳. فایل‌های تغییرکرده

Commit شواهد `b62546ec2e1aafd009a2cf80c654ac78d495619b` فقط ۳۸ فایل تازه زیر `mlino2/validation/g7b/**` دارد:

- `README.md`، `COMMANDS.md` و `VALIDATION_RESULTS.md`
- ۳۲ log بدون credential و بدون دادهٔ ردیفی
- `sql/post_migration_validation.sql`
- `scripts/validate-post-state.ps1`
- `scripts/fingerprint-prisma-install.sh`

در Commit گزارش فقط این فایل و یک ورودی افزودنی در `mlino2/HANDOFF/HANDOFF_STATE.md` ثبت می‌شوند.

تغییر عملیاتی مجاز: فقط migration مصوب در پایگاه محلی V1. فایل پشتیبان خارج از مخزن باقی مانده است.

## ۴. فایل‌ها و محیط‌های تغییرنکرده

- `implementation/**`، از جمله `schema.prisma`، migrationها، backend، API و تست‌ها
- ADRها، تصمیم‌های معماری، قراردادها و `mlino_book/**`
- `main` و شاخهٔ `codex/v2-intent-flow-foundation`
- `mlino2/validation/g7/**`
- نصب Prisma در `C:\mlino code\_PUSH_STAGING\implementation\node_modules`
- imageها و volumeهای Docker

هیچ تست V1، rebuild، restart، `docker compose`، حذف volume، `DROP`، `TRUNCATE` یا `DELETE` اجرا نشد.

## ۵. تست‌ها و اعتبارسنجی‌های اجراشده

- کنترل fresh pre-state: سلامت کانتینر، پنج migration کامل، نام و شمار ده جدول موجود
- مقایسهٔ pre-state تازه با `mlino2/validation/g7/logs/pre-table-counts.log`
- پشتیبان B1 تا B6: `pg_dump -Fc -f` داخل کانتینر، hash و `pg_restore --list` داخل کانتینر، `docker cp` و hash میزبان
- Prisma 5.22.0 از محل فقط‌خواندنی: `migrate status` پیش و پس و `migrate deploy`
- بررسی ledger، شمار همهٔ جدول‌ها، ۱۲ جدول Core، شش ایندکس لازم، ۲۹ CHECK، ۱۳ Trigger، ۳۰ FK و ایندکس ExternalWorkspaceLink
- بررسی سلامت کانتینر PostgreSQL و پاسخ API خواندنی V1
- اثر انگشت چهار پوشهٔ Prisma پیش و پس
- حذف و prune کردن worktree موقت

## ۶. نتایج تست‌ها

- pre-state: **PASS** — دقیقاً پنج migration و شمارهای یکسان با G7
- پشتیبان: **PASS**
  - مسیر: `C:\Users\galexy\mlino-backups\mlino_v1_pre_core_20260913T121927Z.dump`
  - اندازه: `22242` بایت
  - SHA-256 داخل کانتینر: `f3d2208ad55ad4e19ee2d4c458d85d41694cc8ac0eb082784283381b049b3c09`
  - SHA-256 میزبان: `f3d2208ad55ad4e19ee2d4c458d85d41694cc8ac0eb082784283381b049b3c09`
  - تطبیق hash: **PASS**
  - شمار خطوط object در `pg_restore --list`: `68`
  - فایل موقت کانتینر حذف شد و فایل میزبان حفظ شد.
- وضعیت پیش از deploy: **PASS** — فقط migration هدف در انتظار بود.
- deploy: **PASS** — فقط `20260913010000_add_core_foundation` اعمال شد.
- ledger نهایی: **PASS** — شش migration کامل، صفر rollback.
- داده‌های موجود: **PASS** — شمار تمام جدول‌های قبلی ثابت؛ فقط ledger از ۵ به ۶ رسید.
- ۱۲ جدول Core: **PASS** — حاضر و خالی.
- C1 تا C5، C6 تا C11 و موجودی محافظت‌شده: **PASS**.
- Triggerها: **PASS** — ۱۳ غیرسیستمی، شامل allow-list بستهٔ ۱۲ Trigger حساس.
- FKهای Core: **PASS** — ۳۰ مورد، همگی `RESTRICT/RESTRICT`.
- Prisma status: **PASS** — `Database schema is up to date`.
- PostgreSQL: **PASS** — running/healthy، restart صفر.
- API V1: **PASS** — running، restart صفر؛ درخواست بدون token پاسخ 401 مرز احراز هویت گرفت.
- اثر انگشت `_PUSH_STAGING`: **PASS** — چهار مقدار پیش و پس برابر.
- پاک‌سازی: **PASS** — worktree موقت حذف و prune شد.

## ۷. Commit hash

- Commit شواهد: `b62546ec2e1aafd009a2cf80c654ac78d495619b`
- شاخه: `codex/core-prisma-foundation`
- Commit گزارش و Handoff پس از ثبت این سند در پاسخ تحویل اعلام می‌شود.

## ۸. ریسک‌های باقی‌مانده

- فایل پشتیبان حاوی داده است؛ باید خارج از مخزن و با دسترسی محدود نگهداری شود.
- `mlino-v1-read-api` همچنان همان image در حال اجراست و در این مرحله rebuild نشده است. این رفتار مطابق ممنوعیت G7b است؛ migration سازگاری را نشکست، اما استفادهٔ کد جدید از Prisma Client تازه مرحله‌ای جدا می‌خواهد.
- کنترل‌ها صحت ساختار و حفظ شمار ردیف‌ها را ثابت می‌کنند؛ محتوای ردیفی عمداً خوانده یا در شواهد ثبت نشده است.

## ۹. پرسش‌های باز

- آیا Guardian بسته‌شدن G7b و کفایت پشتیبان را تأیید می‌کند؟
- آیا گام بعد باید rebuild کنترل‌شدهٔ read API با Prisma Client تازه باشد یا ابتدا پیاده‌سازی service/repositoryهای Core آغاز شود؟ این انتخاب خارج از اختیار Codex است.

## ۱۰. گام بعدی پیشنهادی

Architecture Guardian این گزارش و شواهد Commit `b62546ec2e1aafd009a2cf80c654ac78d495619b` را مستقل بازبینی کند. Codex تا دریافت وضعیت `APPROVED_NEXT_STEP`، `APPROVED_WITH_FIXES` یا `BLOCKED` هیچ مرحلهٔ دیگری را آغاز نمی‌کند.

من کدکس هستم.
