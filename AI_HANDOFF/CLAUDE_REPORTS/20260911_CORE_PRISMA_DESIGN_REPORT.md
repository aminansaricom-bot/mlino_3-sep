# گزارش تحویل طراحی نخست شِمای Prisma برای MLINO Core

**تاریخ:** ۲۰۲۶-۰۹-۱۱  
**INSTRUCTION_ID:** `CODEX-20260911-0044-CORE-PRISMA-DESIGN`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**وضعیت:** `IMPLEMENTED` — طراحی مستنداتی تحویل شد؛ پیاده‌سازی شِما انجام نشد

## نتیجه

سند `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` ایجاد و روی شاخهٔ `codex/v2-intent-flow-foundation` Push شد.

Commit تحویل:

```text
ccca7c547be232e5ec98f556a59fc706162eeba8
```

Remote confirmation:

```text
8571bad..ccca7c5  codex/v2-intent-flow-foundation -> codex/v2-intent-flow-foundation
```

## محتوای تحویل

سند برای هر ۱۱ مدل خواسته‌شده این موارد را مشخص می‌کند:

- هدف و مالکیت؛
- فیلدها و نوع‌های پیشنهادی Prisma/PostgreSQL؛
- روابط و Foreign Keyهای مرکب؛
- کلیدهای اصلی و Unique؛
- Indexها؛
- چرخهٔ حیات؛
- قاعدهٔ جداسازی Tenant.

قواعد کلیدی نیز ثبت شده‌اند:

- Organization از BusinessIdentityClaim جداست؛
- Permission فقط از Membership و PermissionGrant می‌آید و Role هرگز منبع Permission نیست؛
- بازبین Platform با `reviewed_by_platform_identity_ref` ثبت می‌شود و Business Membership نیست؛
- ارجاع‌های درون‌سازمانی با `(id, organization_id)` و FK مرکب بسته می‌شوند؛
- Uniqueهای جزئی، XOR و Checkهای چندستونه به CCR و Migration بررسی‌شده موکول شده‌اند؛
- هیچ Entity اختصاصی Clinic در Core قرار نگرفته است؛
- Action، Intent، Session persistence، Consent persistence و Customer Data ingestion در این طراحی وجود ندارند.

## اعتبارسنجی انجام‌شده

اعتبارسنجی فقط مستنداتی بود، مطابق دستور:

1. وجود هر ۱۱ مدل در سند کنترل شد: `11/11`.
2. commit اول فقط همین فایل را شامل داشت.
3. `schema.prisma`، Migrationها و فایل‌های برنامه در commit تحویل تغییر نکردند.
4. سند آزمایش مستقل Prisma با نسخهٔ `5.20.0` و نتیجهٔ موفق کلیدهای مرکب به‌عنوان مبنا استفاده شد.
5. هیچ تست کد یا Build اجرا نشد؛ طبق دستور این مرحله لازم نبود.

## موارد باز ثبت‌شده

سند تصمیم‌های باز منابع را پنهان نکرده است:

- همگام‌سازی پایهٔ شاخه با `origin/main` و وجود `ExternalWorkspaceLink` پیش از اولین Schema؛
- تعیین تکلیف دو وضعیت Claim در YR1؛
- ممیزی لغو و `grant_id` در YR2؛
- شکل نهایی شعبه‌ای BusinessProfile؛
- ماندن یا حذف `version_status` در YR5؛
- روش اجرایی Checkهای XOR، بازهٔ زمانی و قیمت؛
- Permission لازم برای انتشار BusinessProfile در OD-05.

این موارد تصمیم جدیدی در این مرحله ایجاد نکرده‌اند.

## وضعیت فایل‌ها

فایل جدید تحویل‌شده:

- `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`

فایل‌های قدیمی untracked موجود در working tree عمداً stage یا تغییر داده نشدند.

**من کدکس هستم.**
