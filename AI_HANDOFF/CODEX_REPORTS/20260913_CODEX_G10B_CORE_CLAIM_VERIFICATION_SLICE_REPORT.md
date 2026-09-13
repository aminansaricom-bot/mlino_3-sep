# گزارش اجرای G10b — برش Claim و Verification هویت

## ۱. کار اجراشده

دستور `CODEX-20260913-G10B-CORE-CLAIM-VERIFICATION-SLICE-001` اجرا شد. هدف، افزودن سرویس‌های ثبت Claim هویت، آغاز و تصمیم‌گیری Verification، گذارهای محدود وضعیت، قفل تراکنشی و آزمون‌های مربوط بود. تصمیم مالک `S12-A` رعایت شد: بازگشت Claim از `SUSPENDED` به `VERIFIED` فقط از مسیر یک تصمیم Verification معتبر انجام می‌شود و وضعیت‌های `REJECTED` و `EXPIRED` پایانی هستند.

## ۲. منابع و پیش‌شرط‌ها

منابع استفاده‌شده:

- بازبینی pinned در commit `563cd3a818d2705c303cba2f4cea86357d6209c2` با SHA-256 ثبت‌شده در `mlino2/validation/g10b/review-source.txt`.
- تصمیم مالک در commit `c7e9a884a644319c2be498caa2fa7b0e4ee9a53c` با SHA-256 ثبت‌شده در `mlino2/validation/g10b/owner-source.txt`.
- کد موجود G10a3 در پایه‌ی `630f89a94e8656c00f0635e6dd134a2fcbec78b7`.

`git fetch origin` با موفقیت انجام شد و نیازی به مسیر GW2-P نبود.

## ۳. فایل‌های تغییرکرده

- `implementation/core/identity-claim-service.ts`
- `implementation/core/identity-verification-service.ts`
- `implementation/core/repositories.ts`
- `implementation/core/error-adapter.ts`
- `implementation/test/core/identity-claim-verification.spec.ts`
- `mlino2/validation/g10b/` شامل لاگ migration، build، تست‌ها، پاک‌سازی، منابع pinned و manifest است.

فهرست و SHA-256 فایل‌های کد و تست در `mlino2/validation/g10b/LF-MANIFEST.txt` ثبت شده و بر اساس بایت‌های `git show` ساخته شده است.

## ۴. فایل‌های تغییرنکرده

این مرحله هیچ تغییری در موارد زیر نداشت:

- `implementation/prisma/schema.prisma`
- migrationها
- `implementation/shared-contracts/types.ts`
- `tsconfig.json` و وابستگی‌ها
- Backend خارج از Core slice
- V2، `main` و `_PUSH_STAGING`
- ADRها و اسناد معماری

## ۵. پیاده‌سازی و شواهد رفتاری

- ثبت Claim با `identity_claim.submit` و عضویت فعال انجام می‌شود.
- خواندن Claim فقط با عضویت فعال سازمان انجام می‌شود.
- گذارهای پلتفرمی مجاز محدود به `VERIFIED→SUSPENDED`، `SUSPENDED→REJECTED` و `PENDING/VERIFIED/SUSPENDED→EXPIRED` است.
- گذار مستقیم به `VERIFIED` و گذار از وضعیت پایانی رد می‌شود.
- آغاز Verification شماره‌ی تلاش را زیر قفل ردیف Claim، با `max + 1`، تولید می‌کند.
- `markUnderReview` و `decide` فقط با هویت پلتفرم معتبر اجرا می‌شوند.
- تصمیم Verification و تغییر Claim در یک تراکنش انجام می‌شود.
- قفل سازمان و قفل Claim برای جلوگیری از رقابت در تغییرات هویتی استفاده شده است.
- خطای قید C1 به `CONFLICT: identifier already claimed` نگاشت می‌شود.
- تغییر Verification تصمیم‌گیری‌شده به Conflict نگاشت می‌شود.

## ۶. ایمنی پایگاه آزمون

- PostgreSQL 16 روی محیط موقت با `tmpfs` و پورت ۵۴۹۹ اجرا شد.
- شش migration موجود با موفقیت اعمال شدند.
- هیچ اتصال یا تغییری روی دیتابیس زنده‌ی V1 انجام نشد.
- کانتینر موقت پس از آزمون حذف شد.
- مقایسه‌ی volume قبل و بعد برابر با `NO_VOLUME_CHANGE` بود.
- شواهد اجرای migration، build، تست‌های Core، تست کامل و پاک‌سازی در `mlino2/validation/g10b/` ثبت شده است.

## ۷. آزمون‌ها و نتیجه

- `npm run build`: موفق.
- `npm test -- --runInBand implementation/test/core`: چهار suite و ۴۷ تست موفق.
- `npm test -- --runInBand`: بیست‌وسه suite و ۲۹۶ تست موفق.
- آزمون‌های G10b شامل گذارهای مجاز و غیرمجاز، S12-A، وضعیت‌های پایانی و ثبت Claim جدید، fail-closed پلتفرم، W1، شماره‌گذاری هم‌زمان، C1 بین دو سازمان، rollback تراکنش و immutability است.

در اجرای اولیه سه شکست دیده شد: نگاشت ناقص خطای C1، پذیرش ناخواسته‌ی گذار نامعتبر به `VERIFIED` و برخورد شناسه‌ی ثابت در اجرای مجدد آزمون. منطق نگاشت، جدول گذار و تولید شناسه‌ی آزمون اصلاح شد و اجرای نهایی بدون شکست انجام شد. این شکست‌های اولیه در `core-tests.log` برای traceability باقی مانده‌اند؛ نتیجه‌ی نهایی در `core-tests-final.log` و `full-tests.log` ثبت شده است.

## ۸. Commitها

- `d828d1e` — افزودن سرویس‌ها، repository lock، adapter و تست G10b.
- `6f02e3f` — ثبت لاگ‌های اجرای G10b.
- `ee4111f` — افزودن manifest هش LF.

## ۹. ریسک‌ها و پرسش‌های باز

- اتصال واقعی به ارائه‌دهنده‌ی هویت پلتفرم هنوز خارج از این slice است و verifier فعلی برای آزمون به‌صورت وابستگی تزریقی استفاده شد.
- مسیر API و persistence consumer برای این سرویس‌ها در این مرحله ساخته نشده است.
- سیاست‌های بعدی مربوط به اتصال این Claimها به لایه‌های بیرونی باید در Handoff جداگانه تصویب شوند.

## ۱۰. گام بعدی پیشنهادی

گام بعد فقط پس از بازبینی Guardian تعیین شود. این تحویل، اجرای خودکار G10c یا هر مرحله‌ی دیگری را آغاز نمی‌کند.

وضعیت تحویل: `COMPLETED — AWAITING ARCHITECTURE GUARDIAN REVIEW`.

من کدکس هستم.
