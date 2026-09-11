# گزارش بررسی هم‌ترازی شاخه‌های MLINO پیش از پیاده‌سازی Prisma

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Branch Alignment Reviewer  
**INSTRUCTION_ID:** `CODEX-20260912-BRANCH-ALIGNMENT-REVIEW-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**دامنه:** بررسی خواندنی شاخهٔ `codex/v2-intent-flow-foundation` در برابر `origin/main`  
**محدودیت:** هیچ merge، rebase، تغییر کد، تغییر schema یا migration انجام نشد.

## ۱. حکم نهایی

### گزینهٔ توصیه‌شده: C — شاخه مستقل بماند و artefactهای منتخب منتقل شوند

ادغام یا rebase مستقیم توصیه نمی‌شود. این شاخه عملاً شاخهٔ V2 و Intent Foundation است، درحالی‌که `origin/main` مبنای جدیدتر معماری و اجرای Core/V1 را دارد. دو مسیر محصولی و دو زنجیرهٔ governance در آن‌ها به‌صورت موازی جلو رفته‌اند.

برای شروع آیندهٔ Prisma، یک شاخهٔ اجرای Core باید از `origin/main` جدید ساخته شود و فقط اسناد لازم از این شاخه به آن منتقل شوند. شاخهٔ فعلی V2 باید بدون بازنویسی تاریخچه و بدون تغییر باقی بماند.

## ۲. مبنای مقایسه و وضعیت هم‌ترازی

| مورد | مقدار |
|---|---|
| شاخهٔ بررسی‌شده | `codex/v2-intent-flow-foundation` |
| HEAD شاخه | `eb90a42d7bc0d4af9b04bd44c329ef5885bed5c8` |
| آخرین ref محلی `origin/main` | `f23e297454236d468da8ed58858eda9e1cb5b8d5` |
| merge-base | `95d7c26d8a8271a5ad55f1964a251d101f7184ef` |
| عقب‌بودن شاخه از main | ۵۵ کامیت |
| جلو‌بودن شاخه از main | ۴۷ کامیت |

`origin/main` در این محیط قبلاً تا `f23e297` دریافت شده بود. تلاش دریافت مجدد در این پاس با خطای موقت اتصال به GitHub به‌روزرسانی نشد؛ بنابراین این گزارش بر همان ref محلی ثبت‌شده و مقایسهٔ مستقیم آن با HEAD استوار است.

## ۳. تفاوت‌های شاخه‌ای

### ۳.۱ تغییرات شاخهٔ Codex نسبت به merge-base

شاخهٔ Codex عمدتاً این دسته‌ها را دارد:

- Foundation و Intent Flow نسخهٔ V2؛
- اسناد معماری و بررسی‌های V2؛
- طراحی Core Prisma در `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`؛
- گزارش مستقل schema و گزارش حل مسدودکننده‌های Prisma؛
- ADRهای مرجع در `docs/architecture/ADR/`؛
- assetها و UI نسخهٔ V2.

آخرین دو کامیت این شاخه مربوط به همین تحویل هستند:

- `78223bd21696aa1a094e191213c73af01e938091` — سند حل مسدودکننده‌های Core Prisma؛
- `eb90a42d7bc0d4af9b04bd44c329ef5885bed5c8` — گزارش تحویل و ثبت Handoff.

### ۳.۲ تغییرات `origin/main` نسبت به merge-base

`origin/main` علاوه بر اسناد نهایی‌تر Core، این موارد را دارد:

- MLINO Book و تصمیم‌ها/قراردادهای Core؛
- ADRهای نهایی و گزارش‌های آمادگی Prisma؛
- پیاده‌سازی و تست‌های قرارداد Recommendation و Business Context؛
- پیاده‌سازی `ExternalWorkspaceLink`؛
- تغییر افزایشی `implementation/prisma/schema.prisma`؛
- migration مربوط به `ExternalWorkspaceLink`؛
- سرویس دامنه و تست نگاشت workspace به organization.

آخرین کامیت `origin/main`، یعنی `f23e297`، گزارش آمادگی نهایی Core Prisma را اضافه کرده و سه گیت فرایندی را صریحاً باقی گذاشته است. این وضعیت از نظر معماری از شاخهٔ Codex جدیدتر است و باید مبنای اجرای Core باشد.

## ۴. فایل‌های متعارض

مقایسهٔ تغییرات دو طرف از merge-base نشان داد فقط دو مسیر در هر دو طرف تغییر کرده‌اند:

1. `AI_HANDOFF/CLAUDE_LATEST_REPORT.md`
2. `AI_HANDOFF/HANDOFF_STATE.md`

`git merge-tree` برای هر دو مسیر وضعیت `changed in both` نشان می‌دهد. این تعارض صرفاً متنی نیست:

- نسخهٔ شاخهٔ Codex وضعیت تحویل V2 و گزارش حل مسدودکنندهٔ Prisma را ثبت می‌کند؛
- نسخهٔ `origin/main` وضعیت آمادگی نهایی Core Prisma و تصمیم‌های جدیدتر را ثبت می‌کند؛
- انتخاب کورکورانهٔ یکی از دو فایل می‌تواند Handoff فعال، checksumها، گزارش جاری یا گیت‌های باز را پنهان یا حذف کند.

حل این دو فایل باید جداگانه و زیر AI_HANDOFF انجام شود. به همین دلیل merge یا rebase خودکار در این مرحله مناسب نیست.

## ۵. تفاوت‌های معماری‌اثرگذار

### ۵.۱ مبنای Core و Prisma

طراحی شاخهٔ Codex در `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` صریحاً می‌گوید مبنای اجرای Prisma باید با `origin/main` و `ExternalWorkspaceLink` همگام باشد. در HEAD این شاخه:

- `implementation/prisma/schema.prisma` مدل `ExternalWorkspaceLink` را ندارد؛
- migration `20260910020000_add_external_workspace_link` وجود ندارد؛
- سرویس و تست نگاشت workspace نیز وجود ندارد.

در `origin/main` هر سه بخش مرتبط وجود دارند. بنابراین شروع Prisma روی HEAD فعلی بدون انتقال مبنای Core، قید هویت و ناوردای نگاشت workspace را از دست می‌دهد.

### ۵.۲ مرجع تصمیم‌های معماری

شاخهٔ Codex ADRهای مرجع را در `docs/architecture/ADR/` دارد، اما `origin/main` علاوه بر ADRها، MLINO Book، گزارش‌های تصمیم مالک و گزارش آمادگی نهایی را دارد. برای اجرای Core، تصمیم‌های جدیدتر `origin/main` باید منبع بررسی باشند؛ دو نسخهٔ ADR نباید بدون تعیین مرجع به‌صورت موازی تغییر کنند.

### ۵.۳ جدایی V1 و V2

شاخهٔ Codex شامل تغییرات اجرایی V2 مانند Assistant Foundation، Intent Foundation و UI است. `origin/main` شامل اجرای Core/V1 و اسناد Business Context است. انتقال کامل یکی روی دیگری مرزهای زیر را مخدوش می‌کند:

- Core/V1 مالک هویت، دادهٔ کسب‌وکار و قراردادهای پایه است؛
- V2 مالک تعامل، Intent و تجربه است؛
- Intent و Session نباید به persistent Core entities تبدیل شوند؛
- V2 نباید مدل کسب‌وکار مستقل بسازد.

## ۶. commits و artefactهای لازم برای مسیر Core

برای اجرای آیندهٔ Core، انتقال کامل ۴۷ کامیت V2 به `main` لازم نیست. مبنای پیشنهادی، `origin/main` تا `f23e297` است که زنجیرهٔ ۵۵ کامیت Core را در خود دارد.

مهم‌ترین نقاط قابل ردیابی این زنجیره عبارت‌اند از:

- `7339249` — تأیید ADR-0010 تا ADR-0012؛
- `482604c`، `4910b27`، `8911c96` و `bb7e0d5` — بستن تصمیم‌های مرز Core، عضویت، هویت و یکپارچه‌سازی؛
- `c8bb0d7` — پیاده‌سازی `ExternalWorkspaceLink`؛
- `019b79b` — قراردادهای دامنهٔ Business Context فاز اول؛
- `ab47fd4` — قرارداد دامنهٔ Recommendation؛
- `fe930d7` — بنیان MLINO Book؛
- `c98e874`، `38040a4`، `1b3ad9a`، `075f1e7`، `da39e27`، `05d94ec`، `fac7e24` و `f23e297` — زنجیرهٔ طراحی، بازبینی و آمادگی Core Prisma.

این فهرست به معنی cherry-pick فوری نیست؛ چون همهٔ این موارد در ancestry `origin/main` قرار دارند. مبنای Core باید مستقیماً از همان ref ساخته شود.

## ۷. artefactهای منتخب برای انتقال بعدی

پس از تأیید مالک و بازشدن گیت اجرای Prisma، این artefactها از شاخهٔ Codex باید به شاخهٔ Core منتقل و دوباره در برابر `origin/main` اعتبارسنجی شوند:

1. `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`
2. `mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md`
3. `mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`
4. گزارش‌های مرتبط در `AI_HANDOFF/CLAUDE_REPORTS/`، فقط در صورت نیاز Handoff و با ثبت checksum جدید.

این موارد نباید با انتقال کل شاخهٔ V2 مخلوط شوند. فایل‌های زیر باید از `origin/main` حفظ شوند و مبنای فنی انتقال بعدی باشند:

- `implementation/prisma/schema.prisma`؛
- `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`؛
- `implementation/foundation/workspace-link/workspace-link.service.ts`؛
- `implementation/test/foundation/workspace-link.spec.ts`؛
- قرارداد و اسناد رسمی `mlino_book` مربوط به workspace، هویت و Core.

## ۸. وضعیت `ExternalWorkspaceLink`

### نتیجهٔ الزام

بله، `ExternalWorkspaceLink` و migration مرتبط باید در مبنای اجرای Prisma حفظ و منتقل شوند؛ این انتقال در این task انجام نشد.

دلیل:

- نگاشت `workspace ⇄ organization` بخشی از مرز هویت و یکپارچه‌سازی است؛
- قید حداکثر یک لینک فعال برای هر workspace در migration PostgreSQL اعمال شده است؛
- طراحی Prisma شاخهٔ Codex صریحاً این مدل را پیش‌نیاز RR1 می‌داند؛
- حذف یا جایگزینی آن با بررسی application-only، قید معماری و امنیتی را ضعیف می‌کند.

انتقال این فایل‌ها به معنی اجازهٔ توسعهٔ Content Studio، تغییر schema آن یا شروع integration جدید نیست. Content Studio همچنان repository مستقل می‌ماند و OD-09 همچنان جداگانه بررسی می‌شود.

## ۹. ارزیابی سه گزینه

| گزینه | ارزیابی | دلیل |
|---|---|---|
| A — Merge main into branch | رد شد | دو فایل Handoff تعارض واقعی دارند و ورود کامل Core/V1 به شاخهٔ V2 مرزها و تاریخچهٔ governance را مخلوط می‌کند. |
| B — Rebase branch | رد شد | همان تعارض‌ها را در تاریخچهٔ شاخه بازنویسی می‌کند و برای شاخه‌ای که تحویل V2 دارد، ریسک traceability ایجاد می‌کند. |
| C — نگه‌داشتن شاخه و انتقال انتخابی | **توصیه می‌شود** | Core از `origin/main` مبنا می‌گیرد و فقط اسناد بررسی‌شدهٔ Prisma منتقل می‌شوند؛ V2 و Handoff آن مستقل باقی می‌مانند. |

## ۱۰. برنامهٔ هم‌ترازی پیشنهادی برای گام بعد

این گزارش فقط پیشنهاد است و هیچ‌یک از مراحل زیر را اجرا نکرده است:

1. از `origin/main` در زمان اجرای واقعی، ref تازه دریافت و hash ثبت شود؛
2. شاخهٔ مستقل Core Prisma از همان ref ساخته شود؛
3. سه سند طراحی/بازبینی/حل مسدودکننده به‌صورت انتخابی منتقل شوند؛
4. `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `AI_HANDOFF/HANDOFF_STATE.md` با حل دستی و checksum جدید بازتنظیم شوند؛
5. وجود و سازگاری `ExternalWorkspaceLink`، migration، سرویس و تست آن دوباره بررسی شود؛
6. قبل از ایجاد `schema.prisma`، CCR و تأییدهای باقی‌ماندهٔ Core ثبت و تأیید شوند.

