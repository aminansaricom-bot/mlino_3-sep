# برنامهٔ انتقال انتخابی artefactهای MLINO

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Selective Artifact Transfer Planner  
**INSTRUCTION_ID:** `CODEX-20260912-SELECTIVE-ARTIFACT-TRANSFER-PLAN-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**شاخهٔ هدف:** `codex/v2-intent-flow-foundation`  
**دامنه:** برنامه‌ریزی انتقال انتخابی از `origin/main`؛ بدون اجرای انتقال

## ۱. وضعیت مبنا

آخرین مقایسهٔ محلی ثبت‌شده:

| مورد | مقدار |
|---|---|
| HEAD فعلی شاخهٔ هدف | `20b6052d402512de4550e03c4e485b8e4293a719` |
| ref محلی `origin/main` | `f23e297454236d468da8ed58858eda9e1cb5b8d5` |
| merge-base | `95d7c26d8a8271a5ad55f1964a251d101f7184ef` |
| عقب‌بودن شاخه از main | ۵۵ کامیت |
| جلو‌بودن شاخه از main | ۴۹ کامیت |

این سند برنامه است. در این مرحله هیچ cherry-pick، merge، rebase، انتقال فایل، تغییر schema، migration یا تغییر backend انجام نمی‌شود.

## ۲. تصمیم اجرایی

شاخهٔ `codex/v2-intent-flow-foundation` به‌عنوان شاخهٔ پیاده‌سازی معماری V2 باقی می‌ماند. برای واردکردن پیش‌نیازهای Core، انتقال باید در سطح فایل و با بررسی مستقل انجام شود؛ تاریخچهٔ کامل ۵۵ کامیت `origin/main` روی این شاخه اعمال نمی‌شود.

قاعدهٔ ترتیب:

```text
حفظ شاخهٔ V2
    ↓
انتقال حداقل مبنای فنی Core
    ↓
انتقال اسناد منتخب Prisma و بازبینی آن‌ها
    ↓
حل دستی Handoff و checksum
    ↓
تأیید CCR
    ↓
ایجاد schema.prisma در دستور جداگانه
```

## ۳. artefactهای لازم از `origin/main`

### ۳.۱ پیش‌نیازهای مستقیم `ExternalWorkspaceLink`

این فایل‌ها باید به‌عنوان یک مجموعهٔ وابسته بررسی و حفظ شوند:

1. `implementation/prisma/schema.prisma`
2. `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`
3. `implementation/foundation/workspace-link/workspace-link.service.ts`
4. `implementation/test/foundation/workspace-link.spec.ts`
5. `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md`

این‌ها در این task منتقل نمی‌شوند. هنگام اجرای آینده باید نسخهٔ آن‌ها از همان ref معتبر `origin/main` ثبت شود و با طراحی Core Prisma مقایسه گردد.

### ۳.۲ مراجع رسمی لازم برای بازبینی

برای جلوگیری از تصمیم‌گیری بر اساس نسخهٔ قدیمی، این مراجع باید از `origin/main` قابل دسترس باشند:

- `mlino_book/adr/ADR-0004-workspace-organization-mapping.md`؛
- `mlino_book/contracts/WORKSPACE_ORGANIZATION_MAPPING.md`؛
- `mlino_book/MLINO_CORE_PRISMA_FINAL_READINESS_REVIEW.md`؛
- `mlino_book/MLINO_PRE_PRISMA_DECISION_NOTE.md`؛
- `mlino_book/MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md`؛
- `mlino_book/MLINO_CORE_PRISMA_DESIGN_REVIEW.md`؛
- تصمیم‌ها و قراردادهای مرتبط با هویت، عضویت، مجوز، Capability، Offer و Publication در `mlino_book/`.

این مراجع باید به‌عنوان منبع فنی بررسی شوند؛ کپی‌کردن کل `mlino_book` در شاخهٔ V2 لازم نیست و نباید دو منبع حقیقت هم‌نام ایجاد کند.

### ۳.۳ اسناد منتخب شاخهٔ هدف برای انتقال به مبنای Core

این سه سند از شاخهٔ هدف، artefactهای مورد نیاز برای مرحلهٔ Core Prisma هستند:

1. `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`؛
2. `mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md`؛
3. `mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`.

انتقال آن‌ها باید روی مبنای `origin/main` و پس از ثبت hash تازهٔ ref انجام شود. گزارش‌های `AI_HANDOFF/CLAUDE_REPORTS/` فقط وقتی منتقل شوند که Handoff جدید صریحاً آن‌ها را بخواهد؛ در آن صورت checksum و مسیر گزارش دوباره ثبت می‌شود.

## ۴. فایل‌هایی که نباید منتقل شوند

### ۴.۱ فایل‌های governance متعارض

این دو فایل نباید با checkout یا کپی کورکورانه از `origin/main` جایگزین شوند:

- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md`؛
- `AI_HANDOFF/HANDOFF_STATE.md`.

