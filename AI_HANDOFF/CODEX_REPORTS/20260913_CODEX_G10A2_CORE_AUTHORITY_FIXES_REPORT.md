# گزارش اجرای G10A2 — اصلاحات هستهٔ اختیار

## ۱. Task executed

اصلاحات A1 تا A9 دستور `CODEX-20260913-G10A2-CORE-AUTHORITY-FIXES-001` اجرا شد. دامنه فقط لایهٔ اختیار Core، آزمون‌های متمرکز، شواهد اعتبارسنجی و ثبت Handoff بود.

## ۲. Source documents and precondition

منبع اصلی، بازبینی pinned زیر بود:

- `AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10A_CORE_AUTHORITY_SLICE.md`
- commit: `21220d90b06970e2df1bf066636f7d0cbddbd503`
- SHA-256 روی خروجی git: `12f24458009e7e09b3103dfe2374b40170e471a44a908ddcb8fd12170ec79d4c`

`git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS (0x8009030e)` ناموفق بود. طبق GW2-P، هر سه بررسی مرجع موفق شدند: commit موجود بود، جد مادری `origin/main` بود و SHA-256 با مقدار pinned برابر بود. هیچ credential، token، git config یا credential helper تغییر نکرد.

## ۳. Files changed

فایل‌های تولیدشده یا اصلاح‌شده:

- `implementation/core/auth-context.ts`
- `implementation/core/bootstrap-service.ts`
- `implementation/core/error-adapter.ts`
- `implementation/core/membership-service.ts`
- `implementation/core/permission-grant-service.ts`
- `implementation/core/platform-identity-verifier.ts`
- `implementation/core/repositories.ts`
- `implementation/test/core/core-authority.spec.ts`
- `implementation/test/core/db-guard.ts`
- `implementation/test/core/error-adapter.spec.ts`
- `mlino2/validation/g10a2/*`
- این گزارش
- ورودی append-only در `mlino2/HANDOFF/HANDOFF_STATE.md`

## ۴. Files not changed

در این مرحله هیچ تغییری در این موارد داده نشد:

- `implementation/prisma/schema.prisma`
- migrationها
- `implementation/shared-contracts/types.ts`
- `implementation/tsconfig.json`
- Backend و HTTP APIهای موجود خارج از Core
- V2، `main` و `_PUSH_STAGING`
- ADRها و گزارش‌های قبلی

## ۵. Implementation evidence for A1–A9

- **A1:** `PlatformIdentityVerifier` و `requireVerifiedPlatformActor` اضافه شد؛ `AuthContext` دیگر `platformIdentityRef` ندارد. تست credential نامعتبر/غایب و مسیر مستقل platform در `core-authority.spec.ts` رد شدن fail-closed را ثابت می‌کند.
- **A2:** bootstrap فقط با actor تأییدشده اجرا می‌شود و دلیل grantهای founding به شکل `bootstrap:platform:test` ثبت شد. آزمون bootstrap تکراری `CONFLICT` می‌دهد و `createFounding` در سطح repository وجود ندارد.
- **A3:** `lockOrganization` با `SELECT ... FOR UPDATE` پیش از mutationهای اختیار اجرا می‌شود. شمارش مدیران فقط grant فعال روی membership فعال را می‌شمارد. آزمون آخرین مدیر و آزمون رقابت دو revoke روی یک grant، یک موفق و یک شکست را ثابت کردند.
- **A4:** سرویس‌ها خطای پایگاه را از `mapCoreDatabaseError` عبور می‌دهند. آزمون‌های adapter ده پیام trigger را پوشش می‌دهند و آزمون `maps a real PostgreSQL trigger error through the Core error adapter` شکل واقعی خطای trigger را بررسی می‌کند.
- **A5:** `db-guard.ts` قبل از هر query در `beforeAll` اجرا می‌شود و فقط localhost/127.0.0.1 روی پورت ۵۴۹۹ را می‌پذیرد؛ `.env`، `:5435` و `@db:` را رد می‌کند. پاک‌سازی آزمون فقط با prefix `g10a2-` انجام شد.
- **A6:** rollback bootstrap با ورودی نامعتبر و نبود organization پس از شکست آزموده شد. مسیر founding خارج از bootstrap در repository عمومی وجود ندارد.
- **A7:** revoke دوباره `CONFLICT` می‌دهد و audit نخست حفظ می‌شود؛ grant به membership غیرفعال `VALIDATION_FAILED` می‌دهد.
- **A8:** فایل‌های تغییرکردهٔ Core و repository بازآرایی شدند تا statementهای جدید در خطوط جدا باشند؛ `git diff --check` موفق بود.
- **A9:** ادعاهای این گزارش به نام آزمون‌ها، خروجی migration/build/test و فایل‌های evidence در `mlino2/validation/g10a2/` متصل شده‌اند.

## ۶. Database safety and evidence

یک PostgreSQL 16 موقت با `tmpfs` روی پورت ۵۴۹۹ ساخته شد. guard محیط را قبل از query بررسی کرد. شش migration موجود با موفقیت اعمال شد. خروجی‌های migration، build، آزمون‌ها، شناسهٔ container، tmpfs، حذف container و فهرست volumeها در `mlino2/validation/g10a2/` ثبت شده‌اند.

container با `docker rm -f` حذف شد. مقایسهٔ `volumes-before-final.txt` و `volumes-after-final.txt` در `volume-diff-final.txt` مقدار `NO_VOLUME_CHANGE` دارد. دیتابیس V1 محلی و `_PUSH_STAGING` استفاده نشدند.

## ۷. Tests executed and results

- `npm run build` — موفق.
- `npm test -- --runInBand implementation/test/core` — ۲ مجموعه و ۲۰ آزمون موفق.
- `npm test -- --runInBand` — ۲۱ مجموعه و ۲۶۹ آزمون موفق.
- `npm run prisma:migrate:deploy` روی PostgreSQL موقت — هر ۶ migration موفق.
- آزمون رقابت authority — یک revoke موفق و یک `CONFLICT`.

در اجرای اولیه، سناریوی آزمون رقابت به‌اشتباه دو مدیر متفاوت را هم‌زمان حذف می‌کرد؛ هر دو موفق شدند که با قاعدهٔ آخرین مدیر تناقضی ندارد. آزمون به دو درخواست هم‌زمان برای همان آخرین grant اصلاح شد و اجرای نهایی موفق شد.

## ۸. Commits

- commit کد و آزمون و شواهد اصلی: `edc88464303030843c339820db2b131c49d01490`
- commit تکمیل شواهد log: `3fb8a0f76006620d2a2dbb2291c186549a621c79`
- commit اولیهٔ گزارش و Handoff: `92a3dbfdafa76517819a908f751068295a39dd78`

## ۹. Remaining risks and open questions

- `git fetch origin` همچنان به خطای احراز هویت Schannel وابسته است؛ اعتبار مرجع با GW2-P ثبت شد.
- مسیر platform verifier در این مرحله یک port داخلی است؛ اتصال آن به هویت واقعی پلتفرم در دامنهٔ مرحلهٔ بعد است.
- اجرای G10B، API، تغییر schema، migration جدید یا اتصال V1/V2 در این مرحله انجام نشده و نیازمند دستور و بازبینی جداگانه است.

## ۱۰. Recommended next step

این تحویل برای بازبینی Architecture Guardian متوقف می‌شود. بدون تصمیم و Handoff جدید، G10B یا هیچ تغییر بعدی در schema، migration، API یا اتصال V1/V2 آغاز نمی‌شود.

من کدکس هستم.
