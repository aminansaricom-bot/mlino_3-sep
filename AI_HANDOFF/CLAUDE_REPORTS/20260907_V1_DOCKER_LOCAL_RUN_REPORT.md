HANDOFF_ID: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN
AUTHOR: CLAUDE
PHASE: V1_DOCKER_LOCAL_RUN
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
EXECUTED_INSTRUCTION_ID: CODEX-20260907-0043-DOCKER-BOTH-APPS-AUTH (بخش A فقط — بخش B متوقف، بخش ۷)
PREVIOUS_HANDOFF_ID: HANDOFF-20260906-HTTP-READ-API-REVIEW-ACK

---

# گزارش — بخش A: بالا آوردن V1 روی Docker همین سیستم

## ۱. دستور و تطبیق

`CODEX-20260907-0043-DOCKER-BOTH-APPS-AUTH`. **تطبیق قبل از اجرا:** `TARGET_HANDOFF_ID` (`HANDOFF-20260906-HTTP-READ-API-REVIEW-ACK`) و `TARGET_REPORT_SHA256` (`f89e52383ee9beab88be920f649780e6f38f0f27dc91ef1577abbfd10739ea15`) دقیقاً منطبق بودند.

**بخش A کامل شد. بخش B (دستور Docker برای موجی) اجرا نشد — دلیلش بخش ۷ این گزارش.**

## ۲. فایل‌های جدید/تغییر و چک‌سام

| فایل | ماهیت | SHA-256 |
|---|---|---|
| `implementation/Dockerfile` | **جدید** — چندمرحله‌ای (build → runtime) | `aeafcedbb76f6d0db468f55e8582eaef5b963c787f9d7e4fdec55acccf950684` |
| `implementation/.dockerignore` | **جدید** | `d9da41146d8dc4a732b2bf67d7d563d764a5a62386b5dcbf437044dea222a370` |
| `implementation/docker-compose.yml` | تغییر — افزودن `v1-migrate` و `v1-read-api` کنار `db` موجود | `058d1028e4a949df180e74171cdcb12c91908314f5545c872173b3c262797034` |
| `implementation/tsconfig.json` | تغییر — افزودن `composition/` و `http/` به `include` (بخش ۴) | `230c2de206c14f3c06b5e71eae5335dce0b7215a28e082e9ed823063b01bd15d` |

## ۳. روش مهاجرت — انتخاب و دلیل (بند ۳.c دستور)

**سرویس مجزای `v1-migrate` که یک‌بار اجرا می‌شود و خارج می‌شود** (`restart: "no"`)، و `v1-read-api` با `depends_on: service_completed_successfully` به آن وابسته است.

سه دلیل:

1. **CLI پریزما یک devDependency است.** Image نهایی با `npm ci --omit=dev` ساخته می‌شود و CLI را ندارد. سرویس مهاجرت عمداً از **stage `build`** ساخته می‌شود که node_modules کامل دارد — بدون آلوده‌کردن Image نهایی به ابزار توسعه.
2. **اجرای مهاجرت در `CMD` سرور غلط بود:** با چند نمونه‌ی سرور، مهاجرت‌ها موازی اجرا می‌شدند.
3. **گارد ترتیب واقعی:** `db` یک `healthcheck` با `pg_isready` دارد و مهاجرت با `condition: service_healthy` منتظر آمادگی واقعی Postgres می‌ماند، نه صرفاً بالا آمدن کانتینر.

## ۴. دو مشکل واقعی که حین کار پیدا شد (هر دو رفع شد)

### ۴.۱. Prisma روی `node:20-slim` بدون OpenSSL کار نمی‌کند

اولین اجرا با `Schema engine error` شکست خورد. علت: `node:*-slim` کتابخانه‌ی OpenSSL را ندارد و موتور پریزما به آن نیاز دارد. **رفع:** نصب `openssl` و `ca-certificates` در **هر دو** stage — هم build (برای موتور مهاجرت) و هم runtime (برای خودِ Client هنگام باز کردن اتصال).

### ۴.۲. باگ نهفته در تحویل قبلی خودم — `tsconfig.json` فایل‌های ورودی را شامل نمی‌شد

بعد از رفع OpenSSL، کانتینر با `Cannot find module '/app/dist/http/server.js'` در حلقه‌ی restart افتاد. علت واقعی:

`tsconfig.json` در `include` خود **هرگز `http/` و `composition/` را نداشت** — این فایل‌ها را در پاس قبلی ساختم اما به `include` اضافه نکردم. روی میزبان مشکلی دیده نشد چون `test/**/*.ts` در `include` هست و `test/http/read-api.spec.ts` این ماژول‌ها را به‌صورت انتقالی وارد می‌کرد. اما `.dockerignore` پوشه‌ی `test` را از Context خارج می‌کند، پس در Container هیچ‌چیز آن‌ها را وارد نمی‌کرد و `dist/http` اصلاً تولید نمی‌شد.

**یعنی این باگ از قبل وجود داشت:** روی یک Checkout تمیز بدون تست‌ها، `npm run build` هرگز نقطه‌ی ورود را تولید نمی‌کرد. Docker فقط آشکارش کرد. **رفع:** افزودن `composition/**/*.ts` و `http/**/*.ts` به `include`. تایید: `rm -rf dist && npm run build` حالا `dist/http/server.js` تولید می‌کند.

این را صریح ثبت می‌کنم چون عیب کار خودم بود، نه چیزی که Docker ایجاد کرده باشد.

## ۵. شواهد اجرای زنده

### ۵.۱. وضعیت سرویس‌ها

```
db            running   Up (healthy)
v1-migrate    exited    Exited (0)          ← موفق، یک‌بار
v1-read-api   running   Up
```

