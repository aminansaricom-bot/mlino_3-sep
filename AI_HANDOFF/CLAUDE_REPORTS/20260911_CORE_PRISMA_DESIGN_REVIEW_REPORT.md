# گزارش Claude — بازبینی طراحی Prisma هسته

**HANDOFF_ID:** HANDOFF-20260911-CORE-PRISMA-DESIGN-REVIEW
**تاریخ:** ۱۱ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Core Prisma Design Reviewer
**سند بازبینی‌شده:** `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` (Codex `ccca7c5`، سر شاخه `39b6708`)

## خروجی
- `mlino_book/MLINO_CORE_PRISMA_DESIGN_REVIEW.md` — فایل تازه. هیچ فایل موجودی تغییر نکرد. بدون `schema.prisma`، migration یا کد.

## حکم: هنوز آماده نیست — ۲ 🔴 · ۷ 🟡 · ۱۰ حوزه 🟢

### 🔴
- **PR1:** سه تصمیم شکل‌دهنده در خود سند باز است:
  - **YR1:** دو وضعیت برای ادعا؛ enum فاقد `REJECTED`، `EXPIRED` و `SUSPENDED`؛ «معلق» D-61 قابل نمایش نیست
  - **YR2:** `revoked_by` و دلیل لغو نیست؛ `grant_id` در `Publication` نیست
  - **YR5:** `version_status` مانده است
- **PR2:** `Organization.id` از نوع `@db.Uuid` است و هیچ‌جا به فضای شناسه‌ی `organization_id` موجود وصل نشده. این ستون در ۶ جدول V1 از نوع `TEXT` است، از AC-2 می‌آید، و در تست‌ها شناسه‌هایی مثل `org_test_a` دارد. نتیجه:
  - دو هویت برای سازمان (ADR-0001)
  - کلید خارجی `ExternalWorkspaceLink → Organization` ساختنی نیست (ADR-0004)

### 🟡
- **PY1:** کلید اصلی مرکب → `@id` + `@@unique([id, organizationId])`
- **PY2:** فهرست قیدهای بیرون از Prisma ناقص است و روش هر قید تعیین نشده؛ خطر احتمالی `DROP INDEX` در migration بعدی باید آزموده شود
- **PY3:** آزمون PostgreSQL انجام نشده
- **PY4:** `CUSTOMER_DATA` در enum فیزیکی هست ولی مسدود نیست
- **PY5:** ویرایش پروفایل و توانمندی منتشرشده بدون دروازه‌ی انتشار
- **PY6:** قاعده‌ی زمان خواندن (YR3) صریح نیست
- **PY7:** قرارداد نام‌گذاری و نوع داده با شِمای منجمد ناهمخوان است

### 🟢
کامل بودن موجودیت‌ها · درستی روابط · جداسازی مستأجر · مرز هویت · مرز اجازه · مقیاس‌پذیری `BusinessProfile` · کنترل دامنه‌ی MVP

## یافته‌ی عملیاتی
- Commit `39b6708` در شاخه‌ی Codex فایل‌های **ریشه‌ی** `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `HANDOFF_STATE.md` را نوشته است.
- `merge-tree` اکنون **دو تعارض** در همین دو فایل می‌دهد. ادعای «ادغام بدون تعارض» در یادداشت پیش از Prisma (نوشته‌شده روی `588b9c0`) دیگر برقرار نیست. آن یادداشت اصلاح نشد، چون تغییر فایل ممنوع بود.
- `implementation/` در شاخه‌ی Codex همچنان صفر تغییر دارد.

## محدودیت‌ها
- هیچ Secret در Commit.
- به V1، AC‑2، Backend، قراردادهای منجمد، Adapter یا Connector دست زده نشد.
- Clone شاخه‌ی Codex فقط خوانده شد.
- Content Studio `f6946a8` همچنان فقط محلی است — OD-09.

من کلاد هستم
