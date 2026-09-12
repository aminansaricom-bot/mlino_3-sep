# سند رفع مسدودکننده‌های انتقال انتخابی artefactهای MLINO

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Artifact Transfer Blocker Resolution Maintainer  
**INSTRUCTION_ID:** `CODEX-20260912-ARTIFACT-TRANSFER-BLOCKER-RESOLUTION-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**مراجع:** `MLINO_SELECTIVE_ARTIFACT_TRANSFER_PLAN.md` و `MLINO_ARTIFACT_COMPATIBILITY_REVIEW.md`  
**محدودیت:** این سند فقط تصمیم و گیت اجرایی را تعریف می‌کند؛ هیچ artefactی منتقل نشده است.

## ۱. جمع‌بندی تصمیم

مسدودکننده‌ها به‌صورت زیر تعیین تکلیف شده‌اند:

| موضوع | تصمیم مستند | وضعیت اجرایی |
|---|---|---|
| migration chain | فقط کل زنجیرهٔ معتبر `origin/main` مبناست؛ migration مستقل ممنوع | باز |
| Prisma Client | پس از schema مجاز و پیش از build/service/test باید با همان نسخه تولید شود | باز |
| Organization FK و tenant isolation | `organization_id` فعلی هنوز FK نیست؛ اصلاح ضمنی ممنوع و CCR لازم است | باز |
| traceability | CCR، ADR، قرارداد و hash هر artefact باید همراه انتقال ثبت شود | باز |
| Handoff conflict | دو فایل governance فقط دستی و با Handoff/checksum جدید حل می‌شوند | باز |

نتیجهٔ این سند، رفع ابهام فرایندی است؛ به‌دلیل بازبودن گیت‌های اجرایی، انتقال هنوز مجاز نیست.

## ۲. مبنای فعلی

| مورد | مقدار |
|---|---|
| شاخهٔ هدف | `codex/v2-intent-flow-foundation` |
| HEAD شاخهٔ هدف | `eb1c3a1316970fbaa4bad50911fbcec60b4acbb1` |
| ref محلی `origin/main` | `f23e297454236d468da8ed58858eda9e1cb5b8d5` |
| merge-base | `95d7c26d8a8271a5ad55f1964a251d101f7184ef` |
| فاصلهٔ فعلی | ۵۵ کامیت عقب، ۵۳ کامیت جلو |

شاخهٔ هدف زنجیرهٔ V1 موجود را دارد، اما artefact جدید `ExternalWorkspaceLink` را ندارد. ref محلی `origin/main` شامل مدل، migration، service، test و مراجع Core است.

## ۳. رفع blocker اول: Migration chain

### ۳.۱ ترتیب وابستگی مصوب برای validation

زنجیرهٔ مورد نیاز باید به همین ترتیب بررسی شود:

1. `implementation/prisma/migrations/20260814065924_init/migration.sql`
2. `implementation/prisma/migrations/20260815033018_add_situation_key/migration.sql`
3. `implementation/prisma/migrations/20260815113714_rename_actor_core_entity_id_to_actor_id/migration.sql`
4. `implementation/prisma/migrations/20260906001500_add_ownership_type/migration.sql`
5. `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`

فایل پنجم فقط پس از چهار migration قبلی و با `migration_lock.toml` همان baseline معنا دارد.

### ۳.۲ artefactهای لازم

- بلوک model و enumهای `ExternalWorkspaceLink` در `implementation/prisma/schema.prisma`؛
- migration پنجم؛
- `implementation/foundation/workspace-link/workspace-link.service.ts`؛
- `implementation/test/foundation/workspace-link.spec.ts`؛
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md`.

### ۳.۳ مرز انتقال

- migration به‌تنهایی منتقل یا اجرا نمی‌شود؛
- کل `schema.prisma` جایگزین نمی‌شود؛ فقط بلوک reviewed قابل انتقال است؛
- migration جدید برای Organization، Capability، Offer یا Publication در این گام ممنوع است؛
- هیچ Content Studio schema یا migration منتقل نمی‌شود؛
- اعمال migration فقط در worktree/دیتابیس PostgreSQL ایزوله و پس از instruction جداگانه مجاز است؛
- partial unique index `external_workspace_link_active_unique` باید عیناً حفظ شود.

