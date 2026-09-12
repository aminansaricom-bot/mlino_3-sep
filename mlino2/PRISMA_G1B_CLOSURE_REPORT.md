# گزارش بسته‌شدن G1b — اعتبارسنجی PostgreSQL و Prisma

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**INSTRUCTION_ID:** CODEX-20260912-G1B-CLOSURE-VALIDATION-001  
**TARGET_HANDOFF_ID:** HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION  
**شاخه:** codex/v2-intent-flow-foundation  
**HEAD مبنای اجرا:** 76589befd882033a634a1fff7b7d364d11f623cb  
**وضعیت نهایی:** FAIL — G1B_NOT_CLOSED

## ۱. حکم

R1، R2 و R3 با شواهد بازتولیدپذیر اجرا شدند. بخش‌های SQL در R4 موفق بودند، اما Prisma write path یک رفتار متناقض را پذیرفت؛ بنابراین G1b بسته نیست و پیاده‌سازی production schema.prisma نباید آغاز شود.

هیچ اصلاح محصول، schema، migration برنامه، backend، ADR یا تصمیم معماری اعمال نشد.

## ۲. محیط

| مورد | مقدار |
|---|---|
| PostgreSQL | 16.14، Alpine، UTC |
| isolation پیش‌فرض | read committed |
| Prisma فعال از lockfile شاخه | 5.22.0 |
| Prisma تعریف‌شده در package.json | ^5.20.0 |
| Node.js | v24.18.0 |
| Docker | کانتینر disposable بدون volume |
| دیتابیس | mlino_g1b روی پورت موقت 55436 |
| پاک‌سازی | کانتینر، root packageهای auto-install و node_modulesهای موقت حذف شدند |

Prisma Client و CLI از نسخهٔ 5.22.0 قفل‌شده در implementation/package-lock.json استفاده کردند. هیچ dependency یا package metadata جدیدی در خروجی مخزن باقی نماند.

## ۳. R1 — شواهد بازتولیدپذیر

### PASS

بستهٔ شواهد در مسیر mlino2/validation/g1b ایجاد شد و شامل این گروه‌هاست:

- README با ترتیب اجرای مستقل؛
- fixtureهای Prisma پایه و follow-up؛
- SQL قیود دستی، assertionها، هم‌زمانی و inventory؛
- Prisma write path test؛
- baseline migration تولیدشده توسط Prisma؛
- follow-up migration تولیدشده توسط Prisma؛
- لاگ هر مرحله؛
- SHA256SUMS برای تمام artefactها.

فایل‌های log هم اجرای موفق و هم تلاش‌های اولیهٔ harness را نگه می‌دارند. لاگ‌های دارای پسوند initial، اشکالات اولیهٔ fixture را نشان می‌دهند و نتیجهٔ نهایی محسوب نمی‌شوند.

### NEEDS_DECISION

فایل MLINO_G1_CLOSURE_REVIEW.md در working tree، همهٔ workspaceهای قابل جست‌وجو و origin/main پیدا نشد. دستور R1 تا R4 به‌اندازهٔ کافی مشخص بود و اجرا متوقف نشد، اما provenance این منبع باید تعیین تکلیف شود.

## ۴. R2 — C15 و Publication

### PASS — تغییر مستقیم projection

تغییر مستقیم publication_status با trigger رد شد. همین رفتار از SQL و Prisma Client هر دو مشاهده شد.

- مسیر SQL: PASS_DIRECT_PUBLICATION_STATUS_GUARD
- مسیر Prisma: PASS prisma_direct_projection_mutation
- SQLSTATE در trigger: P0001

Publication منبع رخداد باقی ماند و درج PUBLISHED projection مربوط به OfferVersion را در همان تراکنش تغییر داد.

### PASS — rollback

درج Publication داخل subtransaction شکست‌خورده، نه رخداد و نه projection باقی نگذاشت:

- PASS_PUBLICATION_ROLLBACK_CONSISTENCY

### PASS — رقابت publish/withdraw

