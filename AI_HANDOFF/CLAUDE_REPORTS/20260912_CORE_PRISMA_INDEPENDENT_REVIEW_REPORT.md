# بازبینی مستقل طراحی شِمای Prisma برای MLINO Core

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** Codex Independent Reviewer  
**INSTRUCTION_ID:** `CODEX-20260912-CORE-PRISMA-INDEPENDENT-REVIEW-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**سند بازبینی‌شده:** `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`  
**نسخهٔ مشاهده‌شده:** `84420ad3962841752d7225a96182f72ceebf43ac`  
**شاخه:** `codex/v2-intent-flow-foundation`

## رأی نهایی

**C — پیش از ساخت `schema.prisma` مسدود است.**

مدل‌های اصلی، مالکیت Core و جداسازی Vertical درست جهت‌گیری شده‌اند؛ اما سه پیش‌نیاز فیزیکی هنوز بسته یا اعتبارسنجی نشده‌اند:

1. شاخهٔ پیاده‌سازی Prisma با پایهٔ مصوب `origin/main` همگام نیست؛
2. سیاست حذف و به‌روزرسانی Foreign Keyها برای حفظ تاریخچه صریح نشده است؛
3. سازوکار نهایی C15 برای هم‌ترازی رخداد `Publication` و `publication_status` انتخاب و روی PostgreSQL اثبات نشده است.

تا بسته‌شدن این موارد، تبدیل سند به شِمای واقعی خطر ایجاد Migration ناسازگار، حذف تاریخی ناخواسته یا دو منبع ناسازگار برای وضعیت انتشار دارد.

## ۱. دامنه و روش بررسی

بررسی با این مبنا انجام شد:

- ADR-0001 تا ADR-0012؛
- D-52، D-55، D-57، D-61، D-63، D-68 و D-71؛
- `MLINO_CORE_SCHEMA_DESIGN_V2.md`؛
- `MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md`؛
- `MLINO_PRE_PRISMA_DECISION_NOTE.md`؛
- `PRISMA_COMPOSITE_KEY_VALIDATION.md`؛
- وضعیت واقعی Git و فایل `implementation/prisma/` در شاخهٔ بازبینی.

این بررسی فقط مستنداتی است. هیچ `schema.prisma`، Migration، کد برنامه، ADR یا Handoff phase تغییر داده نشده است.

## ۲. یافته‌های RED — الزام پیش از Prisma

### RED-01 — پایهٔ شاخه با شِمای مصوب `main` همگام نیست

**شواهد:**

- سند طراحی در §۱، §۴٫۱ و §۹ خود این پیش‌نیاز را با RR1 ثبت کرده است؛
- `HEAD` شاخهٔ بازبینی: `84420ad3962841752d7225a96182f72ceebf43ac`؛
- `origin/main`: `c98e8741f242b572fb4f9af2aeb579c9378f47b5`؛
- `implementation/prisma/schema.prisma` در شاخهٔ فعلی `ExternalWorkspaceLink` ندارد؛
- `origin/main` مدل `ExternalWorkspaceLink` و Migration `20260910020000_add_external_workspace_link` را دارد؛
- شاخهٔ فعلی چهار Migration دارد و Migration پیوند خارجی در آن نیست.

**اثر:** اولین شِمای Core روی این پایه با تاریخچهٔ Migration و مدل مصوب پیوند Workspace واگرا می‌شود. ادغام بعدی می‌تواند دو تاریخچهٔ متعارض برای فایل منجمد ایجاد کند و قواعد D-61 را از مبنای واقعی جدا کند.

**اقدام لازم:** شاخهٔ پیاده‌سازی Prisma باید طبق تصمیم RR1 از پایهٔ همگام با `origin/main` ساخته شود؛ سپس برابری بایت‌به‌بایت `implementation/prisma/schema.prisma` و `implementation/prisma/migrations/` با پایهٔ مصوب ثبت شود. این کار باید بدون rebase مخرب تاریخچهٔ منتشرشده انجام شود.

### RED-02 — سیاست حذف و به‌روزرسانی Foreign Keyها تعیین نشده است

**شواهد:**

- §۳٫۲ کلیدهای مرکب و FKهای Tenant را تعریف می‌کند، اما `ON DELETE` و `ON UPDATE` را مشخص نمی‌کند؛
- §۳٫۴ و چرخه‌های مدل‌ها بر باقی‌ماندن تاریخچه، Immutable بودن Verification/Publication و عدم حذف Versionهای قدیمی تکیه دارند؛
- فهرست C6 تا C15 در §۸ قیدهای مرکب، XOR، Append-only و Trigger را دارد، اما سیاست حذف/به‌روزرسانی روابط در آن نیست.

**اثر:** اگر رفتار FK به پیش‌فرض Prisma یا Database واگذار شود، حذف Organization، Membership، Claim، Offer یا Capability می‌تواند تاریخچه را آبشاری حذف کند یا اجازهٔ تغییر والدِ مرجع‌شده را بدهد. این با ممیزی IdentityVerification و Publication، تاریخچهٔ Claim، نسخه‌های Offer و D-57 سازگار نیست.

**اقدام لازم:** در CCR شِما برای هر FK مشخص شود که رفتار پیش‌فرض `RESTRICT`/`NO ACTION` است و هیچ Cascade خاموشی مجاز نیست؛ برای روابط تاریخی، حذف فیزیکی رکورد والد و به‌روزرسانی کلیدهای هویتی باید مسدود باشد. اگر استثنایی وجود دارد، باید همان‌جا با دلیل، دامنه و آزمون ثبت شود.

### RED-03 — C15 هنوز سازوکار اجرایی قطعی ندارد

**شواهد:**

- §۴٫۱۱ می‌گوید `Publication` منبع حقیقت رخداد است و `publication_status` فقط در همان تراکنش Projection می‌شود؛
- C15 در §۸٫۱ دو گزینه را باز می‌گذارد: Trigger یا مسیر دامنه + تست یکپارچه؛
- §۹ و §۱۰ سند را «نهایی» معرفی می‌کنند، اما §۸ هنوز انتخاب سازوکار C15 را به آزمون بعدی موکول کرده است.

**اثر:** بدون انتخاب سازوکار، دو مسیر می‌تواند هم‌زمان وجود داشته باشد: درج رخداد بدون به‌روزرسانی Projection، یا تغییر مستقیم Projection بدون رخداد. در این حالت Unique جزئی «یک نسخهٔ Published» و Published Read Port قابل اعتماد نیستند.

**اقدام لازم:** یک روش قطعی پیش از `schema.prisma` انتخاب و در PostgreSQL آزمایش شود. حداقل باید ثابت شود:

- تغییر مستقیم `publication_status` رد می‌شود؛
- درج `Publication` Projection درست را در همان تراکنش ایجاد می‌کند؛
- ترتیب Withdrawal نسخهٔ قدیمی پیش از Publish نسخهٔ تازه حفظ می‌شود؛
- Rollback هر دو تغییر را برمی‌گرداند؛
- مسیر Prisma نمی‌تواند قید رخداد را دور بزند.

## ۳. یافته‌های YELLOW — بهبود لازم یا تصمیم اجرایی

### YELLOW-01 — نام‌گذاری رابطه‌های Prisma هنوز دقیق نشده است

قاعدهٔ مدل PascalCase، جدول snake_case و فیلد camelCase با `@map` در §۳٫۱ وجود دارد و پذیرفتنی است. اما نام نهایی Relationها، نام `@@map` جدول‌های پیوند و نام دقیق Relationهای خودارجاع یا چندرابطه‌ای هنوز به شکل قابل‌کپی به `schema.prisma` مشخص نشده است. این موضوع معماری را تغییر نمی‌دهد، اما پیش از کدنویسی باید یک جدول نام‌گذاری نهایی داشته باشد تا Relation collision یا `@relation` مبهم رخ ندهد.

### YELLOW-02 — قرارداد نرمال‌سازی شناسهٔ هویت باید قابل‌آزمون باشد

`identifier_value` نرمال‌شده و Unique جزئی D-61 درست تعریف شده است؛ با این حال الگوریتم نرمال‌سازی، حساسیت حروف، فاصله، ارقام و Collation مشخص نیست. آزمون باید ثابت کند مقدار شاخص دقیقاً همان مقدار نرمال‌شدهٔ Domain است؛ وگرنه Unique دیتابیس می‌تواند دو نمایش از یک شناسه را جدا ببیند.

### YELLOW-03 — JSONهای عمومی و `terms` مرز ساختاری کافی ندارند

`contact_information`، `links`، `business_hours` و `terms` به‌صورت `Json` تعریف شده‌اند. این برای MVP قابل استفاده است، اما Shape و Allowlist قرارداد باید پیش از اولین انتشار مشخص شود تا دادهٔ داخلی، Customer Data یا Availability زنده وارد نمای عمومی نشود. YR7 برای `terms` همچنان باز است.

### YELLOW-04 — قیدهای دامنهٔ مکان، پول و Revision نیازمند آزمون دقیق‌اند

برای `latitude`/`longitude`، قیمت و `content_revision` نوع مناسب پیشنهاد شده و Checkهای کلی آمده‌اند؛ اما آزمون باید محدودهٔ مختصات، مقدار اولیهٔ Revision، افزایش یکتا و جلوگیری از تغییر محتوای منتشرشده بدون تغییر Revision را ثابت کند. به‌خصوص قاعدهٔ «هر ویرایش Revision را زیاد می‌کند» فقط با متن تضمین نمی‌شود.

### YELLOW-05 — شناسهٔ Organization و منبع صدور آن هنوز عملیاتی نشده است

هم‌نوعی `Organization.id` با شناسهٔ AC-2 با PR2 سازگار است و از ساختن هویت دوم جلوگیری می‌کند. منبع صدور و مسیر ثبت Organization جدید به OD-08 وابسته و در سند باز مانده است. این به‌خودی‌خود شکل جدول را مسدود نمی‌کند، اما باید پیش از دادهٔ واقعی و اتصال FKهای موجود ثبت شود.

### YELLOW-06 — محدودیت‌های نگهداری باید کنار FKها در CCR بیاید

قواعد Immutable بودن IdentityVerification، Publication، OfferVersion و OfferVersionCapability در سند وجود دارد، اما روش دقیق Trigger یا مجوز Database برای همهٔ آن‌ها هنوز در سطح گزینه است. فهرست C12 تا C14 مناسب است؛ نتیجهٔ آزمون PostgreSQL باید یک روش نهایی و Rollback آن را ثبت کند.

## ۴. یافته‌های GREEN — تأییدشده

### GREEN-01 — مالکیت Entityها و مرز Core/Module

Core به‌درستی مالک Organization، Claim، Verification، Membership، PermissionGrant، BusinessProfile، Capability، Offer، OfferVersion، Evidence و Publication است. Action Foundation در مسیر Core باقی می‌ماند اما طبق ADR-0007/0008 و طرح فعلی، جدول آن در این فاز عمداً خارج است.

Clinic Module فقط باید واژگان درمانی، خدمات، متخصص، Appointment، Capacity و Workflow تخصصی را نگه دارد. در مدل‌های Core واژهٔ Clinic، Doctor، Treatment، Patient یا Appointment وارد نشده است.

### GREEN-02 — آمادگی چند Vertical

Capability و Offer قراردادهای عمومی Core هستند، `category_key` و `permission_key` بسته و Clinic-specific نشده‌اند، و BusinessProfile دادهٔ عمومی پایه را مستقل از Vertical نگه می‌دارد. بنابراین Restaurant، Retail و Cafe می‌توانند از Core استفاده کنند و دادهٔ تخصصی خود را در Module مستقل نگه دارند.

### GREEN-03 — Permission architecture

Membership به Subject خارجی متکی است و User/Password داخلی ایجاد نمی‌کند. PermissionGrant به Membership متصل است، `permission_key` قابل‌گسترش است و هیچ Role یا Role ID در مسیر اعطا وجود ندارد. عبارت صحیح در سند رعایت شده است: **Role هرگز منبع Permission نیست.**

### GREEN-04 — Identity architecture

Organization از BusinessIdentityClaim جداست. Verification تاریخچهٔ تلاش‌هاست و مالکیت سازمان یا Permission ایجاد نمی‌کند. `reviewed_by_platform_identity_ref` به‌درستی از Business Membership جداست و سیستم هویت دوم معرفی نشده است.

### GREEN-05 — Publication و V2

BusinessProfile، Capability و OfferVersion نمایش عمومی لازم برای V2 را در Core نگه می‌دارند. V2 فقط Published Read Port را مصرف می‌کند و Core به جدول Module وابسته نیست. Gateهای هویت، سازمان، تازگی، تأیید انسانی و وضعیت انتشار صریح شده‌اند.

### GREEN-06 — Offer و Version

Offer Entity مستقل Core است و Knowledge Type نیست. OfferVersion محتوای نسخه‌ای و بازهٔ اعتبار را نگه می‌دارد، نسخهٔ قبلی حذف یا بازنویسی نمی‌شود، و ترتیب پیشنهادی جایگزینی نسخهٔ قدیمی با رخداد Withdrawal پیش از Publish نسخهٔ تازه ثبت شده است.

### GREEN-07 — محدودهٔ حداقلی

Session persistence، Intent persistence، Consent persistence، Customer Data، CRM، Analytics پیچیده، AR، Business Directory، Clinic tables، Action و چرخهٔ Recommendation/Decision/Outcome/Evaluation در این شِما وارد نشده‌اند. این حذف‌ها با محدودهٔ MVP و ADRهای مصوب سازگار است.

## ۵. تأییدهای لازم پیش از اجرای Prisma

پیش از ایجاد `schema.prisma` این موارد باید در یک CCR یا گزارش اعتبارسنجی مستقل بسته شوند:

1. پایهٔ شاخه با `origin/main` و `ExternalWorkspaceLink` مصوب؛
2. `RESTRICT`/`NO ACTION` برای Delete/Update همهٔ FKهای تاریخی و Tenant؛
3. انتخاب و آزمون PostgreSQL برای C15؛
4. آزمون همهٔ FKهای مرکب و رد ارجاع بین سازمانی؛
5. آزمون XOR مالک Evidence و هدف Publication؛
6. آزمون Uniqueهای جزئی D-61، Membership، Grant و OfferVersion؛
7. آزمون Append-only و Immutable بودن تاریخچه و Version؛
8. قرارداد نهایی Relation naming، `@@map`/`@map` و جدول پیوند؛
9. قرارداد نرمال‌سازی شناسه، JSONهای عمومی و `terms`؛
10. ثبت منبع صدور شناسهٔ Organization و مسیر ایجاد دادهٔ واقعی.

## ۶. نتیجهٔ عملی

سند از نظر مرز محصول و مدل چندVertical پایهٔ مناسبی دارد و بخش‌های GREEN آن می‌توانند مبنای CCR باشند. با این حال رأی مستقل برای شروع شِمای Prisma **C — Blocked** است تا RED-01 تا RED-03 بسته شوند. در این مرحله هیچ اصلاحی در سند هدف یا کد پیشنهاد نمی‌شود؛ ابتدا باید تصمیم‌های فیزیکی و آزمون PostgreSQL ثبت شوند.

**من کدکس هستم.**
