# گزارش اجرای U3 — ابزار Offerهای نمونه

- **Instruction:** `CODEX-20260920-U3-SAMPLE-OFFERS-TOOL-001`
- **Target handoff:** `HANDOFF-20260920-OWNER-DECISION-WEB-FIRST-U3`
- **Workstream:** `HANDOFF-20260918-TEST-SEED`
- **Branch:** `codex/test-seed-vanak`
- **Start HEAD:** `3ecf7f5e428e87d33ef1cff77a61316ede514373`
- **Merge commit:** `c9d03fcd25a13e750b06eba43f531df2350b7e63`
- **Code commit:** `2a7dc57610ee188d944765e5c6972f857bc46758`
- **Evidence commit:** `f957c5d28f368f7c933805577694968d5e27e514`
- **Status:** `IMPLEMENTED_LOCALLY_INTEGRATION_VALIDATION_BLOCKED_BY_UNAVAILABLE_DISPOSABLE_DB`

## 1. Task executed

یک subcommand جدید `offers` برای ابزار test-seed پیاده شد. ورودی JSON فقط از مسیری بیرون repository پذیرفته می‌شود، parser سخت‌گیر کدهای خطای ثابت دارد، markerها و prefix رسمی را بررسی می‌کند، و Offer را فقط از مسیر serviceهای رسمی Core ایجاد و منتشر می‌کند. cleanup موجود نیز OfferVersionهای نمونهٔ منتشرشده را با `PublicationService.withdraw` کنار می‌گذارد و هیچ ردیفی حذف نمی‌کند.

## 2. Source documents used

- `2fe67bed04c9deacf9d2b0556a248225964bd638:AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_DECISION_WEB_FIRST_AND_U3.md`
- `6f2c8a58f1cbbb441ff09a10d9b3e6f094e2aa19:mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md`، بخش 6/R4 و بخش آزمون U3
- سرویس‌های مصوب Core در `implementation/core/offer-service.ts` و `implementation/core/publication-service.ts`

`git fetch origin` به‌دلیل محدودیت شبکه شکست خورد. GW2-P کامل و موفق بود: commit موجود، ancestor نسبت به `origin/main` و SHA-256 برابر `1ab6ac6aa4593596874a96749e6ec157a8f42e03c0c3da6b1936c98ec9f794b3`. سپس `e7a99be7f8ba8d61170b4e0b3984d06fafad8d0c` بدون تعارض با merge معمولی وارد شاخه شد.

## 3. Files changed

- `implementation/tools/test-seed/offers.ts` — parser، file reader، guard، idempotency و orchestration رسمی Core
- `implementation/tools/test-seed/cli.ts` — subcommand جدید `offers`
- `implementation/tools/test-seed/withdraw.ts` — withdraw کردن OfferVersionهای markerشده بدون حذف داده
- `implementation/test/tools/test-seed/offers.spec.ts` — parser و توالی تماس‌های Core
- `implementation/test/tools/test-seed/offers.integration.spec.ts` — سناریوی DB موقت برای 3 business و 4 Offer
- `implementation/validation/u3/**` — شواهد
- این گزارش و append-only Handoff

## 4. Files not changed

هیچ فایل `core/**`، `public-export/**`، schema، migration، package/lockfile یا V2 تغییر نکرد. هیچ دادهٔ واقعی، کلید واقعی، Docker، پورت 5435، `_PUSH_STAGING`، main یا push استفاده نشد.

## 5. Core call sequence and traceability

توالی اجرایی در `implementation/tools/test-seed/offers.ts:101-126`:

1. `OfferService.create` در خط 108؛ امضای سرویس در `implementation/core/offer-service.ts:34`.
2. `OfferService.createVersion` در خط 109؛ امضای سرویس در `implementation/core/offer-service.ts:48`.
3. `OfferService.linkCapability` اختیاری در خط 124؛ امضای سرویس در `implementation/core/offer-service.ts:80`.
4. `PublicationService.publish('OFFER_VERSION', version.id, ...)` در خط 126؛ امضای سرویس در `implementation/core/publication-service.ts:20`.

| الزام | آزمون دقیق | نتیجه |
|---|---|---|
| shape/unknown field و کد ثابت | `shape rejection has the exact fixed code`؛ `unknown field rejection has the exact fixed code` | PASS |
| prefix رسمی | `wrong prefix rejection has the exact fixed code` | PASS |
| marker در terms | `missing terms marker rejection has the exact fixed code`؛ `accepts a marker-bearing terms object without echoing fields into errors` | PASS |
| بازهٔ اعتبار | `bad validity window rejection has the exact fixed code` | PASS |
| idempotency ورودی | `duplicate offer keys are rejected` | PASS |
| توالی service و انتشار version | `publishes only the created version after create, createVersion and optional capability link` | PASS |
| 3 business، 4 Offer، export/expiry/idempotency/withdraw/history | `seeds four marked offers, exports only three active offers, is idempotent and withdraws without decreasing rows` | **NOT RUN — DB 5499 unavailable** |

