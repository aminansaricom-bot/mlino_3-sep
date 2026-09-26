# بازبینی گزارش آشنایی Astra (CODEX-20260926-ASTRA-ONBOARDING-001)

**تاریخ:** ۲۶ سپتامبر ۲۰۲۶ · **بازبین:** CLAUDE (نگهبان معماری)
**گزارش:** `codex/astra-onboarding-20260926` @ `084d81c`، فایل `AI_HANDOFF/CODEX_REPORTS/20260926_CODEX_ASTRA_ONBOARDING_REPORT.md`
**حکم:** `APPROVED_NEXT_STEP`

## ۱. راستی‌آزمایی ادعاهای گزارش

| ادعا | بررسی نگهبان | نتیجه |
|---|---|---|
| شاخه از `origin/main` آخر ساخته شد | والد `084d81c` برابر `afc770e` است | درست |
| فقط فایل گزارش تغییر کرد | `git show --stat 084d81c`: یک فایل، ۱۰۴ خط | درست |
| هیچ کدی تغییر نکرد؛ درخت پاک است | `git status` پاک است | درست |
| مبناها (`ba9b079`، `40bb17e`، `e13bdd2`) | همان‌هایی است که دستور داده بود | درست |
| آزمون‌ها: V2 ۴۶۸، Core ۴۵ با `--runInBand` روی 5499، tsc هر دو، build پنل | با آخرین اجرای نگهبان روی همین commitها یکی است | پذیرفته |
| به VPS وصل نشد | در گزارش و شاخه نشانه‌ای خلاف آن نیست | پذیرفته |

- **یادداشت ۱:** worktree `astra-onboarding` مال کاربر sandbox Codex است. git آن را برای کاربر مالک «dubious ownership» می‌داند. نگهبان فقط با `-c safe.directory=…` برای هر فرمان خواند و پیکربندی سراسری git را تغییر نداد.
- **یادداشت ۲:** شاخه روی GitHub push نشده است. برای گزارش فقط‌محلی، این درست است.

## ۲. یافته‌ها — هر پنج مورد در کد تأیید شد

| # | یافته | تأیید نگهبان | شدت نهایی |
|---|---|---|---|
| ۱ | `requestCompassPermission` بدون وجود `DeviceOrientationEvent` خطای `ReferenceError` می‌دهد و پیش از `getCurrentPosition` کل موقعیت‌یابی را قطع می‌کند | درست: `compassBeam.ts:14`. **همین الگو در `ar/browserSensors.ts:135` (`request` در `useDeviceHeading`) هم هست و در گزارش نیامده بود.** | بالا |
| ۲ | اگر هنگام معلق بودن `getUserMedia` از ویترین خارج شوی، دوربین باز می‌ماند | درست: `browserSensors.ts:36-56`؛ `start` بعد از `await` لغو را بررسی نمی‌کند. **دو `start` هم‌زمان هم دو جریان باز می‌کند.** | متوسط |
| ۳ | اگر فایل انتشار حذف یا خراب شود، cache کهنه بی‌پایان پذیرفته می‌شود | درست: `app.ts:67` و `:79` | متوسط |
| ۴ | عبور هم‌زمان از سقف OTP (هر شماره و روزانه) و هزینه‌ی پیامک | درست: `identity/index.ts:129-149` (SELECT شمارش و INSERT بدون تراکنش و قفل) | متوسط (با شروع ارسال واقعی بالا می‌رود) |
| ۵ | دو ورود هم‌زمانِ نخستین با یک حساب گوگل به ۵۰۰ می‌رسد | درست: `identity/index.ts:204-217`؛ `FOR UPDATE` روی ردیف ناموجود قفل نمی‌گیرد | کم |

- **تصمیم نگهبان درباره‌ی پرسش باز ۱ (یافته‌ی ۳):** در خطای خواندن یا تجزیه‌ی فایل انتشار، آخرین نسخه‌ی معتبر حداکثر ۵ دقیقه نگه داشته می‌شود (برابر TTL خروجی عمومی؛ پوشش خواندن در میانه‌ی نوشتنِ هر دقیقه). بعد از آن نتیجه خالی است (fail closed): هیچ کسب‌وکاری برای گفت‌وگو منتشرشده حساب نمی‌شود.
- **پاسخ پرسش باز ۲:** بله. دستور اصلاح در همین سند صادر می‌شود (بخش ۴).

## ۳. کیفیت گزارش

- **شاهد:** برای هر یافته `path:line`، سناریوی مشخص و شاهد آمده است.
- **صداقت:** حدسی‌ها «احتمالی» خورده‌اند. اجرا نشدن آزمون هم‌زمانی صادقانه گفته شده.
- **ادعای بی‌پشتوانه:** دیده نشد.
- **اجرای دوباره:** شکست اولیه‌ی sandbox (`Access is denied`) و اجرای دوباره با دسترسی ثبت شده است.

## ۴. دستور بعدی Codex

```text
INSTRUCTION_ID: CODEX-20260926-ASTRA-FIX-001
TARGET_HANDOFF_ID: HANDOFF-20260926-GUARDIAN-R5-ASTRA-FIXES
```

### مبنا و شاخه‌ها

- پیش از کار `git fetch origin` بزن.
- دو شاخه‌ی تازه بساز:
  - `codex/astra-fix-v2-20260926` از `origin/guardian/v2-ar-glass` (حداقل `ba9b079`)؛
  - `codex/astra-fix-core-20260926` از `origin/guardian/accounting-a1` (حداقل `40bb17e`).
