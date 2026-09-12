# بستهٔ بازتولیدپذیر G1b

این مسیر فقط برای اعتبارسنجی disposable پیش از پیاده‌سازی Prisma است. فایل‌های این پوشه schema یا migration محصول نیستند و نباید به مسیر implementation/prisma منتقل شوند.

ترتیب اجرا:

1. تولید baseline SQL از prisma/base.prisma با Prisma قفل‌شدهٔ شاخه؛
2. اجرای baseline SQL در PostgreSQL 16 ایزوله؛
3. اجرای sql/manual_constraints.sql؛
4. اجرای sql/assertions.sql و prisma-write-path.cjs؛
5. اجرای سناریوی هم‌زمانی با فایل‌های concurrency؛
6. ثبت inventory قبل؛
7. تولید follow-up SQL با prisma migrate diff از دیتابیس به prisma/followup.prisma؛
8. اجرای follow-up SQL و ثبت inventory بعد؛
9. مقایسهٔ FKها، indexهای جزئی و triggerها.

متغیر اتصال باید G1_DATABASE_URL نام داشته باشد و فقط به دیتابیس disposable اشاره کند.

من کدکس هستم.
