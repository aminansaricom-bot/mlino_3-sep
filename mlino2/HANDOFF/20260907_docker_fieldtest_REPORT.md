# گزارش تحویل — فایل‌های Docker اپ V2 برای تست میدانی (Container با HTTPS)

**تاریخ:** ۷ سپتامبر ۲۰۲۶
**نویسنده:** موجی (GLM 5.3 Flash)
**دستور:** فایل‌های Docker اپ V2 (Dockerfile چندمرحله‌ای + nginx/preview با استدلال + دسترسی LAN از گوشی + HTTPS داخل Container)
**تقسیم کار (نکته‌ی هماهنگی دستور bookkeeping یونس):** من فقط فایل‌ها را می‌سازم و تحویل می‌دهم؛ **اجرای Container روی Docker همین سیستم با یونس/مالک است، نه من** — بعد از بازبینی ممد.
**شفافیت:** متن بازنویسی‌شده‌ی `NEXT_INSTRUCTION_FOR_MOJI.md` (نسخه‌ی Docker ممد) در لحظه‌ی اجرا روی Remote نبود (فایل هنوز نسخه‌ی honest-empty است) — اجرا بر اساس مشخصات پیام مستقیم مالک؛ لگ برای bookkeeping ثبت شد.

---

## ۱. چه چیزی ساخته شد (۴ فایل جدید، فقط `mlino2/app/`)

| فایل | نقش |
|---|---|
| `Dockerfile` | دو‌مرحله‌ای: `node:22-alpine` (build) → `nginx:1.27-alpine` (سرو) — گواهی self-signed در build-time با SAN |
| `nginx.conf` | HTTPS روی 8443، SPA fallback، Permissions-Policy (camera/gyroscope/accelerometer/magnetometer/geolocation)، کش assets، بستن `*.env/*.local` |
| `docker-compose.yml` | `up --build -d`؛ volume گواهی (پذیرش هشدار گوشی فقط یک بار)؛ ARG رجیستری |
| `.dockerignore` | **ممنوعیت کلید:** `.env*`، `*.local`، `scripts/` (اسکریپت‌های زنده+خروجی‌های دارای کلید) از build context خارج؛ `node_modules`/`dist` محلی هم |

## ۲. تصمیمات فنی و چرا

| تصمیم | چرا |
|---|---|
| **nginx:alpine به‌جای `vite preview`** | اپ کاملاً استاتیک است (بدون SSR/API)؛ nginx تصویر ~۵۰MB در برابر ~۱۸۰MB Node، رفتار production-نما (هدرها/کش/TLS)، و کنترل صریح `Permissions-Policy` — که برای دوربین/سنسورهای AR روی برخی مرورگرها لازم است. `preview` برای این نیاز هدر-کنترل ندارد. |
| **HTTPS داخل Container با self-signed در build-time** | دوربین/قطب‌نما/Geolocation فقط در Secure Context کار می‌کنند — HTTP ساده تست میدانی را بی‌فایده می‌کند. تولید گواهی در build (نه entrypoint) اجرا را آفلاین و تکرار‌پذیر می‌کند؛ `openssl req -addext SAN` شامل `DNS:localhost, IP:127.0.0.1, DNS:mlino2-dev.local`. |
| **پورت 8443** | HTTPS روی 443/8443 عادت درست است؛ 8443 برای عدم تداخل با سرویس‌های احتمالی میزبان. |
| **ARG `NPM_REGISTRY` با پیش‌فرض yarnpkg** | شبکه‌ی این ماشین registry.npmjs.org را فیلتر می‌کند (سابقه‌ی مستند)؛ `sed` فقط URLهای lockfile را عوض می‌کند — integrity hashes دست‌نخورده می‌مانند و npm همان‌ها را verify می‌کند. در محیط عادی: `--build-arg NPM_REGISTRY=https://registry.npmjs.org`. |
| **Volume گواهی** | بین rebuildها ثابت می‌ماند → هشدار گواهی روی گوشی فقط بار اول پذیرفته می‌شود. |
| **هیچ کلید API در Container** | سه لایه: (۱) `.dockerignore` (۲) در Container، intent فقط قاعده‌محور است — `import.meta.env` در build بدون `V2_*` خالی است (envPrefix فقط وقتی env واقعا ست باشد) (۳) nginx `*.env/*.local` را سرو نمی‌کند. اتصال زنده‌ی LLM در Container فعلاً **عمداً نیست** — کلید در باندل مرورگر عمومی نمی‌شود (یافته‌ی L-2 ممد؛ با Backend آینده حل می‌شود). |

