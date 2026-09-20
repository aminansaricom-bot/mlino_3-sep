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
