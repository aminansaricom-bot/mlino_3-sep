# چک‌لیست آمادگی انتقال انتخابی artefactهای MLINO

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Artifact Transfer Readiness Maintainer  
**INSTRUCTION_ID:** `CODEX-20260912-ARTIFACT-TRANSFER-READINESS-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**مبنای چک‌لیست:** `MLINO_SELECTIVE_ARTIFACT_TRANSFER_PLAN.md` و `MLINO_ARTIFACT_COMPATIBILITY_REVIEW.md`  
**دامنه:** آمادگی پیش از انتقال؛ هیچ انتقالی در این مرحله انجام نمی‌شود.

## ۱. وضعیت فعلی و شرط استفاده از این چک‌لیست

- [x] شاخهٔ هدف `codex/v2-intent-flow-foundation` مشخص است.
- [x] `origin/main` به‌عنوان منبع artefactهای Core مشخص است.
- [x] انتقال کامل تاریخچهٔ main رد شده است.
- [x] merge، rebase و cherry-pick در این مرحله ممنوع و انجام‌نشده هستند.
- [x] سه artefact اسنادی شاخهٔ هدف برای انتقال بعدی مشخص شده‌اند.
- [ ] ref تازهٔ `origin/main` در زمان اجرای انتقال دریافت و hash آن ثبت شده است.
- [ ] CCR و instruction جداگانه برای انتقال اجرایی صادر شده است.

## ۲. الزامات انتقال `ExternalWorkspaceLink`

### artefactهای اجباری

- [ ] `implementation/prisma/schema.prisma` از ref معتبر `origin/main` بررسی شده است.
- [ ] enumهای `ExternalSystem`، `ExternalLinkStatus` و `ExternalLinkBasis` همراه مدل منتقل می‌شوند.
- [ ] `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql` به‌عنوان بخشی از زنجیرهٔ migration مشخص شده است.
- [ ] `implementation/foundation/workspace-link/workspace-link.service.ts` با schema و Prisma Client همان baseline بررسی شده است.
- [ ] `implementation/test/foundation/workspace-link.spec.ts` با service و دیتابیس آزمایشی بررسی شده است.
- [ ] CCR مربوط به ExternalWorkspaceLink و ADR-0004 برای traceability در دسترس هستند.

### قواعد دامنه و تاریخچه

- [ ] نگاشت فقط با شناسهٔ دقیق workspace انجام می‌شود؛ نگاشت بر اساس نام وجود ندارد.
- [ ] وضعیت‌ها فقط `ACTIVE` و `REVOKED` هستند.
- [ ] مسیر `REVOKED → ACTIVE` وجود ندارد و re-link رکورد جدید می‌سازد.
- [ ] برای هر `(system, external_workspace_id)` حداکثر یک رکورد `ACTIVE` مجاز است.
- [ ] رکوردهای `REVOKED` حذف یا بازنویسی نمی‌شوند.
- [ ] `organization_id` مالکیت Content Studio محسوب نمی‌شود.
- [ ] هیچ تغییر در schema Content Studio یا repository مستقل آن وارد انتقال نمی‌شود.
- [ ] actorهای ثبت/لغو لینک به‌عنوان membership کسب‌وکار تفسیر نمی‌شوند.

## ۳. چک‌لیست زنجیرهٔ migration

- [ ] hash و commit دقیق `origin/main` پیش از انتقال ثبت شده است.
- [ ] همهٔ migrationهای پیش از `20260910020000_add_external_workspace_link` در baseline حاضر هستند.
- [ ] ترتیب migrationها با `migration_lock.toml` و تاریخچهٔ همان baseline سازگار است.
- [ ] enumهای migration پیش از ایجاد جدول ساخته می‌شوند.
- [ ] جدول `external_workspace_links` فقط یک‌بار در زنجیره ایجاد می‌شود.
- [ ] index سازمان و workspace وجود دارد.
- [ ] partial unique index با شرط `status = 'ACTIVE'` وجود دارد.
- [ ] migration به‌صورت مستقل از زنجیرهٔ main اجرا نمی‌شود.
- [ ] migration روی دیتابیس واقعی یا shared اجرا نمی‌شود.
- [ ] rollback پیش از دادهٔ واقعی و رفتار پس از ورود دادهٔ واقعی مستند شده است.
- [ ] تست مستقیم دیتابیس برای رد لینک فعال دوم اجرا و ثبت شده است.
- [ ] تست هم‌زمانی برای ناوردای یک لینک فعال اجرا و ثبت شده است.

## ۴. الزامات تولید دوبارهٔ Prisma Client

- [ ] نسخهٔ `prisma` و `@prisma/client` برابر `5.20.0` باقی مانده است.
- [ ] schema پس از انتقال با `prisma validate` بررسی شده است.
- [ ] Prisma Client از همان schema و همان lockfile تولید شده است.
- [ ] enumهای `ExternalSystem`، `ExternalLinkStatus` و `ExternalLinkBasis` در client موجود هستند.
- [ ] delegate `externalWorkspaceLink` در client موجود است.
- [ ] service بدون خطای type و import به client متصل می‌شود.
- [ ] تولید client در worktree ایزوله انجام شده و artifact ناخواسته به شاخهٔ هدف وارد نشده است.
- [ ] هیچ تغییر در `implementation/shared-contracts/types.ts` برای رفع خطای client انجام نشده است.

## ۵. الزامات traceability مستندات

- [ ] `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md` قابل دسترس است.
- [ ] `mlino_book/adr/ADR-0004-workspace-organization-mapping.md` به‌عنوان مرجع معماری مشخص است.
- [ ] `mlino_book/contracts/WORKSPACE_ORGANIZATION_MAPPING.md` به‌عنوان مرجع قرارداد مشخص است.
- [ ] گزارش‌های آمادگی Core Prisma از `origin/main` با hash و commit ثبت شده‌اند.
- [ ] کپی دوم و متعارضی از MLINO Book یا ADRها ساخته نمی‌شود.
- [ ] مسیرهای اشاره‌شده در توضیحات service و migration resolve می‌شوند.
- [ ] گزارش انتقال، hash هر artefact و diff محدود را ثبت می‌کند.
- [ ] `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` جایگزین کورکورانه نمی‌شود.
- [ ] `AI_HANDOFF/HANDOFF_STATE.md` فقط با instruction و checksum جدید به‌روزرسانی می‌شود.

## ۶. چک‌لیست سازگاری FK با Organization

### وضعیت فعلی

- [x] در پیاده‌سازی موجود، `organization_id` در `ExternalWorkspaceLink` از نوع `TEXT` است.
- [x] مدل فعلی ExternalWorkspaceLink در schema موجود رابطهٔ Prisma به Organization ندارد.
- [x] migration فعلی FK به Organization ایجاد نمی‌کند.
- [x] این وضعیت به‌عنوان واقعیت baseline ثبت شده و در انتقال ضمنی اصلاح نمی‌شود.

### گیت پیش از ادعای سازگاری کامل Core

- [ ] مشخص شده است که مدل Organization در schema نهایی Core با چه شناسه و نوعی ایجاد می‌شود.
- [ ] مشخص شده است که FK ساده یا مرکب برای `ExternalWorkspaceLink` لازم است.
- [ ] مشخص شده است که tenant isolation چگونه در رابطه enforce می‌شود.
- [ ] رفتار `ON DELETE` و `ON UPDATE` صریحاً تصویب شده است.
- [ ] حفظ لینک‌های تاریخی هنگام archive/revoke Organization تضمین شده است.
- [ ] تصمیم FK در CCR/Core Prisma ثبت شده است.
- [ ] هیچ FK، تغییر نوع یا relation جدید در این مرحله و به‌صورت ضمنی ایجاد نشده است.

این بخش blocker انتقال فنی به‌عنوان «schema نهایی Core» است. `ExternalWorkspaceLink` می‌تواند به‌عنوان baseline تاریخی/نگاشتی حفظ شود، اما تا بسته‌شدن این گیت نباید سازگاری کامل tenant isolation ادعا شود.

## ۷. artefactهای مجاز و غیرمجاز

### مجاز برای بررسی و انتقال بعدی

- [ ] بلوک reviewed مدل و enumهای `ExternalWorkspaceLink` از `origin/main`.
- [ ] migration مرتبط، فقط همراه با migration chain.
- [ ] service مرتبط، پس از فراهم‌شدن Prisma Client.
- [ ] test مرتبط، پس از فراهم‌شدن PostgreSQL ایزوله.
- [ ] اسناد CCR/ADR لازم برای traceability.
- [ ] `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`.
- [ ] `mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md`.
- [ ] `mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`.

### غیرمجاز

- [ ] کل diff یا ۵۵ کامیت عقب‌ماندهٔ main.
- [ ] جایگزینی کامل فایل‌های Handoff متعارض.
- [ ] تغییر Content Studio یا schema آن.
- [ ] تغییر `implementation/shared-contracts/types.ts`.
- [ ] ایجاد Organization، Capability، Offer یا Publication در این انتقال.
- [ ] ایجاد schema نهایی Core یا migration جدید بدون CCR.
- [ ] اتصال V2، Intent، Session، Matching یا UI به این artefactها.
- [ ] اجرای migration روی دیتابیس واقعی یا shared.

## ۸. ترتیب دقیق مجاز انتقال

این ترتیب فقط پس از تأیید مالک و صدور instruction جداگانه مجاز است:

1. [ ] ref تازهٔ `origin/main` دریافت و hash کامل ثبت شود.
2. [ ] وضعیت working tree شاخهٔ هدف و سه فایل untracked قدیمی ثبت شود؛ آن فایل‌ها stage نشوند.
3. [ ] worktree ایزوله از `codex/v2-intent-flow-foundation` ساخته شود.
4. [ ] نسخهٔ baseline `implementation/prisma/schema.prisma` و زنجیرهٔ migration با `origin/main` مقایسه شود.
5. [ ] مدل و enumهای `ExternalWorkspaceLink` به‌صورت reviewed و فایل‌محور آماده شوند؛ کل schema جایگزین نشود.
6. [ ] migration مرتبط همراه با زنجیرهٔ کامل و بدون اجرای آن روی دیتابیس shared آماده شود.
7. [ ] service و test مرتبط بعد از فراهم‌شدن مدل، migration chain و client آماده شوند.
8. [ ] مراجع CCR/ADR و مسیرهای traceability کنترل شوند.
9. [ ] `prisma validate` و `prisma generate` در worktree ایزوله اجرا شوند.
10. [ ] build و تست‌های workspace-link روی PostgreSQL ایزوله اجرا شوند.
11. [ ] partial unique index، revoke، re-link و `organizationAt` با شواهد تست تأیید شوند.
12. [ ] وضعیت FK به Organization و tenant isolation در CCR جداگانه تعیین تکلیف شود.
13. [ ] diff نهایی فقط با فهرست artefactهای مجاز تطبیق داده شود.
14. [ ] checksum، Handoff و گزارش تحویل به‌صورت جداگانه ثبت شوند.
15. [ ] فقط پس از همهٔ گیت‌های بالا، انتقال انتخابی به شاخهٔ هدف انجام شود.

## ۹. blockerهای فعلی

- [ ] ref تازهٔ Remote در زمان انتقال ثبت نشده است.
- [ ] dependency کامل migration chain باید در worktree ایزوله تأیید شود.
- [ ] Prisma Client هنوز برای مدل جدید تولید نشده است.
- [ ] تصمیم FK و tenant isolation برای `organization_id` هنوز بسته نشده است.
- [ ] traceability کامل مراجع CCR/ADR در شاخهٔ هدف موجود نیست.
- [ ] Handoffهای متعارض هنوز نیازمند حل دستی و checksum جدید هستند.

این موارد باعث می‌شوند انتقال اجرایی فعلاً آغاز نشود. این سند هیچ‌کدام از آن‌ها را اجرا یا حل نمی‌کند.

من کدکس هستم.

NOT_READY_FOR_TRANSFER
