# بررسی سازگاری artefactهای انتقالی MLINO

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Artifact Compatibility Reviewer  
**INSTRUCTION_ID:** `CODEX-20260912-ARTIFACT-COMPATIBILITY-REVIEW-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**شاخهٔ بررسی‌شده:** `codex/v2-intent-flow-foundation`  
**مرجع مقایسه:** `origin/main`  
**محدودیت:** هیچ cherry-pick، merge، rebase، تغییر کد، تغییر schema یا migration انجام نشد.

## ۱. نتیجهٔ نهایی

**نتیجه:** سازگاری مشروط — `CONDITIONALLY_COMPATIBLE / TRANSFER NOT EXECUTED`

چهار artefact اصلی از نظر مسیر، نسخهٔ Prisma و وابستگی‌های TypeScript با زیرساخت فعلی V1 هم‌خوانی دارند، اما انتقال آن‌ها به‌عنوان یک بستهٔ قابل‌اجرا هنوز ایمن و کامل نیست. آن‌ها باید به‌صورت انتخابی و پس از فراهم‌شدن مبنای دقیق `origin/main` منتقل شوند.

دلایل اصلی شرطی‌بودن:

1. شاخهٔ هدف مدل و migration مربوط به `ExternalWorkspaceLink` را ندارد.
2. migration فقط در زنجیرهٔ کامل migrationهای `origin/main` معنا دارد و نباید جداگانه اجرا شود.
3. `organization_id` در پیاده‌سازی فعلی رشته‌ای آزاد است و هنوز FK به `Organization` ندارد؛ این موضوع برای tenant isolation نهایی Core نیازمند CCR/تصمیم صریح است.
4. service و test به Prisma Client تولیدشده و اسناد CCR/قراردادهای مرجع وابسته‌اند که همه در شاخهٔ هدف حاضر نیستند.
5. دو فایل Handoff در هر دو طرف تغییر کرده‌اند و جایگزینی خودکار آن‌ها مجاز نیست.

## ۲. مبنای فنی بررسی

| مورد | مقدار |
|---|---|
| HEAD شاخهٔ هدف | `3cf18f3dd81baeac8c62417cb270d10d3563c7d6` |
| ref محلی `origin/main` | `f23e297454236d468da8ed58858eda9e1cb5b8d5` |
| merge-base | `95d7c26d8a8271a5ad55f1964a251d101f7184ef` |
| عقب‌بودن شاخه از main | ۵۵ کامیت |
| جلو‌بودن شاخه از main | ۵۱ کامیت |
| نسخهٔ Prisma در هر دو مبنا | `5.20.0` |
| وضعیت working tree پیش از این گزارش | سه فایل untracked قدیمی خارج از محدوده |

شاخهٔ هدف `implementation/` و `implementation/prisma/schema.prisma` پایهٔ V1 را دارد، اما نسبت به `origin/main` مدل و migration جدید `ExternalWorkspaceLink` در آن وجود ندارد.

## ۳. فهرست artefactها و ارزیابی سازگاری

### ۳.۱ `implementation/prisma/schema.prisma`

**وضعیت در `origin/main`:** مدل `ExternalWorkspaceLink` و enumهای `ExternalSystem`، `ExternalLinkStatus` و `ExternalLinkBasis` اضافه شده‌اند.

**سازگاری:** 🟡 مشروط

**شواهد:** diff این فایل نسبت به شاخهٔ هدف یک بلوک افزایشی مشخص است و package/config آن در دو سمت تغییر نکرده است. بنابراین از نظر نام‌گذاری Prisma، provider PostgreSQL و نسخهٔ client تعارض مستقیم ندارد.

**شرط‌های انتقال:**

- فقط بلوک مصوب `ExternalWorkspaceLink` و enumهای مرتبط به‌صورت reviewed منتقل شود، نه جایگزینی کورکورانهٔ کل فایل؛
- پس از انتقال، `prisma validate` و `prisma generate` در محیط ایزوله اجرا شود؛
- این تغییر به‌عنوان baseline نگاشت workspace تفسیر شود، نه schema نهایی Core Business؛
- افزودن Organization، FK یا تغییر tenant model در این انتقال انجام نشود و CCR جداگانه بماند.

**نکتهٔ معماری:** مدل فعلی `organizationId String` دارد و به مدل Organization رابطهٔ Prisma ندارد. این با implementation موجود `ExternalWorkspaceLink` سازگار است، اما برای الزام نهایی «Cross-organization references must be impossible» کافی نیست. رفع آن باید در طراحی Core Prisma و CCR صریح تعیین شود.

### ۳.۲ migration

`implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`

**وضعیت:** 🟡 مشروط و وابسته به زنجیره

**آنچه فراهم می‌کند:**

- سه enum مورد نیاز؛
- جدول `external_workspace_links`؛
- index سازمان و workspace؛
- partial unique index با شرط `status = 'ACTIVE'`؛
- امکان حفظ چند رکورد `REVOKED` تاریخی.

**سازگاری با تصمیم‌ها:**

- با وضعیت‌های `ACTIVE` و `REVOKED` سازگار است؛
- با قاعدهٔ «وصل دوباره رکورد جدید بسازد» سازگار است؛
- با حفظ تاریخچه و منع حذف silent سازگار است؛
- قید هم‌زمانی «حداکثر یک لینک فعال» را در PostgreSQL اعمال می‌کند.

**شرط‌ها و blockerها:**

- migration فقط بعد از migrationهای قبلی `origin/main` قابل بررسی و اجراست؛
- انتقال یا اجرای مستقل فایل migration ممنوع است؛
- migration فعلی FK به Organization ایجاد نمی‌کند، چون در مبنای فعلی Organization در schema موجود نیست؛
- اضافه‌کردن FK در هنگام انتقال، تغییر معماری و schema جدید محسوب می‌شود و در این task ممنوع است؛
- rollback پس از ورود دادهٔ واقعی باید از حذف جدول پرهیز کند و policy تاریخی را حفظ نماید.

### ۳.۳ service

`implementation/foundation/workspace-link/workspace-link.service.ts`

**سازگاری:** 🟡 مشروط، از نظر کد قابل‌اتصال پس از تولید client

**وابستگی‌های بررسی‌شده:**

- `@prisma/client` با نسخهٔ `5.20.0`؛
- `implementation/foundation/prisma-client.ts`؛
- `implementation/shared-contracts/types.ts`؛
- enumهای تولیدشده از schema؛
- جدول migration‌شده.

دو مسیر داخلی اول در شاخهٔ هدف وجود دارند و `package.json` نیز با `origin/main` تفاوتی ندارد. بااین‌حال enumها و delegate مربوط به `externalWorkspaceLink` تا زمانی که schema به‌صورت مجاز به‌روزرسانی و Prisma Client دوباره تولید نشود، در type/runtime client شاخهٔ فعلی حاضر نیستند.

**رفتار سازگار با معماری:**

- resolve فقط با شناسهٔ صریح انجام می‌شود و بر نام تکیه ندارد؛
- لینک لغوشده fail-closed resolve می‌شود؛
- `REVOKED → ACTIVE` ندارد؛
- `linkHistory` و `organizationAt` تاریخچهٔ هویتی را حفظ می‌کنند؛
- قید اصلی به دیتابیس سپرده شده و بررسی application-only جایگزین آن نشده است.

**ریسک مستندسازی:** service در توضیحات خود به CCR و ADRهایی اشاره می‌کند که مسیرهای canonical آن‌ها (`implementation/remediation/...` و `mlino_book/...`) در شاخهٔ هدف کامل نیستند. این موضوع اجرای کد را نمی‌شکند، اما traceability را ناقص می‌کند و باید با انتقال محدود مراجع یا ثبت reference حل شود.

### ۳.۴ test

`implementation/test/foundation/workspace-link.spec.ts`

**سازگاری:** 🟡 مشروط و وابسته به محیط

تست‌ها با service و Prisma Client جدید هم‌خوان‌اند و موارد زیر را پوشش می‌دهند:

- resolve لینک فعال و نبود لینک؛
- عدم نگاشت بر اساس نام؛
- قید مستقیم دیتابیس برای یک لینک فعال؛
- لغو و حفظ رکورد؛
- re-link با رکورد جدید؛
- تاریخچه و `organizationAt`.

اما اجرای آن‌ها به این موارد نیاز دارد:

- schema دارای مدل جدید؛
- Prisma Client تولیدشده؛
- کل migration chain روی PostgreSQL؛
- `DATABASE_URL` تستی و ایزوله؛
- پاک‌سازی دادهٔ تست بدون دست‌زدن به دیتابیس واقعی.

بنابراین test قابل انتقال است، ولی بدون انتقال schema و migration قابل اجرا نیست و نباید به‌عنوان تست مستقل یا جایگزین قید PostgreSQL تلقی شود.

## ۴. سازگاری با ADRها و مرزهای معماری

### ADR-0001 تا ADR-0004 و هویت

سازگار است به شرط آن‌که V1 منبع حقیقت نگاشت بماند و `ExternalWorkspaceLink` تنها mapping صریح workspace به Organization باشد. service هویت مستقل برای Content Studio ایجاد نمی‌کند.

### ADR-0005، ADR-0007 تا ADR-0009

تعارض مستقیمی مشاهده نشد. service، Recommendation، Action یا permission جدید نمی‌سازد و role را منبع مجوز نمی‌کند.

### ADR-0010 تا ADR-0012

انتقال این artefactها مرز Core/V1 و V2 را تغییر نمی‌دهد:

- `ExternalWorkspaceLink` در لایهٔ Core/V1 و integration mapping می‌ماند؛
- V2 فقط مصرف‌کنندهٔ تجربه است و نباید جدول یا حقیقت کسب‌وکار بسازد؛
- Intent، Session و Conversation Context در این artefactها persistent نمی‌شوند؛
- انتقال نباید هیچ import جدیدی از V2 به Core ایجاد کند.

### Core Schema و tenant isolation

ساختار فعلی برای نگاشت workspace و قید active-link مناسب است، اما هنوز تمام الزام Core نهایی را اجرا نمی‌کند؛ چون Organization در schema پایهٔ فعلی حاضر نیست و FK مرکب/tenant-scoped برای این رابطه وجود ندارد. این یک blocker برای ادعای «کاملاً آمادهٔ Core Prisma» است، نه دلیلی برای حذف `ExternalWorkspaceLink`.

## ۵. روش انتقال الزامی

روش پیشنهادی، انتقال انتخابی و فایل‌محور است:

1. ref تازهٔ `origin/main` در زمان اجرا دریافت و hash آن ثبت شود؛
2. working tree ایزوله از شاخهٔ هدف برای validation ساخته شود؛
3. پنج artefact زیر با نسخهٔ دقیق `origin/main` بررسی و منتقل شوند:
   - `implementation/prisma/schema.prisma` با بلوک افزایشی reviewed؛
   - `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`؛
   - `implementation/foundation/workspace-link/workspace-link.service.ts`؛
   - `implementation/test/foundation/workspace-link.spec.ts`؛
   - `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md`؛
4. مراجع canonical لازم از `mlino_book` فقط به‌اندازهٔ traceability در دسترس قرار گیرند و کپی دومِ Product Memory ساخته نشود؛
5. دو فایل `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `AI_HANDOFF/HANDOFF_STATE.md` جداگانه و با Handoff/ checksum حل شوند؛
6. در worktree ایزوله `prisma validate`، `prisma generate`، build و تست PostgreSQL اجرا شود؛
7. فقط پس از CCR و instruction جداگانه، تغییرات از validation به شاخهٔ هدف منتقل شوند.

