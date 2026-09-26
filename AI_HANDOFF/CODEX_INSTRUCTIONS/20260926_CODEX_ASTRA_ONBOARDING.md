# آشنایی Astra با کد فعلی ملینو و نقش بازبین/اصلاح‌کننده

**INSTRUCTION_ID:** CODEX-20260926-ASTRA-ONBOARDING-001
**TARGET_HANDOFF_ID:** HANDOFF-20260926-GUARDIAN-R4-SEO-AI-VISIBILITY
**نویسنده:** CLAUDE (نگهبان معماری) · **تاریخ:** ۲۶ سپتامبر ۲۰۲۶
**کار این دستور:** فقط خواندن، اجرای آزمون‌ها و نوشتن یک گزارش. هیچ تغییری در کد نده.

---

## ۰. نسخه‌ی درست: فقط آخرین نسخه، نه کدی که قبلاً روی آن کار می‌کردی

کد فعلی ملینو در شاخه‌های `guardian/*` و `main` است. کلون و شاخه‌های قبلی تو **قدیمی‌اند**. هیچ کار، بازبینی یا مقایسه‌ای روی آن‌ها انجام نده و کد آن‌ها را مبنا قرار نده:

- کلون `C:\Users\galexy\mlino code\v2-intent-flow`؛
- شاخه‌های `codex/*`، از جمله `codex/v2-intent-flow-foundation`، `codex/v2-real-ui-wiring` و `codex/core-*`؛
- پوشه‌های هم‌نام آن‌ها در `C:\Users\galexy\mlino code\`.

همه‌ی آن کارها در این شاخه‌ها ادغام شده و بعد از آن خیلی جلو رفته است.

| بخش | شاخه | commit مبنا (حداقل) |
|---|---|---|
| اپ مشتری V2 و دروازه‌ی دستیار | `guardian/v2-ar-glass` | `ba9b079` |
| Core API، پنل کسب‌وکار، اندروید | `guardian/accounting-a1` | `40bb17e` |
| پیکربندی آزمون Core | `guardian/demo-food-seed` | `e13bdd2` |
| حاکمیت، استقرار و این دستور | `main` | همین commit یا بعدتر |

پیش از هر کار:

1. `git fetch origin`.
2. بررسی کن HEAD شاخه‌ای که می‌خوانی برابر یا جلوتر از commit جدول باشد: `git merge-base --is-ancestor <commit> origin/<branch>`. اگر نبود، `BLOCKED` بده و ادامه نده.
3. برای خواندن یا اجرای آزمون، یا از worktreeهای جدول بخش ۲ استفاده کن (همین کامپیوتر؛ فقط خواندن، بدون commit در آن‌ها)، یا یک worktree تازه از همین شاخه‌ها بساز:

   ```text
   git worktree add C:\Users\galexy\mlino code\astra-review-v2 origin/guardian/v2-ar-glass
   ```

4. برای اصلاح کد، شاخه‌ی تازه‌ی `codex/<task>` بساز. مبنای آن باید `origin/guardian/<همان بخش>` باشد، نه شاخه‌های قدیمی `codex/*`.

---

## ۱. نقش تو

- **مالک محصول** مرجع نهایی است.
- **Claude** نگهبان معماری است. هر گزارش تو پیش از قدم بعد بازبینی می‌شود؛ قواعدش در `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md` هست.
- **تو (Codex با مدل Astra)** بازبین و اصلاح‌کننده‌ی کد هستی:
  - **حالت پیش‌فرض:** فقط خواندن و بررسی. یافته‌ها را با شاهد بنویس.
  - **اصلاح کد:** فقط با دستوری که `TARGET_HANDOFF_ID` معتبر دارد. در شاخه یا worktree جدا و فقط در فایل‌های مجاز همان دستور.
  - **هر ادعا با شاهد:** دستور، خروجی، `git show`، یا شماره‌ی خط. «PASS» یعنی آزمون واقعاً اجرا شده است.
  - هیچ سندی را «ناموجود» اعلام نکن، مگر بعد از جست‌وجو در همه‌ی worktreeها و `git ls-tree` روی شاخه‌های remote.

## ۲. نقشه‌ی کد

مخزن: `github.com/aminansaricom-bot/mlino_3-sep`. چند worktree محلی روی شاخه‌های جدا دارد:

| مسیر | شاخه | چه چیزی |
|---|---|---|
| `C:\mlino code\_PUSH_STAGING` | `main` | حاکمیت: `AI_HANDOFF/`، `mlino_book/` (دفتر تصمیم‌ها `05_OPEN_DECISIONS.md` و `CHANGELOG.md`)، ADRها، و فایل‌های استقرار `mlino2/deploy/vps-demo/` (صفحه‌ی ورود `entry/`، صفحه‌ی login `login/`، نصب دستیار `assistant/`) |
| `C:\Users\galexy\mlino code\v2-ar-glass` | `guardian/v2-ar-glass` | اپ مشتری V2 در `mlino2/app` |
| `C:\Users\galexy\mlino code\accounting-a1` | `guardian/accounting-a1` | Core API در `implementation/`، پنل کسب‌وکار در `business-web/`، اپ‌های اندروید در `android-apps/` |
| `C:\Users\galexy\mlino code\demo-food-seed` | `guardian/demo-food-seed` | پیکربندی jest که آزمون‌های Core از آن استفاده می‌کنند |

### اپ مشتری V2: `v2-ar-glass/mlino2/app`

React + Vite + TypeScript، نقشه‌ی Leaflet/نشان، راست‌به‌چپ و شش زبان.

- **صفحه‌ی اصلی:** `src/publicExport/RealPublicApp.tsx` (نقشه، موقعیت، برگه‌ی پایین، تب‌ها، نسخه‌ی نمایشی).
- **داده‌ی عمومی امضاشده:**
  - `src/publicExport/`: `consumer.ts`، `verify.ts` (Ed25519 با WebCrypto، و در Brave با `@noble/ed25519`)، `clock.ts` (ساعت سرور از سرآیند Date)، `catalog.ts`.
  - سرور هر دقیقه دوباره امضا می‌کند.
- **ویترین زنده:** `src/live/LiveVitrine.tsx`، `src/ar/` (قطب‌نما و دوربین در `browserSensors.ts`).
- **نقشه:** `src/components/MapView.tsx`، پرتوی جهت در `compassBeam.ts`.
- **طراحی «روشنای محله»:** `src/design/` (`roshan.css`، `ui.tsx`، `CurvedBottomNav.tsx`).
- **زبان‌ها:** `src/i18n/`. کلید متن همان فارسی است: `tr('…')`. پنج فرهنگ en/ar/tr/es/de دارد و `i18n.test.ts` نبودِ ترجمه را می‌گیرد.
- **نسخه‌ی نمایشی:** `src/demo/demoRelocation.ts` (کسب‌وکارهای ساختگی `test-demo-*` دور موقعیت کاربر چیده می‌شوند).
- **دروازه‌ی دستیار:** `gateway/` (Node، بی‌وابستگی، کلید CodeCraft فقط روی سرور).
- **فایل‌های عمومی:** `public/diag.html` (صفحه‌ی بررسی روی گوشی)، `public/sw.js` (Service Worker).

### Core API: `accounting-a1/implementation`

TypeScript، Prisma و pg.

- **مسیرهای HTTP:** `http/api/app.ts`. مخاطب از Host تعیین می‌شود: explore → `v2` و business → `business`. هر state-changing درخواست سرآیند `x-mlino-csrf: 1` لازم دارد.
- **فایل‌های دیگر:** `http/api/main.ts` (راه‌اندازی و فرمان‌ها)، `identity/` (ورود با کد پیامکی، نشست، ورود با گوگل در `google.ts`)، `chat/`، `ratings/`، `notify/`، `core/` (برنامه‌ها، آفرها، انتشار).

### پنل کسب‌وکار: `accounting-a1/business-web`

React + Vite.

### محیط زنده (فقط برای فهم؛ تو استقرار نمی‌کنی)

- app.mlino.site: صفحه‌ی ورود
- explore.mlino.site: V2
- business.mlino.site: پنل
- `/api` روی هر دو دامنه به Core (پورت 8741) می‌رود.
- `/assistant` به دروازه (پورت 8787) می‌رود.
- `/login` روی هر دو دامنه صفحه‌ی ورود است.

## ۳. قواعد معماری که هر تغییر باید حفظ کند

- **D-63:** Core نام هیچ صنفی را نمی‌برد. آزمون سه‌سؤالی Core/Module را به کار ببر.
- **D-66 / D-70:** نشست فقط هویت است، نه سازمان و نه مجوز. هر نشست فقط برای مخاطب خودش معتبر است. بستن نشست هیچ عضویتی را تغییر نمی‌دهد.
- **D-57:** مجوز فقط از عضویت و grant می‌آید و هنگام هر عمل بررسی می‌شود.
- **D-52:** انتشار کار انسان است. هیچ چیز خودکار منتشر نمی‌شود.
- **D-71:** داده‌ی ماژول‌ها (گفت‌وگو، امتیاز) جدا از Core ذخیره می‌شود.
- **داده‌ی عمومی:**
  - بدون امضای معتبر نمایش داده نمی‌شود.
  - هیچ کسب‌وکار یا امتیاز ساختگی به‌جای داده‌ی واقعی گذاشته نمی‌شود؛ نمونه‌ها فقط با برچسب «آزمایشی».
- **پاسخ مدل هوش مصنوعی:**
  - فقط JSON محدود.
  - مدل هیچ پیوند، کسب‌وکار، قیمت یا تخفیفی نمی‌سازد.
- **متن‌ها:** هر متن تازه‌ی رابط باید از `tr()` بگذرد و در هر پنج فرهنگ ترجمه شود.

## ۴. فرمان‌ها

```text
# V2 (در v2-ar-glass/mlino2/app)
npx tsc --noEmit -p .
npx vitest run                      # الان ۴۶۸ آزمون، همه باید سبز باشند

# Core (در accounting-a1/implementation) — فقط روی پایگاه آزمایشی یک‌بارمصرف 5499، و حتماً --runInBand
DATABASE_URL=postgresql://guardian:guardian_disposable_test@127.0.0.1:5499/mlino_test \
  npx jest -c ../../demo-food-seed/implementation/jest.g.config.js --rootDir . --runInBand test/chat
# الان ۱۲ فایل و ۴۵ آزمون. بدون --runInBand آزمون‌ها روی همان schema با هم تداخل می‌کنند و گیر می‌کنند.

npx tsc -p tsconfig.json --noEmit

# پنل (در accounting-a1/business-web)
npm run build
```

## ۵. ممنوعیت‌های قطعی

- **کلیدها و اعتبارنامه‌ها:**
  - هیچ کلید، توکن، رمز یا فایل اعتبارنامه‌ای را باز نکن، چاپ نکن و commit نکن. این‌ها از جمله‌اند:
    - `C:\mlino code\GITHUB_TOKEN.txt`، `C:\mlino code\MLINO V2 API.txt`، `C:\mlino code\api codecraft.txt`؛
    - هر چیزی در `C:\mlino code\_KEYS_TEST\`، کلیدهای `~/.ssh/`، فایل‌های `.env`.
  - در `accounting-a1` دستورهای `git remote -v` یا `git config --list` را اجرا نکن و `.git/config` را نخوان؛ نشانی remote آن اعتبارنامه دارد.
  - به پیکربندی git و اعتبارنامه‌ها دست نزن.
- **پایگاه داده:**
  - `DATABASE_URL` هرگز نباید به `mlino-v1-local-db` (پورت 5435) اشاره کند. آزمون‌ها جدول‌ها را پاک می‌کنند.
  - اجرای `docker compose down -v`، پاک کردن volume، `DROP`، `TRUNCATE` یا `DELETE` روی داده‌ی V1 ممنوع است. فقط پایگاه یک‌بارمصرف 5499 مجاز است.
  - هیچ پشتیبانی commit نمی‌شود.
- **آزمون در `_PUSH_STAGING`:** `npm test` یا `jest` اجرا نکن.
- **سرور:** به VPS (202.133.90.75) وصل نشو، چیزی استقرار نده و کلید SSH را به کار نبر. استقرار کار نگهبان است.
- **داده‌ی واقعی:** داده‌ی واقعی کسب‌وکارها (ونک) فقط محلی است و به هیچ خروجی عمومی نمی‌رود.
- **منابع بیرونی:** تصویر یا کد از اینترنت برندار و اسکریپت از راه دور (`irm | iex`) اجرا نکن.
- **وابستگی تازه:** فقط با دلیل در گزارش و با نسخه‌ی قفل‌شده. `npm audit` باید صفر باشد.
- **فایل‌های حاکمیتی:** فایل‌های ریشه‌ی `AI_HANDOFF/` مثل `HANDOFF_STATE.md` و `CLAUDE_LATEST_REPORT.md` را تغییر نده. فقط گزارش خودت را در `AI_HANDOFF/CODEX_REPORTS/` بنویس.

## ۶. شکل گزارش بازبینی

برای هر یافته:

- مسیر فایل و خط (`path:line`)؛
- شدت: بحرانی / بالا / متوسط / کم؛
- سناریوی مشخص: «با ورودی/وضعیت X، نتیجه Y می‌شود»؛
- شاهد: دستور و خروجی، یا کد مربوط؛
- پیشنهاد اصلاح. خود اصلاح را فقط با دستور جدا انجام بده.

یافته‌ی حدسی را با برچسب «احتمالی» جدا کن.

## ۷. وضعیت امروز (برای شروع)

- **کارهای اخیر:**
  - فوتر منحنی با دکمه‌ی ویترین زنده در وسط؛
  - پرتوی جهت روی نقطه‌ی موقعیت؛
  - دنبال کردن چرخش نسبی در ویترین زنده، برای Brave که قطب‌نمای شمال‌دار ندارد؛
  - تأیید امضا در Brave با `@noble/ed25519`؛
  - ساعت سرور برای تازگی داده؛
  - GPS و موقعیت شبکه به‌صورت هم‌زمان؛
  - صفحه‌ی ورود با شماره و گوگل (گوگل تا Client ID مالک خاموش است)؛
  - صفحه‌ی ورود و SEO.
- **باز:**
  - پرتوی جهت روی گوشی مالک در Brave هنوز دیده نمی‌شود (منتظر نتیجه‌ی «آزمون قطب‌نما» در `/diag.html`)؛
  - آزمون اپ اندروید ۱.۲ روی گوشی؛
  - روشن شدن پیامک (منتظر شناسه‌ی الگوی sms.ir)؛
  - ورود با گوگل (منتظر Client ID).
- **سوابق:** `AI_HANDOFF/CLAUDE_REVIEWS/20260925_CLAUDE_LOGIN_PAGE_GOOGLE_D90.md` (بخش‌های ۸ تا ۱۵) و `20260926_CLAUDE_SEO_AI_VISIBILITY.md`.

## ۸. کار همین دستور

1. `git fetch origin`، سپس این دستور و دو سند بالا را با `git show origin/main:<path>` بخوان.
2. نقشه‌ی بخش ۲ را روی دیسک تأیید کن: مسیرها، شاخه‌ها و فایل‌های کلیدی. هر اختلاف را بنویس.
3. آزمون‌های بخش ۴ را اجرا کن و عدد دقیق را بنویس: V2 (tsc و vitest)، Core (tsc و jest با `--runInBand`)، build پنل.
4. یک بازبینی فقط‌خواندنی روی این فایل‌ها انجام بده و حداکثر ۱۰ یافته‌ی مهم را با شکل بخش ۶ بنویس:
   - `RealPublicApp.tsx`، `consumer.ts`، `verify.ts`، `clock.ts`؛
   - `LiveVitrine.tsx`، `browserSensors.ts`، `compassBeam.ts`، `CurvedBottomNav.tsx`؛
   - `identity/index.ts`، `identity/google.ts`، `http/api/app.ts`.
5. گزارش را در `AI_HANDOFF/CODEX_REPORTS/20260926_CODEX_ASTRA_ONBOARDING_REPORT.md` بنویس. فقط همان فایل را در شاخه‌ی خودت commit کن.
6. بعد متوقف شو و منتظر بازبینی Claude بمان.

پایان گزارش یکی از این‌ها باشد: `ONBOARDING_COMPLETE`، `ONBOARDING_COMPLETE_WITH_FINDINGS` یا `BLOCKED` (با دلیل).