## 6. Tests executed

- `npm run build` سه بار.
- Jest روی `offers.spec.ts`، `parse-map.spec.ts` و `verifier.spec.ts` سه بار با `--runInBand`.
- سه Mutation در کپی throwaway:
  1. حذف الزام marker.
  2. پذیرش offer key بدون prefix.
  3. انتشار با Offer ID به‌جای OfferVersion ID.
- بررسی TCP برای `127.0.0.1:5499`؛ اتصال timeout شد. طبق ممنوعیت دستور، Docker راه‌اندازی نشد.

در اجرای اولیه، worktree فاقد `node_modules` بود. یک junction موقت به dependencyهای worktree غیرممنوع ساخته شد، ولی Prisma Client آن قدیمی بود. junction حذف شد؛ dependencyها به `node_modules` gitignored همین worktree کپی و Prisma Client فقط در همین کپی محلی regenerate شد. هیچ package یا lockfile تغییر نکرد.

## 7. Test results

| دور | Build | Suites | Tests |
|---|---:|---:|---:|
| 1 | PASS | 3/3 | 27/27 |
| 2 | PASS | 3/3 | 27/27 |
| 3 | PASS | 3/3 | 27/27 |

هر سه Mutation با شکست دقیق آزمون مربوط تشخیص داده شد. آزمون integration اجرا نشد و بنابراین پذیرش نهایی رفتار DB، export و withdraw ادعا نمی‌شود.

## 8. Evidence and hashes

شواهد در `implementation/validation/u3/` قرار دارند: سه run log، `mutation.log`، `integration-unavailable.log`، `precondition.log`، `scope.log` و `LF-MANIFEST.txt`. Manifest شامل SHA-256 بایت‌های `git show` برای پنج فایل کد و SHA-256 نسخهٔ LF-normalized برای هفت log است. Leak scan برای شمارهٔ موبایل، connection string، private key و نام واقعی PASS شد.

## 9. Remaining risks and open questions

- آزمون یکپارچه روی PostgreSQL موقت اجرا نشده است؛ این یک مانع پذیرش U3 است و Guardian باید آن را روی DB disposable پورت 5499 اجرا کند.
- ورودی `terms` اختیاری است؛ هر terms object موجود باید marker رسمی را داشته باشد. fixture یکپارچه برای Offerهای قابل نمایش از terms استفاده نمی‌کند تا با validator فعلی `public-business.v1` ناسازگار نشود.
- هیچ اجرای ابزار روی دیتابیس مالک مجاز یا انجام نشده است؛ آن مرحله طبق سند نیازمند تصویب تازهٔ مالک است.

## 10. Recommended next step

Guardian روی PostgreSQL یک‌بارمصرف پورت 5499، migrationها را اعمال و آزمون `offers.integration.spec.ts` را اجرا کند. پس از قبولی آن، کد و شواهد را بازبینی کند. هیچ اجرای دیتابیس مالک، push یا مرحلهٔ بعدی به‌صورت خودکار انجام نشود.

من کدکس هستم

## توقف پیش‌شرط U3c — commit الزامی در دسترس نیست

- **Instruction:** `CODEX-20260920-U3C-OFFER-TERMS-CONTRACT-001`
- **Pinned review:** `6ce1bdc7b85c0ffd9c6841cd2fe609bc87536444:AI_HANDOFF/CLAUDE_REVIEWS/20260920_CLAUDE_U2_MERGE_U3_RUN_AND_U3C.md`
- **Required branch HEAD:** `95b68103f0f299f3e48dc3567d8f60733f47080e`
- **Actual local HEAD:** `05c47d4a72941cb2f39babfaf8ce5696b4d1f776`
- **Status:** `STOPPED_AT_PRECONDITION`

Pinned review با GW2-P معتبر شد: `cat-file` و ancestor موفق بودند و SHA-256 بایت‌های `git show` دقیقاً `ea54b52d92cc3f27a0d8e116d7b5ec0bb86e716de3c474eb0260db5c13c2cf7f` بود.

همگام‌سازی شاخه ممکن نشد:

1. `git fetch origin` در sandbox به علت نبود اتصال شبکه شکست خورد.
2. تکرار fetch با دسترسی شبکه، پیش از اتصال با خطای Git `dubious ownership` متوقف شد؛ process بیرون sandbox با حساب مالک اجرا می‌شود ولی worktree متعلق به حساب sandbox است.
3. commit الزامی `95b6810...` در object store محلی موجود نبود و `origin/codex/test-seed-vanak` هنوز روی `4a51ed9...` بود.
4. تغییر یا دور زدن `safe.directory` طبق دستور ممنوع بود و انجام نشد.