هر دو در دو طرف از merge-base تغییر کرده‌اند. نسخهٔ شاخهٔ هدف وضعیت V2 و گزارش‌های جاری آن را دارد و `origin/main` وضعیت Core Prisma را. حل آن‌ها فقط با Handoff صریح، ثبت checksum و حفظ تاریخچه مجاز است.

### ۴.۲ محتوای غیرمرتبط با هدف انتقال

این موارد در این مرحله منتقل نشوند:

- کل تاریخچه یا کل diff پنجاه‌وپنج‌کامیتی `origin/main`؛
- کل `mlino_book` به‌عنوان کپی دومِ Product Memory؛
- گزارش‌های قدیمی که فقط تاریخچه‌اند و مرجع اجرایی جدید نیستند؛
- Docker، deploy و artefactهای محیطی که پیش‌نیاز schema نیستند؛
- هر تغییر Content Studio یا migration متعلق به repository مستقل Content Studio؛
- هر فایل V2 شامل UI، AR، Intent، Session، asset یا تجربهٔ کاربر که برای مبنای Core لازم نیست؛
- Recommendation و Business Context implementation برای این مرحله، مگر اینکه Handoff جداگانه آن‌ها را به‌عنوان وابستگی مستقیم مشخص کند؛
- هر فایل جدیدی که از این انتقال، مالکیت business، permission، offer یا publication را به V2 بدهد.

## ۵. الزامات `ExternalWorkspaceLink`

در انتقال آینده، این قواعد باید هم‌زمان حفظ شوند:

1. `ExternalWorkspaceLink` تنها نگاشت صریح workspace بیرونی به `Organization` است؛ نگاشت بر اساس نام ممنوع است.
2. وضعیت‌ها فقط `ACTIVE` و `REVOKED` هستند؛ مسیر `REVOKED → ACTIVE` وجود ندارد.
3. برای هر `(system, external_workspace_id)` حداکثر یک لینک فعال مجاز است.
4. لینک‌های revoked حذف نمی‌شوند و برای پاسخ تاریخی «در زمان T کدام Organization؟» باقی می‌مانند.
5. actorهای ثبت و لغو لینک با هویت پلتفرمی ثبت می‌شوند و نباید به‌صورت membership کسب‌وکار تفسیر شوند.
6. Content Studio مالک `organization_id` نمی‌شود و schema آن در این انتقال تغییر نمی‌کند.
7. انتقال فایل migration به‌تنهایی کافی نیست؛ مدل Prisma، migration، سرویس و تست باید با هم بررسی شوند.
8. رابطهٔ فعلی `organization_id` در پیاده‌سازی موجود باید در مرحلهٔ CCR/Core Prisma دوباره بررسی شود؛ افزودن FK یا تغییر نوع در این task مجاز نیست.

## ۶. وابستگی‌های migration

Migration زیر:

`implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`

به این موارد وابسته است:

- ترتیب کامل migrationهای موجود در `origin/main`؛
- enumهای `ExternalSystem`، `ExternalLinkStatus` و `ExternalLinkBasis`؛
- جدول مستقل `external_workspace_links`؛
- ایندکس‌های جست‌وجوی سازمان و workspace؛
- ایندکس یکتای جزئی `external_workspace_link_active_unique` با شرط `status = 'ACTIVE'`؛
- PostgreSQL، چون قید جزئی در این شکل جایگزین سادهٔ Prisma ندارد.

