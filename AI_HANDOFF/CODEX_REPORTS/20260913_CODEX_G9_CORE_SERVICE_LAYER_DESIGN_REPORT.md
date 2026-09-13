# گزارش اجرای G9 — طراحی لایهٔ سرویس Core

**تاریخ:** ۲۰۲۶-۰۹-۱۳
**INSTRUCTION_ID:** `CODEX-20260913-G9-CORE-SERVICE-LAYER-DESIGN-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
**REVIEW_REFERENCE:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G8_V1_RUNTIME_REBUILD.md`
**DECISION:** `APPROVED_NEXT_STEP`
**MODE:** `DOCUMENT ONLY`

## ۱. Task اجراشده

سند طراحی `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md` با ۱۱ بخش اصلی ایجاد شد. طراحی شامل W1 اجباری، W2 به‌عنوان گزینه، مدل permission مبتنی بر Membership + Grant، تراکنش Publication، D6=A، نگاشت عملیات به ۱۳ Trigger، مدل خطا، راهبرد آزمون tmpfs، تصمیم‌های باز S1 تا S9 و ماتریس ADR-0001 تا ADR-0012 است.

هیچ پیاده‌سازی، Prisma generate، migration، Docker یا اتصال دیتابیس انجام نشد.

## ۲. منابع استفاده‌شده

- دستور مالک G9 و الزامات آن
- `origin/main:implementation/prisma/schema.prisma`
- `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql`
- ADRهای موجود در `mlino_book/adr/ADR-0001` تا `ADR-0012`
- Handoff زندهٔ `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
- شواهد و تصمیم‌های G1 تا G8 موجود در شاخهٔ Core

تلاش برای `git fetch origin` در این اجرا به‌دلیل نبود credential در Schannel انجام نشد؛ بنابراین متن بازبینی G8 از ref محلی قابل‌دسترسی نبود. طراحی فقط بر اساس الزامات صریح همین دستور، schema و migration موجود در `origin/main` و منابع بالا نوشته شد و این محدودیت در بخش ریسک ثبت شده است.

## ۳. فایل‌های ایجادشده

- `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md`
- `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9_CORE_SERVICE_LAYER_DESIGN_REPORT.md`
- یک ورودی افزودنی در `mlino2/HANDOFF/HANDOFF_STATE.md`

## ۴. فایل‌های تغییرنکرده

- `implementation/**`
- `schema.prisma` و تمام migrationها
- کد backend، API، Repository و تست‌ها
- ADRها و `mlino_book/**`
- `main` و شاخهٔ V2
- `_PUSH_STAGING`
- فایل‌های root در `AI_HANDOFF/**`
- Docker، دیتابیس و imageها

## ۵. اعتبارسنجی مستندات

- وضعیت شاخه پیش از کار: `codex/core-prisma-foundation` روی `669a992d7f0d9b46960a5b2504ca57ec658c32d5`
- working tree پیش از کار clean بود.
- جست‌وجوی schema و migration با `rg` و `git show origin/main:<path>` انجام شد.
- شمارهٔ خط شروع همهٔ مدل‌های Core استخراج و در سند ثبت شد.
- هیچ تست کد یا تست دیتابیس اجرا نشد، چون scope این مرحله فقط document است.

## ۶. شواهد schema و migration

- `schema.prisma:327-655` مدل‌های Core و روابط آن‌ها را پوشش می‌دهد.
- migration خطوط `403-490` کلیدهای خارجی tenant را با `ON DELETE RESTRICT ON UPDATE RESTRICT` نشان می‌دهد.
- migration خطوط `509-513` قید یکتایی نسخهٔ published را نشان می‌دهد.
- migration خطوط `696-755` قیدهای projection، revision و confirmation را نشان می‌دهد.
- migration خطوط `760-1007` Triggerهای immutability، D6 و C15 را نشان می‌دهد.
- SHA-256 محتوای Git برای schema: `760b25b59735c7dbb4b2ca4602f3ccf4dc353f5e3d71f2dff9ec893500222ee4`
- SHA-256 محتوای Git برای migration: `99e7ae8a06e804d6fa282727ce5b5ef65e4bbea5add0e936b4d9604411751167`

## ۷. تصمیم‌هایی که عمداً اعمال نشدند

Codex هیچ‌کدام از S1 تا S9 را انتخاب نکرد: transport، AuthContext نهایی، پذیرش W2، idempotency، platform identity adapter، error payload، snapshot، repository boundary و V2 read contract همگی برای مالک باز مانده‌اند.

## ۸. ریسک‌ها و محدودیت‌ها

- متن بازبینی G8 به‌دلیل خطای credential در fetch از remote دوباره دریافت نشد؛ این موضوع باید در بازبینی Guardian بررسی شود.
- سند فعلی design است و نباید به‌عنوان مجوز ایجاد service یا API تفسیر شود.
- وجود schema و migration به‌تنهایی به معنی وجود عملیات business یا اتصال عملیاتی V1 به V2 نیست.

## ۹. پرسش‌های باز

- آیا Guardian با وجود در دسترس نبودن متن بازبینی G8 در ref محلی، منابع و شواهد استفاده‌شده را کافی می‌داند؟
- کدام‌یک از S1 تا S9 باید پیش از مشخصات implementation تصمیم‌گیری شود؟
- آیا read contract منتشرشدهٔ V2 باید در یک سند جداگانه تعریف شود؟

## ۱۰. گام بعدی

Architecture Guardian سند طراحی و گزارش را مستقل بازبینی کند. Codex پس از Commit و Push متوقف می‌شود و بدون Handoff جدید، تصویب مالک و بازبینی Guardian هیچ implementation، Prisma، Docker یا دیتابیسی را شروع نمی‌کند.

من کدکس هستم.