## ۳. راهنمای تست میدانی (برای یونس/مالک — بعد از تایید ممد)

```powershell
cd mlino2\app
docker compose up --build -d
ipconfig   # IPv4 میزبان در LAN، مثلاً 192.168.1.15
```
گوشی (همان Wi-Fi): `https://192.168.1.15:8443`

**پذیرش گواهی روی گوشی:**
1. اولین باز شدن → هشدار «اتصال خصوصی نیست» (طبیعی — گواهی self-signed است).
2. اندروید/Chrome: «Advanced/پیشرفته» → «Proceed to… (ناامن)/ادامه» → یک بار برای همیشه در آن مرورگر.
3. iOS/Safari: «Show Details» → «visit this website» → «Visit Website» تایید.
4. اگر پذیرش نگه نداشت (بعضی مرورگرها): گواهی را دانلود و در تنظیمات «Certificate Trust» نصب کنید — به‌دلیل volume، تا اعتبار ۳۶۵ روزه همین گواهی معتبر است.
5. سپس: تب «ویترین AR» → «شروع ویترین AR» → مجوز دوربین/Motion → چک‌لیست V2-4 (بج قطب‌نما absolute/دستی، چرخش، طبقه‌ی صریح پاساژ).

**توقف Container:** `docker compose down` (volume گواهی باقی می‌ماند).

## ۴. راستی‌آزمایی انجام‌شده (بدون Docker — Docker روی این میزبان نصب نیست، اجرا با یونس)

| بررسی | نتیجه |
|---|---|
| `npm test` روی میزبان | ✅ ۷۹/۷۹ |
| `npm run build` روی میزبان | ✅ موفق (همان فرمان مرحله‌ی build) |
| بازسازی فرمان openssl دقیق Dockerfile (openssl واقعی) | ✅ گواهی+کلید با SAN درست ساخته شد (subject/dates/alt-names تایید) |
| `git check-ignore` فایل‌های حساس | ✅ `.env.local` و `scripts/local/*` هر دو ignored — هیچ Secret ای وارد Commit/context نمی‌شود |
| review دستی `.dockerignore` | ✅ یک باگ خودی در آن (exclude اشتباه nginx.conf/src) **قبل از تحویل کشف و اصلاح شد** — نسخه‌ی نهایی context را سالم نگه می‌دارد |
| docker build/up | ⏳ **اجرای واقعی با یونس** (Docker روی این میزبان نیست) — طبق تقسیم کار دستور |

## ۵. ریسک‌های باقی‌مانده — صریح

1. **build واقعی Docker اجرا نشده** (میزبان Docker ندارد) — محتمل‌ترین شکست: نسخه‌ی tagها (`node:22-alpine`، `nginx:1.27-alpine`) یا pull رجیستری Docker در شبکه‌ی فیلترشده؛ در آن صورت mirror/پروکسی Docker لازم است — تصمیم با یونس.
2. `http2 on;` نیاز به nginx ≥1.25.1 دارد (۱.۲۷ ✅).
3. هشدار self-signed روی هر مرورگر جدید گوشی تکرار می‌شود (تا نصب دستی گواهی) — طبیعی تست داخلی.
4. `Permissions-Policy` روی سافاری iOS کاملاً enforce نمی‌شود — سافاری خودش prompt جداگانه‌ی Motion دارد (قبلاً هندل شده).

## ۶. قرارداد `02` / قانون طلایی / قواعد

- فقط ۴ فایل داخل `mlino2/app/` + این گزارش — V1 و قرارداد `02` صفر تغییر؛ هیچ کلیدی در ریپو/image.

## ۷. متوقف شدم

→ بازبینی مستقل ممد → سپس یونس Container را بالا می‌آورد و تست میدانی با مالک انجام می‌شود (V2-4 بالاخره اجرا می‌شود؛ من نتیجه‌اش را در پاس بعدی ثبت می‌کنم).
