# گزارش اعتبارسنجی قیود PostgreSQL برای Prisma

تاریخ: ۲۰۲۶-۰۹-۱۲
INSTRUCTION_ID: CODEX-20260912-POSTGRES-VALIDATION-EXECUTION-001
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION
شاخه: codex/v2-intent-flow-foundation
HEAD هنگام آزمون: 2397c30ef3e0714258b36241b99d7b9cc886cf36
سند مبنا: mlino2/MLINO_POSTGRES_VALIDATION_PLAN.md
SHA-256 سند مبنا: 72d180317ec0f970b4454efae0a20a2f9a22ed3468f2fdce07444ca1c91a7e1e
وضعیت نهایی G1: G1_PARTIAL — NOT_CLOSED

## ۱. نتیجه

اعتبارسنجی PostgreSQL در کانتینر disposable و بدون volume انجام شد. رفتارهای اصلی FK، Restrict، uniqueness مربوط به Identity Claim، انتشار و پس‌گرفتن نسخه، append-only بودن Publication، immutability، rollback و رقابت هم‌زمان با موفقیت مشاهده شدند.

G1 هنوز بسته نشده است:

- artefactهای ExternalWorkspaceLink در HEAD شاخه وجود ندارند و G2 باز است؛
- migration stability با خود Prisma اجرا نشد، چون implementation/node_modules وجود ندارد و lockfile نسخهٔ 5.22.0 را resolve می‌کند؛
- fixture خارج از schema.prisma بود و همهٔ C7 تا C11 مدل نهایی Core را پوشش نمی‌دهد.

هیچ مورد اجرا نشده به‌عنوان PASS کامل گزارش نشده است.

## ۲. محیط و روش

- PostgreSQL: 16.14، UTC، isolation پیش‌فرض read committed.
- Prisma هدف اسناد: 5.20.0.
- وضعیت پروژه: node_modules مربوط به V1 نصب نیست؛ package-lock نسخهٔ 5.22.0 دارد.
- محیط: postgres:16-alpine، بدون volume، با دیتابیس مستقل mlino_g1.
- فایل‌های موقت: خارج از مخزن در TEMP/mlino-g1-20260912؛ commit نشدند.
- کانتینر پس از پایان آزمون حذف شد.

Fixture فقط رفتار PostgreSQL و نامزد C15 را بررسی کرد و جایگزین schema یا migration محصول نیست.

## ۳. آزمون‌های موفق

| آزمون | وضعیت | شواهد و SQLSTATE |
|---|---|---|
| FK مرکب و cross-tenant | PASS | ارجاع offer-a/org-b رد شد؛ 23503 |
| Claim فعال بدون verified_at | PASS | رد شد؛ 23514 |
| uniqueness جزئی Claim و سابقهٔ تاریخی | PASS | Claim فعال تکراری رد شد؛ 23505؛ Claim REJECTED پذیرفته شد |
| verification تصمیم‌شده بدون audit کامل | PASS محدود | رد شد؛ 23514 |
| immutability نسخهٔ منتشرشده | PASS | trigger تغییر محتوا را رد کرد؛ P0001 |
| تغییر مستقیم publication_status | PASS | رد شد؛ P0001 |
| rollback رخداد و projection | PASS | هر دو پس از rollback باقی نماندند |
| withdraw سپس publish جایگزین | PASS | فقط یک نسخهٔ PUBLISHED باقی ماند |
| append-only بودن Publication | PASS | UPDATE رد شد؛ P0001 |
| ON DELETE و ON UPDATE RESTRICT | PASS | حذف Organization و تغییر id رد شد؛ 23503 |
| verification تاریخی immutable | PASS | UPDATE رد شد؛ P0001 |
| حفظ index و trigger پس از DDL نامرتبط | PASS در سطح PostgreSQL | دو partial index و سه trigger باقی ماندند |
| Organization با شناسهٔ TEXT | PASS | org-text-001 با نوع text ذخیره شد |
| رقابت دو publish هم‌زمان | PASS | T1 commit شد، T2 با unique جزئی رد شد؛ 23505؛ فقط یک نسخهٔ published ماند |

در رقابت، con-v1 برابر PUBLISHED، con-v2 برابر UNPUBLISHED و تعداد Publication event برابر یک باقی ماند.

## ۴. کدهای خطا