**نتیجهٔ blocker:** ترتیب و مرز دقیق شد، اما چون validation chain هنوز در worktree ایزوله اجرا نشده است، گیت اجرایی بسته نشده است.

## ۴. رفع blocker دوم: Prisma Client

### ۴.۱ وابستگی فعلی

- `prisma`: `5.20.0`؛
- `@prisma/client`: `5.20.0`؛
- provider: PostgreSQL؛
- `implementation/foundation/prisma-client.ts`: نقطهٔ دسترسی runtime؛
- `implementation/shared-contracts/types.ts`: انواع مشترک مورد استفادهٔ service.

فایل‌های package و lockfile در مقایسهٔ شاخهٔ هدف با `origin/main` تغییر لازم ندارند و نباید برای این انتقال بازنویسی شوند.

### ۴.۲ نقطهٔ regeneration

تولید client فقط بعد از آماده‌شدن schema مجاز و قبل از این موارد انجام می‌شود:

1. build سرویس؛
2. type-check تست؛
3. اجرای `workspace-link.spec.ts`؛
4. هر اجرای migration یا validation runtime.

پس از regeneration باید وجود این موارد تأیید شود:

- enumهای `ExternalSystem`، `ExternalLinkStatus` و `ExternalLinkBasis`؛
- delegate مربوط به `externalWorkspaceLink`؛
- تطبیق typeهای service با client؛
- نبود generated artifact ناخواسته در commit.

### ۴.۳ ریسک سازگاری

اگر service یا test پیش از regeneration اجرا شوند، client قدیمی enumها و delegate جدید را ندارد و نتیجهٔ خطا با ناسازگاری معماری اشتباه گرفته می‌شود. اگر client با نسخه یا schema دیگری تولید شود، نتیجه قابل اعتماد نیست.

**نتیجهٔ blocker:** نقطهٔ regeneration و نسخه مشخص شد، اما تولید client هنوز انجام نشده و گیت اجرایی بسته نشده است.

## ۵. رفع blocker سوم: Organization FK و tenant isolation

### ۵.۱ مالکیت شناسه

- V1 مالک هویت canonical و Organization است؛
- `ExternalWorkspaceLink` فقط mapping صریح workspace بیرونی به Organization است؛
- Content Studio مالک `organization_id` نیست؛
- نگاشت بر اساس نام ممنوع است؛
- `organization_id` نباید از یک workspace به سازمان دیگر به‌صورت silent تغییر کند.

### ۵.۲ واقعیت baseline

در پیاده‌سازی فعلی `ExternalWorkspaceLink`:

- `organization_id` از نوع `TEXT` است؛
- رابطهٔ Prisma به Organization وجود ندارد؛
- migration فعلی FK به Organization نمی‌سازد؛
- partial unique فقط «حداکثر یک لینک ACTIVE برای هر workspace» را enforce می‌کند و tenant isolation سازمانی را به‌تنهایی تضمین نمی‌کند.

این واقعیت نباید با انتقال فایل‌ها به‌صورت ضمنی اصلاح یا پنهان شود.

### ۵.۳ گیت‌های لازم برای رفع کامل

پیش از ادعای سازگاری کامل Core باید در CCR/Core Prisma مشخص شود:

- مدل و نوع کلید Organization؛
- FK ساده یا مرکب مورد نیاز؛
- قاعدهٔ جلوگیری از cross-organization reference؛
- `ON DELETE` و `ON UPDATE`؛
- رفتار archive/revoke سازمان در برابر لینک‌های تاریخی؛
- اعتبارسنجی تعلق `organization_id` به Organization موجود؛
- تست direct database و tenant isolation.

افزودن FK یا تغییر نوع در این سند انجام نمی‌شود؛ چنین کاری implementation جدید و خارج از scope است.

**نتیجهٔ blocker:** مالکیت و invariantها روشن شدند، اما تصمیم FK و validation نهایی هنوز باز است؛ این گیت بسته نشده است.

## ۶. رفع blocker چهارم: Documentation traceability

### مراجع اجباری

- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md`؛
- `mlino_book/adr/ADR-0004-workspace-organization-mapping.md`؛
- `mlino_book/contracts/WORKSPACE_ORGANIZATION_MAPPING.md`؛
- `mlino_book/MLINO_CORE_PRISMA_FINAL_READINESS_REVIEW.md`؛
- `mlino_book/MLINO_PRE_PRISMA_DECISION_NOTE.md`؛
- `mlino_book/MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md`؛
- `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`؛
- `mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md`؛
- `mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`.

برای هر artefact باید این موارد ثبت شوند:

- مسیر دقیق؛
- ref/commit منبع؛
- SHA-256؛
- دلیل ورود به انتقال؛
- وابستگی‌های آن؛
- نتیجهٔ validation.

`AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `AI_HANDOFF/HANDOFF_STATE.md` به‌دلیل تغییر در هر دو شاخه، بخشی از انتقال انتخابی عادی نیستند و باید با instruction، checksum و ثبت append-only حل شوند.

**نتیجهٔ blocker:** فهرست و شکل evidence تعیین شد، اما همهٔ مراجع canonical هنوز در شاخهٔ هدف حاضر نیستند؛ گیت بسته نشده است.

## ۷. رفع blocker پنجم: Handoff conflict

دو مسیر زیر در هر دو طرف تغییر کرده‌اند:

- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md`؛
- `AI_HANDOFF/HANDOFF_STATE.md`.

قواعد حل:

1. هیچ نسخه‌ای با checkout یا کپی کامل جایگزین نشود؛
2. Handoff فعال `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION` حفظ شود؛
3. گزارش‌های قبلی حذف یا بازنویسی نشوند؛
4. گزارش جدید در `AI_HANDOFF/CLAUDE_REPORTS/` ایجاد شود؛
5. نسخهٔ canonical گزارش در `CLAUDE_LATEST_REPORT.md` با checksum جدید ثبت شود؛
6. `HANDOFF_STATE.md` فقط با ثبت `INSTRUCTION_ID`، مسیر گزارش، SHA-256 و delivery commit به‌روزرسانی شود؛
7. حل Handoff بخشی از انتقال schema تلقی نشود و instruction مستقل خود را داشته باشد.

**نتیجهٔ blocker:** روش حل تعیین شد، اما تعارض‌ها برای انتقال بعدی هنوز باز هستند.

## ۸. ترتیب دقیق پس از بسته‌شدن گیت‌ها

این ترتیب هنوز اجرا نشده است:

1. دریافت ref تازهٔ `origin/main` و ثبت hash؛
2. ثبت وضعیت working tree و خارج‌کردن فایل‌های untracked قدیمی از stage؛
3. ساخت worktree ایزوله از شاخهٔ هدف؛
4. تطبیق چهار migration قبلی و migration `ExternalWorkspaceLink`؛
5. آماده‌سازی بلوک reviewed schema، بدون جایگزینی کل schema؛
6. قرار دادن migration در زنجیرهٔ کامل، بدون اجرای shared؛
7. فراهم‌کردن CCR/ADR/contractهای traceability؛
8. حل دستی Handoff و ثبت checksum؛
9. اجرای `prisma validate`؛
10. اجرای `prisma generate` با نسخهٔ `5.20.0`؛
11. اجرای build و type-check؛
12. اجرای تست‌های service روی PostgreSQL ایزوله؛
13. اثبات partial unique، revoke، re-link و تاریخچه؛
14. تعیین تکلیف FK و tenant isolation در CCR؛
15. تطبیق diff نهایی با فهرست artefactهای مجاز؛
16. انتقال واقعی فقط با instruction جداگانه و تأیید همهٔ گیت‌ها.

## ۹. مواردی که این سند عمداً حل نمی‌کند

- ایجاد یا تغییر `schema.prisma`؛
- ایجاد migration؛
- افزودن FK به Organization؛
- تولید Prisma Client؛
- انتقال service یا test؛
- تغییر Content Studio؛
- merge، rebase یا cherry-pick؛
- اتصال V2 یا فعال‌سازی Matching؛
- تغییر ADR یا تصمیم معماری.

این محدودیت‌ها برای جلوگیری از تبدیل سند رفع blocker به implementation پنهان ثبت شده‌اند.

## ۱۰. وضعیت نهایی

با وجود مشخص‌شدن روش رفع هر blocker، هیچ‌یک از گیت‌های اجرایی در این task اجرا نشده‌اند. تا دریافت ref تازه، validation واقعی chain، regeneration client، تصمیم FK و حل traceability/Handoff، انتقال ایمن قابل ادعا نیست.

من کدکس هستم.

NOT_READY_FOR_TRANSFER
