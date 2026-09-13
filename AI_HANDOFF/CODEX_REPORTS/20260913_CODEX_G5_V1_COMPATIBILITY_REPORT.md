# گزارش اجرای G5 — سازگاری V1 پس از شِمای Core

**تاریخ:** ۲۰۲۶-۰۹-۱۳
**INSTRUCTION_ID:** `CODEX-20260913-G5-V1-COMPATIBILITY-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
**REVIEW_REFERENCE:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G4_CORE_SCHEMA_MIGRATION.md@3ef9fe9f0f867b9130116c6980a4407bcf605eb4`
**BASE_COMMIT:** `6b625093b2fd39fba9a26c2073a849e97411caa4`
**CORE_COMMIT:** `f47c852bbfb48f9561c693b533a9df120f7ca708`
**DELIVERY_COMMIT:** `807af102224299628fc162a6f082ddaeefd46e24`

## ۱. Task اجراشده

سازگاری V1 در دو worktree موقت و detached بررسی شد: مبنای پیش از G4 و نسخهٔ G4. در هر دو نسخه وابستگی‌ها از lockfile نصب، Prisma Client تولید، build اجرا، migrationها روی PostgreSQL مستقل اعمال و کل مجموعهٔ تست V1 با `--runInBand` اجرا شد. هیچ اصلاح کد یا تغییر محصول انجام نشد.

## ۲. اسناد منبع

- بازبینی Guardian برای G4 در Commit `3ef9fe9f0f867b9130116c6980a4407bcf605eb4`
- گزارش G4 در `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G4_CORE_SCHEMA_MIGRATION_REPORT.md`
- شِما و migration مصوب G4 در Commit `f47c852bbfb48f9561c693b533a9df120f7ca708`
- Handoff زنده `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

## ۳. فایل‌های تغییرکرده

فقط ۲۹ فایل شاهد تازه در `mlino2/validation/g5/**` اضافه شدند: گزارش‌های نصب، تولید Client، build، migration، تست، مقایسهٔ مدل‌ها، کنترل container/worktree و اسناد بازتولید. `SHA256SUMS.txt` hash همین artifactها را از بایت‌های canonical در Commit اجرایی ثبت می‌کند.

## ۴. فایل‌های تغییرنکرده

- تمام `implementation/**` شامل کد، تست، `schema.prisma`، migrationها، package files و `dist/`
- ADRها و `mlino_book/**`
- شواهد G1 تا G4
- فایل‌های ریشهٔ `AI_HANDOFF`
- شاخهٔ V2 و `main`
- دیتابیس محلی `mlino-v1-local-db` و volume آن
- `_PUSH_STAGING`

## ۵. تست‌ها و اعتبارسنجی‌های اجراشده

برای هر دو نسخه:

- `npm ci`
- `npx --no-install prisma generate`
- `npm run build`
- `npx --no-install prisma migrate deploy`
- `npm test -- --runInBand`

برای G4، `Prisma.ModelName` نیز فهرست و با مبنا و فهرست ۱۲ مدل مصوب مقایسه شد. یک تلاش اضافی `npm ci --offline` در sandbox به‌علت مجوز cache رد شد؛ نصب عادی مجاز در هر دو محیط با exit code صفر تکرار و ثبت شد و این رخداد اثری بر نتیجهٔ محصول ندارد.

## ۶. نتایج تست

| معیار | مبنا | G4 | نتیجه |
|---|---:|---:|---|
| Prisma generate | PASS | PASS | برابر |
| build | PASS | PASS | برابر |
| خطای TypeScript | ۰ | ۰ | بدون رگرسیون |
| migration | ۵/۵ | ۶/۶ | مطابق انتظار |
| مجموعه‌های تست | ۱۹/۱۹ | ۱۹/۱۹ | برابر |
| تست‌ها | ۲۴۹/۲۴۹ | ۲۴۹/۲۴۹ | برابر |
| تست موفق مبنا و ناموفق G4 | — | ۰ | PASS |

G4 هر ۸ مدل قبلی را حفظ کرده و هر ۱۲ مدل جدید Core را دارد؛ مدل گمشده یا افزودهٔ غیرمنتظره صفر است.

## ۷. Commit hash

Commit شواهد اجرایی:

`807af102224299628fc162a6f082ddaeefd46e24`

Commit گزارش و Handoff پس از ثبت این گزارش ساخته و در پاسخ نهایی اعلام می‌شود.

## ۸. ریسک‌های باقی‌مانده

- این Gate فقط سازگاری فنی V1 را اثبات می‌کند؛ ادغام شاخهٔ Core با `main` هنوز انجام نشده است.
- migration روی هیچ دیتابیس دارای داده اجرا نشده؛ اجرای آینده روی دیتابیس محلی یا محیط دیگر نیازمند Gate مستقل، پشتیبان و طرح rollback است.
- هشدارهای deprecated مربوط به dependencyهای موجود هنگام `npm ci` مشاهده شدند، اما در مبنا و G4 یکسان‌اند و رگرسیون G4 نیستند.

## ۹. پرسش‌های باز

- آیا مالک پس از بازبینی Guardian اجازهٔ G6 و ادغام کنترل‌شده با `main` را می‌دهد؟
- زمان و شرایط G7 برای پشتیبان‌گیری و اعمال migration روی دیتابیس دارای داده چه خواهد بود؟

## ۱۰. گام پیشنهادی بعدی

Architecture Guardian باید شواهد و مقایسهٔ G5 را مستقل بازبینی کند. Codex پس از Push متوقف می‌شود و بدون دستور تازه هیچ merge، migration روی دیتابیس محلی یا کار مرحلهٔ بعدی انجام نمی‌دهد.

من کدکس هستم.