- 23503: نقض Foreign Key در cross-tenant و حذف/تغییر مورد استفاده.
- 23505: نقض unique جزئی Claim یا OfferVersion.
- 23514: نقض CHECK در Claim و verification.
- P0001: رد عمدی trigger برای projection مستقیم، append-only و immutability.

خطاهای مورد انتظار در آزمون‌های منفی کنترل شدند. خطای تراکنش دوم در رقابت، شکست مورد انتظار آزمون است و نشان می‌دهد قید یکتایی عمل کرده است.

## ۵. موارد اجرا نشده یا ناقص

| مورد | وضعیت | دلیل |
|---|---|---|
| C7 کامل، XOR مالکیت Evidence | NOT_EXECUTED | fixture مدل Evidence نداشت |
| C8 کامل، audit completeness | NOT_EXECUTED | قیدهای نهایی در schema.prisma نیستند |
| C9 کامل، basis و founding relation | NOT_EXECUTED | در fixture مدل نشد |
| C10 کامل، همهٔ cross-field checks | NOT_EXECUTED | فقط بخشی از checkها در fixture بود |
| C11 کامل، confirmation عمومی | NOT_EXECUTED | فقط actor/time/reason verification آزموده شد |
| اجرای واقعی با schema.prisma محصول | NOT_EXECUTED | ساخت schema هنوز انجام نشده است |
| اجرای دوم با Prisma Migrate | NOT_EXECUTED | node_modules نصب نیست و chain شاخه ناقص است |
| ExternalWorkspaceLink | NOT_EXECUTED | model، migration، service و test در HEAD شاخه نیستند |
| Prisma Client regeneration | NOT_EXECUTED | قبل از schema و نصب dependencies مجاز نیست |

بنابراین PASSهای این گزارش اثبات fixture هستند، نه تأیید کامل schema.prisma نهایی یا بستن همهٔ C1 تا C15.

## ۶. C15 و Publication consistency

نامزد trigger C15 این رفتارها را نشان داد:

1. درج Publication projection را در همان تراکنش تغییر داد.
2. تغییر مستقیم projection با P0001 رد شد.
3. rollback رخداد و projection را هم‌زمان برگرداند.
4. رقابت publish فقط یک نسخهٔ published باقی گذاشت.
5. ترتیب withdraw سپس publish جایگزین سازگار ماند.

انتخاب نهایی C15 برای محصول هنوز باید در CCR و بر پایهٔ schema.prisma و migration chain واقعی ثبت شود. سازگاری نهایی trigger با Prisma Migrate از این fixture قابل ادعا نیست.

## ۷. مسائل تأییدشده و پیشنهادهای صرفاً پیشنهادی

### مسائل تأییدشده

- G1 کامل نیست تا C7 تا C11 با مدل نهایی و شواهد مستقل اجرا شوند.
- G2 باز است و artefactهای ExternalWorkspaceLink در شاخهٔ فعلی وجود ندارند.
- migration stability در سطح PostgreSQL آزمایش شد، اما Prisma Migrate واقعی آزمایش نشد.
- lockfile روی 5.22.0 است، در حالی که اسناد مبنا 5.20.0 را هدف گرفته‌اند.

### پیشنهادهای صرفاً پیشنهادی

- نسخهٔ دقیق Prisma پیش از schema.prisma pin شود یا اختلاف 5.20/5.22 در CCR تعیین تکلیف شود.
- پس از G2، آزمون migration دوم با Prisma Migrate واقعی روی دیتابیس disposable تکرار شود.
- privilegeهای پایگاه‌داده و مسیر trigger/domain service برای C15 در CCR freeze شوند.
- بعد از ایجاد schema.prisma، همین آزمون‌ها با نام‌ها و قیود واقعی محصول دوباره اجرا شوند.

هیچ پیشنهاد P1 تا P12 اعمال نشده است.

## ۸. وضعیت نهایی و گام بعد

وضعیت نهایی: G1_PARTIAL — NOT_CLOSED

برای بسته‌شدن G1 باید G2 و artefactهای ExternalWorkspaceLink تعیین تکلیف شوند، C7 تا C11 با schema واقعی اجرا شوند، و Prisma Migrate واقعی نیز حفظ قیدهای دستی را ثابت کند. تا آن زمان ساخت schema.prisma یا migration محصول مجاز نیست.

من کدکس هستم.