هیچ فایل ابزار، آزمون، contract، builder یا Core برای U3c تغییر نکرد؛ هیچ تست، DB، Docker، کلید، push، rebase یا amend انجام نشد. ادامه نیازمند در دسترس قرار گرفتن commit `95b6810...` در object store یا دستور جدید Guardian با روش همگام‌سازی مجاز است.

من کدکس هستم

## اصلاحیه U3b — Price mode و استقلال آزمون‌ها

- **Instruction:** `CODEX-20260920-U3B-SAMPLE-OFFERS-FIXES-001`
- **Guardian review:** `8298a4b77fd9d2a0e7de94a8f412950f16ad4a5c:AI_HANDOFF/CLAUDE_REVIEWS/20260920_CLAUDE_REVIEW_U3_SAMPLE_OFFERS.md`
- **Code commit:** `a750a205b2139d8d50c556544e33d26f36b17de2`
- **Evidence commit:** `ec191a791435fe011a739316731a568669f78dd8`
- **Status:** `FIXES_IMPLEMENTED_LOCALLY_INTEGRATION_VALIDATION_BLOCKED_BY_UNAVAILABLE_DISPOSABLE_DB`

### اصلاح F1

قاعدهٔ ابزار اکنون دقیقاً با CHECK دیتابیس در `implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:690-694` هم‌راستا است:

- `on_request=true` فقط بدون قیمت و currency پذیرفته می‌شود.
- حالت غیر on-request فقط با جفت کامل `price_amount` و `price_currency` پذیرفته می‌شود.
- نبود هر دو mode یا ترکیب on-request با هر جزء قیمت با کد ثابت `TEST_SEED_OFFER_PRICE_MODE` پیش از اولین Core call رد می‌شود.
- fixtureهای `linked` و `expired` به‌صورت صریح `on_request=true` شدند.

آزمون‌های تازه/تغییریافته:

- `missing price mode rejection has the exact fixed code`
- `on-request with a price pair rejection has the exact fixed code`
- `invalid price mode is rejected before any Core call`

آزمون سوم Core doubleهایی دارد که در صورت فراخوانی خطا می‌دهند و علاوه بر کد خطا، `not.toHaveBeenCalled()` را بررسی می‌کند.

### اصلاح F2

دو integration spec اکنون rangeهای جدا دارند:

- Offer spec: `test-vanak-81..83`
- Seed spec: `test-vanak-91..93`

تمام filterهای export، countها، withdraw و archive فقط IDهای همان spec را مصرف می‌کنند. تابع `withdrawVanakBusinesses` یک فیلتر اختیاری organization IDs برای آزمون‌ها دارد؛ CLI واقعی بدون این آرگومان رفتار قبلی و دامنهٔ کامل test-vanak را حفظ می‌کند. هیچ DELETE یا cleanup مخربی اضافه نشد.

### اعتبارسنجی U3b

GW2-P کامل و موفق بود؛ SHA-256 برابر `d1eaee4800b7a9aa15673d437214d80cc55980dd4bc34fdf20a5d2dd608c4b59` شد.

| اجرا | نتیجه |
|---|---|
| `npm run build` | PASS |
| سه spec غیر DB | 3/3 suite و 30/30 test PASS |
| مجموعهٔ کامل `test/tools/test-seed` روی DB تازه، سه بار | NOT RUN — `localhost:5499` در دسترس نبود |

Docker طبق دستور استفاده نشد. پورت 5435، دیتابیس مالک، شبکه، کلید واقعی و Push استفاده نشدند. شواهد و LF SHA-256 در `implementation/validation/u3b/LF-MANIFEST.txt` ثبت شده‌اند. هنگام ثبت شواهد، سه log ابتدا به‌دلیل working directory در مسیر تودرتوی اشتباه ساخته شدند؛ پیش از stage به مسیر مجاز منتقل و مسیر اشتباه حذف شد. هیچ فایل اشتباهی commit نشد.

### گام بعد

Guardian باید مجموعهٔ کامل `test/tools/test-seed` را سه بار، هر بار روی PostgreSQL موقت تازه در پورت 5499 اجرا کند. تا آن زمان پذیرش integration و اجرای ابزار روی دیتابیس مالک همچنان مسدود است.

من کدکس هستم

## U3c — هم‌راستاسازی قرارداد terms پیشنهاد

