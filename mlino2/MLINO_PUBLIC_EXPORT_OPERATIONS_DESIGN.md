# طرح عملیاتی تحویل خروجی عمومی امضاشدهٔ MLINO

**وضعیت: DRAFT — گزینه‌های O1 تا O5 پیشنهادند؛ هیچ‌کدام در این سند تصویب یا اجرا نشده‌اند.**

**دامنه:** رساندن artifact عمومیِ تولیدکنندهٔ V1 به مصرف‌کنندهٔ مرورگری V2 پس از تصویب مالک. این سند قرارداد `mlino.v2.public-business.v1`، تصمیم‌های Q1–Q10 و C8-1 تا C8-5 را تغییر نمی‌دهد. کلید واقعی، مسیر میزبان و زمان‌بندی در این مرحله ایجاد نمی‌شوند. [مرجع تصمیم‌های موجود: `origin/main:mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md:8-20`؛ `0bd14bb:mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md:102-106`؛ `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_1_OPERATIONS_DESIGN.md:9-15`]

## ۱. وضعیت تأییدشدهٔ کد و مرز طرح

- V1 فرمان `public-export` را به `dist/public-export/cli.js` وصل کرده است. CLI، `MLINO_EXPORT_OUTPUT_DIR`، `MLINO_EXPORT_KEY_ID` و adapter بیرونیِ `MLINO_EXPORT_KEY_PROVIDER_MODULE` را می‌خواند؛ مسیر adapter باید مطلق و بیرون مخزن باشد. کلید خصوصی از `SigningKeyProvider.privateKey(keyId)` به‌شکل `KeyObject` گرفته می‌شود و نوع آن Ed25519 کنترل می‌شود. [مرجع: `origin/main:implementation/package.json:12-17`؛ `origin/main:implementation/public-export/cli.ts:28-34,80-89`؛ `origin/main:implementation/public-export/signing.ts:5-11,24-34`]
- CLI خروجی را بیرون مخزن می‌خواهد، پوشه را هنگام ایجاد با `0o700` می‌سازد، قفل انحصاری `wx` می‌گیرد، فایل موقت را با `0o600` می‌نویسد و sync می‌کند، امضا را دوباره می‌سنجد و سپس با rename جایگزین می‌کند. نسخه‌های `previous-1` و `previous-2` پس از انتشارِ current به‌روزرسانی می‌شوند. در خطای سطح بالا فقط `PUBLIC_EXPORT_FAILED` چاپ می‌شود؛ مسیر موفقیت در حال حاضر کد، `snapshot_id`، `key_id` و شمار رکورد را هم log می‌کند. **مقادیر mode در فراخوانیِ ایجاد، ACL یک فایل/دایرکتوری از پیش موجود را به‌تنهایی اثبات نمی‌کنند.** [مرجع: `origin/main:implementation/public-export/cli.ts:21-25,33-76,94-96`]
- سازنده، داده را در تراکنش read-only با `RepeatableRead` می‌خواند و `generated_at` را از `asOf` می‌سازد. پروفایل با claim نامعتبر یا معلق، و قابلیت/پیشنهاد فاقد شرایط از خروجی کنار می‌روند؛ `stale` در artifact همیشه `false` است و معیار تازگی cache نیست. [مرجع: `origin/main:implementation/public-export/builder.ts:148-160,174-216,221-224`؛ `0bd14bb:mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md:35-39`]
- V2 آدرس `VITE_PUBLIC_EXPORT_URL` و bundle کلید عمومی `VITE_PUBLIC_EXPORT_TRUST_BUNDLE` را از پیکربندی build می‌خواند. دریافت مرورگر با `cache: 'no-store'` انجام می‌شود، فاصلهٔ polling در کد ۶۰ ثانیه و TTL بر پایهٔ `generated_at`، ۳۰۰ ثانیه با ۳۰ ثانیه انحراف ساعت دستگاه است. دادهٔ نامعتبر به Mock برنمی‌گردد و پس از TTL، UI پیام «اطلاعات واقعی فعلاً در دسترس نیست» می‌دهد. [مرجع: `540ad2d:mlino2/app/src/publicExport/RealPublicApp.tsx:8-16,23-35,47-51`؛ `540ad2d:mlino2/app/src/publicExport/transport.ts:6-17`؛ `540ad2d:mlino2/app/src/publicExport/consumer.ts:7-9,43-61`]
- استقرار محلیِ مستند V1 در Compose فعلی فقط `db`، `v1-migrate` و `v1-read-api` را تعریف می‌کند؛ export runner یا مسیر وب برای artifact در آن تعریف نشده است. استقرار میدانی V2 وب‌سرور Nginx روی HTTPS پورت 8443 دارد، فقط volume گواهی را mount می‌کند و مسیر `/` را برای SPA به `index.html` برمی‌گرداند؛ هنوز route اختصاصی artifact ندارد. این‌ها **وضعیت فایل‌های پیکربندی‌اند، نه ادعای وضعیت فعلیِ پردازه‌های میزبان**. [مرجع: `origin/main:implementation/docker-compose.yml:17-18,42-55,55-75`؛ `540ad2d:mlino2/app/docker-compose.yml:6-23`؛ `540ad2d:mlino2/app/nginx.conf:6-15,24-25`؛ `origin/main:mlino2/validation/g8/README.md:1-15`]
- ساخت V2، bundle استاتیک را با `npm run build` به فایل‌های سرو‌شده در Nginx تبدیل می‌کند؛ envهای `VITE_` در کد با `import.meta.env` خوانده می‌شوند. در Dockerfile/Compose فعلی آرگومان یا route اختصاصی public export وجود ندارد؛ اتصال عملیاتی مستلزم تغییر جداگانهٔ پیکربندی و آزمون است. [مرجع: `540ad2d:mlino2/app/Dockerfile:17-18,35-38,41-53`؛ `540ad2d:mlino2/app/vite.config.ts:13-15`؛ `540ad2d:mlino2/app/src/publicExport/RealPublicApp.tsx:8-12`؛ `540ad2d:mlino2/app/docker-compose.yml:6-23`]

