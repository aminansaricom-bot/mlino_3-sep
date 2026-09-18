# گزارش اجرای M2-3a: توزیع خروجی عمومی

## ۱. کار اجراشده

دستور `CODEX-20260918-M2-3A-PUBLIC-EXPORT-DISTRIBUTION-001` روی شاخهٔ مستقل `codex/public-export-distribution` اجرا شد. خروجی فقط پس از بررسی قالب، بایت‌های کانونی، امضا، زمان تولید و جلوگیری از بازگشت نسخه به پوشهٔ عمومی منتقل می‌شود. هیچ انتشار واقعی، کلید واقعی یا پوشهٔ عملیاتی استفاده نشد.

## ۲. منابع و پیش‌شرط

- مرجع تصویب: `8d7f709bee3ecf10c7ea6a9ec06bdc8e56444721:AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_3_HOST_WIRING.md` و سند `mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md`، تصمیم‌های O2=A و O5=B.
- تلاش `git fetch origin` با خطای `SEC_E_NO_CREDENTIALS` متوقف شد؛ هیچ تنظیم Git یا اطلاعات دسترسی تغییر نکرد. مسیر GW2-P اجرا شد: `git cat-file -e` با خروجی ۰، `git merge-base --is-ancestor` با خروجی ۰، و SHA-256 بایت‌های `git show` برابر `90b2aaa33242546593d58951844d0652933444d6542a6cb1711b194827268356` بود.
- مبنای شاخه: `8d7f709bee3ecf10c7ea6a9ec06bdc8e56444721`.

## ۳. فایل‌های تغییرکرده

- `implementation/public-export/distribution/`: `distribute.ts`، `cli.ts`، `setup-public-folder.ps1` و `verify-public-folder.ps1`؛ همگی تازه.
- `implementation/test/public-export/distribution/`: `distribute.spec.ts` و `acl.spec.ts`؛ تازه.
- `implementation/validation/m2-3a/`: سه جفت لاگ ساخت و آزمون، اسکریپت و لاگ جهش، و `LF-MANIFEST.txt`؛ تازه.
- این گزارش و یک ورودی افزوده‌شده در `mlino2/HANDOFF/HANDOFF_STATE.md`.

## ۴. فایل‌های تغییرنکرده

هیچ فایل موجود در V1، قرارداد، schema، migration، تنظیمات بسته‌ها، V2 یا شاخهٔ `main` تغییر نکرد. فایل‌های تولیدی `dist` و پیوند محلی `node_modules` در commit نیستند. هیچ push انجام نشد.

## ۵. آزمون‌ها و شواهد

| الزام | آزمون دقیق | نتیجه |
|---|---|---|
| فقط فایل جاری و کپی بایت‌به‌بایت | `dist-current-only-copies-canonical-bytes` | موفق |
| امضا و کلید ناشناس | `dist-rejects-tampered-signature-preserves-public`، `dist-rejects-unknown-key-preserves-public` | موفق |
| قالب و کانونی بودن | `dist-rejects-wrong-contract-preserves-public`، `dist-rejects-noncanonical-preserves-public` | موفق |
| زمان و بازگشت نسخه | `dist-rejects-expired-and-future-preserves-public`، `dist-rejects-rollback-preserves-public` | موفق |
| نوشتن اتمیک و پاک‌سازی | `dist-rename-failure-removes-temp-preserves-public` | موفق |
| مسیرهای نامعتبر | `dist-rejects-relative-nested-identical-and-repository-directories` | موفق |
| محرمانگی لاگ و خطا | `dist-logs-fixed-code-and-boolean-only`، `dist-errors-never-contain-paths-or-identifiers` | موفق |
| CLI و کلید عمومی | `dist-cli-public-provider-does-not-read-protected-material`، `dist-cli-uses-public-only-descriptor-without-protector` | موفق |
| خاموش بودن ارث‌بری ACL | `acl-script-explicitly-disables-inheritance` | موفق |
| تنظیم و بازخوانی ACL در Jest | `ACL_UNAVAILABLE: acl-setup-and-verify-reject-extra-ace` | ردشده با دلیل آشکار؛ محدودیت محیط |

`npm run build` و `npm test -- --runInBand test/public-export/distribution` هر کدام سه بار اجرا شدند. هر دور: ۲ مجموعهٔ موفق، ۱۴ آزمون موفق، ۱ آزمون ردشده با `ACL_UNAVAILABLE`، ۰ شکست. در نشست PowerShell فعلی، `setup-public-folder.ps1` و `verify-public-folder.ps1` جداگانه روی پوشهٔ موقت با حساب فعلی موفق شدند؛ `icacls` توانست یک ACE اضافه کند و verify سپس به‌درستی آن را رد کرد. از درون فرایند Node/Jest، Windows PowerShell نتوانست ماژول `Microsoft.PowerShell.Security` را برای `Set-Acl` بارگذاری کند؛ به همین دلیل آزمون یک skip واقعی است، نه موفقیت ساختگی. پوشه‌های موقت پاک شدند.

جهش‌ها در نسخهٔ دورریختنی و بیرون worktree اجرا شدند: حذف بررسی امضا، حذف محافظ بازگشت نسخه، جایگزین‌کردن فایل جاری با `previous-1` و حذف خاموش‌سازی ارث‌بری ACL؛ در هر چهار حالت آزمون مربوط شکست خورد. لاگ `mutation.log` نتیجهٔ هر چهار را دارد.

## ۶. نتیجه و محدودیت

ساخت TypeScript، آزمون‌های قابل اجرا و چهار اثبات جهش موفق‌اند. بررسی ACL از درون Jest به محیط مالک با دسترسی عادی موکول است؛ اجرای دستی همان اسکریپت‌ها در پوشهٔ موقت موفق بود. هیچ اتصال دیتابیس، Docker، کلید واقعی یا اجرای CLI عملیاتی انجام نشد.

## ۷. اثرانگشت فایل‌ها

`implementation/validation/m2-3a/LF-MANIFEST.txt` دارای SHA-256 هر ۱۴ فایل کد، آزمون و شاهد بر اساس بایت‌های `git show` است؛ بازشماری مستقل ۱۴/۱۴ موفق بود. SHA-256 خود فهرست: `09747b6e6c431cf814477b1746610aed363f42a2d0a6f2fd241e5cbcbc6bbd88`. جست‌وجوی نشت برای کلید خصوصی، پیشوند PKCS8، مسیرهای واقعی و نشانی پایگاه زنده در فایل‌های افزوده‌شده نتیجه‌ای نداشت.

## ۸. commit

Commit کد، آزمون و شواهد: `5d3d034e544b82d525a14cdb4aa4752e447b1cf5`. این گزارش و Handoff در commit مستندات بعدی ثبت می‌شوند. هر دو commit فقط محلی‌اند.

## ۹. ریسک‌ها و پرسش‌های باز

بازبینی‌کننده باید آزمون ACL را زیر حساب مالک اجرا کند. خود توزیع هنوز به زمان‌بند یا میزبان واقعی وصل نیست؛ این دستور مجوز آن کار را نمی‌دهد. برای این برش تصمیم معماری تازه‌ای گرفته نشد.

## ۱۰. گام پیشنهادی

بازبینی مستقل Guardian روی این دو commit و اجرای آزمون ACL در محیط مالک. تا اعلام تصمیم Guardian، هیچ مرحلهٔ بعدی آغاز نمی‌شود.

من کدکس هستم
