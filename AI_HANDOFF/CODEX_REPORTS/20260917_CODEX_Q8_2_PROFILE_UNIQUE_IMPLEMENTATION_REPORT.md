# گزارش اجرای Q8-2 — ایندکس یکتای Profile منتشرشده

## ۱. کار اجراشده

Q8-2 بر اساس تصویب مالک در `AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_2_IMPLEMENTATION.md` اجرا شد. هدف، enforce کردن قاعدهٔ «حداکثر یک BusinessProfile با وضعیت PUBLISHED برای هر Organization»، نگاشت خطای واقعی به `CONFLICT` و آزمون مسیر انتشار بود.

## ۲. منابع و پیش‌شرط

- مرجع pinned: commit `786f18eb19a7125c43c44f7d268ed57a525b670e`.
- SHA-256 مرجع با `git show` bytes: `7c3b10e0f85c7c2b91d993cc097e1b1f3eb1b59cab5dc54e4865b761cb1ed817`.
- `git fetch origin` در این محیط با خطای دسترسی شبکه به GitHub شکست خورد.
- GW2-P: `git cat-file -e <pinned>^{commit}` موفق؛ `git merge-base --is-ancestor <pinned> origin/main` موفق؛ SHA-256 فایل pinned برابر مقدار بالا بود.
- هیچ credential، git config یا safe.directory تغییر نکرد.

## ۳. فایل‌های تغییرکرده

- CCR: وضعیت `APPROVED` و ثبت OQ-Q8-1=A، OQ-Q8-2=A، OQ-Q8-3=A.
- migration تازه: `implementation/prisma/migrations/20260917010000_add_business_profile_published_unique/migration.sql`.
- نگاشت محدود در `implementation/core/error-adapter.ts`.
- spec تازه: `implementation/test/core/q8-2-profile-unique.spec.ts`.
- شواهد: `mlino2/validation/q8-2/`.
- فایل‌های schema.prisma، migrationهای قبلی، package، V2 و دیتابیس زنده تغییر نکردند.

## ۴. رفتار پیاده‌شده

Migration در یک تراکنش، جدول `business_profiles` را با `ACCESS EXCLUSIVE` قفل می‌کند، preflight دادهٔ تکراری را با `P0001` رد می‌کند و سپس ایندکس جزئی زیر را می‌سازد:

```sql
CREATE UNIQUE INDEX business_profile_one_published_per_organization_unique
  ON business_profiles (organization_id)
  WHERE publication_status = 'PUBLISHED';
```

`schema.prisma` عمداً تغییر نکرد؛ `prisma migrate status` و `prisma migrate diff` پس از اجرای همهٔ migrationها هر دو بدون drift بودند.

خطای واقعی دو شکل داشت:

- direct raw validation: `P2010` با `meta.code=23505` و پیام کلید `organization_id`.
- مسیر Prisma Service: `P2002` با `meta.modelName=Publication` و `meta.target=["organization_id"]`؛ شکست از trigger projection هنگام `publication.create` عبور می‌کند.

نگاشت فقط برای نام ایندکس Q8، یا همین شکل دقیقِ Publication/organization_id انجام می‌شود؛ uniqueهای capability و permission پیام قبلی خود را حفظ کردند.

## ۵. آزمون‌ها و نتایج

| نام آزمون دقیق | نتیجه |
|---|---|
| `partial unique index exists, is valid, and carries the published predicate` | PASS |
| `publishing a second profile maps the real unique error to CONFLICT and leaves no Publication row` | PASS |
| `concurrent publishes of different profiles yield one success and one mapped CONFLICT` | PASS |
| `withdrawing the first profile frees the organization for the second profile` | PASS |
| `other unique conflicts retain their existing messages` | PASS |
| `public export still produces one record for one published profile` | PASS |

## ۶. اعتبارسنجی کامل

- TypeScript build: PASS، `npm run build` پس از تولید Prisma Client نسخهٔ 5.22.0.
- Migration از صفر روی PostgreSQL 16 موقت پورت `5499`: PASS.
- `prisma migrate status`: `Database schema is up to date!`.
- `prisma migrate diff`: `No difference detected.`.
- اجرای کامل ۱: ۳۱ suite، ۳۹۰ test، PASS.
- اجرای کامل ۲: ۳۱ suite، ۳۹۰ test، PASS.
- اجرای کامل ۳: ۳۱ suite، ۳۹۰ test، PASS.
- هر اجرا روی container تازهٔ tmpfs انجام شد و `mlino-q8-2-testdb` در پایان حذف شد.
- یک تلاش نامعتبر به‌دلیل باقی‌ماندن container قبلی و یک خطای نگاشت اولیهٔ پورت اجرا و متوقف شد؛ هیچ migration یا آزمونی روی DB اشتباه/زنده انجام نشد و هر دو incident در شواهد ثبت شده‌اند.

## ۷. SHA-256 شواهد و فایل‌ها

همهٔ hashها از `git show HEAD:<path>` و با بایت‌های LF محاسبه شدند:

| path | SHA-256 |
|---|---|
| `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PROFILE_PUBLISHED_UNIQUE.md` | `26bcd5ee5b307aed16e03fcf07a7c25a74e11cd0a6dd985b0033d8c6c62cb870` |
| `implementation/prisma/migrations/20260917010000_add_business_profile_published_unique/migration.sql` | `3874e179a0f7e9b05f931cf359ecb1aa8f2dadb1243eb0923e20314614c1f1d0` |
| `implementation/core/error-adapter.ts` | `a3faea29f06ad4804fbbf8f21b76c521187eadaa6eb691cc90a99035796572f7` |
| `implementation/test/core/q8-2-profile-unique.spec.ts` | `a6c43a87923c9f59df4348d4bcb97365a2cc0783f37172bbc1f0b1fc508706ac` |
| `mlino2/validation/q8-2/migrate-status-diff.txt` | `18fdda150408abaaee84d3e45f50a15f929de46f84132a71e4ff30bb819f99c0` |
| `mlino2/validation/q8-2/run1.log` | `a918ff627d2c2037272eb54347607993ae07b3686a89ae5c9eda644c045514a2` |
| `mlino2/validation/q8-2/run2.log` | `57f27b09536a5ee72f9e940661537338004b8da5af6303b64f98139f5e97febc` |
| `mlino2/validation/q8-2/run3.log` | `99064b49fa694357dbd7bd86cf3b4a0dacafd7ea7f042d16b24418cfae9b88d7` |
| `mlino2/validation/q8-2/incidents.txt` | `857f40ae8a4fef8bffc6ef6b2fa78221daf27a42d583f6eb06e53e2e6c67c303` |

## ۸. commitها و وضعیت

- `70b73d6`: CCR draft.
- `e74191f`: گزارش Q8 و Handoff.
- `8f7c07e`: migration، mapping و spec.
- `6b035b1`: شواهد اجرای کامل.
- `b9d5028`: شواهد نهایی با LF.
- push انجام نشد؛ branch محلی باقی ماند.

## ۹. ریسک و گام بعد

اعمال migration روی `mlino-v1-local-db` هنوز انجام نشده و در دامنهٔ Q8-3 است. گام بعد فقط پس از بازبینی Guardian و دستور جداگانهٔ مالک مجاز است. G14c-1 و ادغام در main شروع نشدند.

من کدکس هستم