این روش به معنی اجرای هیچ‌یک از مراحل بالا در این task نیست.

## ۶. مواردی که نباید منتقل یا اجرا شوند

- کل ۵۵ کامیت عقب‌ماندهٔ `origin/main`؛
- جایگزینی کامل `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` یا `HANDOFF_STATE.md`؛
- انتقال کل `mlino_book` به‌عنوان نسخهٔ دوم؛
- هر schema یا migration جدید برای Organization، Capability، Offer یا Publication؛
- تغییر Content Studio یا افزودن `organization_id` به schema آن؛
- تغییر `implementation/shared-contracts/types.ts` یا فایل‌های منجمد خارج از CCR؛
- اتصال V2، Intent، Session، Matching یا UI به این artefactها؛
- اجرای migration روی دیتابیس واقعی یا shared؛
- تبدیل رشتهٔ فعلی `organization_id` به FK بدون تصمیم و CCR جداگانه.

## ۷. blockerها و ریسک‌ها

### RED — حل پیش از انتقال اجرایی

1. **مبنای schema و migration:** شاخهٔ هدف باید نسخهٔ دقیق `origin/main` را به‌عنوان baseline داشته باشد؛ انتقال migration بدون تاریخچه قابل قبول نیست.
2. **Prisma Client:** service/test بدون تولید client دارای enum و delegate جدید قابل build/اجرا نیستند.
3. **رابطهٔ Organization:** برای الزام Core مبنی بر جلوگیری از cross-organization reference، وضعیت FK/رابطهٔ `ExternalWorkspaceLink.organization_id` باید در CCR/Core Prisma صریح تعیین شود.
4. **Traceability:** مسیرهای CCR/ADR مورد اشارهٔ service و migration باید برای implementation قابل دسترس باشند.