## ۱۱. اعتبارسنجی و محدودیت بررسی

انجام شد:

- مقایسهٔ `HEAD` و `origin/main` بر اساس merge-base؛
- شمارش commitهای جلو/عقب؛
- فهرست تغییرات دو طرف؛
- شناسایی مسیرهای مشترکِ تغییرکرده؛
- بررسی merge-tree برای تعارض؛
- بررسی وجود `ExternalWorkspaceLink`، migration و سرویس در `origin/main` و نبود آن‌ها در HEAD شاخهٔ Codex؛
- بررسی نبود مسیرهای `schema.prisma`، migration یا `implementation/` در diff این تحویل.

انجام نشد و در این مرحله لازم هم نبود:

- merge یا rebase؛
- اجرای تست کد؛
- ایجاد یا تغییر Prisma schema؛
- اجرای migration یا اتصال PostgreSQL.

## ۱۲. وضعیت تحویل

**نتیجه:** گزینهٔ C — `KEEP_BRANCH_ISOLATED_AND_TRANSFER_SELECTED_ARTIFACTS`  
**وضعیت:** REVIEW DELIVERED  
**کد و schema:** بدون تغییر  
**Migration:** ایجاد یا تغییر نشد  
**main:** ادغام نشد  
**دستور بعدی:** پس از تأیید این گزارش، شاخهٔ مستقل Core از `origin/main` ساخته شود و انتقال انتخابی با Handoff جداگانه انجام گیرد.

من کدکس هستم.