## ۲. O1 — کلید واقعی و مرز دسترسی

**روش پیشنهادی:** اپراتور مجاز، جفت Ed25519 را با ابزار تحت کنترل سازمان در یک نشست امن تولید و کلید خصوصی را مستقیماً در secret store سیستم‌عامل/سرویس مدیریت کلیدِ مورد تأیید وارد کند؛ این سند هیچ فرمان تولیدی یا کلیدی ارائه نمی‌کند. حساب اختصاصی producer تنها هویتِ مجاز برای خواندن کلید خصوصی باشد. adapter موجود، از مسیر مطلق بیرون مخزن بار شود و برای `key_id` تعیین‌شده یک `KeyObject` امضاکننده و کلید عمومی متناظر برگرداند. امکان سازگاری secret store منتخب با قرارداد `KeyObject` باید پیش از انتخاب نهایی آزموده شود؛ در حال حاضر adapter عملیاتیِ مشخصی در این سند تأیید نشده است. [مرجع قرارداد adapter: `origin/main:implementation/public-export/cli.ts:80-89`؛ `origin/main:implementation/public-export/signing.ts:5-11,24-34`]

قاعدهٔ پیشنهادی `key_id`: `pb-v1-YYYYMMDD-<16 hex نخست SHA-256 کلید عمومی خام>`، یکتا و تغییرناپذیر برای هر جفت‌کلید. بخش تاریخ، تاریخ تولیدِ ثبت‌شده توسط اپراتور است؛ fingerprint فقط از کلید **عمومی** مشتق می‌شود. رکورد کنترل‌شدهٔ استقرار باید `key_id`، fingerprint کامل، زمان فعال‌سازی، مالک و وضعیت لغو را نگه دارد؛ هیچ‌یک حامل کلید خصوصی نیست. کلید عمومی خام ۳۲‌بایتی به‌صورت base64url در `keys[{keyId,rawPublicKeyBase64Url}]`، همراه `version` و `revokedIds` به build V2 می‌رود؛ کلید خصوصی، seed، passphrase و مسیر secret store به build، artifact، repo یا log نمی‌روند. [مرجع شکل bundle و بررسی اندازهٔ کلید: `540ad2d:mlino2/app/src/publicExport/trustBundle.ts:3-19,29-47`؛ مرجع امضای `key_id`: `origin/main:implementation/public-export/signing.ts:19-34`]

