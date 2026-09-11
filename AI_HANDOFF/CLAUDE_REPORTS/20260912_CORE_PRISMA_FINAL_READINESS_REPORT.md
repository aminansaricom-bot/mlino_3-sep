# گزارش Claude — نهایی‌سازی طراحی Prisma و بازبینی نهایی آمادگی

**HANDOFF_ID:** HANDOFF-20260912-CORE-PRISMA-FINAL-READINESS
**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5

## خروجی‌ها
1. **`mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` نسخه‌ی ۳، نهایی** — شاخه‌ی `codex/v2-intent-flow-foundation`، **commit `84420ad`** (والد `b8b763d`). فقط همین فایل تغییر کرد.
2. **`mlino_book/MLINO_CORE_PRISMA_FINAL_READINESS_REVIEW.md`** — روی `main`، فایل تازه.

بدون `schema.prisma`، migration یا کد.

## تصمیم‌های مالک که اعمال شد (F1 تا F5)
- **F1:** `Publication` منبع حقیقت؛ `publication_status` یک projection است و فقط در همان تراکنش رخداد تغییر می‌کند. سازوکار ترجیحی C15: Trigger درج رخداد projection را می‌نویسد و تغییر مستقیم رد می‌شود.
- **F2:** بدون `grant_id`.
- **F3:** پنج وضعیت ادعا، بدون withdrawal.
- **F4:** آخرین ممیزی کافی است؛ تاریخچه فقط برای IdentityVerification و Publication.
- **F5:** `@db.Timestamptz(3)` · DB `snake_case` · مدل `PascalCase`. فیلد Prisma `camelCase` + `@map` (برداشت از قرارداد موجود).

## حکم بازبینی نهایی
**طراحی ✅ نهایی و آماده‌ی `schema.prisma` — ۰ 🔴 طراحی · ۴ 🟡.**

**۴ مورد 🟡:**
- **FY1:** `onDelete` و `onUpdate` تعیین نشده‌اند. پیش‌فرض Prisma در رابطه‌ی اختیاری SetNull است که یا ارجاع را بی‌صدا تهی می‌کند یا به‌تصادف با CHECK رد می‌شود. در رابطه‌ی اجباری onUpdate آبشاری است، که با تغییر شناسه‌ی AC-2 دو هویت می‌سازد. **پیشنهاد: `Restrict` همه‌جا.**
- **FY2:** پیوند نسخه‌ی آفر و توانمندی فقط تا وقتی قابل تغییر باشد که نسخه هرگز منتشر نشده.
- **FY3:** در جایگزینی نسخه، رخداد `WITHDRAWN` پیش از `PUBLISHED` — چون ایندکس یکتای جزئی قابل تعویق نیست.
- **FY4:** نام فیلد Prisma، نام رابطه‌های چندگانه و الگوی نوشتن Client.

**⛔ سه دروازه‌ی فرایندی پیش از نوشتن `schema.prisma`:**
- **G1:** اعتبارسنجی PostgreSQL
- **G2:** همگام‌سازی شاخه — ادغام در دو فایل ریشه‌ی `AI_HANDOFF` تعارض دارد
- **G3:** CCR مصوب مالک

**زود لازم:**
- اجازه‌ی انتشار پروفایل (OD-05) اکنون روی مسیر بحرانی MVP است
- ثبت تصمیم‌ها در `05_OPEN_DECISIONS.md`
- مرجع صدور شناسه‌ی سازمان تازه

## محدودیت‌ها
- هیچ Secret در Commit.
- به V1، AC‑2، Backend، قراردادهای منجمد، Adapter یا Connector دست زده نشد.
- سه فایل commitنشده‌ی Codex دست نخوردند.
- Content Studio `f6946a8` همچنان فقط محلی است — OD-09.

من کلاد هستم
