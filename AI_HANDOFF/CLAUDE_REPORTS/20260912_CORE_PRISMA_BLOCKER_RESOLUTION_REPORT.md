# گزارش تحویل حل موانع پیش از Prisma برای MLINO Core

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**INSTRUCTION_ID:** `CODEX-20260912-CORE-PRISMA-BLOCKER-RESOLUTION-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**وضعیت:** `IMPLEMENTED` — تصمیم و اعتبارسنجی مستنداتی تحویل شد؛ Prisma اجرا نشد

## سند تحویل

`mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`

هش SHA-256 سند:

```text
92ecc10f9e136fff34808820cb39abcc37485db98d29063b3f7a1ed70db588f4
```

## نتیجهٔ راستی‌آزمایی شاخه

- شاخه: `codex/v2-intent-flow-foundation`
- HEAD: `17759bee9a1cccd0825484d608572bd028263404`
- `origin/main` پس از Fetch: `f23e297454236d468da8ed58858eda9e1cb5b8d5`
- Merge-base: `95d7c26d8a8271a5ad55f1964a251d101f7184ef`
- فاصله: `55` commit عقب و `45` commit جلو
- `ExternalWorkspaceLink` و Migration `20260910020000_add_external_workspace_link` در `origin/main` وجود دارند و در HEAD شاخه وجود ندارند.

نتیجهٔ اجرایی: Prisma باید روی پایهٔ همگام با `origin/main` اجرا شود؛ این مرحله شاخه را جابه‌جا یا ادغام نکرد.

## تصمیم‌های ثبت‌شده

1. برای همهٔ FKهای Core، `ON DELETE RESTRICT` و `ON UPDATE RESTRICT`؛ بدون Cascade یا حذف تاریخی ضمنی.
2. حفظ تاریخچه با Archive، Revoke، Retire، Withdraw و Expire انجام می‌شود؛ حذف فیزیکی رکوردهای تاریخی مجاز نیست.
3. `Publication` منبع حقیقت رخدادهای انتشار است و `publication_status` Projection همان تراکنش است.
4. جایگزینی OfferVersion با Withdrawal نسخهٔ قدیمی پیش از Publish نسخهٔ تازه و در یک تراکنش انجام می‌شود.
5. راهکار مبنای C15، Triggerهای محدود PostgreSQL به‌همراه آزمون تراکنشی است؛ Update مستقیم Projection باید رد شود.

## اعتبارسنجی

- سند جدید ایجاد شد و همهٔ ۱۲ نشانگر لازم را دارد.
- هیچ `schema.prisma`، Migration، Backend، API یا فایل اجرایی تغییر نکرد.
- هیچ تست کد یا Build اجرا نشد؛ طبق دستور این مرحله فقط اعتبارسنجی مستنداتی لازم بود.

## وضعیت نهایی

ابهام طراحی سه مانع رفع شد، اما دو Gate اجرایی همچنان باید پیش از ساخت `schema.prisma` انجام شوند:

- همگام‌سازی واقعی پایه با `origin/main` و حفظ `ExternalWorkspaceLink`؛
- اجرای اعتبارسنجی PostgreSQL برای FK، Check، Unique جزئی و C15.

فاز Handoff تغییر نکرد و ادغام با `main` انجام نشد.

**من کدکس هستم.**