### YELLOW — کنترل پیش از اجرا

- حل دستی دو فایل Handoff؛
- اعتبارسنجی migration روی PostgreSQL ایزوله؛
- اثبات دوبارهٔ partial unique index و re-link تاریخی؛
- ثبت hash هر artefact و diff محدود؛
- حفظ working tree فعلی و سه فایل untracked قدیمی خارج از stage.

### GREEN — تأییدشده

- enumهای وضعیت و basis با تصمیم‌های approved سازگارند؛
- partial unique index ناوردای یک لینک فعال را پوشش می‌دهد؛
- service mapping را بر اساس نام انجام نمی‌دهد؛
- revoke تاریخچه را حذف نمی‌کند؛
- artefactها منطق V2، AR، Matching، Intent persistence یا Content Studio schema را وارد نمی‌کنند.

## ۸. وضعیت تحویل

**حکم:** `CONDITIONALLY_COMPATIBLE — DO NOT TRANSFER YET`  
**روش لازم:** انتقال فایل‌محور در worktree ایزوله، با حفظ migration chain و validation مستقل  
**merge:** انجام نشد  
**rebase:** انجام نشد  
**cherry-pick:** انجام نشد  
**schema.prisma:** تغییر نکرد  
**migration:** ایجاد یا تغییر نکرد  
**backend:** تغییر نکرد  
**main:** تغییر نکرد  
**گام بعدی:** بازبینی مالک و سپس Handoff جداگانه برای انتقال انتخابی؛ پیش از آن Prisma implementation شروع نشود.

من کدکس هستم.
