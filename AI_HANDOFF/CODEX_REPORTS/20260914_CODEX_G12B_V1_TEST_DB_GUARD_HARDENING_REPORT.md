# گزارش اجرای G12b — سخت‌سازی محافظ پایگاه‌داده‌ی تست V1

## ۱. کار اجراشده

سه حفره‌ی هم‌خوانی با dotenv بسته شد: بررسی همه‌ی assignmentهای
`DATABASE_URL`، پشتیبانی از `export ` و quote، و بررسی هم‌زمان
`implementation/.env` و `implementation/prisma/.env`. precedence متغیر محیطی
حفظ شد. G10c اجرا نشد.

## ۲. مبنا و پیش‌شرط

- review: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12A_MERGE.md`
- pinned commit: `8835f885340f101adbde3d58aeeca842da2d76ba`
- pinned SHA-256: `2f32b2b5dd3c6355524f041c2add2d6ff4db014bcfb7e1365ff4e9ac377a3647`

`git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS` شکست خورد؛ GW2-P موفق شد:
commit وجود داشت، ancestor `origin/main` بود و hash فایل review دقیقاً برابر
مقدار pinned بود.

## ۳. فایل‌های تغییرکرده

- `implementation/test/test-db-guard.ts`
- `implementation/test/test-db-guard.spec.ts`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_V1_TEST_DB_GUARD.md`
- `mlino2/validation/g12b/**`
- این گزارش
- `mlino2/HANDOFF/HANDOFF_STATE.md` به‌صورت append-only

`implementation/test/setup-env.ts` تغییر نکرد و همان فراخوانی G12a را حفظ کرد.

## ۴. فایل‌های خارج از scope

schema، migration، API، types، package، tsconfig، jest config، docker-compose،
`.env`، `test/core/**`، V2، main، شاخه‌ی Core و `_PUSH_STAGING` تغییر نکردند.

## ۵. رفتار سخت‌شده

اگر هر assignment از `DATABASE_URL` در هر یک از دو فایل env ناامن باشد، guard
رد می‌کند؛ بنابراین first/last-wins ambiguity باعث عبور مقدار ناامن نمی‌شود.
`export DATABASE_URL=...` و quoteهای تک/دوگانه پذیرفته می‌شوند. اگر متغیر
محیطی `DATABASE_URL` وجود داشته باشد، فایل‌ها نادیده گرفته می‌شوند و همان
مقدار باید local روی پورت ۵۴۹۹ باشد. پیام خطا URL یا رمز را شامل نمی‌شود.

## ۶. آزمون‌ها و نتایج

- `npm ci --ignore-scripts` در worktree مستقل — موفق
- `npx prisma generate` با Prisma 5.22.0 — موفق
- `npm run build` — موفق
- `npm test -- --runInBand test/test-db-guard.spec.ts` — ۱۴ تست موفق
- `npm run prisma:migrate:deploy` روی PostgreSQL 16 tmpfs پورت ۵۴۹۹ — موفق، ۶ migration
- `npm test -- --runInBand` — ۲۴ suite و ۳۱۳ تست موفق
- refusal با `DATABASE_URL=postgresql://x:y@db:5432/x` — exit code مورد انتظار ۱، صفر تست اجرا شد

## ۷. ایمنی محیط

شواهد در `mlino2/validation/g12b/` است. volume قبل/بعد یکسان است و
`mlino-g12b-postgres` حذف شده است. هیچ URL پورت ۵۴۳۵، دیتابیس زنده یا
`_PUSH_STAGING` استفاده نشد.

## ۸. manifest و traceability

`mlino2/validation/g12b/LF-MANIFEST.txt` hash فایل‌های scope را ثبت می‌کند.
hashها بر اساس blobهای Git و بدون انتشار مقدارهای محرمانه تولید می‌شوند.

## ۹. ریسک‌ها و موارد باز

- هشدارهای audit وابستگی‌های موجود پروژه خارج از scope بودند و اصلاح نشدند.
- تغییرات G12b فقط تستی هستند و روی تولید اثر ندارند.
- G10c تا بازبینی و دستور مستقل آغاز نمی‌شود.

## ۱۰. وضعیت و گام بعد

وضعیت اعتبارسنجی: PASS.
گام بعد: بازبینی Guardian؛ تا آن زمان هیچ کار دیگری آغاز نمی‌شود.

Commit hash در پیام تحویل نهایی پس از commit ثبت می‌شود.