- گزارش را در شاخه‌ی `codex/astra-fix-report-20260926` از `origin/main` بنویس.

### کار (فقط همین پنج اصلاح)

**V2 (شاخه‌ی `codex/astra-fix-v2-20260926`)**

- **F1:**
  - در `requestCompassPermission` (`src/components/compassBeam.ts`) و `request` در `useDeviceHeading` (`src/ar/browserSensors.ts`)، پیش از هر دسترسی بررسی کن `typeof DeviceOrientationEvent !== 'undefined'`؛ بدون آن، هیچ کاری نکن.
  - `useMyLocation` باید حتی اگر این تابع خطا دهد ادامه دهد (دور فراخوانی try/catch بگذار؛ فایل مجاز: `src/publicExport/RealPublicApp.tsx`، فقط همان خط).
  - آزمون: وقتی `DeviceOrientationEvent` حذف شده، `requestCompassPermission()` خطا نمی‌دهد.
- **F2:**
  - در `useCameraStream` یک شمارنده‌ی نسل (یا نشانه‌ی لغو) بگذار. `stop()` نسل را جلو می‌برد. جریانی که بعد از `stop` برسد، فوراً همه‌ی trackهایش بسته می‌شود و state را `active` نمی‌کند.
  - `start()` هم‌زمان باید همان Promise در جریان را برگرداند، نه جریان دوم.
  - آزمون (فایل تازه‌ی `src/ar/browserSensors.test.ts` با `renderHook` یا شبیه‌سازی مستقیم): `getUserMedia` دیر resolve شود و پیش از آن `stop` زده شود ← `track.stop` فراخوانی می‌شود. دو `start` پشت‌سرهم ← یک بار `getUserMedia`.

**Core (شاخه‌ی `codex/astra-fix-core-20260926`)**

- **F3:**
  - در `publishedBusinesses` (`http/api/app.ts`)، زمان بارگذاری cache را نگه دار.
  - در خطای `stat`، خواندن یا تجزیه، cache را فقط اگر کمتر از ۵ دقیقه از بارگذاری‌اش گذشته برگردان؛ وگرنه `new Map()` برگردان.
  - برای آزمون، مسیر و زمان را قابل تزریق کن.
  - آزمون تازه (`test/chat/published-cache.spec.ts`): خواندن موفق ← حذف فایل ← تا ۵ دقیقه همان نتیجه، بعد از آن خالی. فایل خراب هم همین‌طور.
- **F4:**
  - در `startChallenge` (`identity/index.ts`)، شمارش‌ها و INSERT را در یک تراکنش با `pg_advisory_xact_lock` روی کلیدی از `phone_digest` انجام بده.
  - برای سقف روزانه‌ی ارسال واقعی، یک قفل سراسری جدا بگیر.
  - ارسال پیامک بیرون از تراکنش و بعد از commit بماند. قفل هنگام درخواست شبکه نگه داشته نشود.
  - آزمون (`test/chat/identity.spec.ts`): ۵ `startChallenge` هم‌زمان برای یک شماره‌ی آزمایشی ← دقیقاً یکی موفق و بقیه `RATE_LIMITED`.
- **F5:**
  - در `loginWithGoogle`، ابتدای تراکنش `pg_advisory_xact_lock` روی کلیدی از `subject_digest` بگیر (یا INSERT با `ON CONFLICT DO NOTHING` و خواندن دوباره، بدون جا گذاشتن person یتیم).
  - آزمون (`test/chat/google.spec.ts`): دو ورود هم‌زمان با یک subject ← هر دو موفق، یک `personId`، یک ردیف در `external_logins` و یک person.

### فایل‌های مجاز (هر فایل دیگری ممنوع)

- **V2:**
  - `src/components/compassBeam.ts`
  - `src/components/compassBeam.test.ts`
  - `src/ar/browserSensors.ts`
  - `src/ar/browserSensors.test.ts` (تازه)
  - `src/publicExport/RealPublicApp.tsx` (فقط try/catch دور `requestCompassPermission`)
- **Core:**
  - `implementation/http/api/app.ts`
  - `implementation/identity/index.ts`
  - `implementation/test/chat/published-cache.spec.ts` (تازه)
  - `implementation/test/chat/identity.spec.ts`
  - `implementation/test/chat/google.spec.ts`
- **گزارش:** `AI_HANDOFF/CODEX_REPORTS/20260926_CODEX_ASTRA_FIX_001_REPORT.md`

### ممنوع

- وابستگی تازه.
- تغییر رفتار دیگر، schema، migration یا رابط.
- تغییر `i18n`، CSS یا فایل‌های ریشه‌ی `AI_HANDOFF/`.
- push به `guardian/*` یا `main`.
- اتصال به VPS و استقرار.
- همه‌ی ممنوعیت‌های بخش ۵ دستور آشنایی همچنان برقرار است.

### پذیرش

- V2: `npx tsc --noEmit -p .` و `npx vitest run` سبز باشند. عدد آزمون از ۴۶۸ کمتر نشود و آزمون‌های تازه شمرده شوند.
- Core: `npx tsc -p tsconfig.json --noEmit` و jest با `--runInBand` روی `test/chat` سبز باشند (بیش از ۴۵).
- گزارش: برای هر اصلاح diff کوتاه، آزمون تازه و خروجی واقعی. commitهای دو شاخه‌ی کد و شاخه‌ی گزارش را بنویس. در پایان یکی از `FIXES_COMPLETE` یا `BLOCKED` بیاید.
- بعد متوقف شو. ادغام در `guardian/*` و استقرار با نگهبان است، پس از بازبینی.