| گزینه | پیامد |
|---|---|
| A. Secret store و adapter محدود به حساب producer | کنترل دسترسی/چرخش قابل ممیزی؛ پیاده‌سازی adapter و سازگاری Ed25519/Node باید آزموده شود. **توصیه**، سازگار با Q2. |
| B. سرویس امضای مدیریت‌شده/HSM | حفاظت کلید قوی‌تر؛ adapter فعلی `KeyObject` می‌خواهد و امضای remote مستقیماً جایگزین آن نیست؛ تغییر قرارداد و تصویب جدا می‌خواهد. |
| C. فایل خصوصی بیرون مخزن با ACL سخت | راه‌اندازی ساده‌تر؛ نگه‌داری، backup و نشت فایل ریسک بیشتری دارد؛ برای بهره‌برداری توصیه نمی‌شود. |

## ۳. O2 — مسیر انتشار خواندنی روی میزبان

**جریان پیشنهادی پس از تصویب:** `MLINO_EXPORT_OUTPUT_DIR/public-business.v1.json` در فضای خصوصی producer → بررسی موفقیت CLI و امضای همان فایل → مرحلهٔ توزیع با کمترین اختیار، کپی اتمیک **فقط artifact جاری** به دایرکتوری عمومیِ جدا روی میزبان استقرار → mount فقط‌خواندنی آن دایرکتوری در وب‌سرور V2 → route دقیق `/public-export/public-business.v1.json` → URL هم‌مبدأ HTTPS در `VITE_PUBLIC_EXPORT_URL` → `FetchTransport` و بررسی امضا در مرورگر. نام route و دایرکتوری عمومی **پیشنهاد** است، نه مسیر پیکربندی‌شدهٔ فعلی. فایل‌های `previous-1/-2`، فایل قفل، فایل موقت و کلید خصوصی هرگز در docroot یا mount عمومی قرار نگیرند. فایل مقصد باید با نوشتن موقت و rename اتمیک جایگزین شود؛ کپی ناقص نباید سرو شود. [مرجع نام فایل، قفل و rename در V1: `origin/main:implementation/public-export/cli.ts:35-47,63-70`؛ مرجع transport: `540ad2d:mlino2/app/src/publicExport/transport.ts:6-27`]

**هم‌مبدأ، توصیهٔ O2-A:** مرورگر artifact را از همان مبدأ HTTPS صفحهٔ V2 می‌گیرد؛ CORS لازم نیست. route باید فقط فایل مشخص را با `Content-Type: application/json; charset=utf-8`، `Cache-Control: no-store, max-age=0`، `X-Content-Type-Options: nosniff` و خطای واقعی 404/503 در نبود فایل سرو کند؛ هرگز به fallback `index.html` نرود. `fetch(..., {cache:'no-store'})` در مصرف‌کننده هست، ولی proxy/CDN و سرور نیز باید cache کردن artifact را منع کنند. برای فایل HTML و trust bundleِ همراه build، سیاست cache و الزام بارگذاری نسخهٔ تازه در O4 تعیین می‌شود؛ قانون `immutable` فعلی فقط برای `/assets/` است. [مرجع درخواست و کنترل اندازه: `540ad2d:mlino2/app/src/publicExport/transport.ts:11-27`؛ مرجع fallback/هدرهای فعلی: `540ad2d:mlino2/app/nginx.conf:18-39`]

