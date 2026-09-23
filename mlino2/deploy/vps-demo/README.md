# vps-demo

- `entry/`: صفحه‌ی انتخاب نقش (app.mlino.site).
- `Caddyfile.mlino-sites`: بلوک‌های سه نشانی.
- `ops/`: هسته‌ی نمایشی روی سرور (کلید نمایشی، seed، تازه‌سازی هر دقیقه).
- پنل کسب‌وکار (business.mlino.site) از `business-web/` روی شاخه‌ی `guardian/accounting-a1` ساخته می‌شود؛ صفحه‌ی ایستای قبلی جایش را داد.
- `ops/mlino-api-setup.sh`: سرویس `mlino-api` (ورود عضو با کد یک‌بارمصرف — D-74، و ماژول گفتگو — D-73). راه‌اندازی یک‌باره و بی‌تکرار؛ رازها همان‌جا در `/etc/mlino/api.env` (0600) ساخته می‌شوند و هرگز چاپ نمی‌شوند. نقش پایگاه‌داده‌ی `mlino_api` کم‌اختیار است: مالک طرح `core_identity` و پایگاه جدای `mlino_chat`، و فقط خواندن جدول‌های عضویت هسته. کد: `/opt/mlino/api/mlino-api.cjs` (بسته‌ی esbuild از `implementation/http/api/main.ts` روی `guardian/accounting-a1`). Caddy مسیر `/api/*` را روی explore و business به `127.0.0.1:8741` می‌دهد.
- عضو آزمایشی کسب‌وکارهای نمایشی: `node mlino-api.cjs seed-demo-members 09000000090` با `CORE_DATABASE_URL` مدیر؛ فقط سازمان‌های `test-demo-*` و فقط شماره‌ی آزمایشی.
- ساخت V2 با `VITE_CHAT=1` (در کنار `VITE_ASSISTANT_REMOTE=0`).