- **Instruction:** `CODEX-20260920-U3C-OFFER-TERMS-CONTRACT-002`
- **Pinned review:** `d00376f8b904315c252e07642fde5970cc664daa:AI_HANDOFF/CLAUDE_REVIEWS/20260920_U3C_002_OBJECT_AVAILABLE.md`
- **Merge commit:** `e28746b0e4c4db19b122593f4d0ffe81d4a75158`
- **Code commit:** `4313480bab007cacd42f647526f48e9b9bf3509c`
- **Evidence commit:** `3a10b06`
- **Status:** `IMPLEMENTED_LOCALLY_INTEGRATION_VALIDATION_BLOCKED_BY_UNAVAILABLE_DISPOSABLE_DB`

### تغییر قرارداد

ابزار seed اکنون قرارداد عمومی موجود در `implementation/public-export/builder.ts:140-144` را پیش از هر Core call اعمال می‌کند. `terms` فقط سه کلید `schema_version`، `summary` و `conditions` را می‌پذیرد. نسخه باید دقیقاً `mlino.offer-terms.v1` باشد؛ summary باید غیرخالی، حداکثر ۲۰۰۰ نویسه و بدون angle bracket باشد؛ conditions باید حداکثر ۳۰ رشتهٔ غیرخالی، هرکدام حداکثر ۱۰۰۰ نویسه و بدون angle bracket باشد. هر نقض با کد ثابت `TEST_SEED_OFFER_TERMS_CONTRACT` رد می‌شود.

اگر ورودی terms نداشته باشد، ابزار یک شیء معتبر با summary شامل «آزمایشی» می‌سازد. نشان دادهٔ آزمایشی فقط در `offer_key`، نام، توضیح کوتاه و summary نگه داشته می‌شود و کلید اضافهٔ `test_marker` در terms تولید یا پذیرفته نمی‌شود.

### آزمون‌های افزوده یا تقویت‌شده

- `extra terms key rejection has the exact fixed code`
- `wrong terms schema rejection has the exact fixed code`
- `empty terms summary rejection has the exact fixed code`
- `non-string terms condition rejection has the exact fixed code`
- `too many terms conditions rejection has the exact fixed code`
- `terms omitted builds contract-valid traceable terms`
- `accepts contract-valid terms unchanged`
- `seeds four marked offers, exports only three active offers, is idempotent and withdraws without decreasing rows` اکنون یک Offer دارای terms معتبر می‌سازد و برابری terms خروجی را بررسی می‌کند.

اصلاح Guardian در commit `95b6810` نیز با merge عادی وارد شد. آزمون integration اکنون `asOf` را دو بار از ساعت اجرای واقعی می‌سازد و هیچ تاریخ ثابت `2026-09-20T12:00:00Z` یا `12:01:00Z` در آن باقی نمانده است.

### Mutation proof

| Mutation | آزمون نام‌دار شکست‌خورده | نتیجه |
|---|---|---|
| پذیرش دوبارهٔ کلید اضافه در terms | `extra terms key rejection has the exact fixed code` | PASS — mutation با ۱ شکست از ۱۸ آزمون شناسایی شد |
| تولید schema_version نادرست برای terms پیش‌فرض | `terms omitted builds contract-valid traceable terms` | PASS — mutation شناسایی شد؛ آزمون توالی Core نیز به‌سبب revalidation شکست خورد |

Mutationها فقط در کپی موقت اجرا شدند؛ کپی پس از اجرا حذف شد و هیچ تغییر mutation در worktree باقی نماند.

### اعتبارسنجی

| بررسی | نتیجه |
|---|---|
| GW2-P و SHA-256 pinned review | PASS |
| object و remote-tracking commit `95b6810` | PASS |
| merge بدون conflict | PASS |
| `npm run build` | PASS |
| آزمون‌های غیر DB | ۳ suite و ۳۵ test PASS |
| PostgreSQL موقت `localhost:5499` | در دسترس نبود |
| integration و سه اجرای کامل روی DB تازه | NOT RUN — Docker طبق دستور ممنوع بود |
| leak scan | PASS |
| تغییر public builder/Core/schema/migration/package | انجام نشد |
| Push | انجام نشد |

شواهد در `implementation/validation/u3c/` ثبت شده‌اند و `LF-MANIFEST.txt` SHA-256 فایل‌های تغییرکرده و logها را نگه می‌دارد. هیچ اتصال به پورت 5435 یا دیتابیس مالک، Docker، شبکه، کلید واقعی یا `_PUSH_STAGING` انجام نشد.

### ریسک و گام بعد

پذیرش نهایی integration هنوز به اجرای کل مجموعهٔ `test/tools/test-seed` در سه PostgreSQL موقت تازه روی پورت 5499 نیاز دارد. Guardian باید این مرحله را اجرا و نتیجه را بازبینی کند؛ اجرای ابزار روی دیتابیس مالک همچنان مجاز نیست.

من کدکس هستم
