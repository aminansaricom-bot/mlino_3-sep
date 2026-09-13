# ترتیب بازتولید G3b

Connection stringها و credentialهای واقعی/موقت در artifactها ذخیره نشده‌اند. هنگام بازتولید از متغیرهای محیطی و پایگاه‌های disposable استفاده شود.

1. `scripts/extract-origin-migrations.ps1`: استخراج بایت‌های canonical پنج migration و lock file از `origin/main` با `git cat-file`.
2. `scripts/extract-ccr.ps1`: استخراج متن دقیق Prisma و SQL دستی از CCR.
3. `scripts/build-temp-schema.ps1`: ساخت شِمای موقت با `generator.output` صریح بیرون مخزن.
4. اجرای Prisma 5.22.0 با `CHECKPOINT_DISABLE=1` و `PRISMA_GENERATE_SKIP_AUTOINSTALL=1`: version، validate و generate.
5. اجرای `migrate diff --from-migrations` با Shadow Database یک‌بارمصرف و مقایسه با diff مستقل schema-to-schema.
6. بازپخش پنج migration، `sql/generated-core-migration.sql` و `prisma/manual-constraints.sql` در PostgreSQL 16 یک‌بارمصرف.
7. اجرای `sql/base-assertions.sql` و `sql/t1-t12.sql` با `ON_ERROR_STOP`.
8. اجرای `scripts/prisma-write-path.cjs` با Client موقت و انتظار `P2003`.
9. ثبت `sql/inventory.sql`، اجرای `sql/unrelated-field-diff.sql` و مقایسه‌ی hash inventory پیش و پس.
10. محاسبه‌ی hash منابع با `git show COMMIT:PATH`.
11. محاسبه‌ی fingerprint نصب Prisma با روش نگهبان:

```text
find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
```

12. توقف container `--rm`، اثبات نبود volume و حذف پوشه‌ی tooling موقت پس از بررسی مسیر مطلق.

من کدکس هستم.
