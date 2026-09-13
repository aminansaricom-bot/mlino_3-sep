# گزارش G11a — آماده‌سازی ادغام لایه‌ی Core Service

## ۱. دستور اجراشده

دستور `CODEX-20260913-G11A-CORE-SERVICE-MERGE-PREP-001` اجرا شد. دامنه شامل اصلاح M1/M2، اعتبارسنجی head، trial merge در worktree موقت و تهیه‌ی CCR پیش‌نویس بود. ادغام واقعی با `main` انجام نشد.

## ۲. پیش‌شرط و GW2-P

`git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS` شکست خورد. طبق GW2-P هر سه بررسی pinned موفق شدند:

- commit `41f6a20fcd3e273c4e75302fe87c25dfa03e6017` وجود داشت.
- commit pinned جد نیایشی از `origin/main` بود.
- SHA-256 review از بایت‌های Git برابر `56f57846de235e747cda89adec1c70a829e368440fd93d542e19ab573a9b0d12` بود.

خروجی کامل در `mlino2/validation/g11a/precondition.log` ثبت شده است. هیچ credential، token، git config یا credential helper تغییر نکرد.

## ۳. اصلاحات M1 و M2

- پارامتر مستقل `organizationId` از `IdentityClaimService.read()` حذف شد؛ سازمان فقط از `AuthContext` خوانده می‌شود.
- تست cross-org با شناسه‌ی عضو سازمان B و `organizationId` سازمان A در AuthContext، `AUTHORIZATION_DENIED` می‌گیرد.
- `IdentityVerificationService.start()` زمان `startedAt` را صریحاً از ساعت برنامه می‌گیرد.
- قانون single-clock با comment در کد ثبت شده است.

## ۴. اعتبارسنجی head

- PostgreSQL 16 موقت با `tmpfs` و پورت ۵۴۹۹.
- شش migration با موفقیت اعمال شدند.
- Build موفق.
- Core: ۴ suite و ۵۰ تست موفق.
- کل V1: ۲۳ suite و ۲۹۹ تست موفق.
- کانتینر حذف شد و volumeها بدون تغییر باقی ماندند.

## ۵. Trial merge

یک worktree موقت از `origin/main` در commit `41f6a20fcd3e273c4e75302fe87c25dfa03e6017` ساخته شد و head Core در commit `6487a56f8956f7c83707b5e16a351613ba2cc22a` با `--no-ff --no-commit` آزمایش شد.

- نتیجه‌ی merge: بدون تعارض.
- Commit در worktree آزمایشی: ایجاد نشد.
- Push trial: انجام نشد.
- ابتدا build به‌دلیل نبود Prisma Client تولیدشده در worktree شکست خورد؛ پس از `prisma generate` در همان worktree موقت، build و همه‌ی تست‌ها موفق شدند.
- Trial Core: ۴ suite و ۵۰ تست موفق.
- Trial کامل V1: ۲۳ suite و ۲۹۹ تست موفق.
- worktree با `merge --abort` و حذف کامل پاک شد.

diffstat و فهرست تعارض‌ها در `mlino2/validation/g11a/trial-diffstat.txt` و `trial-conflicts.txt` ثبت شده‌اند.

## ۶. CCR پیش‌نویس

فایل زیر ایجاد شد و عمداً در وضعیت `DRAFT` باقی مانده است:

`implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_SERVICE_LAYER.md`

این CCR دامنه، اثر runtime، قواعد tenant و permission، single-clock، انقضای attemptهای باز، ایمنی آزمون، rollback و شواهد را ثبت می‌کند. هیچ schema، migration یا API تازه‌ای اضافه نشده است.

## ۷. فایل‌های تغییرکرده

- `implementation/core/identity-claim-service.ts`
- `implementation/core/identity-verification-service.ts`
- `implementation/core/repositories.ts`
- `implementation/test/core/identity-claim-verification.spec.ts`
- CCR پیش‌نویس Core Service Layer
- `mlino2/validation/g11a/` شامل لاگ‌ها، trial evidence و manifest

## ۸. فایل‌های تغییرنکرده و محدودیت‌ها

- `schema.prisma` و migrationها تغییر نکردند.
- `types.ts` و tsconfig تغییر نکردند.
- `main` و V2 تغییر نکردند.
- trial merge به هیچ شاخه‌ای Push نشد.
- پورت ۵۴۳۵، دیتابیس زنده‌ی V1 و `_PUSH_STAGING` استفاده نشدند.
- هیچ ادغام واقعی با `main` انجام نشد.

## ۹. Commitها و شواهد

- `6487a56f8956f7c83707b5e16a351613ba2cc22a` — اصلاحات M1/M2 و شواهد head.
- `e4466f3b72b8a7bf869b6df3e269114e74fcd7b4` — CCR پیش‌نویس و شواهد trial.
- `3c903e0de752d882a2ed937a29b0507f5debc8db` — LF manifest.

Manifest در `mlino2/validation/g11a/LF-MANIFEST.txt`، SHA-256 بایت‌های Git فایل‌های کد، تست و CCR را ثبت می‌کند.

## ۱۰. وضعیت و گام بعد

وضعیت اجرا: `COMPLETED — AWAITING ARCHITECTURE GUARDIAN REVIEW`.

این مرحله فقط آماده‌سازی بود. ادغام با `main` نیازمند بازبینی Guardian و تصویب مالک است. G11b یا هر مرحله‌ی بعدی خودکار شروع نمی‌شود.

من کدکس هستم.
