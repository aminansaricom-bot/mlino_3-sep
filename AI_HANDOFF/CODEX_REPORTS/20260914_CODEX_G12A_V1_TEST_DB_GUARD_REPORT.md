# گزارش اجرای G12a — محافظ پایگاه‌داده‌ی تست V1

## ۱. کار اجراشده

محافظ سراسری تست‌های V1 اضافه شد تا تست‌ها فقط به PostgreSQL یک‌بارمصرف
محلی روی پورت ۵۴۹۹ وصل شوند. G10c اجرا نشد.

## ۲. اسناد و مبناهای استفاده‌شده

- `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V1_TEST_GUARD.md`
- `AI_HANDOFF/HANDOFF_STATE.md` در `origin/main`
- دستور `CODEX-20260914-G12A-V1-TEST-DB-GUARD-002`

پیش‌شرط fetch به‌دلیل `SEC_E_NO_CREDENTIALS` شکست خورد؛ GW2-P برای commit
پین‌شده موفق شد: commit موجود بود، ancestor `origin/main` بود و SHA-256 سند
دقیقاً برابر `62529d4a4a605e1f5c3ef21a9204d83bd7c0615cd28cb0b03fe4f82c5fa59be6`
بود.

## ۳. فایل‌های تغییرکرده

- `implementation/test/test-db-guard.ts`
- `implementation/test/setup-env.ts`
- `implementation/test/test-db-guard.spec.ts`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_V1_TEST_DB_GUARD.md`
- `mlino2/validation/g12a/**`
- این گزارش
- `mlino2/HANDOFF/HANDOFF_STATE.md` به‌صورت append-only

## ۴. فایل‌های تغییرنکرده

هیچ تغییری در schema، migration، `types.ts`، package، tsconfig، jest config،
docker-compose، `.env`، `test/core/**`، V2، main یا شاخه‌ی Core انجام نشد.
`_PUSH_STAGING` نیز استفاده نشد.

## ۵. رفتار پیاده‌شده

URL محیطی بر URL فایل env اولویت دارد. URL غایب مجاز است. URL موجود فقط وقتی
مجاز است که میزبان `localhost`، `127.0.0.1` یا `::1` و پورت دقیقاً `5499` باشد.
پورت `5435`، میزبان `@db:`، میزبان/پورت دیگر و URL نامعتبر رد می‌شوند.
پیام خطا URL یا رمز را چاپ نمی‌کند. فراخوانی guard در `setup-env.ts` پیش از
منطق موجود `MLINO_JWT_SECRET` قرار گرفت و آن منطق بدون تغییر ماند.

## ۶. آزمون‌های اجراشده

- `npx prisma generate` — موفق، Prisma 5.22.0
- `npm run build` — موفق
- `npm test -- --runInBand test/test-db-guard.spec.ts` — ۱۰ تست موفق
- `npm run prisma:migrate:deploy` روی PostgreSQL 16 موقت tmpfs، پورت ۵۴۹۹ — موفق، ۶ migration
- `DATABASE_URL=postgresql://x:y@db:5432/x npm test -- --runInBand test/foundation/workspace-link.spec.ts` — رد شدن مورد انتظار، ۰ تست اجرا شد و guard پیش از query متوقف کرد
- `npm test -- --runInBand` — ۲۴ suite و ۳۰۹ تست موفق

## ۷. شواهد محیط

شواهد در `mlino2/validation/g12a/` قرار دارد: log migration، log refusal،
log کل suite، وضعیت و حذف container و فهرست volume قبل/بعد. PostgreSQL با
tmpfs اجرا شد؛ volume جدیدی ساخته نشد و container حذف شد. هیچ URL پورت ۵۴۳۵
و هیچ دیتابیس زنده‌ای استفاده نشد.

## ۸. hash فایل‌ها

`mlino2/validation/g12a/LF-MANIFEST.txt` hashهای LF چهار فایل scoped را با
خروجی بایت‌های کاری نرمال‌شده به LF ثبت می‌کند.

## ۹. ریسک‌ها و موارد باز

- نصب وابستگی‌ها فقط در worktree مستقل انجام شد؛ `_PUSH_STAGING` دست‌نخورده ماند.
- هشدارهای audit وابستگی‌های موجود پروژه بررسی یا اصلاح نشدند چون خارج از scope هستند.
- G10c تا بازبینی و تأیید این مرحله شروع نمی‌شود.

## ۱۰. وضعیت و گام بعد

وضعیت اعتبارسنجی: PASS.
گام بعد فقط پس از بازبینی Guardian و دستور جدید مجاز است: بررسی G12a و سپس
تصمیم جداگانه درباره‌ی G10c.

Commit hash در پیام تحویل نهایی پس از commit ثبت می‌شود.