خروجی مهاجرت: `4 migrations found` / `No pending migrations to apply.`
لاگ سرور: `[v1-read-api] listening on 3000 — local bridge, not production`

### ۵.۲. تست زنده‌ی HTTP از **بیرون** کانتینر (بند ۳.d دستور)

| # | سناریو | نتیجه |
|---|---|---|
| ۱ | بدون توکن | `401` + `{"error":"unauthorized"}` |
| ۲ | توکن نامعتبر | `401` |
| ۳ | توکن معتبر، بدون داده | `200` + `{"opportunities_by_family":{}}` |
| ۴ | by-id شناسه‌ی ناموجود | `404` + `{"error":"not found"}` |
| ۵ | Feed با داده‌ی واقعی seed‌شده | `200` — **دقیقاً ۱ فرصت، فقط سازمان خودی** (سازمان دوم فیلتر شد) |
| ۶ | by-id فرصت سازمان خودی | `200` |
| ۷ | **Existence Oracle** | شناسه‌ی **واقعیِ** سازمان دیگر → `404`؛ شناسه‌ی ناموجود → `404`؛ `cmp` روی دو بدنه → **بایت‌به‌بایت یکسان** |
| ۸ | ثبت تعامل `SEEN` از مسیر HTTP | `202` + `{"admission_result":"accepted"}` |
| ۹ | ثبت تعامل روی فرصت سازمان دیگر | `404` یکنواخت |

توکن‌ها با همان Secret محلیِ Compose ساخته شدند. **داده‌ی آزمایشی بعد از تست کاملاً پاک شد** (تایید: صفر ردیف باقی‌مانده).

نکته: مورد ۷ همان چیزی است که در تست‌های Jest هم قفل شده، اما اینجا **از بیرون کانتینر و روی سوکت واقعی** بازتایید شد — یعنی لایه‌ی Docker نشتی جدیدی اضافه نکرده.

### ۵.۳. مجموعه‌ی میزبان

```
npm test        → 16 Suites / 162 Tests passed   (بدون Regression)
npx tsc --noEmit → CLEAN (Exit 0)
```

## ۶. Drift و ممنوعیت‌ها — با شواهد

| بررسی | نتیجه |
|---|---|
| `shared-contracts/types.ts` | `bc0ca61e...` — **Drift صفر** |
| `prisma/schema.prisma` | `673b8220...` — **Drift صفر** |
| `ac2-decision-port.ts` | چک‌سام برابر `f6aa2aa` → IDENTICAL |
| `opportunity-read.service.ts` | چک‌سام برابر `f6aa2aa` → IDENTICAL |
| `jest.config.js` | چک‌سام برابر `f6aa2aa` → IDENTICAL |
| Featureها، `mlino2/`، قرارداد `02` | لمس نشدند |
| Secret واقعی در Commit | هیچ — `MLINO_JWT_SECRET` مقدار پیش‌فرض `local-dev-only-not-a-real-secret` دارد و با `${MLINO_JWT_SECRET:-...}` از env میزبان قابل جایگزینی است؛ پسورد Postgres همان مقدار توسعه‌ی محلی از قبل موجود |
| Deploy عمومی / HTTPS عمومی / دامنه | هیچ — فقط `127.0.0.1` |
| وابستگی جدید | هیچ — `node:http` استاندارد، Image پایه‌ی رسمی Node slim |

## ۷. بخش B متوقف شد — تعارض با دستور جدیدتر همان نویسنده

بند ۴ دستور می‌گفت `mlino2/HANDOFF/NEXT_INSTRUCTION_FOR_MOJI.md` **Overwrite** شود با دستور Docker برای موجی.

**اجرا نکردم**، چون بعد از صدور این مجوز (۰۰:۴۳)، ممد یک **دستور جدیدتر** در همان فایل نوشته است: «رفتار چیزی پیدا نشده (تصمیم مالک محصول) + تست زنده‌ی DeepSeek» — که یک تصمیم تازه‌ی مالک محصول درباره‌ی نتیجه‌ی خالی صادقانه را عملی می‌کند و به یک بازبینی جدید (`20260907_MAMAD_INDEPENDENT_REVIEW_LIVE_LLM_VALIDATION.md`) ارجاع می‌دهد.

Overwrite کردن یعنی **نابود کردن یک دستور فعالِ جدیدتر از همان نویسنده**. طبق بند ۷ خودِ دستور («اگر به تناقض رسیدی: متوقف شو — حدس نزن») متوقف شدم.

**تصمیم لازم (با مالک محصول یا ممد):** آیا کار Docker موجی به دستور فعلی **افزوده** شود (به‌عنوان بخش موازی)، یا بعد از تکمیل آن دستور بیاید؟ ترتیب اولویت، تصمیم من نیست. متن آماده‌ی بخش Docker موجی نوشته شده و منتظر همین تصمیم است.

## ۸. آنچه ساخته نشد

- **هیچ Deploy عمومی/HTTPS/دامنه** — فقط Docker محلی روی `127.0.0.1`.
- **هیچ قابلیت محصولی جدید، Backend، یا Connector** — فقط Container‌سازی آنچه از قبل تایید شده بود.
- **هیچ ادعای «تولیدی امن»** — هدر `Dockerfile` و `docker-compose.yml` هر دو صریح می‌گویند این اجرای محلی است، نه Deploy: بدون HTTPS عمومی، بدون Secret manager، بدون مانیتورینگ.

## ۹. اقدام بعدی

**متوقف می‌شوم.** بازبینی مستقل ممد؛ و تصمیم درباره‌ی بخش B (بخش ۷).
