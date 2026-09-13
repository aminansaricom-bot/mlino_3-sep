# Contract Change Request — Core Service Layer

## وضعیت

`DRAFT` — این سند برای آماده‌سازی بازبینی معماری است و به‌تنهایی مجوز ادغام یا توسعه‌ی مرحله‌ی بعد نیست.

## دامنه

این CCR تغییرات service-layer برش‌های G10a، G10b، G10b2 و اصلاحات آماده‌سازی G11a را مستند می‌کند:

- authority و permission mutation در Core
- ثبت و خواندن Business Identity Claim
- آغاز، بررسی و تصمیم‌گیری Identity Verification
- قفل سازمان و Claim برای tenant isolation و رقابت هم‌زمان
- انقضای attemptهای باز هنگام تغییر وضعیت Claim
- حفظ قاعده‌ی S12-A برای reinstatement

این CCR شامل schema، migration، API بیرونی، V2، Connector یا تغییر در Content Studio نیست.

## اثر runtime

- سازمان از `AuthContext` می‌آید و هیچ سرویس مجاز نیست tenant را از ورودی مستقل قبول کند.
- مجوز از Membership و Permission Grant فعال به‌دست می‌آید.
- actor پلتفرم برای بررسی و گذارهای Claim باید fail-closed تأیید شود.
- تغییر وضعیت Claim و منقضی‌کردن attemptهای باز در همان تراکنش انجام می‌شود.
- `start()` زمان `startedAt` را از ساعت برنامه می‌گیرد؛ این همان ساعت مرجع `statusChangedAt` و `decidedAt` است.
- تصمیم Verification فقط `VERIFIED` یا `REJECTED` است.
- Claimهای `REJECTED` و `EXPIRED` پایانی‌اند و ارسال دوباره ردیف تازه می‌سازد.

## تصمیم‌ها و قواعد اجرایی

1. `IdentityClaimService.read()` فقط از `AuthContext.organizationId` استفاده می‌کند.
2. `IdentityVerificationService.start()` سازمان درخواست را با `requireSameOrganization` کنترل می‌کند.
3. هر تغییر وضعیت Claim، attemptهای دیگر با وضعیت `PENDING` یا `UNDER_REVIEW` را به `EXPIRED` تبدیل می‌کند.
4. دلیل انقضای خودکار `superseded: claim <STATUS>` است.
5. تصمیم روی Claim تعلیق‌شده فقط برای attemptی معتبر است که بعد از `statusChangedAt` شروع شده باشد.
6. `Role` منبع مجوز نیست؛ Membership و Grant منبع مجوز هستند.
7. سازمان و Claim زیر قفل ردیف سازمان/Claim تغییر می‌کنند.

## تصمیم‌های باز

هیچ تصمیم معماری تازه‌ای در این مرحله گرفته نشده است. تصویب نهایی این CCR، دامنه‌ی ادغام و ترتیب انتشار را برای Guardian و مالک باقی می‌گذارد.

## ایمنی آزمون

- head اصلی روی PostgreSQL 16 موقت با `tmpfs` و پورت ۵۴۹۹ آزموده شد.
- trial merge در worktree جدا از `origin/main` انجام شد؛ merge بدون تعارض بود، سپس abort و حذف شد.
- trial merge هیچ Commit یا Push نداشت.
- migrationها فقط روی پایگاه‌های دورریختنی اجرا شدند.
- volumeها قبل و بعد مقایسه شدند و تغییر تازه‌ای ثبت نشد.
- دیتابیس زنده‌ی V1، پورت ۵۴۳۵ و `_PUSH_STAGING` در این مرحله استفاده نشدند.

## راه بازگشت

قبل از ادغام، بازگشت با حذف Commitهای این برش از شاخه‌ی ویژگی انجام می‌شود. پس از هر ادغام احتمالی، بازگشت فقط از طریق سیاست مصوب Guardian و با حفظ migrationهای منتشرشده انجام خواهد شد. این CCR هیچ migration تازه‌ای ایجاد نمی‌کند.

## شواهد

شواهد G11a در `mlino2/validation/g11a/` قرار دارد، از جمله:

- `head-migrate.log`
- `head-core-tests.log`
- `head-full-tests.log`
- `trial-migrate.log`
- `trial-build-final.log`
- `trial-core-tests-final.log`
- `trial-full-tests.log`
- `trial-merge-result.txt`
- `trial-conflicts.txt`
- `trial-diffstat.txt`
- فایل‌های پاک‌سازی و volume

## SHA-256 فایل‌های تغییرکرده‌ی اجرایی

SHAها باید روی بایت‌های Git محاسبه شوند. فهرست زیر در manifest تحویل G11a نیز ثبت می‌شود:

| فایل | مرجع | SHA-256 |
|---|---|---|
| `implementation/core/identity-claim-service.ts` | `6487a56f8956f7c83707b5e16a351613ba2cc22a` | `f3a115c046f1a3ce14f38460f3619a7aac6c75f919e8ba0fd23d70663e6f6eef` |
| `implementation/core/identity-verification-service.ts` | `6487a56f8956f7c83707b5e16a351613ba2cc22a` | `6c5fc837c310a107f8f0bf9a18d3c7388f875e3911de8a4906d744c8e45e652e` |
| `implementation/core/repositories.ts` | `6487a56f8956f7c83707b5e16a351613ba2cc22a` | `1110277ee31925e76e8941425ddef25a98f5c54f3939bfa5909d465fe6b7a83d` |
| `implementation/test/core/identity-claim-verification.spec.ts` | `6487a56f8956f7c83707b5e16a351613ba2cc22a` | `8dc3c331c6e2adf76a8383fac06373b086742e21bba982ba2c16d8cf6eb5dce4` |

## نتیجه‌ی این مرحله

این CCR در وضعیت `DRAFT` باقی می‌ماند. نتیجه‌ی آزمون‌ها برای بازبینی است و به معنی تصویب ادغام با `main` نیست.

من کدکس هستم.
