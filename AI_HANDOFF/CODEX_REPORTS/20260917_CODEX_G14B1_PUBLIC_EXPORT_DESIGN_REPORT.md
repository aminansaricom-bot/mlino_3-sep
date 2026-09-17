# گزارش اجرای G14b-1 — طراحی خروجی عمومی امضاشدهٔ V1

**وضعیت:** تحویل DRAFT برای بازبینی Guardian؛ هیچ تصمیم E9 قطعی نشده است.

## ۱. کار اجراشده

سند طراحی `mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md` بر اساس قرارداد FINAL ‏`public-business.v1` تهیه شد. کار فقط مستندسازی است؛ G14b-2 و G14c آغاز نشده‌اند.

## ۲. اسناد مبنا

- `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md:9-78`؛ commit پین‌شده `2eb8947c301a25463fefdf05602533d7db4f4c7e`.
- `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-192,194-202,221-234,253-271`؛ DTO و تصمیم‌های FINAL.
- `origin/main:implementation/prisma/schema.prisma:239-655`؛ مدل‌ها، وضعیت‌ها، روابط و ایندکس‌ها.
- `origin/main:implementation/core/publication-service.ts:20-170`؛ کلیدهای واقعی snapshot و رفتار انتشار/برداشت.
- `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:388-400,568-600`؛ ایندکس‌های زمانی و قید هدف Publication.

## ۳. فایل‌های تغییرکرده

| مسیر | تغییر |
|---|---|
| `mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md` | سند تازه، DRAFT |
| `AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14B1_PUBLIC_EXPORT_DESIGN_REPORT.md` | این گزارش تازه |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | یک ورودی در انتهای فایل؛ append-only |

هیچ فایل دیگری تغییر نکرد؛ به‌ویژه قرارداد FINAL، V2، schema، migration، کد، تست، پیکربندی و ADR دست‌نخورده‌اند. هیچ Docker، DB، npm، کلید واقعی یا push انجام نشد.

## ۴. پوشش دستور E1 تا E9

| بند | بخش سند | وضعیت |
|---|---|---|
| E1 — منبع و انتخاب رویداد، دروازه‌ها، query و ایندکس | E1 | انجام شد؛ شکاف چند Profile و `fresh_until` صریحاً ثبت شد. |
| E2 — DTO ثابت و نگاشت تک‌تک فیلدها | E2 | انجام شد؛ بلوک DTO پس از LF-normalization با بخش ۷ FINAL برابر است. |
| E3 — الگوریتم، محل کلید، `key_id`، rotation | E3 | انجام شد؛ گزینه‌ها و یک توصیه برای هر محور؛ کلید واقعی لازم نیست. |
| E4 — canonical bytes، زمان، عدد، Unicode و امضا | E4 | انجام شد؛ ناسازگاری strict byte identity در دو زمان مختلف با `generated_at`/TTL پنهان نشده و در Q10 باز است. |
| E5 — CLI/schedule/service، atomic write و پنج دقیقه | E5 | انجام شد؛ producer هیچ write به DB ندارد؛ حد زمانی و ناتوانی تشخیص stale فوری با polling بیان شد. |
| E6 — schema نسخه‌دار ساعات و terms | E6 | انجام شد؛ رفتار با JSON نامعتبر همراه گزینه‌ها و توصیه‌ها ثبت شد. |
| E7 — privacy، tenant و امن‌سازی artifact/log | E7 | انجام شد؛ contact allowlist و ممنوعیت داده‌های داخلی و secrets ثبت شد. |
| E8 — برنامهٔ آزمون G14b-2 روی DB موقت | E8 | انجام شد؛ آزمونی در این مرحله اجرا نشده است. |
| E9 — پرسش‌های باز با گزینه/پیامد/توصیه | E9 | انجام شد؛ Q1 تا Q10 باز هستند و هیچ‌کدام به تصمیم تبدیل نشده‌اند. |

## ۵. پیش‌شرط GW2 / GW2-P

`git fetch origin` در sandbox به‌علت عدم اتصال شبکه شکست خورد. اجرای بیرون sandbox نیز به‌علت اختلاف مالکیت Git متوقف شد. طبق محدودیت دستور، هیچ `git config`، `safe.directory`، credential یا helper تغییر نکرد. اعتبارسنجی GW2-P روی سند پین‌شده موفق بود:

| بررسی | نتیجه |
|---|---|
| `git cat-file -e 2eb8947c301a25463fefdf05602533d7db4f4c7e^{commit}` | exit 0 |
| `git merge-base --is-ancestor 2eb8947c301a25463fefdf05602533d7db4f4c7e origin/main` | exit 0 |
| `git show <PINNED_COMMIT>:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md` | exit 0 |
| SHA-256 بایت‌های خام `git show` | `ad775b42794f3f23269eea6d0e26d6a9860ec2d8d1014c86d75fb3dc7489dc93`؛ برابر مقدار پین‌شده |
| `origin/main` هنگام ایجاد worktree | `2eb8947c301a25463fefdf05602533d7db4f4c7e` |

## ۶. اعتبارسنجی مستندات

- هر ۹ بخش E1 تا E9 حاضر است.
- بلوک `PublicBusinessExportV1` و `PublicBusinessRecordV1` عین بلوک FINAL پس از یکسان‌سازی LF است؛ نوع یا فیلد تازه‌ای افزوده نشد.
- `git diff --check origin/main..477075c` بدون خطا است.
- SHA-256 سند از **بایت‌های `git show 477075c:mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md`**: `5eebd9ff3f2dfb86cca4edd4d5581c507f8a8d4909673b2f89867628795c05ba`.
- تست کد، Prisma، Docker یا اتصال پایگاه داده مطابق MODE اجرا نشد.

## ۷. commit، محدودیت‌ها و گام بعد

Commit سند: `477075c3a0e02a3f328aa741cfc65f117d2b4f6e`. گزارش و Handoff در commit محلی بعدی ثبت می‌شوند؛ هیچ push انجام نمی‌شود.

ریسک‌های باز برای بازبینی: `fresh_until` در snapshot Capability فعلی وجود ندارد؛ چند Profile برای یک سازمان ممکن است؛ strict byte identity در دو زمان مستقل با freshness امضاشده تعارض دارد؛ و polling به‌تنهایی stale فوریِ withdrawal ناشناخته را تشخیص نمی‌دهد. این‌ها به‌صورت Q7، Q8، Q10 و Q4 با گزینه و توصیه، بدون تصمیم‌گیری، آمده‌اند.

**گام بعد:** بازبینی Guardian و سپس تصمیم مالک دربارهٔ پرسش‌های E9؛ Codex مرحلهٔ بعد را خودکار شروع نمی‌کند.

من کدکس هستم.
