# گزارش گیت پیش از پیاده‌سازی Prisma در MLINO Core

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Prisma Pre-Implementation Gate Maintainer  
**INSTRUCTION_ID:** `CODEX-20260912-PRISMA-PREIMPLEMENTATION-GATE-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**مراجع:**

- `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`
- `mlino_book/MLINO_CORE_PRISMA_FINAL_READINESS_REVIEW.md` در `origin/main`
- `mlino2/MLINO_ARTIFACT_TRANSFER_READINESS_CHECKLIST.md`
- `mlino2/MLINO_ARTIFACT_TRANSFER_BLOCKER_RESOLUTION.md`

**محدودیت:** این سند فقط گیت پیش از implementation است؛ `schema.prisma`، migration، backend و شاخه‌ها تغییر نکرده‌اند.

## ۱. حکم گیت

طراحی منطقی Core Prisma آمادهٔ تبدیل است، اما پیش‌شرط‌های اجرایی هنوز بسته نشده‌اند. بنابراین ایجاد `schema.prisma` در وضعیت فعلی مجاز نیست.

سه گیت اصلی:

| گیت | موضوع | وضعیت |
|---|---|---|
| G1 | اعتبارسنجی PostgreSQL و انتخاب/اثبات C15 | اجرا نشده |
| G2 | همگام‌سازی مبنای شاخه و حفظ `ExternalWorkspaceLink` | انجام نشده |
| G3 | CCR مصوب مالک برای schema منجمد | صادر نشده |

گیت‌های تکمیلی FK، traceability و Handoff نیز باید قبل از شروع واقعی بسته شوند.

## ۲. وضعیت شاخه و Handoff

وضعیت refهای محلی در زمان تهیهٔ این گزارش:

| مورد | مقدار |
|---|---|
| شاخهٔ هدف | `codex/v2-intent-flow-foundation` |
| HEAD شاخه | `9b42958c3a0602128217cb4d4a15b21ab902629c` |
| `origin/main` محلی | `f23e297454236d468da8ed58858eda9e1cb5b8d5` |
| merge-base | `95d7c26d8a8271a5ad55f1964a251d101f7184ef` |
| فاصله | ۵۵ کامیت عقب، ۵۷ کامیت جلو |
| Handoff فعال | `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION` |

### الزامات G2

- شاخهٔ هدف نباید با `origin/main` merge یا rebase شود؛
- مبنای اجرای Core باید ref تازهٔ `origin/main` باشد؛
- مدل، migration، service و test مربوط به `ExternalWorkspaceLink` باید از همان مبنا حفظ شوند؛
- سه سند Core Prisma شاخهٔ هدف فقط به‌صورت انتخابی و پس از تطبیق منتقل شوند؛
- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `AI_HANDOFF/HANDOFF_STATE.md` به‌دلیل تعارض دوطرفه نباید با نسخهٔ main جایگزین شوند؛
- حل Handoff باید دستی، append-only و همراه checksum جدید باشد.

در وضعیت فعلی، `ExternalWorkspaceLink` در `origin/main` وجود دارد اما در baseline شاخهٔ هدف موجود نیست. تا انتقال انتخابی و validation آن انجام نشود، G2 بسته نیست.

## ۳. الزامات اعتبارسنجی PostgreSQL

G1 باید در یک PostgreSQL ایزوله و با migration chain معتبر اجرا شود. اجرای روی دیتابیس واقعی یا shared مجاز نیست.

### ۳.۱ فهرست قیدها

طراحی Core پانزده قید C1 تا C15 و یازده آزمون رفتاری را مشخص کرده است. validation باید حداقل این گروه‌ها را اثبات کند:

- یکتایی‌های جزئی Claim، Membership، PermissionGrant و نسخهٔ منتشرشده؛
- قیدهای tenant و زوج‌های سایهٔ روابط اختیاری؛
- XOR مالک Evidence و هدف Publication؛
- ممیزی اجباری در وضعیت‌های پایانی؛
- بازهٔ اعتبار، قیمت، confidence و revision؛
- تأیید انسانی و جدایی provenance از confirmation؛
- append-only بودن Publication؛
- تغییرناپذیری IdentityVerification و OfferVersion پس از شرایط مقرر؛
- سازگاری `publication_status` با Publication Event در C15.

### ۳.۲ C15 و Publication consistency

قاعدهٔ قطعی:

- `Publication` منبع حقیقت رویداد انتشار و withdrawal است؛
- `publication_status` فقط projection وضعیت موضوع است؛
- تغییر projection باید در همان تراکنشی رخ دهد که Publication Event ثبت می‌شود؛
- نوشتن مستقیم `publication_status` خارج از مسیر مجاز باید رد شود؛
- رخداد `PUBLISHED` باید revision منتشرشده را درست بنویسد؛
- رخداد `WITHDRAWN` باید وضعیت را به شکل سازگار تغییر دهد؛
- Publication append-only است و UPDATE/DELETE آن مجاز نیست؛
- در جایگزینی نسخه، withdrawal نسخهٔ قبلی باید قبل از publish نسخهٔ جدید انجام شود، چون partial unique index قابل تعویق نیست.

روش ترجیحی ثبت‌شده برای C15، trigger محدود PostgreSQL است:

1. trigger درج Publication projection موضوع را در همان transaction به‌روزرسانی کند؛
2. trigger تغییر مستقیم projection را رد کند، مگر مسیر داخلی کنترل‌شدهٔ همان transaction؛
3. triggerهای append-only روی Publication، UPDATE/DELETE را رد کنند؛
4. رفتار با تست مستقیم دیتابیس، rollback و concurrency اثبات شود.

اگر G1 روش جایگزین domain-service را انتخاب کند، همان روش باید در CCR با محدودیت‌های دقیق و تست اجباری ثبت شود. انتخاب نهایی نباید شفاهی یا ضمنی باقی بماند.

### ۳.۳ آزمون‌های تراکنشی اجباری

- درج Publication و projection در یک transaction موفق؛
- rollback درج Publication باعث باقی‌ماندن projection نشود؛
- تغییر مستقیم `publication_status` بدون رخداد رد شود؛
- withdrawal نسخهٔ قدیمی و publish نسخهٔ جدید در ترتیب درست موفق شود؛
- publish نسخهٔ جدید قبل از withdrawal نسخهٔ قدیمی رد شود؛
- دو publish هم‌زمان برای یک OfferVersion/Offer فقط یک وضعیت معتبر ایجاد کند؛
- UPDATE/DELETE Publication رد شود؛
- migration دومِ بی‌ربط، CHECKها، partial indexها و triggerهای دستی را حذف یا تضعیف نکند.

خروجی G1 باید نتیجهٔ هر قید، SQL مشاهده‌شده و نتیجهٔ هر آزمون را ثبت کند.

## ۴. قواعد FK و حفظ تاریخچه

CCR باید برای همهٔ روابط Core صریحاً این policy را ثبت کند:

- `ON DELETE RESTRICT`؛
- `ON UPDATE RESTRICT`؛
- شناسه‌ها تغییرناپذیرند؛
- Cascade، SetNull و حذف silent تاریخی مجاز نیست؛
- حذف رکورد ارجاع‌شده باید با خطای دیتابیس رد شود؛
- archive، revoke، retire، withdraw و expire جایگزین حذف فیزیکی در موجودیت‌های تاریخی هستند.

این قاعده دربارهٔ روابط Organization، Claim، Verification، Membership، Grant، Profile، Capability، Offer، OfferVersion، Evidence، Publication و mappingهای مرتبط باید در schema و CCR یکسان اعمال شود.

حداقل history rules:

- IdentityVerification به‌صورت تاریخچهٔ تصمیم‌شده حفظ شود؛
- Publication append-only و قابل پرسش تاریخی باشد؛
- لینک‌های `ExternalWorkspaceLink` با revoke حذف نشوند؛
- Membership و Grant ارجاع‌شده فیزیکی حذف نشوند؛
- آرشیو Organization نباید تاریخچهٔ identity یا publication را از بین ببرد؛
- تغییر نام یا شناسه نباید با cascade چند هویت متفاوت بسازد.

## ۵. الزامات CCR پیش از `schema.prisma`

CCR باید دست‌کم تصمیم‌های زیر را بدون ابهام منجمد کند:

### قواعد هویت

- Organization از Business Identity Claim جداست؛
- Organization ریشهٔ Tenant و شناسهٔ آن همان شناسهٔ AC-2 است؛
- Core برای Organization شناسهٔ UUID تازه تولید نمی‌کند؛
- Verification مالکیت نیست؛
- platform verification actor نباید business membership باشد؛
- `ExternalWorkspaceLink` تنها mapping صریح workspace به Organization است.

### قواعد مجوز

- مجوز فقط از Membership + Permission Grant می‌آید؛
- Role هیچ‌گاه منبع permission نیست؛
- permission key به‌صورت extensible باقی می‌ماند؛
- پلتفرم مجری است و مرجع ایجاد authority کسب‌وکار نیست.

### قواعد Capability و Offer

- Capability و Offer موجودیت Core و مستقل از vertical هستند؛
- Offer به knowledge type تبدیل نمی‌شود؛
- OfferVersion منتشرشده immutable است؛
- جایگزینی با نسخهٔ جدید انجام می‌شود؛
- برای هر Offer حداکثر یک نسخهٔ منتشرشده فعال وجود دارد؛
- پیوند OfferVersion/Capability طبق FY2 فقط تا پیش از انتشار قابل درج/حذف است و UPDATE همیشه رد می‌شود.

### قواعد Publication

- Publication منبع حقیقت event است؛
- `publication_status` projection هم‌تراکنش است؛
- `grant_id` در MVP اضافه نمی‌شود؛
- withdrawal قدیمی پیش از publish جدید انجام می‌شود؛
- خروجی V2 فقط از دادهٔ Core منتشرشده و معتبر در لحظهٔ خواندن استفاده می‌کند؛
- Core به module storage برای public discovery وابسته نمی‌شود.

### قواعد نام‌گذاری

- نام جدول پایگاه‌داده: `snake_case`؛
- نام مدل Prisma: `PascalCase`؛
- نام فیلد Prisma: `camelCase` با `@map("snake_case")`؛
- relationهای چندگانه به یک مدل باید نام صریح و یکتا داشته باشند؛
- الگوی نوشتن Prisma برای روابط مرکب و زوج‌های سایه باید ثبت شود.

### قواعد migration

- migration فقط پس از CCR مصوب ایجاد شود؛
- migrationها به‌صورت ترتیبی و با حفظ migration history ایجاد شوند؛
- SQL دستی partial index/trigger باید در diff بازبینی شود؛
- migration بعدی نباید قیدهای دستی migration قبلی را حذف کند؛
- rollback پیش از دادهٔ واقعی و رفتار بعد از دادهٔ واقعی باید جداگانه مستند شود؛
- migration روی دیتابیس shared یا واقعی در این گیت اجرا نشود.

## ۶. قواعد Prisma Client

- نسخهٔ `prisma` و `@prisma/client`: `5.20.0`؛
- ابتدا schema و migration chain در محیط مجاز آماده شود؛
- سپس `prisma validate` اجرا شود؛
- سپس Prisma Client با همان schema و lockfile تولید شود؛
- وجود enumها و delegateهای مدل‌های جدید بررسی شود؛
- build و type-check پس از regeneration اجرا شود؛
- تست‌های service پس از migration روی PostgreSQL ایزوله اجرا شوند؛
- generated output ناخواسته وارد commit نشود؛
- service یا test نباید با client stale اعتبارسنجی شوند.

## ۷. traceability و artefact synchronization

پیش از بازشدن گیت implementation، مسیر و hash این موارد باید ثبت شود:

- `implementation/prisma/schema.prisma` از baseline معتبر؛
- migration chain کامل؛
- `implementation/foundation/workspace-link/workspace-link.service.ts`؛
- `implementation/test/foundation/workspace-link.spec.ts`؛
- CCR مربوط به ExternalWorkspaceLink؛
- ADR-0004 و قرارداد workspace/organization؛
- سند طراحی Core Prisma؛
- گزارش مستقل schema؛
- گزارش حل blockerها؛
- گزارش PostgreSQL validation؛
- CCR نهایی و Handoff مربوط به implementation.

هیچ سند governance با checksum نباید کپی یا بی‌سروصدا بازنویسی شود. اختلاف بین Product Memory و Technical/Governance truth باید صریح flag شود.

## ۸. مواردی که هنوز مجاز نیستند

- ایجاد `schema.prisma`؛
- ایجاد migration؛
- تغییر schema موجود؛
- افزودن FK به‌صورت ضمنی؛
- انتقال service یا test به working tree اصلی؛
- تولید Prisma Client در شاخهٔ تحویل؛
- اجرای migration روی دیتابیس واقعی یا shared؛
- merge، rebase یا cherry-pick؛
- تغییر Content Studio؛
- اتصال V2، Intent، Session یا Matching به Core؛
- تغییر ADR یا بازکردن دوبارهٔ تصمیم معماری.

## ۹. معیار بازشدن گیت

وضعیت فقط زمانی از BLOCKED خارج می‌شود که همهٔ موارد زیر evidence داشته باشند:

- G1 با گزارش کامل C1 تا C15 و آزمون‌های PostgreSQL موفق شده باشد؛
- روش نهایی C15 در CCR ثبت شده باشد؛
- G2 با حفظ `ExternalWorkspaceLink`، migration chain و artefactهای وابسته بسته شده باشد؛
- FK و tenant isolation برای `organization_id` تصمیم‌گیری و ثبت شده باشد؛
- G3 با CCR مصوب مالک بسته شده باشد؛
- نام relationها، نام‌گذاری فیلدها و الگوی نوشتن Prisma منجمد شده باشند؛
- traceability و checksum همهٔ artefactها ثبت شده باشد؛
- Handoff implementation جدید صادر شده باشد؛
- diff نهایی فقط در محدودهٔ مجاز باشد.

در آن نقطه، ایجاد `schema.prisma` در instruction جداگانه قابل بررسی خواهد بود.

## ۱۰. وضعیت نهایی

من کدکس هستم.

BLOCKED_BEFORE_SCHEMA_IMPLEMENTATION
