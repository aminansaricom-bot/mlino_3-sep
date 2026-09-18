# گزارش اصلاحات M2-2c — اسکریپت DPAPI و trust bundle

**وضعیت: تحویل محلی برای بازبینی Guardian.** آزمون واقعی DPAPI در حساب sandbox با دلیل آشکار skip شد؛ پذیرش M2-2 منوط به PASS همین آزمون زیر حساب مالک است.

## ۱. کار انجام‌شده

- **F1:** `buildDpapiScript` متن واقعی فرمان را برای `protect` و `unprotect` از خطوط جداشده با newline می‌سازد؛ mode فقط یکی از همین دو مقدار است. داده همچنان تنها از stdin عبور می‌کند و `spawn` با `shell:false` است. آزمون تازه هر دو متن را از **stdin** به `Parser.ParseInput` خود PowerShell می‌دهد و صفر خطای parse می‌خواهد. چون PowerShell `}; else {` را ممکن است از نظر نحو بپذیرد ولی `else` را در اجرا فرمان نامعتبر ببیند، آزمون این الگوی مشخص را جداگانه رد می‌کند.
- **F2:** نسخهٔ trust bundle اکنون رشتهٔ غیرخالی است. آزمون محلی، قواعد پذیرش V2 را طبق `540ad2d:mlino2/app/src/publicExport/trustBundle.ts:10-18,29-49` بازسازی و JSON خروجی را از آن عبور می‌دهد.
- **F3:** مقدار غیررشته‌ای یا خالیِ `descriptorPath` با `KEY_DESCRIPTOR_PATH_INVALID` رد می‌شود؛ آزمون مقدار `undefined` و رشتهٔ خالی دارد.

## ۲. منابع و پیش‌شرط‌ها

بازبینی: `23d93ea9cca6f7e98cffad1bd08c0f7b872a98e2:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_2B_DPAPI_KEY_ADAPTER.md`. HEAD آغازین دقیقاً `fda7803b72f4aa8bfc684d322d48601008e6b62e` بود. `git fetch origin` با `SEC_E_NO_CREDENTIALS` شکست خورد؛ GW2-P موفق بود: `git cat-file -e 23d93ea9cca6f7e98cffad1bd08c0f7b872a98e2^{commit}` و `git merge-base --is-ancestor 23d93ea9cca6f7e98cffad1bd08c0f7b872a98e2 origin/main` هر دو کد ۰؛ SHA-256 بایت‌های `git show` برابر مقدار پین‌شدهٔ `c31021e5770c2215a7c2a998a82429acd4c6b0cfff2547f7ece168ae82e47b00` بود. به credential یا git config دست نخورد.

## ۳. فایل‌های تغییرکرده

`implementation/public-export/key-providers/{protector,trustBundle,dpapiKeyProvider}.ts`، `implementation/test/public-export/key-providers/key-providers.spec.ts`، آزمون تازهٔ `powershell-parser.spec.ts`، اسکریپت mutation و پنج log تازه با پسوند `c` در `implementation/validation/m2-2/`. این گزارش تازه است و Handoff فقط الحاق می‌شود. شواهد و گزارش M2-2b دست‌نخورده‌اند.

## ۴. فایل‌های دست‌نخورده

`cli.ts`، `signing.ts`، `builder.ts`، `canonical.ts`، schema، migrationها، package و lockfile، V2، `.env` و فایل‌های کلید تغییر نکردند. CLI، Docker، دیتابیس، scheduler و کلید واقعی استفاده نشدند؛ Push انجام نشد.

## ۵. آزمون‌ها و نام دقیق

| اصلاح | آزمون دقیق | نتیجه |
|---|---|---|
| F1 در هر دو mode | `PowerShell parser accepts exact generated script for protect` و `PowerShell parser accepts exact generated script for unprotect` | هر دو PASS؛ script از stdin به parser رفت و الگوی `}; else {` رد شد. |
| F2 و قواعد V2 | `trust bundle is public-only and matches V2 raw-key shape` | PASS؛ نسخهٔ عددی در helper رد و رشتهٔ خالی در builder رد شد. |
| F3 | `relative and in-repository descriptor paths reject` | PASS؛ `undefined` و رشتهٔ خالی کد ثابت دادند. |
| حفاظت مسیر داده | `plaintext travels only by stdin; powershell.exe, shell:false, no secret in args/options/env` | PASS. |
| DPAPI واقعی | `dpapi.integration.spec.ts` | SKIP با `DPAPI_PROFILE_UNAVAILABLE` در sandbox؛ Guardian باید زیر حساب مالک اجرا کند. |

