INSTRUCTION_ID: CODEX-20260907-0043-DOCKER-BOTH-APPS-AUTH
AUTHOR: CODEX
STATUS: PARTIALLY_EXECUTED
EXECUTED_BY: CLAUDE
EXECUTED_AT: 2026-09-07T01:30:00
RESULTING_HANDOFF_ID: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN
EXECUTION_NOTE: Part A (V1 on Docker) complete. Part B (overwrite Moji's instruction with the Docker task) deliberately NOT executed - a newer active instruction from the same author now occupies that file; see report section 7.
TARGET_HANDOFF_ID: HANDOFF-20260906-HTTP-READ-API-REVIEW-ACK
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260906_HTTP_READ_API_REVIEW_ACKNOWLEDGEMENT.md
TARGET_REPORT_SHA256: f89e52383ee9beab88be920f649780e6f38f0f27dc91ef1577abbfd10739ea15
TARGET_ZIP_PATH: (none)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-07T00:43:00
AUTHORIZATION_SCOPE: IMPLEMENT_DOCKER_LOCAL_RUN_FOR_V1_HTTP_API_AND_V2_APP_NO_DEPLOY_NO_NEW_FEATURES

---

# مجوز: بالا آوردن هر دو برنامه (V1 + V2) روی Docker همین سیستم

**صادرکننده:** ممد (بازبین مستقل، GLM 5.3 Flash) — بر پایه‌ی تصمیم صریح مالک محصول (۷ سپتامبر ۲۰۲۶): «هر دو برنامه V1 و V2 روی داکر همین سیستم فعلی بیاید بالا.»

## ۰. ماهیت این فاز

- **زیرساخت اجرای محلی است، نه Deploy عمومی.** بدون HTTPS عمومی، بدون دامنه، بدون Secret manager — همان هشدارهای صادقانه‌ی قبلی پابرجاست (هر دو فایل HTTP هدر «NOT PRODUCTION-SAFE» دارند).
- **هیچ قابلیت محصولی جدیدی** در این فاز ساخته نمی‌شود — فقط Container‌سازی آنچه تایید شده وجود دارد.
- Docker Desktop همین سیستم فعال است و `mlino-v1-local-db` (Postgres) از قبل روی همان بالا است — بستر نیمه‌آماده.

## ۱. بخش A — V1 روی Docker (یونس)

### ۱.۱. ساخت
1. `implementation/Dockerfile` — چندمرحله‌ای (build با tsc، اجرای `dist/http/server.js`).
2. الحاق به `implementation/docker-compose.yml` موجود (کنار سرویس Postgres فعلی): سرویس `v1-read-api` — پورت قابل‌تنظیم (مثلاً 3000→3000)، `DATABASE_URL` و `MLINO_JWT_SECRET` از env/compose environment (مقادیر محلی — هیچ Secret واقعی در Commit)، وابستگی `depends_on` به Postgres.
3. Schema Migration: یک‌بار `prisma migrate deploy` از داخل Container یا سرویس init — روش را انتخاب و مستند کن.
4. وابستگی جدید **ممنوع** — همان `node:http` استاندارد؛ Image پایه‌ی رسمی Node slim.

### ۱.۲. تست (Postgres واقعی همان Compose)
- کانتینر بالا بیاید، `prisma migrate deploy` موفق، سرور گوش بدهد.
- تست زنده‌ی HTTP از بیرون کانتینر: 401 بدون توکن / Feed با توکن معتبرِ سازمان تست / 404 یکنواخت By-Id / ثبت تعامل — همه روی همان خروجی AC-2 Adapter واقعی.
- مجموعه‌ی کامل `npm test` روی میزبان (۱۶۲) همچنان سبز — Dockerfile نباید رفتار تست‌ها را عوض کند.
- قوانین همیشگی: دو فایل منجمد دست‌نخورده، Featureها دست‌نخورده، Import بین‌Featureای ممنوع.

## ۲. بخش B — V2 روی Docker (موجی — از طریق NEXT_INSTRUCTION_FOR_MOJI.md)

1. `mlino2/app/Dockerfile` + اگر لازم Compose جدا در `mlino2/` — اپ Vite/React (سرو استاتیک با nginx-alpine یا preview سرور Vite — انتخاب با استدلال در گزارش).
2. **کلیدهای API به Container میرسند؟** خیر — به‌یادداشت L-2 بازبینی قبلی: کلید در باندل مرورگر عمومی می‌شود. Container فقط همان چیزی را سرو کند که الان سرو می‌شود؛ اتصال زنده‌ی LLM سمت مرورگر/محلی باقی می‌ماند تا تصمیم Backend آینده. در گزارش صریح.
3. تست: Container بالا بیاید، از LAN قابل‌دسترس باشد (تست میدانی AR از پشت Docker هم ممکن شود)، ۵۵/۵۵ تست و build روی میزبان همچنان سبز.
4. قانون طلایی: فقط `mlino2/`، بدون تماس با V1.

## ۳. ممنوعیت‌های مشترک

- هیچ Deploy عمومی/HTTPS عمومی/دامنه — فقط Docker محلی همین سیستم.
- هیچ قابلیت محصولی جدید، هیچ Backend جدید، هیچ Connector — فقط Container‌سازی.
- دو فایل منجمد V1 دست‌نخورده؛ `jest.config.js` دست‌نخورده؛ قرارداد `02` دست‌نخورده.
- هیچ Secret واقعی در Commit — همه از env/compose environment محلی.

## ۴. تعریف Done

- هر دو برنامه روی Docker همین سیستم بالا و از مرورگر/HTTP قابل‌تست.
- V1: تست‌های زنده‌ی HTTP از بیرون کانتینر + کل مجموعه‌ی ۱۶۲ سبز روی میزبان.
- V2: ۵۵/۵۵ + build سبز روی میزبان + Container قابل‌دسترس از LAN.
- گزارش واحد با هر دو بخش (یا دو گزارش جدا اگر راحت‌تر است) + چک‌سام فایل‌های جدید + Drift صفر دو فایل منجمد + Push (V1: الگوی دو-Commit در AI_HANDOFF؛ V2: سند در mlino2/HANDOFF/) با Hash واقعی در پاسخ نهایی به کاربر.
- تناقض با سطوح ۱–۵ اقتدار → متوقف شو، CCR/ACR — حدس نزن.

## ۵. شرط توقف

بعد از گزارش + Push، کاملاً متوقف شو — بازبینی مستقل را ممد جداگانه انجام می‌دهد.

---
*بازبین: ممد (GLM 5.3 Flash) — R4 (BLOCKED)، R5 (OPEN)، R8-a/b (OPEN)، Connector (فاز بعدی).*
