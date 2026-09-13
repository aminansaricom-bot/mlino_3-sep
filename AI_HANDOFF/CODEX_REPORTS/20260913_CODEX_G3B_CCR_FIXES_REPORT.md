# گزارش اجرای G3b — اصلاح و اعتبارسنجی CCR شِمای Core

## ۱. Task executed

- `INSTRUCTION_ID`: `CODEX-20260913-G3B-CCR-FIXES-001`
- `TARGET_HANDOFF_ID`: `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
- `REVIEW_REFERENCE`: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G3_CCR_DRAFT.md@3e19b541d1db2f629ca758faaba4dbbf1b30fbda`
- `BASE_COMMIT`: `48834d189c95cc7130913944d123102c380a174a`
- تصمیم مالک: `D6=A`
- Commit اصلی اصلاحات و شواهد: `fcddfc2ef2faf76a2d6f8ded7eb4f68ec07a71cb`

R-1 تا R-7 در متن CCR اعمال و بسته‌ی مستقل `g3b` از صفر ساخته و اجرا شد. وضعیت CCR عمداً `DRAFT — pending owner approval` باقی ماند.

## ۲. Source documents used

- بازبینی Guardian در Commit `3e19b541d1db2f629ca758faaba4dbbf1b30fbda`
- پیش‌نویس CCR تحویل G3 در Commit `48834d189c95cc7130913944d123102c380a174a`
- پنج migration و `schema.prisma` از `origin/main`
- ADRها و تصمیم‌های D1 تا D5 ثبت‌شده در CCR
- تأیید صریح مالک برای D6=A

Hash بازبینی و فایل‌های Prisma مرجع با بایت‌های `git show` در `mlino2/validation/g3b/logs/canonical-git-hashes.log` ثبت شده است.

## ۳. Files changed

- ویرایش: `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md`
- ایجاد: ۳۱ artifact زیر `mlino2/validation/g3b/`
- ایجاد: همین گزارش
- افزودن یک رکورد در انتهای `mlino2/HANDOFF/HANDOFF_STATE.md`

جدول اصلاحات:

| یافته | اقدام | نتیجه |
|---|---|---|
| R-1 | افزودن ستون‌های `published_content_revision` و `published_at` به Guardهای C15 | PASS |
| R-2 | Trigger پیوند با INSERT/UPDATE/DELETE و قفل والد | PASS |
| R-3 | D6=A؛ افزایش خودکار revision برای همه‌ی فیلدهای عمومی اعلام‌شده | PASS |
| R-4 | پذیرش بازنشر Profile/Capability فقط با revision بزرگ‌تر | PASS |
| R-5 | افزودن T1 تا T12 | PASS |
| R-6 | بازگشت به `Membership` / `memberships` | PASS |
| R-7 | ثبت صریح قواعد گذار در D1 | PASS |

## ۴. Files not changed

- `mlino2/validation/g3/**`، `g1b/**` و `g1c/**`
- `implementation/prisma/schema.prisma` و تمام migrationهای محصول
- `implementation/package.json`، lockfileها، Backend، serviceها و testهای برنامه
- ADRها، `mlino_book/**` و اسناد طراحی
- فایل‌های ریشه‌ی `AI_HANDOFF` و گزارش‌های Claude
- شاخه‌ی V2 و `main`
- نصب Prisma در `_PUSH_STAGING`

هیچ FK به `external_workspace_links`، merge، rebase، cherry-pick یا force-push ایجاد نشد.

## ۵. Tests executed

- Prisma 5.22.0: version، validate و generate با output صریح در TEMP
- `migrate diff --from-migrations` از پنج migration canonical در `origin/main`
- diff مستقل schema-to-schema و مقایسه‌ی بایت‌به‌بایت
- بازپخش کامل پنج migration، SQL تولیدی و SQL دستی CCR در PostgreSQL 16.15
- C1 تا C15 با SQLSTATE دقیق
- W1 از مسیر Prisma Client با کد دقیق
- T1 تا T12
- migration نامرتبط و inventory پیش/پس
- fingerprint چهار پوشه‌ی Prisma پیش/پس
- teardown کانتینر، volume و tooling موقت

