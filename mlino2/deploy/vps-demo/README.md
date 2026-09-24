# vps-demo

- `entry/`: صفحه‌ی انتخاب نقش (app.mlino.site).
- `Caddyfile.mlino-sites`: بلوک‌های سه نشانی.
- `ops/`: هسته‌ی نمایشی روی سرور (کلید نمایشی، seed، تازه‌سازی هر دقیقه).
- پنل کسب‌وکار (business.mlino.site) از `business-web/` روی شاخه‌ی `guardian/accounting-a1` ساخته می‌شود؛ صفحه‌ی ایستای قبلی جایش را داد.
- `ops/mlino-api-setup.sh`: سرویس `mlino-api` (ورود عضو با کد یک‌بارمصرف — D-74، و ماژول گفتگو — D-73). راه‌اندازی یک‌باره و بی‌تکرار؛ رازها همان‌جا در `/etc/mlino/api.env` (0600) ساخته می‌شوند و هرگز چاپ نمی‌شوند. نقش پایگاه‌داده‌ی `mlino_api` کم‌اختیار است: مالک طرح `core_identity` و پایگاه جدای `mlino_chat`، و فقط خواندن جدول‌های عضویت هسته. کد: `/opt/mlino/api/mlino-api.cjs` (بسته‌ی esbuild از `implementation/http/api/main.ts` روی `guardian/accounting-a1`). Caddy مسیر `/api/*` را روی explore و business به `127.0.0.1:8741` می‌دهد.
- عضو آزمایشی کسب‌وکارهای نمایشی: `node mlino-api.cjs seed-demo-members 09000000090` با `CORE_DATABASE_URL` مدیر؛ فقط سازمان‌های `test-demo-*` و فقط شماره‌ی آزمایشی.
- ساخت V2 با `VITE_CHAT=1` (در کنار `VITE_ASSISTANT_REMOTE=0`).
- `ops/mlino-api-setup-2.sh`: گام دوم API (D-75 تا D-78) — نشانی Prisma با همان نقش کم‌اختیار، پایگاه جدای `mlino_notify`، کلیدهای VAPID که روی خود سرور ساخته می‌شوند، مسیر فایل منوی منتشرشده، و اختیارهای لازم برای نوشتن آفر و انتشار؛ سرویس از build خود Core اجرا می‌شود (`/opt/mlino/core/dist/http/api/main.js`).
- `ops/core-deploy.sh`: استقرار build هسته با پشتیبان کامل پیش از آن، `npm ci`، `prisma migrate deploy` و `prisma generate`؛ خروجی و API در حین جابه‌جایی متوقف‌اند.
- پیامک ورود (D-82): در `/etc/mlino/api.env` (۶۰۰ root): `SMSIR_API_KEY`، `SMSIR_TEMPLATE_ID`، `SMSIR_PARAMETER` (پیش‌فرض CODE)، `OTP_ALLOW_TEST_NUMBERS=1`، `SMS_DAILY_LIMIT`، و برای روشن کردن `OTP_DELIVERY=sms`؛ سپس `systemctl restart mlino-api`. کلید هرگز در مخزن.
- اعضا و دسترسی‌ها (D-81): نقش `mlino_api` روی پایگاه Core باید `INSERT, UPDATE` روی `memberships` و `permission_grants` داشته باشد (بی `DELETE`): `GRANT INSERT, UPDATE ON memberships, permission_grants TO mlino_api`. پس از استقرار: `node dist/http/api/main.js seed-demo-members 09000000090` با کاربر سرویس.
- اپ‌های اندروید (D-79): پروژه در `android-apps/` روی شاخه‌ی `guardian/accounting-a1`. ساخت: `node scripts/configure-native.cjs` پس از `npx cap add android`، سپس در هر `android/`: `./gradlew --init-script ../../scripts/mirrors.init.gradle assembleRelease bundleRelease` با `JAVA_HOME` روی JDK 21 و `MLINO_SIGNING` به فایل امضای بیرون از مخزن. فایل‌ها در `/var/www/mlino-entry/download/` (نوع `application/vnd.android.package-archive`).
