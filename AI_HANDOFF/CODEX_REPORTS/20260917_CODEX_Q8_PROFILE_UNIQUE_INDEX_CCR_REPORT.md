# گزارش Codex — پیش‌نویس CCR یکتایی Profile منتشرشده (Q8)

**Instruction:** `CODEX-20260917-Q8-PROFILE-UNIQUE-INDEX-CCR-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1`
**شاخه:** `codex/core-profile-unique-ccr`، بر پایهٔ `6514b846788ea061e7a92383521ced7a0d383e48`؛ فقط commit محلی.

## ۱. کار انجام‌شده

سند DRAFT برای قید «حداکثر یک `BusinessProfile` منتشرشده در هر سازمان» نوشته شد. پیشنهاد، یک ایندکس یکتای جزئی PostgreSQL در migration تازه است؛ هیچ قید یا schema فعلی تغییر نکرد.

## ۲. اسناد مبنا و پیش‌شرط

مرجع تصویب `AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_CCR_AND_G14C1_PARALLEL.md` در commit پین‌شدهٔ `6514b846788ea061e7a92383521ced7a0d383e48` است. SHA-256 بایت‌های `git show` برابر **`d5fecc63b62df270d19f6368052107cf74dc3f67186cbf32da52f64d2b370dfb`** شد.

پیش‌شرط GW2: `git fetch origin` در sandbox با `Failed to connect to github.com:443` و در تکرار elevated با `dubious ownership` متوقف شد؛ هیچ credential یا git config تغییر نکرد. GW2-P روی همان commit: `git cat-file -e` و `git merge-base --is-ancestor ... origin/main` هر دو **exit 0 و خروجی خالی** داشتند؛ هش سند نیز با مقدار پین‌شده برابر بود. `origin/main` همان `6514b846...` بود. منابع محتوایی: schema، migrationهای Core/ExternalWorkspaceLink/`published_content`، PublicationService، error adapter، export builder، و شواهد تاریخی G7b و G14a-3؛ تمام ادعاهای schema و رفتار کنونی با `origin/main:<file>:<line>` در CCR ارجاع دارند.

## ۳. فایل‌های تغییرکرده

1. `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PROFILE_PUBLISHED_UNIQUE.md` — پیش‌نویس تازه.
2. همین گزارش در `AI_HANDOFF/CODEX_REPORTS/` — تازه.
3. `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط الحاق ورودی این تحویل.

## ۴. فایل‌هایی که تغییر نکردند

`schema.prisma`، همهٔ migrationها، کد سرویس، آزمون‌ها، پیکربندی، قرارداد نهایی V2، شاخهٔ V2، و فایل‌های ریشهٔ `AI_HANDOFF` دست‌نخورده‌اند. کار موازی G14c-1 در این شاخه شروع نشده است.

## ۵. پوشش P1 تا P7

| الزام | بخش سند | نتیجه |
|---|---|---|
| P1 | P1 | انجام شد: نبود یکتایی سازمانی و هزینهٔ پنهان‌شدن کل کسب‌وکار در export توضیح داده شد. |
| P2 | P2 | انجام شد: preflight دقیق، `BEGIN/COMMIT`، قفل، DDL ایندکس جزئی و مرز Prisma/Drift ثبت شد. |
| P3 | P3 | انجام شد: 23505 در trigger، rollback رویداد، نگاشت پیشنهادی خطا، withdraw و نبود REPLACED برای Profile ثبت شد. |
| P4 | P4 | انجام شد: query فقط‌خواندنیِ لازم و الگوی backup/deploy آینده نوشته شد؛ **اجرا نشد**. |
| P5 | P5 | انجام شد: rollback با migration رو‌به‌جلوی تازه و اثر تاریخچه ثبت شد. |
| P6 | P6 | انجام شد: آزمون‌های قید، هم‌زمانی، نگاشت خطا، export و کل suite برای مرحلهٔ بعد فهرست شدند؛ **اجرا نشدند**. |
| P7 | P7 | انجام شد: سه سؤال باز با گزینه‌ها و یک توصیه برای هرکدام؛ هیچ گزینه‌ای تصویب نشد. |

## ۶. اعتبارسنجی و نتیجه

فقط مستندات بررسی شد: `git diff --cached --check` **exit 0**؛ وضعیت CCR برابر DRAFT؛ دامنهٔ commit اول فقط همان سند CCR. طبق دستور، npm، Prisma، Docker، دیتابیس یا آزمون اجرا نشد.

## ۷. commit و SHA-256

Commit پیش‌نویس: `70b73d6`. SHA-256 فایل CCR بر مبنای بایت‌های `git show HEAD:implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PROFILE_PUBLISHED_UNIQUE.md`:

`1fa0fcd046a5456158a72defd7926eaf7a42b299c8edda62de92fddfbc35d82b`

## ۸. ریسک‌های باقی‌مانده

تا زمان پیاده‌سازی و اعمال migration، قید Q8 فقط در producer به‌شکل fail-closed پوشش داده می‌شود. زمان قفل `ACCESS EXCLUSIVE` در محیط هدف و شکل واقعی خطای Prisma هنوز آزموده نشده‌اند. اجرای ایندکس روی دادهٔ دارای Profile تکراری باید متوقف شود؛ هیچ اصلاح دادهٔ خودکار مجاز نشده است.

## ۹. پرسش‌های باز

تصمیم مالک دربارهٔ رفع دادهٔ تکراری احتمالی، شیوهٔ ساخت ایندکس در استقرار، و توالی نگاشت خطا/اجرای migration در P7 باز است. این سند هیچ‌کدام را تعیین نکرده است.

## ۱۰. گام پیشنهادی

بازبینی Architecture Guardian و تصمیم مالک دربارهٔ CCR. اجرای migration، تغییر error adapter یا کار G14c-1 در این تحویل انجام نمی‌شود. پس از ثبت گزارش و commit محلی، این workstream متوقف می‌شود.

من کدکس هستم
