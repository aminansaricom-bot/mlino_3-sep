# مانیفست بازبینی Wave 1

**نوع سند: عکس فوری وضعیت، نه تصمیم.** ثبت‌شده بدون تغییر در کد.

| فیلد | مقدار |
|---|---|
| تاریخ/ساعت (UTC) | 2026-08-14T08:21:18Z |
| شناسه‌ی Baseline معماری | `MLINO_V1_CORE_BASELINE_001` |
| نسخه‌ی قرارداد مشترک | v1 (`PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/`) |
| نسخه/بسته‌ی فاز ۴B | `MLINO_PHASE_4B_AGENT_READY_IMPLEMENTATION_PACK.zip` |
| مخزن Git | **وجود ندارد** — `git status` در `implementation/` خطای «not a git repository» بازگرداند؛ بدون Commit Hash، بدون امکان بررسی تغییرات مرحله‌بندی‌شده |
| Node.js | v24.18.0 |
| npm | 11.16.0 |
| TypeScript | 5.9.3 (CLI اجراشده)؛ `^5.6.2` در package.json |
| Jest | 29.7.0 |
| Prisma / @prisma/client | 5.22.0 |
| PostgreSQL (تست) | 16.14 (Docker، `postgres:16-alpine`) |
| پیکربندی DB تست (بدون راز) | میزبان `localhost`، پورت `5435`، پایگاه‌داده `mlino_v1`، کاربر `mlino` — رمز در `.env` محلی، اینجا افشا نشد |
| کل فایل منبع (غیر‌تست) | ۱۶ فایل `.ts` |
| کل فایل تست | ۷ فایل `.spec.ts` |
| Migration ها | یک مورد: `20260814065924_init` |
| وضعیت درخت کاری | N/A (بدون مخزن Git برای مقایسه) |

## وابستگی‌ها (خلاصه، جزئیات کامل در `WAVE_1_DEPENDENCY_AUDIT.md`)

`@prisma/client`, `jsonwebtoken`, `uuid` (Runtime)؛ `jest`, `prisma`, `ts-jest`, `typescript`, `@types/*` (Dev).

## محدودیت‌های شناخته‌شده (بدون تغییر، فقط ثبت)

- بدون مخزن Git — هیچ تاریخچه‌ی Commit قابل‌ارجاع نیست.
- FP-02 (Projection/IC-14 واقعی) ساخته نشده — F-04/F-05 با Mock کار می‌کنند.
- اتصال واقعی به Connector Malino ساخته نشده.
- یافته‌ی actor/CoreEntity — جزئیات کامل در `ACTOR_COREENTITY_FINDING.md`، **بدون حل در این بسته‌بندی.**
