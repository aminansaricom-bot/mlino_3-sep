# روش بازتولید اعتبارسنجی G4

مقادیر اتصال زیر هنگام اجرا از متغیر محیطی موقت گرفته شدند و در مخزن ذخیره نشده‌اند.

1. اجرای PostgreSQL 16 یک‌بارمصرف با `--rm` و `--tmpfs /var/lib/postgresql/data`.
2. محاسبهٔ fingerprint چهار پوشهٔ Prisma با روش Guardian:
   `find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`.
3. اجرای Prisma 5.22.0 با `CHECKPOINT_DISABLE=1` و `PRISMA_GENERATE_SKIP_AUTOINSTALL=1`.
4. اجرای `prisma validate` روی شِمای محصول.
5. تولید SQL با `prisma migrate diff --from-migrations ... --to-schema-datamodel ... --script` و مقایسهٔ بایت‌به‌بایت با خروجی مصوب G3b.
6. اجرای `prisma migrate deploy` برای هر شش migration روی دیتابیس خالی.
7. اجرای دوبارهٔ `migrate diff` و انتظار `-- This is an empty migration.`.
8. اجرای `base-assertions.sql` و `t1-t12.sql` با `ON_ERROR_STOP`.
9. تولید Prisma Client در مسیر موقت دارای `generator.output` صریح و اجرای W1.
10. ثبت inventory قیدها، ایندکس‌ها و Triggerها.
11. محاسبهٔ fingerprint پس از آزمون و مقایسه با مبنا.
12. توقف container، اثبات حذف آن و حذف کنترل‌شدهٔ `g4-tooling`.

هیچ migration روی `mlino-v1-local-db` یا volume آن اجرا نشد.

من کدکس هستم.
