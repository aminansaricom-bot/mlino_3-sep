# گزارش اجرای G10c2 — اصلاحات Profile و Capability

## ۱. کار اجراشده

اصلاحات R1 و Y1 تا Y7 در برش G10c2 روی شاخه‌ی `codex/core-g10c-profile-capability` اجرا شد. دامنه فقط سرویس‌های Core، آزمون اختصاصی همان برش و شواهد اعتبارسنجی بود.

## ۲. اسناد و مبنای اجرا

- دستور: `CODEX-20260914-G10C2-PROFILE-CAPABILITY-FIXES-001`
- بازبینی پین‌شده: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C_PROFILE_CAPABILITY.md`
- commit بازبینی: `c9dded7a541d82a9d6a2e52547d2867370a9c7e0`
- SHA-256 بازبینی از `git show`: `17434d33ed4116d557339302fcd21dabb4f3baac37282e8569f5d543ff52727d`
- `git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS` ناموفق بود؛ بررسی GW2-P با commit موجود، ancestor بودن نسبت به `origin/main` و hash سند موفق شد.

## ۳. فایل‌های تغییرکرده

- `implementation/core/business-profile-service.ts`
- `implementation/core/capability-service.ts`
- `implementation/core/publication-service.ts`
- `implementation/test/core/g10c-profile-capability.spec.ts`
- `mlino2/validation/g10c2/*`

## ۴. فایل‌های تغییرنکرده

`schema.prisma`، migrationها، `types.ts`، `tsconfig`، `setup-env.ts`، `test-db-guard.ts`، Offer، Evidence، HTTP، main، `_PUSH_STAGING` و فایل‌های خارج از دامنه تغییر نکردند.

## ۵. نتیجه‌ی اصلاحات

- R1: allowlist صریح برای create/update پروفایل و capability اضافه شد؛ کلیدهای ناشناخته و فیلدهای جعلی مانند confirmation، status، freshUntil، revision و projection رد می‌شوند و ردیف بدون تغییر می‌ماند. وضعیت `HUMAN_CONFIRMED` فقط از مسیر `confirm()` قابل دستیابی است.
- Y1: انتشار، انتشار تکراری، تغییر revision و انتشار دوباره، برداشت، برداشت دوباره و `gate_snapshot` آزموده شد.
- Y2: نبود مجوز برای create/update/link/unlink پروفایل، confirm capability و publish/withdraw انتشار رد می‌شود.
- Y3: هم محافظ projection و هم محافظ create مستقیم با وضعیت `PUBLISHED` آزموده شد.
- Y4: نتیجه‌ها یکنواخت شدند: publish معمولی `PUBLISHED`، انتشار هم‌revision `ALREADY_PUBLISHED` و برداشت `WITHDRAWN`.
- Y5: target نامعتبر و `OFFER_VERSION` پیش از دسترسی به ردیف هدف رد می‌شوند.
- Y6: claimهای `SUSPENDED`، `REJECTED` و claim سازمان دیگر با S13-A رد می‌شوند.
- Y7: نام خالی یا فقط فاصله در update پروفایل رد می‌شود و مقدار قبلی حفظ می‌گردد.

## ۶. آزمون‌ها و نتایج

- `npm run build`: موفق.
- `npm run prisma:migrate:deploy` روی PostgreSQL موقت پورت ۵۴۹۹: هر ۶ migration موفق.
- `npm test -- --runInBand test/core/g10c-profile-capability.spec.ts`: یک suite و ۱۳ تست موفق.
- `npm test -- --runInBand`: ۲۵ suite و ۳۲۶ تست موفق.

## ۷. ایمنی محیط آزمون

آزمون‌ها فقط با PostgreSQL disposable روی tmpfs و پورت ۵۴۹۹ اجرا شدند. volume قبل و بعد یکسان بود؛ کانتینر `mlino-g10c2-postgres` پس از آزمون حذف شد. هیچ اتصال یا اجرایی روی پورت ۵۴۳۵، پایگاه زنده، `_PUSH_STAGING` یا فایل credential انجام نشد.

## ۸. manifest شواهد

manifest مبتنی بر bytes خروجی `git show` در `mlino2/validation/g10c2/LF-MANIFEST.txt` ثبت شده و commit پایه‌ی آن `4cbdaa94bac50ceb9e8d59ea6d51b5bda4408d00` است.

## ۹. ریسک‌ها و محدودیت‌ها

این گزارش فقط اجرای اصلاحات G10c2 را پوشش می‌دهد. Offer، Evidence و HTTP عمداً خارج از این برش هستند. fetch شبکه‌ای به‌علت نبود credential شکست خورد، اما GW2-P برای سند بازبینی موفق شد.

## ۱۰. وضعیت و گام بعد

وضعیت: **DELIVERED_AWAITING_GUARDIAN_REVIEW**.

commit محلی اصلاحات: `4cbdaa94bac50ceb9e8d59ea6d51b5bda4408d00`.
پس از ثبت گزارش و handoff، فقط به شاخه‌ی `codex/core-g10c-profile-capability` push می‌شود و کار متوقف می‌گردد. شروع G10d یا ادغام با main بدون بازبینی Guardian مجاز نیست.

من کدکس هستم.