**مبدأ جدا، O2-B:** فقط اگر هم‌مکانی عملی نباشد، HTTPS و CORS با `Access-Control-Allow-Origin` محدود به مبدأ دقیق V2، `Vary: Origin`، بدون wildcard و بدون credential، به‌علاوهٔ همان هدرهای عدم cache. سربار پیکربندی و ریسک خطای CORS/TLS بیشتر است؛ امضا جای TLS یا کنترل میزبان را نمی‌گیرد. [مرجع مدل تهدید تأییدشده: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C1_V2_CONSUMER_DESIGN.md:35-39`]

برای آزمایش محلی، V1 امروز طبق Compose مستند، DB/API دارد و V2 وب‌سرور HTTPS میدانی دارد؛ هیچ فایل استقراری در repo، producer را به route وب وصل نمی‌کند. اینکه producer روی Windows میزبان اجرا شود یا در محیط دیگری، مسیر واقعی، حساب‌ها، ACL و mount دقیق با بازبینی میزبان انتخاب خواهند شد. این سند وجود یک mount، DNS یا گواهی عملیاتی را فرض نمی‌کند. [مرجع: `origin/main:implementation/docker-compose.yml:17-75`؛ `540ad2d:mlino2/app/docker-compose.yml:6-23`؛ `540ad2d:mlino2/app/nginx.conf:6-15,24-25`]

## ۴. O3 — زمان‌بندی، قفل و خطا

مصرف‌کنندهٔ V2 هر ۶۰ ثانیه polling می‌کند و پس از ۳۰۰ ثانیه از `generated_at` خروجی را پنهان می‌کند. CLI هنگام نبود `MLINO_EXPORT_AS_OF` از زمان اجرای خود استفاده می‌کند و سازنده همان زمان را به `generated_at` تبدیل می‌کند. بنابراین **توصیه** این است که runner هر حدود ۶۰ ثانیه CLI را یک‌بار، با حساب producer و محیط کنترل‌شده، اجرا کند؛ نباید زمان ثابتِ قدیمی به `MLINO_EXPORT_AS_OF` بدهد. این ریتم، هدف است و بدون پایشِ زمان انتشار/دریافت تضمین تأخیر نیست. [مرجع: `540ad2d:mlino2/app/src/publicExport/consumer.ts:7-9,43-61`؛ `origin/main:implementation/public-export/cli.ts:28-32`؛ `origin/main:implementation/public-export/builder.ts:221-224`]

| گزینهٔ runner | پیامد |
|---|---|
| A. Windows Scheduled Task روی میزبان محلی یا scheduler بومی میزبان استقرار، هر ۶۰ ثانیه | process کوتاه‌عمر و نظارت ساده؛ مشخصات حساب و مجوزها باید با میزبان تطبیق یابد. **توصیه برای استقرار محلیِ Windows،** در امتداد Q3. |
| B. سرویس Compose اختصاصیِ export | برای استقرار کانتینری مناسب؛ نیازمند تصویر، دسترسی محدود به DB/secret store و مسیر خروجی، healthcheck و طراحی restart. Compose فعلی این سرویس را ندارد. [مرجع وضعیت فعلی: `origin/main:implementation/docker-compose.yml:17-75`] |
| C. حلقهٔ دائمیِ sleep | کمترین وابستگی ظاهری، اما مدیریت crash، drift و هم‌پوشانی دشوارتر؛ توصیه نمی‌شود. |

فایل قفل `.public-business.lock` با `wx` هم‌پوشانی دو اجرا را رد می‌کند. خطا یا crash قبل از پاک‌سازی `finally` ممکن است قفل یتیم بگذارد؛ runner نباید خودکار قفل را حذف یا بی‌درنگ دوباره اجرا کند. runbook آینده باید بعد از اثبات نبود پردازهٔ فعال، سن و مالک قفل و سلامت current را بررسی و سپس رفع قفل را با ثبت رویداد انجام دهد. در شکست تولید، current معتبر پیشین می‌تواند تا TTL نمایش داده شود و بعد V2 پیام «در دسترس نیست» نشان می‌دهد؛ جایگزین‌کردن خروجیِ تازه با artifact قدیمیِ `previous-*` بدون بررسی زمان ممنوع است. [مرجع قفل/پاک‌سازی: `origin/main:implementation/public-export/cli.ts:35-36,74-76,94-96`؛ مرجع حفظ cache و UI: `540ad2d:mlino2/app/src/publicExport/consumer.ts:59-69`؛ `540ad2d:mlino2/app/src/publicExport/RealPublicApp.tsx:47-51`]

پایش پیشنهادی: زمان آخرین انتشار معتبر، فاصلهٔ آن از اکنون، موفقیت/شکست runner، قفل مانده، زمان کپی و HTTP status مسیر عمومی؛ هشدار پیش از TTL (مثلاً پس از دو چرخهٔ ناموفق) و هشدار سخت در انقضای پنج‌دقیقه‌ای. log پایدار runner فقط timestamp، وضعیت boolean و **کدهای ثابت** داشته باشد؛ payload، تماس، شناسهٔ کسب‌وکار/رویداد، `snapshot_id`، `key_id`، امضا، URL اتصال و کلید ممنوع‌اند. CLI فعلی در مسیر موفق `snapshot_id`/`key_id`/شمار رکورد و برای issue شناسهٔ سازمان/انتشار می‌فرستد؛ بنابراین wrapper آینده باید stdout آن را در حافظه به کد/boolean تقلیل دهد یا تغییر لاگ CLI با مجوز مستقل درخواست کند، نه اینکه stdout خام را بایگانی کند. [مرجع لاگ فعلی: `origin/main:implementation/public-export/cli.ts:37-39,71-72,94-96`؛ ساخت Issue: `origin/main:implementation/public-export/builder.ts:31,149-153`]

## ۵. O4 — لغو، چرخش و پنجرهٔ خطر

bundle کلید عمومی در build V2 قرار می‌گیرد و `RealPublicApp` آن را هنگام ساخت consumer می‌خواند؛ مصرف‌کننده در هر read لغو key_id موجود در **همان bundle بارشده** را می‌سنجد. پس لغو اضطراری در وضعیت فعلی تنها با build/redeploy V2 و دریافت نسخهٔ تازه توسط مرورگر اثر می‌کند؛ تبِ از پیش بازشده با bundle قدیمی می‌تواند تا reload همچنان کلید قدیم را بپذیرد. TTL پنج‌دقیقه‌ای بر ساعت دستگاه است و مانع امنیتیِ قطعی برای کلید افشاشده نیست. بنابراین بدون مکانیزم و آزمون الزام‌آور برای تازه‌شدن کلاینت‌ها، «لغو فوری» یا سقف زمانیِ قطعی قابل ادعا نیست. [مرجع: `540ad2d:mlino2/app/src/publicExport/RealPublicApp.tsx:8-17`؛ `540ad2d:mlino2/app/src/publicExport/trustBundle.ts:11-25,29-47`؛ `540ad2d:mlino2/app/src/publicExport/consumer.ts:59-69`؛ `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C1_V2_CONSUMER_DESIGN.md:35-39`]

**رویهٔ پیشنهادی افشا/گم‌شدن کلید:** (۱) مسئول امنیت رویداد و `key_id` را ثبت و اختیار امضای کلید قدیم را در secret store معلق کند؛ (۲) مدیر انتشار تولید با آن کلید را متوقف کند؛ (۳) مسئول V2 نسخهٔ جدیدی بسازد که آن `key_id` در `revokedIds` است یا اصلاً در allowlist نیست و با نسخهٔ تازه در HTML/no-store منتشر کند؛ (۴) تا وقتی کلاینت‌های قبلی به‌طور قابل‌اندازه‌گیری bundle تازه نگرفته‌اند، مسیر artifact را محدود/خاموش نگه دارد و وضعیت عمومی را unavailable بداند؛ (۵) پس از تأیید کلید عمومی جایگزین در V2، تولید با کلید تازه از سر گرفته شود؛ (۶) تست امضای قدیم، cache قدیم، تب باز قدیمی و دستگاه با ساعت عقب‌رفته را در drill ثبت کند. خاموش‌کردن URL به‌تنهایی cache پیشینِ هنوز معتبر را فوراً پاک نمی‌کند. این گام‌ها **طرح** هستند، نه عملیاتی انجام‌شده. [مرجع رفتار cache و کلید: `540ad2d:mlino2/app/src/publicExport/consumer.ts:43-69`؛ مرجع خطای دریافت: `540ad2d:mlino2/app/src/publicExport/RealPublicApp.tsx:23-35,47-51`]

برای چرخش عادی، یک کلید عمومی standby از پیش در bundle V2 می‌تواند زمان جابه‌جایی را کم کند: V2 با public key جدید منتشر و دریافتش تأیید شود، سپس producer با `key_id` تازه امضا کند؛ پس از پایان عمر artifactهای قبلی، کلید قدیم از allowlist برداشته و نسخهٔ V2 تازه منتشر شود. فقط **یک** standby کنترل‌شده پیشنهاد می‌شود؛ خصوصیِ standby نیز در secret store محدود بماند. [مرجع طراحی پیشین: `0bd14bb:mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md:23-29`؛ `origin/main:mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md:157-165`]

| گزینه | پیامد |
|---|---|
| A. Build/redeploy با `revokedIds` و راهِ الزام‌آورِ reload/نسخه‌سنجی کلاینت | در چارچوب C8-3 می‌ماند؛ راه reload، cache HTML و SLA لغو باید جداگانه پیاده و آزموده شوند. **توصیه، مشروط به اثبات سقف زمانی پیش از بهره‌برداری.** |
| B. فقط build/redeploy دستی، بدون کنترل تب‌های باز | ساده‌تر، اما زمان پایان اعتماد تب‌های قدیمی نامحدود است؛ برای ادعای لغو فوری قابل قبول نیست. |
| C. trust bundle قابل‌به‌روزرسانی مستقل در runtime | واکنش سریع‌تر، اما تصمیم C8-3 و زنجیرهٔ اعتماد فعلی را تغییر می‌دهد؛ CCR/تصویب معماری جدا لازم دارد. |

**drill پیشنهادی:** با کلیدهای آزمایشی، کلید standby را از پیش منتشر کنید؛ یک artifact را با کلید اول و سپس دوم تولید کنید؛ لغو اول را در build اعمال کنید؛ صفحهٔ تازه و تب باز قدیمی را جداگانه بسنجید؛ زمان تا توقف پذیرش در هر دو را اندازه بگیرید؛ بازگشت نسخهٔ V2 و بازگشت key_id را فقط با سناریوی مصوب تمرین کنید. هیچ کلید واقعی یا دستور اجرای drill در این مرحله تولید نشده است.

## ۶. O5 — دسترسی فایل بدون دسترسی به کلید خصوصی

وب‌سرور V2 باید artifact جاری را بخواند، اما نیازی به خواندن کلید خصوصی، adapter، فایل قفل، موقت یا دو نسخهٔ پیشین ندارد. CLI فایل موقت را با `0o600` و پوشه را با `0o700` هنگام ایجاد می‌سازد؛ نسخه‌های پیشین با `mode: 0o600` نوشته می‌شوند. خود وب‌سرور فعلی فقط `dist` را در تصویر دارد و Compose فعلی هیچ mount خروجی export ندارد. [مرجع: `origin/main:implementation/public-export/cli.ts:33-47,67-70`؛ `540ad2d:mlino2/app/Dockerfile:41-53`؛ `540ad2d:mlino2/app/docker-compose.yml:18-23`]

| گزینه | پیامد |
|---|---|
| A. اجرای وب‌سرور با همان هویت producer | دسترسی مستقیم به فایل با mode فعلی؛ جدایی امتیاز از بین می‌رود و وب ممکن است به مسیرهای producer/secret store هم دست یابد. توصیه نمی‌شود. |
| B. مرحلهٔ انتشار فقط artifact جاری به دایرکتوری وبِ جدا، با حساب/ACL محدود و mount فقط‌خواندنی در وب‌سرور | producer output و کلید خصوصی جدا می‌مانند؛ نیازمند طراحی copy اتمیک، ACL و آزمون host است. **توصیه.** |
| C. ACL خواندن مستقیم روی پوشهٔ خصوصی و current برای وب‌سرور | کپی کمتر؛ traverse/read روی مسیر 0700/0600، inheritance و rename باید با سیستم‌عامل واقعی آزموده شوند؛ احتمال نمایش اشتباه فایل‌های قبلی/موقت بیشتر است. |

در B، فرایند توزیع باید فقط به currentِ امضاشده دسترسی خواندن داشته باشد و به key provider دسترسی نداشته باشد. اگر روی میزبان واقعی جداسازی این دو اختیار با ACL ممکن نباشد، producer می‌تواند با یک hook/runner مجاز بعد از موفقیت CLI، فقط فایل عمومی را به staging جدا منتقل کند؛ وب‌سرور فقط staging را read-only می‌بیند. در هر دو حالت، **ACL کلید خصوصی و secret store به وب‌سرور منتقل نمی‌شود.** وضعیت مالکیت و ACL فایل‌های از قبل موجود، فایل پس از rename و مسیر bind mount باید در M2-3 اندازه‌گیری شود؛ فراخوانی `mode` به‌تنهایی ضمانت عملی نیست. [مرجع ایجاد/rename: `origin/main:implementation/public-export/cli.ts:33-47,67-70`؛ مرجع شرط adapter خارج مخزن: `origin/main:implementation/public-export/cli.ts:80-86`]

## ۷. تهدیدها، محدودیت‌ها و پایش

| تهدید/محدودیت | نسبت با O1–O5 | کنترل پیشنهادی و حد آن |
|---|---|---|
| نشت کلید خصوصی | O1، O5 | secret store و حساب producer؛ public key در V2. اگر producer یا secret store آلوده شود، امضای معتبرِ جعلی ممکن است. [مرجع قرارداد key provider: `origin/main:implementation/public-export/signing.ts:5-11,24-34`] |
| فایل ناقص یا دست‌کاری‌شده در مسیر | O2، O5 | rename اتمیک در هر دو مرحله و verify در V2؛ امضا یکپارچگی artifact را می‌سنجد، نه محرمانگی یا دسترسی میزبان. [مرجع: `origin/main:implementation/public-export/cli.ts:45-70`؛ `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C2_V2_CONSUMER_IMPLEMENTATION.md:22-25`] |
| producer متوقف، قفل یتیم یا خروجی کهنه | O3 | monitor تولید/توزیع، بررسی قفل، alarm پیش از TTL و حالت unavailable پس از آن؛ `stale=false` امضاشدهٔ V1 معیار freshness نیست. [مرجع: `origin/main:implementation/public-export/cli.ts:35-36,74-76`؛ `origin/main:implementation/public-export/builder.ts:214-216`؛ `540ad2d:mlino2/app/src/publicExport/consumer.ts:59-69`] |
| لغو کلید با تب قدیمی | O4 | rebuild/redeploy و سازوکار اجباری/قابل‌آزمون دریافت نسخهٔ تازه؛ بدون آن SLA لغو نداریم. [مرجع: `540ad2d:mlino2/app/src/publicExport/RealPublicApp.tsx:8-17`؛ `540ad2d:mlino2/app/src/publicExport/trustBundle.ts:19-25`] |
| ساعت دستگاه دست‌کاری‌شده (N1 مصرف‌کننده) | O3، O4 | TTL مرورگر فقط محافظ UX/درستی است؛ چرخهٔ producer و کنترل تحویل لازم‌اند و باز هم امنیت در برابر ساعت دست‌کاری‌شده تضمین نمی‌شود. [مرجع: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C1_V2_CONSUMER_DESIGN.md:35-38`؛ `540ad2d:mlino2/app/src/publicExport/consumer.ts:43-61`] |
| منشأ V2 آلوده (N2 مصرف‌کننده) | O2، O4 | امضا artifact را محافظت می‌کند، نه JS/HTML یا public bundle آلوده را؛ کنترل استقرار، نسخه و مبدأ لازم است. [مرجع: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C1_V2_CONSUMER_DESIGN.md:35-39`] |
| محدودیت‌های producer | O3، O5 | پروفایل بدون claim معتبر حذف می‌شود؛ `stale` همیشه false است؛ ساخت فعلی همهٔ ردیف‌ها را یک‌جا می‌خواند؛ دو نسخهٔ پیشین پس از rename چرخش می‌کنند. این‌ها باید در پایش/ظرفیت‌سنجی دیده شوند، بدون تغییر قرارداد این مرحله. [مرجع: `origin/main:implementation/public-export/builder.ts:155-164,174-180,214-216`؛ `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_G14B2_EXPORT_IMPLEMENTATION.md:40-45`] |

## ۸. تصمیم‌های باز برای مالک — هیچ‌کدام در این سند تصویب نشده‌اند

1. **O1 — محل و شکل کلید:** آیا secret store با adapter سازگار با `KeyObject` و شناسهٔ نسخه‌دار پیشنهادی پذیرفته می‌شود؟ **توصیه: گزینهٔ A.** انتخاب محصول/سیستم‌عامل secret store، حساب producer، دورهٔ چرخش و روش backup/restore کلید نیز در بستهٔ اجرایی با مالک است.
2. **O2 — مسیر تحویل:** آیا یک route هم‌مبدأ HTTPS از دایرکتوری عمومیِ جدا و read-only روی میزبان V2 پذیرفته می‌شود؟ **توصیه: گزینهٔ A**؛ نام واقعی مسیر، CORS در صورت استقرار دومبدأیی، و هدرها پس از دیدن میزبان تثبیت شوند.
3. **O3 — runner و پایش:** آیا scheduler بومی هر حدود ۶۰ ثانیه با حساب محدود، قفل CLI، هشدار پیش از TTL و log فقط code/boolean پذیرفته می‌شود؟ **توصیه: گزینهٔ A.** در استقرار غیرWindows، معادل بومی میزبان نیازمند تصویب مشخص است.
4. **O4 — لغو و چرخش:** آیا نسخهٔ V2 با `revokedIds`، یک کلید standby و سازوکار اثبات‌شدهٔ دریافت نسخهٔ تازه توسط تب‌های باز لازم است؟ **توصیه: گزینهٔ A، مشروط.** مالک باید سقف زمانی قابل‌اندازه‌گیریِ لغو را تعیین کند؛ تا راه refresh/reload اثبات نشود، بهره‌برداری واقعی شروع نشود.
5. **O5 — دسترسی به artifact:** آیا staging جدا برای فقط current، انتشار اتمیک و mount فقط‌خواندنی به وب‌سرور پذیرفته می‌شود؟ **توصیه: گزینهٔ B.** هویت‌ها/ACL واقعی باید بدون گسترش مجوز کلید خصوصی آزموده شوند.

## ۹. تقسیم اجرای بعدی — هر بخش نیازمند مجوز جدا

- **M2-2، هویت و adapter کلید:** انتخاب secret store، حساب producer، تولید/ثبت کلید با اپراتور، adapter و آزمون Ed25519/کلید عمومی. مجوز مستقل پیش از دسترسی به هر کلید واقعی.
- **M2-3، مسیر میزبان و وب:** ACL و staging، route دقیق HTTPS، build config عمومی V2، عدم cache/CORS در صورت نیاز، و آزمون فایل امضاشده از دید مرورگر. مجوز مستقل برای هر تغییر host/Compose/Nginx.
- **M2-4، scheduler و drill:** زمان‌بندی، پایش بدون داده، سنجش تأخیر، شکست producer، قفل یتیم، چرخش عادی و لغو اضطراری با تب باز. مجوز مستقل پیش از فعال‌سازی و پیش از استفاده از کلید واقعی.

معیار پذیرش پیشنهادیِ نهایی: فقط پس از تصویب O1–O5، صحت ACL و دسترسی مرورگر، fail-closed شدن هنگام شکست/انقضا، عدم نشت محتوا در log، سازگاری امضا، و زمان اندازه‌گیری‌شدهٔ لغو کلید در تب‌های باز. این‌ها در این مرحله اجرا نشده‌اند.

## ۱۰. خارج از دامنه

این سند کلید واقعی نمی‌سازد یا نمی‌خواند؛ secret/`.env` باز نمی‌کند؛ adapter، code، schema، migration، Compose/Nginx، قرارداد FINAL یا شاخهٔ V2 را تغییر نمی‌دهد؛ artifact تولید یا منتشر نمی‌کند؛ scheduler، Docker، DB، Push یا سرویس عمومی را راه نمی‌اندازد. تصمیم‌های O1–O5 و اجرای M2-2 تا M2-4 فقط پس از بازبینی Guardian و تصویب مالک ممکن‌اند.

من کدکس هستم