## ۶. نتایج اعتبارسنجی و mutation

`npm run build` و چهار spec متمرکز، سه بار پشت‌سرهم موفق شدند. هر بار **۱۰ آزمون PASS، ۱ SKIP**؛ سه suite PASS و یک suite SKIP. `run-c-1.log` تا `run-c-3.log` دلیل skip را آشکار ثبت کرده‌اند.

`mutation-c.log` نشان می‌دهد هر شش تغییر عمدی آزمون مربوط به خود را شکست دادند: `ACTIVE_ONLY`، `PUBLIC_PRIVATE_MATCH`، `KEY_ID_BINDING`، `PLAINTEXT_ARGUMENT`، **`POWERSHELL_SEMICOLON_JOIN`** و **`NUMERIC_TRUST_BUNDLE_VERSION`**. Mutation پنجم ابتدا نشان داد که parser تنها، الگوی `}; else {` را رد نمی‌کند؛ آزمون با وارسی صریح همان الگوی runtime کامل شد و سپس mutation شکست خورد. کپی‌های موقت پاک شدند (`MUTATION_COPIES_REMAINING=0`). اسکن ۱۰ فایل تغییرکرده و logهای تازه برای نشانگر کلید خصوصی، پیشوند PKCS8 و مسیر واقعی descriptor، صفر تطابق داد (`leak-c.log`).

## ۷. Commit و SHA-256

Commit کد و شواهد: `289c2ee3abfba4afcaeb171c3ffeea95caaa1dd3`. Hashهای زیر بر بایت‌های `git show 289c2ee:<path>` حساب شده‌اند:

| مسیر زیر `implementation/` | SHA-256 |
|---|---|
| `public-export/key-providers/dpapiKeyProvider.ts` | `9001ebebace0324754125d14c81bfb24bf087bdf2ef06c9e1d4c107d22daaedc` |
| `public-export/key-providers/protector.ts` | `73c713f6a68cd0d03185741424126da7e5748aa2730c6339fab6543449bd1abb` |
| `public-export/key-providers/trustBundle.ts` | `2f3c2bf0955ca1f76197f1a3f13b2ab93556088998f028bfa3a58a380d3051c3` |
| `test/public-export/key-providers/key-providers.spec.ts` | `462934ebd574b3c5e32a88d1e7951860af9f539d32dc73664d8ba41e36910a78` |
| `test/public-export/key-providers/powershell-parser.spec.ts` | `eea2c380bb2219300d6da8d97d8af9029b0fdb8b7bfbacba770e4b4f629150bd` |
| `validation/m2-2/leak-c.log` | `06797718404e823aed4091b1233bfd21719c6ecb0e19a83f8a106ceeefae92aa` |
| `validation/m2-2/mutation-c.log` | `ab7f8f9cc15520d295af8d2f45f876a00379fb581bbf9c283903d1cf980dfc73` |
| `validation/m2-2/mutation.cjs` | `e15625d1bcfb1be25f804908aac4a0006ecb3ba7ea4b9ce67958eda4161c2b4a` |
| `validation/m2-2/run-c-1.log` | `b068c560e3e534f00f1eb292a49218274148e99b48746246b8f2ef49f6dfac4d` |
| `validation/m2-2/run-c-2.log` | `c38a28c506d27d2b12117025e5396f44fd06e0737903d97a5d7e7347cf8026dd` |
| `validation/m2-2/run-c-3.log` | `7eec5a1be6aeec96b895129d100d340faf7a410bfc427666972efde32bf33470` |

## ۸. ریسک باقی‌مانده

نشست Codex پروفایل Windows بارگذاری‌شده ندارد، بنابراین اجرای واقعی `DpapiProtector` در این محیط شاهد موفقیت نیست. آزمون parser فقط نحو و الگوی `else` را می‌سنجد؛ رفتار DPAPI باید با همان spec زیر حساب مالک PASS شود. نسخهٔ واقعی V2 یا کلید واقعی در این برش استفاده نشد.

## ۹. پرسش باز

هیچ تصمیم جدیدی برای مالک پیشنهاد نمی‌شود. Guardian باید نتیجهٔ اجرای مستقل DPAPI و تطابق bundle با مصرف‌کنندهٔ V2 را بازبینی کند.

## ۱۰. گام بعد

پس از commit محلی گزارش و Handoff، توقف کامل تا بازبینی Guardian. M2-3، M2-4، کلید واقعی و Push آغاز نمی‌شوند.

من کدکس هستم
