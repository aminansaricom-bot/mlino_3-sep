# گزارش تحویل برنامهٔ انتقال انتخابی artefactهای MLINO

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**INSTRUCTION_ID:** `CODEX-20260912-SELECTIVE-ARTIFACT-TRANSFER-PLAN-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**وضعیت:** `PLAN READY — TRANSFER NOT EXECUTED`  
**سند:** `mlino2/MLINO_SELECTIVE_ARTIFACT_TRANSFER_PLAN.md`  
**SHA-256 سند:** `025e0492a81ed076bb422bdbd42367c9238d130462959aaa086c751acfd0d32a`

## نتیجه

شاخهٔ `codex/v2-intent-flow-foundation` به‌عنوان شاخهٔ V2 و معماری فعلی حفظ می‌شود. برنامه، انتقال فایل‌محور و انتخابی artefactهای مورد نیاز Core را از `origin/main` پیشنهاد می‌کند؛ هیچ merge، rebase یا cherry-pick انجام نشد.

## مبنای بررسی

- HEAD شاخهٔ هدف: `20b6052d402512de4550e03c4e485b8e4293a719`
- ref محلی `origin/main`: `f23e297454236d468da8ed58858eda9e1cb5b8d5`
- merge-base: `95d7c26d8a8271a5ad55f1964a251d101f7184ef`
- وضعیت: ۵۵ کامیت عقب، ۴۹ کامیت جلو

## موارد ثبت‌شده

- مجموعهٔ کامل `ExternalWorkspaceLink` شامل schema، migration، service، test و CCR باید حفظ شود.
- migration باید همراه با زنجیرهٔ migration مبنای `origin/main` بررسی شود؛ انتقال مستقل فایل migration مجاز نیست.
- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `AI_HANDOFF/HANDOFF_STATE.md` به‌دلیل تغییر در هر دو طرف، فقط با Handoff و checksum جدید حل شوند.
- کل diff `origin/main`، کل MLINO Book، Content Studio و کدهای غیرمرتبط با این گام منتقل نشوند.
- رابطهٔ `organization_id` در پیاده‌سازی موجود برای CCR/Core Prisma دوباره بررسی شود؛ در این برنامه هیچ FK یا تغییر نوعی پیشنهاد اجرایی نشده است.

## اعتبارسنجی

- برنامه ایجاد شد و hash آن ثبت شد.
- هیچ فایل schema، migration یا backend تغییر نکرد.
- هیچ انتقال فایل، merge، rebase یا cherry-pick اجرا نشد.
- `main` تغییر نکرد.
- سه فایل untracked قدیمی در working tree دست‌نخورده باقی ماندند.

## اقدام بعدی

پس از تأیید مالک، Handoff جداگانه برای اجرای انتقال انتخابی صادر شود. تا آن زمان `schema.prisma` و migration ایجاد یا تغییر داده نشوند.

من کدکس هستم.
