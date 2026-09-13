# گزارش اجرای G10a — برش Core Authority

## ۱. Task اجراشده

برش G10a مطابق دستور `CODEX-20260913-G10A-CORE-AUTHORITY-SLICE-001` اجرا شد: AuthContext/W1، registry بستهٔ Permission، repositoryهای Organization/Membership/PermissionGrant، BootstrapService، MembershipService، PermissionGrantService، error adapter و تست‌های Core.

## ۲. مراجع استفاده‌شده

- بازبینی G9c در commit `57ba5a765eebb76af17189346accdeba4759bbe6`.
- تصویب مالک G10a در commit `f39b28debd40a96d7d514bfbc0912140e6645fae`.
- طراحی نهایی در commit `091d422` با SHA `cd041054c34d9e3827f5d590ff6dcb07c82e51b208f7d489443501ceecb561a8`.

## ۳. فایل‌های تغییرکرده

- `implementation/core/auth-context.ts`
- `implementation/core/bootstrap-service.ts`
- `implementation/core/error-adapter.ts`
- `implementation/core/errors.ts`
- `implementation/core/membership-service.ts`
- `implementation/core/permission-grant-service.ts`
- `implementation/core/permission-registry.ts`
- `implementation/core/repositories.ts`
- `implementation/test/core/core-authority.spec.ts`
- `implementation/tsconfig.json` — فقط یک ورودی `core/**/*.ts` به include اضافه شد
- `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md` — فقط header به `FINAL — owner-approved` تغییر کرد
- `mlino2/validation/g10a/**` — guard و شواهد اجرایی

## ۴. فایل‌های تغییرنیافته

`schema.prisma`، migrationها، `shared-contracts/types.ts`، packageها، jest config، setup-env، docker-compose، فایل‌های موجود V1، main، V2، `_PUSH_STAGING` و root `AI_HANDOFF` تغییر نکردند.

## ۵. محیط و guard ایمنی

یک PostgreSQL 16 disposable با نام `mlino-g10a-test-20260913-r2` روی پورت 5499 و با `tmpfs /var/lib/postgresql/data` اجرا شد. guard پیش از `npx prisma` و Jest اجرا شد و موفق بود. guard بررسی کرد که DATABASE_URL فقط به localhost:5499 اشاره کند، شامل 5435 یا `@db:` نباشد و `implementation/.env` وجود نداشته باشد. رمز در متغیر فرایند بود و در گزارش یا log چاپ نشد.

هیچ اتصال یا فرمانی روی `mlino-v1-local-db`، پورت 5435 یا `_PUSH_STAGING` اجرا نشد.

## ۶. تست‌ها و نتیجه

- `npm ci`: موفق
- `npx prisma migrate deploy`: موفق؛ هر ۶ migration روی دیتابیس disposable اعمال شد
- `npx prisma generate`: موفق؛ Prisma Client نسخهٔ 5.22.0
- `npm run build`: موفق
- `npm test -- --runInBand`: موفق؛ ۲۰ Test Suite و ۲۵۵ تست
- تست Core Authority: موفق؛ bootstrap، W1/S2، Membership، self-grant، grantor key، آخرین grant-admin و Role-only
- volume قبل و بعد یکسان بود؛ هیچ volume جدیدی ایجاد نشد
- کانتینر در پایان حذف شد

در اجرای نخست یک خطای import در `bootstrap-service.ts` پیدا شد؛ اصلاح شد و validation از ابتدا با کانتینر و volume بررسی‌شدهٔ تازه تکرار شد. شواهد هر دو اجرا در `mlino2/validation/g10a/` ثبت شده‌اند.

## ۷. شواهد و manifest

- guard: `guard-r2.log`
- migration: `prisma-migrate-deploy-r2.log`
- generate: `prisma-generate-r2.log`
- build: `tsc-build-r2.log`
- tests: `npm-test-r2.log`
- volume قبل/بعد: `docker-volume-before-r2.txt` و `docker-volume-after-r2.txt`
- manifest SHA-256 بر اساس bytes خروجی `git show aa225d1:<path> | sha256sum`: `lf-sha256-manifest.txt`

## ۸. Commit و دامنه

Commit کد و validation: `aa225d1` با پیام `feat: add G10a Core authority slice`. فقط فایل‌های مجاز در آن Commit هستند. Commit گزارش و Handoff پس از این گزارش ساخته می‌شود.

## ۹. ریسک‌ها و موارد خارج از دامنه

اتصال واقعی AC-2، Claim/Verification، Profile، Capability، Offer، Evidence، Publication و HTTP پیاده‌سازی نشدند. guardهای S10 فعلاً در Service هستند؛ DB guard آن‌ها طبق تصمیم مالک به CCR آینده موکول است. خطاهای P0001 بر اساس پیام و خطاهای unique/FK/CHECK به domain error تبدیل می‌شوند و transport adapter جداست.

## ۱۰. اقدام بعدی

پس از Push این گزارش، Codex متوقف می‌شود و منتظر بازبینی Architecture Guardian می‌ماند. G10b یا هر برش بعدی بدون دستور جدید و تصویب لازم آغاز نمی‌شود.

من کدکس هستم.
