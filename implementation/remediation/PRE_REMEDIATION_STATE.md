# وضعیت پیش از اصلاح (Pre-Remediation State)

**این سند عکس فوری وضعیت Wave 1 بلافاصله پیش از شروع اصلاح جراحی است — ثبت‌شده پیش از هر تغییر کد در این تکلیف.**

## Baseline معماری

- شناسه‌ی Baseline: `MLINO_V1_CORE_BASELINE_001`
- تأیید بدون رانش (Drift): `ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/architecture/Kernel_Architecture_v1.3_FROZEN.md`، `Interaction_Contracts_v1.1_FROZEN.md`، و ADRهای `00AC`/`00AD`/`00AE` بدون تغییر از زمان بسته‌بندی Wave 1 (بدون مخزن Git، اما هیچ ابزار یا فرآیندی در این جلسه این فایل‌ها را تغییر نداده — تأیید با محتوای مرجع‌دهی‌شده در `WAVE_1_REVIEW_MANIFEST.md` و پژوهش تازه‌ی این تکلیف که همان نقل‌قول‌ها را بازیابی کرد).
- سلسله‌مراتب مرجع تأیید‌شده مجدد: `DOCUMENT_AUTHORITY_CLASSIFICATION.md:26` — «Kernel → ADR پذیرفته‌شده → Interaction Contract پذیرفته‌شده → اسناد REFERENCE/IMPLEMENTATION-GUIDANCE».

## نسخه‌ی قرارداد مشترک

- `PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/CONTRACTS.md` — وضعیت «FROZEN FOR IMPLEMENTATION» — بدون تغییر.
- `implementation/shared-contracts/types.ts` — تأیید مطابقت کامل با CONTRACTS.md (بدون تغییر در این تکلیف مگر جایی که صریحاً گزارش شود).

## تعداد تست فعلی

۳۷ تست، ۷ Test Suite — همگی موفق (بازآزمایی مستقل، تازه اجراشده در این جلسه).

## نتیجه‌ی اعتبارسنجی فعلی

| بررسی | نتیجه |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | PASS — exit 0، خروجی خالی |
| `npx prisma validate` | PASS — «schema... is valid 🚀» |
| `npx jest` | PASS — ۷/۷ Suite، ۳۷/۳۷ تست |

## وضعیت Migration فعلی

```
npx prisma migrate status
→ 1 migration found in prisma/migrations
→ Database schema is up to date!
```

تنها Migration: `20260814065924_init`.

## وضعیت وابستگی فعلی

بدون تغییر نسبت به [[../WAVE_1_DEPENDENCY_AUDIT.md]] — `@prisma/client ^5.20.0`، `jsonwebtoken ^9.0.3`، `@types/jsonwebtoken ^9.0.10`، `uuid ^9.0.1` (Runtime)؛ `typescript`, `jest`, `ts-jest`, `prisma`, `@types/*` (Dev). **پیش‌بینی این اصلاح: بدون افزودن هیچ وابستگی جدید** (طبق بند ۶ درخواست — استفاده از قابلیت‌های موجود Prisma برای رفع R1، و اعتبارسنجی صریح دستی برای رفع R2/R3، بدون کتابخانه‌ی جدید).

## فایل‌هایی که انتظار می‌رود در این اصلاح تغییر کنند

| فایل | یافته‌ی مرتبط | نوع تغییر پیش‌بینی‌شده |
|---|---|---|
| `foundation/event-log/event-log.service.ts` | R1 | افزودن مدیریت اتمیک تعارض یکتایی DB (catch روی خطای Constraint) |
| `foundation/event-admission/admission-validator.ts` | R2, R3 | تقویت اعتبارسنجی زمان اجرا (ساختار Payload، بازه‌ی `confidence_level`)، تقویت بررسی هدف Amendment (نوع رویداد + تطابق domain_tag) |
| `foundation/auth-adapter/auth-adapter.ts` | R7 | حذف Fallback ناامن؛ Fail-Closed در نبود `MLINO_JWT_SECRET` |
| `jest.config.js` | R7 (پشتیبانی تست) | افزودن `setupFiles` برای پیکربندی صریح راز تست |
| `test/setup-env.ts` (جدید) | R7 | تنظیم صریح `MLINO_JWT_SECRET` فقط برای محیط تست |
| `test/foundation/auth-adapter.spec.ts` | R7 | افزودن تست‌های Fail-Closed؛ حفظ ۶ تست موجود بدون تغییر ادعا |
| `test/foundation/event-admission-concurrency.spec.ts` (جدید) | R1 | تست همزمانی واقعی روی Postgres |
| `test/foundation/event-admission-validation.spec.ts` (جدید) | R2, R3 | ماتریس ورودی نامعتبر + تست‌های یکپارچگی هدف Amendment |
| `.env.example` | R7 (مستندسازی) | افزودن راهنمای `MLINO_JWT_SECRET` (بدون رمز واقعی) |

**فایل‌هایی که عمداً دست‌نخورده باقی می‌مانند:** `prisma/schema.prisma` (بدون نیاز به تغییر — Constraint یکتایی لازم برای R1 از قبل موجود است)؛ همه‌ی فایل‌های Feature (F-01 تا F-05)؛ `shared-contracts/types.ts` (بدون تغییر در این اصلاح — یافته‌های نیازمند تغییر قرارداد به CONTRACT_CHANGE_REQUEST ارجاع داده می‌شوند)؛ هر ۳۷ تست موجود (بدون حذف، بدون تضعیف ادعا — فقط `auth-adapter.spec.ts` یک `beforeAll`/`afterEach` برای پیکربندی صریح محیط تست دریافت می‌کند، بدون تغییر خودِ ادعاها).