سناریوی واقعی با دو connection مستقل اجرا شد:

1. T1 نسخهٔ قدیمی را WITHDRAWN کرد؛
2. T1 پس از مکث، نسخهٔ جدید را PUBLISHED کرد و commit شد؛
3. T2 هم‌زمان تلاش کرد نسخهٔ رقیب را PUBLISHED کند؛
4. T2 با unique جزئی offer_one_published_version_unique و exit code 3 رد شد.

وضعیت نهایی:

| نسخه | وضعیت |
|---|---|
| conc-old | WITHDRAWN |
| conc-new | PUBLISHED |
| conc-rival | UNPUBLISHED |

فقط یک نسخهٔ منتشرشده و دو event موفق T1 باقی ماندند؛ event تراکنش شکست‌خوردهٔ T2 باقی نماند.

### PASS — immutability و append-only

- UPDATE/DELETE روی Publication با trigger رد می‌شود.
- محتوای OfferVersion پس از انتشار immutable است.
- metadata انتشار در WITHDRAWN حفظ می‌شود؛ CHECK فقط implication «PUBLISHED مستلزم metadata است» را اعمال می‌کند.

## ۵. R3 — رفتار Prisma Migrate

### PASS — تولید migration

Prisma Migrate Diff از دیتابیس دارای قیود دستی به fixture follow-up اجرا شد. تغییر follow-up فقط افزودن ستون validation_note به organizations بود.

SQL تولیدشده فقط شامل ALTER TABLE ADD COLUMN بود و هیچ‌یک از موارد زیر را نداشت:

- DROP TABLE؛
- DROP INDEX؛
- DROP CONSTRAINT؛
- DROP TRIGGER؛
- DROP FUNCTION؛
- ALTER TABLE ... DROP.

### PASS — پایداری پس از اعمال migration

follow-up SQL با Prisma DB Execute اعمال شد. inventory قبل و بعد دقیقاً یکسان بود و assertion نهایی این موارد را تأیید کرد:

- ۳ partial unique index؛
- ۵ trigger دستی؛
- ۸ Foreign Key با ON DELETE RESTRICT و ON UPDATE RESTRICT؛
- ۴ CHECK دستی؛
- ستون follow-up جدید.

نتیجهٔ ثبت‌شده:

PASS_PRISMA_MIGRATION_PRESERVED_MANUAL_OBJECTS

این PASS مربوط به fixture و Prisma 5.22.0 است و به‌معنی ایجاد یا تأیید production migration نیست.

## ۶. R4 — تست‌های schema-critical

### PASS — SQL composite tenant isolation

درج OfferVersion با organization_id سازمان B و Offer سازمان A مستقیماً در SQL با Foreign Key مرکب رد شد:

- PASS_COMPOSITE_TENANT_ISOLATION
- SQLSTATE: 23503

### PASS — uniqueness و verification

- Claim فعال VERIFIED/SUSPENDED تکراری با partial unique رد شد.
- Claim فعال بدون verified_at با CHECK رد شد.
- Prisma Client خطای P2002 را برای Claim فعال تکراری گزارش کرد.

### PASS — Prisma مسیر معتبر

Prisma Client توانست این مسیر را اجرا کند:

- ساخت Organization؛
- ساخت Offer؛
- ساخت OfferVersion با connect مرکب معتبر؛
- ساخت Publication؛
- خواندن projection برابر PUBLISHED.

نتایج:

- PASS prisma_composite_create
- PASS prisma_partial_unique_claim code=P2002
- PASS prisma_publication_projection_read
- PASS prisma_direct_projection_mutation

### FAIL — Prisma nested write متناقض

این write به Prisma داده شد:

- Organization connect: prisma-org-b
- Offer connect مرکب: prisma-offer-a / prisma-org-a

انتظار: write به‌عنوان ورودی tenant متناقض رد شود.

رفتار واقعی: write پذیرفته شد و ردیف با organization_id=prisma-org-a ذخیره شد. مقدار connect مربوط به Organization B در نتیجهٔ نهایی اعمال نشد.

