# بستهٔ بازتولیدپذیر G1c

این پوشه فقط fixture و شواهد اعتبارسنجی پیش از پیاده‌سازی Prisma است. هیچ فایل آن schema یا migration محصول نیست و نباید به implementation منتقل شود.

## دامنه

- زنجیرهٔ پنج migration شاخه origin/main پیش از fixture موقت اعمال می‌شود.
- PostgreSQL 16 در container یک‌بارمصرف اجرا می‌شود.
- Prisma CLI و Client دقیقاً نسخهٔ 5.22.0 در پوشه‌ای موقت خارج از مخزن نصب می‌شوند.
- هیچ رشتهٔ اتصال یا اعتبارنامه‌ای در فایل‌ها و logها ذخیره نمی‌شود.
- شواهد G1b تغییرناپذیرند.

## ترتیب بازتولید

1. متغیرهای G1C_DATABASE_URL، G1C_SHADOW_DATABASE_URL و G1C_HISTORY_DATABASE_URL را فقط در محیط disposable تنظیم کنید.
2. پنج migration را با git show از origin/main به پوشهٔ موقت خارج از مخزن استخراج کنید.
3. migrationها را به ترتیب روی دیتابیس disposable اعمال کنید.
4. sql/00_core_fixture.sql و سپس sql/01_manual_constraints.sql را اعمال کنید.
5. sql/02_assertions.sql، prisma-write-path.cjs و concurrency-run.cjs را اجرا کنید.
6. هر دو Prisma schema را با 5.22.0 validate و generate کنید.
7. migrate diff را با --from-migrations و shadow database اجرا و inventory را قبل و بعد مقایسه کنید.
8. همهٔ خروجی‌ها را پس از حذف نشانی اتصال در logs ذخیره کنید.

اسکریپت‌های منفی کد خطای مورد انتظار را دقیق بررسی می‌کنند؛ هر کد دیگر شکست است.

من کدکس هستم.

