# گزارش اجرای M2-3b: مسیر هم‌مبدأ خروجی عمومی V2

## ۱. کار انجام‌شده

دستور `CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-002` روی شاخهٔ مستقل `codex/v2-public-export-route` از commit مبنای `540ad2d45f245a1bc5960bfdb15dc21b85f00947` اجرا شد. فایل عمومی امضاشده و شناسهٔ ساخت از مسیرهای دقیق همان مبدأ سرو می‌شوند؛ برنامه در صورت مشاهدهٔ ساخت تازه، حداکثر یک بار برای آن شناسه صفحه را تازه می‌کند.

## ۲. منابع و پیش‌شرط

- مرجع تصویب: `bd484012449b721a4da922c6a9d3330e47a0bde7:AI_HANDOFF/CLAUDE_REVIEWS/20260918_REISSUE_M2_3B_V2_ROUTE.md` و طراحی عملیات خروجی عمومی با تصمیم‌های O2=A و O4=A مشروط.
- `git fetch origin` به علت قطع اتصال به GitHub موفق نشد. مسیر GW2-P با این خروجی‌ها گذشت: `git cat-file -e` ← ۰؛ `git merge-base --is-ancestor` ← ۰؛ SHA-256 بایت‌های `git show` ← `cbde9c0107a12878620937c4a53da3ebff8eadc5a5b899ec1dac08be1fb62553`، برابر مقدار مصوب.
- هیچ تنظیم Git یا اطلاعات دسترسی تغییر نکرد.

## ۳. فایل‌های تغییرکرده

- `mlino2/app/nginx.conf`: مسیرهای دقیق فایل عمومی و `version.json` با ۴۰۴ واقعی، هدرهای امنیتی و کش مناسب؛ `index.html` با `no-cache`.
- `mlino2/app/docker-compose.yml` و `mlino2/app/Dockerfile`: mount فقط‌خواندنی پوشهٔ عمومی و آرگومان‌های ساخت URL و بستهٔ اعتمادِ فقط‌عمومی. `mlino2/app/public-export-empty/.gitkeep` برای حالت پیش‌فرض افزوده شد.
- `mlino2/app/vite.config.ts`: ساخت شناسهٔ تازه و همسان در برنامه و `dist/version.json`.
- `mlino2/app/src/publicExport/RealPublicApp.tsx` و `versionCheck.ts`: بررسی دوره‌ای نسخه با `no-store` و محافظ جلوگیری از بارگذاری دوبارهٔ بی‌پایان. `versionCheck.test.ts` و `nginxRoute.test.ts` آزمون‌های تازه‌اند.
- `mlino2/validation/m2-3b/`: سه جفت لاگ ساخت و آزمون، لاگ نسخه، اسکریپت و لاگ جهش، و فهرست SHA-256. این گزارش و ورودی افزوده‌شدهٔ Handoff در commit مستندات ثبت می‌شوند.

## ۴. فایل‌های تغییرنکرده

منطق پذیرش `canonical`، `verify`، `trustBundle` و `consumer` تغییر نکرد. هیچ فایل V1، schema، migration، وابستگی یا lockfile تغییر نکرد. شاخهٔ `main` و شاخهٔ پیشین V2 دست‌نخورده‌اند؛ push، Docker، پایگاه داده و کلید واقعی استفاده نشدند.

## ۵. آزمون‌ها و شواهد

| الزام | نام دقیق آزمون | نتیجه |
|---|---|---|
| بارگذاری برای ساخت تازه | `reloads once when a valid different build_id is returned` | موفق |
| ساخت یکسان و خطاها | `does not reload for the embedded build_id`، `ignores network, HTTP, JSON and storage errors` | موفق |
| محافظ تکرار و `no-store` | `reloads at most once per new build_id, including after a repeated page check`، `fetches version.json with no-store and does not read trust keys` | موفق |
| شناسهٔ نامعتبر | `ignores malformed build identifiers` | موفق |
| فایل عمومی و نسخه با ۴۰۴ واقعی | `serves the signed artifact from its read-only directory with a real 404, no SPA fallback`، `serves version.json with a real 404, no SPA fallback` | موفق |
| هدرها و کش | `sets JSON, no-store, nosniff and all security headers on %s`، `does not cache index.html across a redeploy` | موفق |
| mount و آرگومان‌های عمومی | `mounts only the public export folder as read-only, with an empty default`، `passes the public URL and public-only trust bundle at build time` | موفق |

`npm run build -- --configLoader runner` و `npm test -- --configLoader runner` هر کدام سه دور اجرا شدند؛ در هر دور ۱۶ فایل آزمون و ۲۳۸ آزمون موفق بود. سه SHA-256 متفاوت در `version.log` ثابت می‌کند شناسه در هر ساخت تغییر کرد؛ همان شناسه در بستهٔ برنامه پیدا شد. آزمون‌ها فقط از تابع‌های ساختگی برای پاسخ شبکه استفاده کردند.

سه جهش در نسخهٔ موقت بیرون worktree اجرا شد: حذف محافظ بارگذاری مجدد، افزودن بازگشت به `index.html` در مسیر فایل عمومی، و حذف `no-store`. هر سه آزمون متناظر را شکست دادند. پوشه‌های موقت پاک شدند.

## ۶. محدودیت محیط و نتیجه

بارگذار پیش‌فرض پیکربندی Vite در این محیط ویندوزی خطای دسترسی به مسیر اجدادی می‌دهد؛ همان خطا با `vite.config.ts` اصلیِ پیش از تغییر نیز بازتولید شد. بنابراین سه دور معتبر با گزینهٔ رسمی `--configLoader runner` اجرا شدند. این تفاوتِ ابزار باید در بازبینی ثبت شود. طبق محدودیت دستور، Docker یا `nginx -t` اجرا نشد؛ آزمون زندهٔ Nginx بر عهدهٔ Guardian است.

## ۷. SHA-256 و بررسی نشت

`mlino2/validation/m2-3b/LF-MANIFEST.txt` اثرانگشت ۱۹ فایل تغییرکردهٔ کد و شاهد را بر پایهٔ بایت‌های `git show` دارد؛ راستی‌آزمایی دوباره ۱۹/۱۹ موفق بود. SHA-256 خود فهرست: `8ee7ac3d989ec2d798bc38b63eb62c623ad3bde15d5f10f9921cc42465e9af93`. جست‌وجوی کلید خصوصی، پیشوند PKCS8، رمز و token در فایل‌های تازه و خروجی ساخت نتیجه‌ای نداشت.

## ۸. commit

Commit کد، آزمون و شواهد: `ced4077460e3ef47b9baf23cc5499543b672e0d3`. گزارش و Handoff در commit مستندات بعدی ثبت می‌شوند. هر دو commit فقط محلی‌اند.

## ۹. ریسک‌ها و پرسش‌های باز

هدرها و ۴۰۴ با آزمون ایستای پیکربندی بررسی شده‌اند؛ اجرای واقعی Nginx و bind mount تا بازبینی Guardian سنجیده نمی‌شود. بستهٔ اعتماد عمداً پیش‌فرض خالی دارد؛ بدون تنظیم کلیدهای عمومی، مصرف‌کننده همان رفتار بستهٔ قبلی را حفظ می‌کند و دادهٔ بی‌امضا را نمی‌پذیرد.

## ۱۰. گام پیشنهادی

بازبینی مستقل Guardian، اجرای `nginx -t` و وارسی GET/HEAD/۴۰۴ در محیط مجاز. هیچ استقرار یا گام بعدی بدون تصمیم بازبینی آغاز نمی‌شود.

من کدکس هستم
