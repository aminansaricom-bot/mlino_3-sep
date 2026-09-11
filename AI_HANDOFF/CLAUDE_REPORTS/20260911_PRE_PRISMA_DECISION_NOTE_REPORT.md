# گزارش Claude — یادداشت تصمیم پیش از Prisma

**HANDOFF_ID:** HANDOFF-20260911-PRE-PRISMA-DECISION-NOTE
**تاریخ:** ۱۱ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Database Architecture Reviewer
**مبنا:** `MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md` (`075f1e7`) · `MLINO_CORE_SCHEMA_DESIGN_V2.md` (Codex `588b9c0`)

## خروجی
- `mlino_book/MLINO_PRE_PRISMA_DECISION_NOTE.md` — **فایل تازه**. هیچ فایل موجودی تغییر نکرد. بدون Prisma، migration یا کد.

## وضعیت زنده — بررسی‌شده
- `origin/main` = `075f1e7` · Codex = `588b9c0` · پایه‌ی مشترک `95d7c26` · main ۵۱ و Codex ۳۸ commit جلوتر.
- **هیچ فایلی را هر دو شاخه تغییر نداده‌اند.** `git merge-tree` بدون تعارض.
- شاخه‌ی Codex **صفر فایل** در `implementation/` تغییر داده؛ فقط پایه‌اش قدیمی است.
- Clone محلی Codex سه فایل **commitنشده** دارد (`MLINO_FIRST_VALUE_PATH_PLAN.md`، `MLINO_PHASE_0_CLOSURE_REPORT.md`، `MLINO_PHASE_0_IMPLEMENTATION_READINESS_REPORT.md`) — دست نخوردند.

## توصیه‌ها (تصمیم نهایی با مالک)
1. **همگام‌سازی (RR1):** شاخه‌ی پیاده‌سازی از `origin/main` + **merge** شاخه‌ی Codex؛ rebase و کپی دستی رد. پیش از اولین مدل: `implementation/prisma` بایت‌به‌بایت برابر `main`.
2. **جداسازی مستأجر (RR2):** یکتای `(id, organization_id)` + کلید خارجی مرکب برای ۱۱ موجودیت؛ `organization_id` به `IdentityVerification`، `PermissionGrant`، `OfferVersion`، `OfferVersionCapability` افزوده شود. ارجاع بازبین پلتفرم عمداً بیرون. `MATCH SIMPLE` با XOR سازگار است؛ رفتار Prisma با رابطه‌ی اختیاری مرکب **با آزمون کوچک راستی‌آزمایی شود** — جایگزین: SQL دستی مثل `20260910020000`.
3. **اقدام:** بیرون از فاز ۱ تایید شد؛ CCR دوم با پیشنهاد v1.1، ارجاع موضوعی (Y8)، KPI و هدف.
4. **`BusinessProfile`:** سه گزینه تحلیل شد؛ توصیه = **پروفایل به‌عنوان واحد مکان یا شعبه** — بدون یکتای سازمان، ارجاع تهی‌پذیر به ادعا (یکتای جزئی)، مکان عددی؛ «یک پروفایل در MVP» قاعده‌ی دامنه. اجازه‌ی انتشار پروفایل ذیل OD-05 — مانع شِما نیست.
5. **موارد 🟡:** پیش از Prisma: YR1 · YR2 · YR4-الف · YR4-ج · YR5 · YR6-پیوند · YR8. بعداً: YR3 (ولی همین حالا تصمیم شود) · YR4-ب · YR6-Registry · YR7.

## محدودیت‌ها
- هیچ Secret در Commit. به V1، AC‑2، Backend، قراردادهای منجمد، Adapter یا Connector دست زده نشد.
- Content Studio `f6946a8` همچنان فقط محلی است — OD-09.

من کلاد هستم
