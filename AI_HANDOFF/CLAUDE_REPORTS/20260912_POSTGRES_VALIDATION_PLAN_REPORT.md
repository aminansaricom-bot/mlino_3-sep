# گزارش Claude — طرح اعتبارسنجی PostgreSQL (G1)

**INSTRUCTION_ID:** `CLAUDE-20260912-POSTGRES-VALIDATION-DESIGN-001`
**HANDOFF_ID:** HANDOFF-20260912-POSTGRES-VALIDATION-PLAN
**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5

## خروجی
- `mlino_book/MLINO_POSTGRES_VALIDATION_PLAN.md` — **فقط طرح**.
- بدون `schema.prisma`، migration، کد یا اجرای آزمون.
- هیچ فایل موجودی تغییر نکرد. شاخه‌ی Codex فقط خوانده شد.

## مبنا
- طراحی نهایی (Codex `84420ad`؛ تا سر شاخه `7666d94` تغییر نکرده)
- `MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md` (`78223bd`)
- گزارش گیت و بازبینی مستقل Codex
- `review/MLINO_CORE_PRISMA_READINESS_REVIEW.md` (main `dd374df`)

## محتوا
- **محیط:** PostgreSQL 16 (مثل `docker-compose.yml`) · Prisma 5.20.0 · container یک‌بارمصرف بیرون از مخزن · اعتبارنامه فقط در env · مبنا = پنج migration موجود `origin/main`، پس آزمون **مستقل از G2** است.
- **آزمون‌ها:** PC ۱۶ · FK ۱۲ · ID ۱۲ · CT ۱۰ · IM ۷ · DR ۵ — هر کدام با SQLSTATE مورد انتظار.
- **هم‌زمانی:** دو اتصال مستقل، هماهنگی با Advisory Lock (نه `pg_sleep`)، ۴۰ اجرا برای هر آزمون (۲۰ زیر `READ COMMITTED` + ۲۰ زیر `SERIALIZABLE`).
- **قیدها:** C1 تا C15 با DDL هر کدام · ۱۲ پیشنهاد تازه P1 تا P12 — **برای تصمیم مالک، نه مصوب.**

## سه یافته
1. **نشت پرچم C15:** پرچم `set_config(..., true)` که سند حل موانع پیشنهاد کرده، تا پایان تراکنش باز می‌ماند و UPDATE مستقیم بعدی را هم مجاز می‌کند. پیشنهاد: `pg_trigger_depth() > 1` (P3) · آزمون تعیین‌کننده PC-04.
2. **`MATCH SIMPLE`:** FK مرکب با یک ستون تهی اصلاً بررسی نمی‌شود؛ پس C6 اختیاری نیست. `MATCH FULL` به‌عنوان دفاع دوم پیشنهاد شد (P1).
3. **ناهمخوانی FK `ExternalWorkspaceLink → Organization`:**
   - سند حل موانع §۳٫۲ این FK را در سیاست روابط آورده است.
   - طراحی نهایی §۴٫۱ و §۷ و گزارش گیت §۸ آن را در CCR اول ممنوع کرده‌اند.
   - FK-12 فقط شاهد است. پیشنهاد: در CCR اول نباشد.

## پیشنهادهای مهم دیگر
- **P2:** Trigger درج رخداد، گذار را بررسی کند و ردیف هدف را قفل کند — تا رخداد تکراری وارد تاریخچه‌ی پاک‌نشدنی نشود.
- **P6:** RESTRICT ردیف‌های برگ و `TRUNCATE` را حفظ نمی‌کند؛ `DELETE` و `TRUNCATE` از نقش اپلیکیشن سلب شود.
- **P7/P8:** «وضعیت پایانی برنمی‌گردد» امروز فقط در متن است.
- **P9:** `content_revision` را Trigger خودکار زیاد کند، به‌جای اینکه رد کند.
- **P10/P11:** کف نرمال‌سازی شناسه — **بدون ارقام فارسی و عربی** — و Collation `"C"`.

## محدودیت‌ها
- هیچ Secret در Commit.
- به V1، AC‑2، Backend، قراردادهای منجمد، Adapter یا Connector دست زده نشد.
- Content Studio `f6946a8` همچنان فقط محلی است — OD-09.

من کلاد هستم