در اجرای آینده:

- migration نباید جدا از زنجیرهٔ اصلی یا در working tree شاخهٔ V2 اجرا شود؛
- اعمال آن باید روی مبنایی باشد که تاریخچهٔ migration را دارد؛
- پیش از هر تغییر Core، `prisma validate` و بررسی migration history لازم است؛
- قید «یک لینک فعال» باید با تست مستقیم دیتابیس و تست هم‌زمانی دوباره اثبات شود؛
- rollback پس از ورود دادهٔ واقعی نباید با حذف جدول انجام شود؛ لینک‌ها باید طبق policy به `REVOKED` برسند.

## ۷. ریسک‌های معماری انتقال

| ریسک | اثر | کنترل لازم |
|---|---|---|
| جایگزینی فایل Handoff | پنهان‌شدن مرحلهٔ فعال یا checksum نادرست | حل دستی زیر Handoff جداگانه |
| انتقال کل main به شاخهٔ V2 | مخلوط‌شدن مرز Core/V1 و V2 | انتقال فایل‌محور و محدود |
| انتقال migration بدون زنجیره | شکست deploy یا migration history | استفاده از مبنای `origin/main` و بررسی ترتیب |
| انتقال schema موجود به‌عنوان schema نهایی Core | فرض‌کردن آماده‌بودن Prisma قبل از CCR | نگه‌داشتن آن به‌عنوان baseline و بازبینی قبل از implementation |
| برداشت اشتباه از `organization_id` | تضعیف مالکیت هویت یا tenant isolation | تصمیم صریح در CCR و ممنوعیت اصلاح ضمنی |
| کپی دوگانهٔ ADR یا MLINO Book | دو منبع حقیقت و drift | تعیین `origin/main` به‌عنوان مرجع Core و ثبت reference |
| انتقال کد V1 بدون مجوز | شروع ناخواستهٔ integration یا تغییر backend | انتقال فقط پس از instruction مستقل |
| انتقال گزارش قدیمی به‌جای تصمیم نهایی | استفاده از قواعد superseded | بررسی تاریخ، commit و status هر سند |

## ۸. معیار پذیرش برنامهٔ انتقال

برنامه زمانی قابل اجرا تلقی می‌شود که همهٔ موارد زیر پیش از انتقال واقعی ثبت شوند:

- ref تازهٔ `origin/main` و hash آن ثبت شده باشد؛
- شاخهٔ هدف همچنان `codex/v2-intent-flow-foundation` باشد؛
- مقصد انتقال و فهرست فایل‌های مجاز مشخص باشد؛
- دو فایل Handoff برای حل دستی علامت‌گذاری شده باشند؛
- مجموعهٔ کامل `ExternalWorkspaceLink` شامل schema، migration، service و test مشخص باشد؛
- ترتیب migration و PostgreSQL بودن قید partial unique تأیید شده باشد؛
- مشخص شده باشد که `ExternalWorkspaceLink` در این مرحله منتقل می‌شود، اما Content Studio تغییر نمی‌کند؛
- CCR و مجوز جداگانهٔ implementation صادر شده باشد؛
- پس از انتقال، diff فقط شامل فایل‌های مجاز باشد و هیچ schema یا migration بدون مجوز تغییر نکند.

## ۹. وضعیت

**وضعیت:** PLAN READY — TRANSFER NOT EXECUTED  
**merge:** انجام نشد  
**rebase:** انجام نشد  
**cherry-pick:** انجام نشد  
**schema.prisma:** تغییر نکرد  
**migration:** ایجاد یا تغییر نکرد  
**backend:** تغییر نکرد  
**شاخهٔ main:** ادغام یا تغییر داده نشد  
**گام بعدی:** بازبینی مالک این برنامه؛ سپس Handoff جداگانه برای اجرای انتقال انتخابی.

من کدکس هستم.
