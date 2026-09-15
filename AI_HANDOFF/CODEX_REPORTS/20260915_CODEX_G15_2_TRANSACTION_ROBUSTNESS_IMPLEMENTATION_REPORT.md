# گزارش اجرای G15-2 — مقاوم‌سازی تراکنش‌های Core

## ۱. کار اجراشده

پیاده‌سازی تصمیم‌های مصوب S1 تا S4 انجام شد: یک helper مشترک برای تراکنش‌های تعاملی Core، نگاشت خطاهای retryable، انتقال همه‌ی call siteهای مجاز به helper، و آزمون‌های متمرکز. طبق تصمیم S3 هیچ retry خودکاری اضافه نشد.

## ۲. اسناد مبنا

- `AI_HANDOFF/CLAUDE_REVIEWS/20260915_OWNER_APPROVAL_G15_2_TRANSACTION_ROBUSTNESS.md`، با اعتبارسنجی GW2-P.
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_TRANSACTION_ROBUSTNESS.md`، CCR مصوب.
- شواهد G15-1 در `mlino2/validation/g15-1/`.
- دستور اجرای `CODEX-20260915-G15-2-TRANSACTION-ROBUSTNESS-IMPLEMENTATION-001`.

## ۳. فایل‌های تغییرکرده

- CCR: `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_TRANSACTION_ROBUSTNESS.md` — فقط وضعیت و تصمیم‌های مالک.
- helper: `implementation/core/transaction.ts`.
- قرارداد خطا: `implementation/core/errors.ts`.
- adapter خطا: `implementation/core/error-adapter.ts`.
- ده سرویس Core: `bootstrap-service.ts`، `business-profile-service.ts`، `capability-service.ts`، `evidence-service.ts`، `identity-claim-service.ts`، `identity-verification-service.ts`، `membership-service.ts`، `offer-service.ts`، `permission-grant-service.ts`، `publication-service.ts` — فقط import و مسیر تراکنش.
- آزمون: `implementation/test/core/g15-transaction-robustness.spec.ts`.
- شواهد: `mlino2/validation/g15-2/`.
- این گزارش و ورودی append-only در `mlino2/HANDOFF/HANDOFF_STATE.md`.

## ۴. فایل‌های تغییرنکرده

`schema.prisma`، همه‌ی migrationها، `implementation/foundation/prisma-client.ts`، `types.ts`، `tsconfig.json`، `package.json` و lockfile، Dockerfile، HTTP، V2، و سایر فایل‌های V1 تغییر نکردند. هیچ پایگاه زنده، پورت 5435، یا `_PUSH_STAGING` استفاده نشد.

## ۵. نتیجه‌ی پذیرش مسیر تراکنش

خروجی `transaction-route-grep.log` نشان می‌دهد تنها رخداد مستقیم `$transaction(` در `implementation/core/` این است:

```text
implementation/core\transaction.ts:22:  return db.$transaction(fn, coreTransactionOptions());
```

| مورد | نام دقیق آزمون | نتیجه |
|---|---|---|
| T1 | `T1 passes default and overridden transaction options and rejects invalid values` | PASS؛ پیش‌فرض 5000/10000، override و ورودی نامعتبر بررسی شد |
| T2 | `T2 maps deterministic pool exhaustion to TRANSACTION_RETRYABLE` | PASS؛ با pool برابر 1 و `maxWait=200` شکست deterministic به `TRANSACTION_RETRYABLE` نگاشت شد |
| T3 | `T3 maps %s to %s` | PASS؛ P2028، P2034، 40001 و 40P01 به `TRANSACTION_RETRYABLE` و P9999 به `INTERNAL_ERROR` نگاشت شدند |
| T3 | `T3 preserves existing trigger and uniqueness mappings` | PASS؛ نگاشت‌های قبلی حفظ شدند |

## ۶. اعتبارسنجی TypeScript و آزمون کامل

`tsc -p implementation/tsconfig.json --noEmit` با کد خروجی صفر موفق شد؛ شاهد آن `mlino2/validation/g15-2/tsc.log` است.

ده اجرای متوالی روی ده پایگاه PostgreSQL 16 جداگانه با storage از نوع tmpfs، روی `127.0.0.1:5499` و با `connection_limit=10` انجام شد. در هر اجرا ابتدا migration و سپس `jest --runInBand` اجرا شد.

| اجرا | بار CPU ثبت‌شده | migration | مجموعه‌آزمون | آزمون‌ها | نتیجه |
|---:|---:|---:|---:|---:|---|
| 1 | 4% | 0 | 29/29 | 368/368 | PASS |
| 2 | 29% | 0 | 29/29 | 368/368 | PASS |
| 3 | 13% | 0 | 29/29 | 368/368 | PASS |
| 4 | 52% | 0 | 29/29 | 368/368 | PASS |
| 5 | 20% | 0 | 29/29 | 368/368 | PASS |
| 6 | 40% | 0 | 29/29 | 368/368 | PASS |
| 7 | 66% | 0 | 29/29 | 368/368 | PASS |
| 8 | 15% | 0 | 29/29 | 368/368 | PASS |
| 9 | 27% | 0 | 29/29 | 368/368 | PASS |
| 10 | 42% | 0 | 29/29 | 368/368 | PASS |

مجموعه‌ی پذیرش نهایی با کد خروجی صفر تمام شد؛ `ten-run-verification.log` آن را به‌صورت ۱۰ اجرای معتبر از ۱۰ ثبت می‌کند. اجرای اختیاری زیر فشار مصنوعی CPU انجام نشد.

یک اجرای قبلی به‌علت cleanup تکراری کد خروجی ۱ گرفت، در حالی که لاگ‌های run سبز بودند. آن شاهد به‌عنوان پذیرش نهایی استفاده نشد؛ cleanup اسکریپت اصلاح شد و اجرای ده‌تایی نهایی با کد خروجی صفر تکرار شد.

## ۷. ایمنی محیط

`cleanup.log` نشان می‌دهد فهرست containerها و volumeها قبل و بعد یکسان بوده، هر ده container آزمایشی حذف شده‌اند و `THROWAWAY_COPIES_REMOVED=True` ثبت شده است. `redaction-check.log` روی ۱۴ فایل گزارش/شاهد اجرا شد و `URL_OR_SECRET_VALUES_FOUND=0` دارد.

## ۸. GW2 / GW2-P

fetch به‌علت در دسترس نبودن ارتباط/اعتبار احراز Git با کد 128 شکست خورد؛ هیچ credential، Git config یا credential helper دست‌کاری نشد. سپس GW2-P روی commit پین‌شده اجرا شد:

- `git cat-file -e 919329d115e036897447d365cf26b85461b596c7^{commit}` → exit 0
- `git merge-base --is-ancestor 919329d115e036897447d365cf26b85461b596c7 origin/main` → exit 0
- `git show ...:AI_HANDOFF/CLAUDE_REVIEWS/20260915_OWNER_APPROVAL_G15_2_TRANSACTION_ROBUSTNESS.md` → exit 0
- SHA-256 بایت‌های سند → `e39a1bedae8918579ed5da61a0070cb20b428e8f7fbf270dd58f8a7b783bcf32`

## ۹. manifest شواهد

هش‌های LF برای فایل‌های تغییرکرده و همه‌ی شواهد در `mlino2/validation/g15-2/LF-MANIFEST.txt` ثبت شده‌اند. مقدارها با متن فایل‌ها پس از نرمال‌سازی خط پایان به LF محاسبه شده‌اند.

## ۱۰. commit و وضعیت

این گزارش قبل از commit نهایی نوشته شد و hash commit پس از commit در همین بخش ثبت می‌شود.

## ۱۱. ریسک‌های باقی‌مانده

- `TRANSACTION_RETRYABLE` به caller واگذار می‌شود و در Core retry خودکار ندارد؛ این دقیقاً تصمیم S3 است.
- مقدار `connection_limit=10` فقط برای آزمون‌هاست و تنظیم runtime طبق S4 تغییر نکرده است.
- این مرحله schema یا migration ندارد و اثر runtime روی read-api ندارد.

## ۱۲. پرسش‌های باز

پرسش باز جدیدی ایجاد نشد؛ S1 تا S4 مطابق تصمیم مالک اجرا شدند.

## ۱۳. گام بعدی توصیه‌شده

بازبینی Guardian روی کد، گزارش، manifest و ده اجرای سبز؛ پس از آن هیچ مرحله‌ای خودکار شروع نمی‌شود.

**وضعیت: تحویل محلی انجام شد و منتظر بازبینی Guardian است.**

من کدکس هستم.
