# فرمان‌های بازتولید G3

مقادیر اتصال زیر placeholder هستند. هیچ credential یا connection string واقعی در این سند ذخیره نشده است.

```text
$env:CHECKPOINT_DISABLE = "1"
$env:PRISMA_GENERATE_SKIP_AUTOINSTALL = "1"
$env:DATABASE_URL = "<DISPOSABLE_DATABASE_URL>"
$env:SHADOW_DATABASE_URL = "<DISPOSABLE_SHADOW_DATABASE_URL>"
```

ترتیب اجرا:

1. استخراج بلوک‌های علامت‌گذاری‌شده از CCR با `scripts/extract-ccr.ps1`.
2. ساخت شِمای موقت با `scripts/build-temp-schema.ps1`. `generator.output` باید صریحاً بیرون مخزن و بیرون نصب V1 باشد.
3. اجرای Prisma 5.22.0 با نصب فقط‌خواندنی موجود: version، validate و generate.
4. اجرای `migrate diff --from-migrations` با Shadow Database یک‌بارمصرف و ثبت SQL در `sql/generated-core-migration.sql`.
5. در PostgreSQL 16 یک‌بارمصرف: بازپخش پنج migration موجود، SQL تولیدی و `prisma/manual-constraints.sql`.
6. اجرای `sql/assertions.sql` و مقایسه‌ی SQLSTATEها.
7. اجرای `scripts/prisma-write-path.cjs` با متغیرهای محیطی `DATABASE_URL` و `G3_PRISMA_CLIENT_PATH`.
8. اجرای دو نشست `sql/concurrency-session-a.sql` و `sql/concurrency-session-b.sql` با `scripts/run-concurrency.sh`.
9. ثبت inventory، اجرای `sql/unrelated-field-diff.sql` و ثبت دوباره‌ی inventory؛ دو خروجی باید یکسان باشند.
10. محاسبه‌ی hash منابع تاریخی با `git show COMMIT:PATH` و `scripts/hash-git-content.ps1`.
11. محاسبه‌ی اثر انگشت نصب فقط‌خواندنی با روش نگهبان:

```text
find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
```

12. توقف کانتینر `--rm`، اثبات نبود container/volume G3 و حذف پوشه‌ی tooling موقت.

من کدکس هستم.