شواهد:

- FAIL prisma_cross_tenant_connect was accepted
- FAIL prisma_cross_tenant_connect stored_organization_id=prisma-org-a
- VALIDATION_FAILURE_COUNT=1

دیتابیس یک ردیف cross-tenant ذخیره نکرد؛ FK مرکب از مرز tenant محافظت کرد. شکست مربوط به write contract است: Prisma تضاد دو relation input را به خطا تبدیل نکرد و یکی از آن‌ها را مبنای scalar مشترک قرار داد. این رفتار می‌تواند intent caller را بدون خطای صریح تغییر دهد و پیش از طراحی مسیر نوشتن production باید حل شود.

## ۷. خطاهای اولیهٔ harness

دو اشکال fixture در اجرای اولیه پیدا و فقط در artefact validation اصلاح شدند:

1. Client ابتدا از مسیر auto-install اشتباه resolve شد. مسیر Client فعال 5.22.0 صریح شد.
2. CHECK اولیه برای metadata انتشار به‌صورت equivalence نوشته شده بود و WITHDRAWN معتبر را رد می‌کرد. مطابق تصمیم طراحی به implication تبدیل شد.
3. verifier اولیهٔ concurrency فقط تعداد نسخهٔ published را می‌شمرد و شکست T1 را تشخیص نمی‌داد. verifier نهایی وضعیت هر سه نسخه و تعداد eventهای T1/T2 را بررسی می‌کند.

این تغییرها به production code یا architecture منتقل نشدند. لاگ‌های اولیه برای audit نگه داشته شده‌اند.

## ۸. طبقه‌بندی نهایی

### PASS

- R1: SQL، logs، environment و checksum artefactها ایجاد شد.
- R2: direct mutation، rollback و publish/withdraw concurrency معتبر است.
- R3: migration آزمایشی Prisma 5.22.0 اشیای دستی را حذف نکرد.
- R4: SQL tenant isolation، partial uniqueness، verification rule و مسیر معتبر Prisma موفق است.
- محیط disposable پاک شد و هیچ فایل production تغییر نکرد.

### FAIL

- Prisma nested write متناقض Organization B + Offer سازمان A را رد نکرد.
- در نتیجه G1b بسته نیست.

### NEEDS_DECISION

- قرارداد production write باید مشخص کند relationهای هم‌پوشان چگونه به یک organization_id واحد تبدیل و پیش از write validate می‌شوند.
- باید تصمیم گرفته شود آیا relation مستقیم Organization در OfferVersion write input حذف/محدود می‌شود یا service boundary تضاد را fail-closed می‌کند.
- نسخهٔ Prisma production باید بین بازهٔ ^5.20.0 و lockfile فعلی 5.22.0 صریح و ثابت شود.
- منبع گم‌شدهٔ MLINO_G1_CLOSURE_REVIEW.md باید بازیابی یا وضعیت canonical آن ثبت شود.
- پذیرش triggerهای C15 و privilege model آن‌ها همچنان نیازمند CCR است.

هیچ‌یک از این پیشنهادها یا تصمیم‌ها خودکار اعمال نشدند.

## ۹. محدودیت‌های رعایت‌شده

- production schema.prisma ساخته یا تغییر داده نشد.
- migration برنامه ساخته یا تغییر داده نشد.
- backend، ADR و architecture decision تغییر نکردند.
- merge، rebase یا cherry-pick انجام نشد.
- پیشنهادها اعمال نشدند.
- سه فایل untracked قدیمی کاربر دست‌نخورده باقی ماندند.

## ۱۰. وضعیت نهایی

FAIL — G1B_NOT_CLOSED

شروع schema.prisma تا تصمیم و اصلاح مستقل write contract متناقض مجاز نیست. پس از تصمیم مالک، فقط همان write path باید در validation fixture اصلاح و G1b دوباره اجرا شود.

من کدکس هستم.