## ۶. Test results

### نتایج T1 تا T12

| تست | نتیجه |
|---|---|
| T1 — Profile با revision برابر | PASS |
| T2 — Profile با revision نابرابر | PASS، `P0001` |
| T3 — D6/A و پنهان‌شدن محتوای stale | PASS؛ ۹ فیلد عمومی Profile هرکدام دقیقاً +1 |
| T4 — تغییر مستقیم سه projection | PASS، هر سه `P0001` |
| T5 — بازنشر Profile | PASS؛ بزرگ‌تر پذیرفته، برابر/کوچک‌تر `P0001` |
| T6 — مسیر کامل Capability | PASS؛ ۴ فیلد عمومی +1 و بازنشر محدود |
| T7 — INSERT/DELETE پیوند منتشرشده | PASS، هر دو `P0001` |
| T8 — INSERT/DELETE پیوند پیش‌نویس | PASS |
| T9 — UPDATE پیوند | PASS، `P0001` |
| T10 — DELETE Publication | PASS، `P0001` |
| T11 — ممیزی Claim/Membership/Grant | PASS، همه `23514` |
| T12 — فهرست بسته‌ی Trigger | PASS، مجموعه‌ی دقیق ۱۲ از ۱۲ |

### سایر نتایج

- C1 تا C5: `23505` مطابق انتظار
- C6 تا C11: `23514` مطابق انتظار
- C12 تا C15: `P0001` مطابق انتظار
- FK بین‌سازمانی SQL: `23503`
- W1 Prisma: `P2003`
- همه‌ی FKهای ۱۲ مدل Core: `RESTRICT/RESTRICT`
- diff نامرتبط فقط ستون `validation_note` را افزود؛ inventory ۱۵۲ خطی پیش و پس hash یکسان `f94eea3ea84b703f739f9c4b6833eaf1ff6bc52171291927d794cf9c8bcc465a` داشت.
- fingerprint چهار پوشه‌ی `_PUSH_STAGING` پیش و پس دقیقاً برابر مبنای Guardian بود.
- بازپخش نهایی از تاریخچه‌ی `origin/main`: PASS
- teardown: container باقی‌مانده صفر، volume نام‌دار G3b صفر و `g3b-tooling` حذف شد.

## ۷. Commit hash

- Commit اصلی CCR و شواهد: `fcddfc2ef2faf76a2d6f8ded7eb4f68ec07a71cb`
- شاخه: `codex/core-prisma-foundation`
- Commit گزارش و Handoff پس از ثبت hash این گزارش ساخته می‌شود.

## ۸. Remaining risks

- CCR هنوز DRAFT است و مجوز schema/migration محصول محسوب نمی‌شود.
- B1 هویت caller را در runtime تشخیص نمی‌دهد؛ امنیت آن به `pg_trigger_depth`، فهرست بسته‌ی دقیق، محدودیت DDL و بازبینی migration متکی است.
- semantics قراردادهای JSON، registry کلیدهای Permission و writerهای production در مراحل جداگانه باقی مانده‌اند.
- FK `ExternalWorkspaceLink → Organization` طبق D4 عمداً خارج از این CCR است.

## ۹. Open questions

- آیا Architecture Guardian اصلاحات R-1 تا R-7 و شواهد T1 تا T12 را تأیید می‌کند؟
- در صورت تأیید Guardian، آیا مالک CCR را صریحاً APPROVED می‌کند؟

Codex هیچ تصمیم معماری تازه‌ای نگرفته است.

## ۱۰. Recommended next step

Architecture Guardian Commit اصلی، متن CCR، استخراج دقیق SQL/Prisma و شواهد G3b را مستقل بازبینی کند. Codex پس از Push متوقف می‌شود. تغییر `schema.prisma` یا ایجاد migration فقط پس از تصویب مالک و Handoff جداگانه مجاز است.

من کدکس هستم.
