# گزارش اجرای G3 — پیش‌نویس و اعتبارسنجی CCR شِمای Core

## ۱. Task executed

- `INSTRUCTION_ID`: `CODEX-20260912-G3-CCR-DRAFT-001`
- `TARGET_HANDOFF_ID`: `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
- `REVIEW_REFERENCE`: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G2_CORE_BRANCH.md@89aef7ab70573283621f1396efade87d7e5d21db`
- `BASE_COMMIT`: `ee7fb95372b7ca1805f14dec8fee0a5e6a5fb1ec`
- Commit اصلی artifactها: `1c53ba27f940dc5c9a0bccf30a2b7e39181463fd`

پیش‌نویس CCR شِمای Core با وضعیت `DRAFT — pending owner approval` ساخته شد. متن دقیق ۱۲ مدل، ۱۵ enum و SQL دستی C1 تا C15 استخراج و در PostgreSQL یک‌بارمصرف اعتبارسنجی شد. D1 تا D5 طبق تأیید صریح مالک همگی `DECIDED` ثبت شده‌اند: B1، W1 الزامی/W2 اختیاری، Prisma 5.22.0، نبود FK نگاشت بیرونی در CCR اول و دو قاعده‌ی migration.

## ۲. Source documents used

- بازبینی مجوزدهنده‌ی G2 در Commit `89aef7a`
- `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` v3
- بازبینی مستقل Prisma و سند حل blockerها
- گزارش‌های PostgreSQL G1، G1b و G1c
- ADR-0001 تا ADR-0012
- CCR مصوب ExternalWorkspaceLink به‌عنوان الگوی ساختار

Hash همه‌ی منابع فوق روی بایت‌های canonical فرمان `git show COMMIT:PATH` محاسبه و در `mlino2/validation/g3/logs/canonical-git-hashes.log` ثبت شد؛ مقدارها با جدول CCR برابرند.

## ۳. Files changed

- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md`
- ۳۲ artifact زیر `mlino2/validation/g3/` شامل متن استخراج‌شده، SQL تولیدی، assertionها، scriptها، logها، نتایج و manifest
- همین گزارش
- `mlino2/HANDOFF/HANDOFF_STATE.md` فقط با یک رکورد افزودنی تحویل به‌روزرسانی می‌شود.

Commit نخست ۳۳ فایل artifact را اضافه کرده است. گزارش و رکورد Handoff در Commit bookkeeping بعدی ثبت می‌شوند.

## ۴. Files not changed

- `implementation/prisma/schema.prisma`
- همه‌ی `implementation/prisma/migrations/**`
- `implementation/package.json` و همه‌ی lockfileها
- کد Backend، serviceها و testهای برنامه
- ADRها و اسناد معماری منتقل‌شده
- `ExternalWorkspaceLink` و migration/service/testهای آن
- شاخه‌ی V2 و `main`
- فایل‌های ریشه‌ی Handoff و گزارش‌های Claude

هیچ merge، rebase، cherry-pick، force-push، schema production یا migration برنامه انجام نشد.

## ۵. Tests executed

- Prisma CLI 5.22.0: `validate` و `generate` با `generator.output` صریح در پوشه‌ی موقت
- `migrate diff --from-migrations` با پنج migration موجود و Shadow Database یک‌بارمصرف
- بازپخش کامل پنج migration، SQL تولیدی Core و SQL دستی C1 تا C15 روی PostgreSQL 16.15
- C1 تا C5 با انتظار `23505`
- C6 تا C11 با انتظار `23514`
- C12 تا C15 با انتظار `P0001`
- FK بین‌سازمانی با انتظار `23503`
- W1 با Prisma Client و انتظار `P2003`
- C15: مسیر صحیح Publication، رد تغییر مستقیم، شکست transition نامعتبر و نبود نشت پس از savepoint
- دو نشست هم‌زمان انتشار
- inventory همه‌ی FKها، CHECKها، indexها و Triggerها پیش و پس از migration نامرتبط
- fingerprint چهار پوشه‌ی نصب فقط‌خواندنی Prisma پیش و پس از عملیات
- پاک‌سازی container، volume و tooling موقت

## ۶. Test results

- Prisma schema: `PASS`
- Client generation در مسیر موقت: `PASS`
- خروجی diff از migrationها: `PASS` و پیش از canonicalization بایت‌به‌بایت برابر با SQL ثبت‌شده
- بازپخش تاریخچه: `PASS`
- C1 تا C15: `PASS` با SQLSTATEهای دقیق
- tenant isolation SQL: `PASS` با `23503`
- tenant isolation Prisma: `PASS` با `P2003`
- رقابت انتشار: `PASS`؛ یک برنده و یک بازنده با `23505`
- همه‌ی FKهای ۱۲ مدل جدید Core: `RESTRICT/RESTRICT`
- migration نامرتبط: فقط `validation_note` را افزود؛ inventory ۱۵۰ خطی پیش و پس hash یکسان `1c75cd6266a8033c3c36e6fb499d2fd55c378c6e7a5eb909a9fdcc5842e443c3` داشت.
- fingerprint نصب V1: هر چهار مقدار پیش و پس دقیقاً برابر بود.
- teardown: container باقی‌مانده `0`، volume نام‌دار G3 باقی‌مانده `0`، پوشه‌ی `g3-tooling` حذف شد.

اجرای نخست C6 یک نقص واقعی در متن اولیه یافت: حالت یک جزء `NULL` در `CHECK` پذیرفته می‌شد. متن CCR اصلاح شد تا هر دو جزء رابطه‌ی مرکب صریحاً با هم مقدار داشته باشند؛ محیط از صفر بازسازی شد و C6 با `23514` عبور کرد. خطاهای اولیه‌ی credential، resolve شدن Client، inventory و timeout یک نشست نیز در `validation-incidents.log` ثبت شده‌اند و هیچ‌کدام به‌عنوان شاهد PASS استفاده نشده‌اند.

## ۷. Commit hash

- Commit اصلی CCR و شواهد: `1c53ba27f940dc5c9a0bccf30a2b7e39181463fd`
- شاخه: `codex/core-prisma-foundation`
- Commit bookkeeping گزارش/Handoff پس از ثبت hash گزارش ساخته می‌شود.

## ۸. Remaining risks

- CCR هنوز `DRAFT` است و تا بازبینی نگهبان و تصویب مالک مجوز تغییر `schema.prisma` نیست.
- B1 برای تشخیص nested trigger از `pg_trigger_depth()` استفاده می‌کند؛ فهرست بسته‌ی Trigger از راه بازبینی migration، inventory و محدودیت DDL حفظ می‌شود، نه از تشخیص نام caller در runtime.
- دو FK قدیمی cascade در جدول `_EventCoreEntities` متعلق به شِمای پیشین‌اند؛ آزمون `RESTRICT` عمداً فقط ۱۲ مدل Core این CCR را سنجید.
- FK `ExternalWorkspaceLink → Organization` طبق D4 خارج از این CCR باقی مانده است.
- registry کلیدهای permission، قرارداد JSON و استفاده‌ی production نیازمند مراحل جداگانه‌ی مصوب‌اند.

## ۹. Open questions

- آیا Architecture Guardian متن CCR و شواهد G3 را تأیید می‌کند؟
- پس از نظر Guardian، آیا مالک CCR را از `DRAFT` به `APPROVED` ارتقا می‌دهد؟

هیچ تصمیم معماری تازه‌ای توسط Codex گرفته نشده است.

## ۱۰. Recommended next step

Architecture Guardian این گزارش، Commit اصلی، انطباق متن استخراج‌شده با CCR، اصلاح C6 و شواهد G3 را مستقل بررسی کند. فقط پس از تأیید Guardian، تصویب صریح مالک و دستور Handoff جدید می‌توان مرحله‌ی تغییر `schema.prisma` و ساخت migration برنامه را آغاز کرد. Codex پس از Push این تحویل متوقف می‌شود.

من کدکس هستم.
