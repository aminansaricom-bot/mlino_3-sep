# گزارش اجرای G15-1 — مقاوم‌سازی تراکنش‌های Core

## ۱. کار اجراشده

یک CCR با وضعیت `DRAFT` برای تشخیص و طراحی مقاوم‌سازی تراکنش‌های Core تهیه شد. تشخیص‌های مجاز فقط در کپی‌های موقت بیرون از مخزن و روی PostgreSQL موقت انجام شد؛ هیچ تغییر محصولی اجرا نشد.

## ۲. منابع

- review سنجاق‌شده: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260915_CLAUDE_REVIEW_G14A3_COMPLETE_G15_1_RELEASE.md` در commit `d20ad7cfeff48ca8b3f28bb0bdc284b4588139b3`.
- شواهد قبلی: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2C_CONCURRENCY_DIAGNOSIS.md`.
- `origin/main:implementation/foundation/prisma-client.ts:1-9`.
- `origin/main:implementation/core/repositories.ts:4-9`.
- سرویس‌های دارای transaction و Dockerfile که در CCR با file:line ذکر شده‌اند.

## ۳. پیش‌شرط GW2/GW2-P

| مورد | نتیجه |
|---|---|
| `git fetch origin` | شکست شبکه، exit 128؛ Git config و credential دست نخورد. |
| pinned commit | `CAT_FILE_EXIT=0` |
| ancestor check | `ANCESTOR_CHECK_EXIT=0` |
| pinned review | `PINNED_REVIEW_SHOW_EXIT=0` |
| SHA-256 بایت‌های `git show` | `1bffdb3f275f1e807459e10324a05ec8226aeb1f1e258ca0ca1bde264b87fb96` |
| نتیجه | `GW2-P_PASS` |

خروجی خام در `mlino2/validation/g15-1/precondition.log` است.

## ۴. دامنه فایل‌ها

### تغییرکرده

- CCR جدید در `implementation/remediation/CONTRACT_CHANGE_REQUESTS/` با وضعیت DRAFT.
- `mlino2/validation/g15-1/run-g15-diagnostics.ps1` و شواهد آن.
- این گزارش و یک ورودی append-only در Handoff.

### تغییرنکرده

هیچ فایل محصولی، `schema.prisma`، migration، `errors.ts`، `error-adapter.ts`، `foundation/prisma-client.ts`، serviceهای موجود، آزمون‌های موجود، Dockerfile، package files، main، V2 یا `_PUSH_STAGING` تغییر نکرده است.

## ۵. اجرای R1 و جدول diagnostic runs

سه کپی مستقل از `implementation/` بیرون از مخزن ساخته شدند. instrumentation فقط در همان کپی‌ها قرار گرفت. برای هر حالت یک PostgreSQL 16 با tmpfs روی `127.0.0.1:5499` ساخته شد، هفت migration اعمال شد، Jest با `--runInBand` اجرا شد و container حذف شد.

| کپی | تنظیم transaction | pool | نتیجه | raw code |
|---|---|---|---|---|
| `default` | پیش‌فرض Prisma؛ بدون option صریح | بدون `connection_limit` صریح | ۲۸ suite و ۳۶۰ تست موفق | هیچ `P2028/P2034` |
| `extended` | `maxWait=10000ms`, `timeout=15000ms` فقط در کپی | بدون `connection_limit` صریح | ۲۸ suite و ۳۶۰ تست موفق | هیچ `P2028/P2034` |
| `pool1` | پیش‌فرض Prisma | `connection_limit=1` فقط در کپی | ۲۸ suite و ۳۶۰ تست موفق | هیچ `P2028/P2034` |
| شواهد تاریخی G14a-2c | `maxWait=2000ms`, `timeout=5000ms` | در گزارش قبلی صریح نشده | ۶ شکست از ۶ در head و baseline | `P2028` |

نتیجه‌ی factual: سه اجرای تازه P2028 را بازتولید نکردند؛ شواهد قبلی آن را در baseline هم نشان می‌دهد. علت قطعی از این اجراها استخراج نمی‌شود. زمان ورود/خروج `lockOrganization` ثبت شد و در اجرای تازه کوتاه بود؛ زمان دقیق acquire connection از pool برای G15-2 باقی می‌ماند.

## ۶. گزینه‌های R2 و پیشنهاد

| گزینه | پیامد |
|---|---|
| A — helper مشترک با `maxWait/timeout` صریح | رفتار متمرکز و قابل audit؛ خطر انتظار طولانی‌تر و نگه‌داری بیشتر connection. |
| B — نگاشت `P2028/P2034` به خطای retryable | failure پایدارتر؛ نیازمند تصمیم درباره‌ی `CoreErrorCode` جدید در برابر `CONFLICT`. |
| C — retry محدود داخل service | برای read/idempotent کم‌خطرتر؛ برای mutation خطر اثر دوگانه و نیاز به idempotency. |
| D — تنظیم `connection_limit`/pool | ظرفیت قابل پیش‌بینی‌تر؛ مقدار نادرست موجب starvation یا فشار DB می‌شود. |

پیشنهاد واحد این سند: ابتدا گزینه A در CCR اجرایی جداگانه، پس از اندازه‌گیری G15-2؛ در همان مرحله retry عمومی اضافه نشود. این پیشنهاد تصمیم مالک نیست.

## ۷. تعیین‌پذیری R3

هدف پذیرش G15-2: مجموعه‌ی کامل V1 و Core روی DB تازه، در ۱۰ اجرای متوالی سبز شود و log کامیت‌شده داشته باشد. هر run باید barrier شروع، زمان acquire، ورود callback، زمان قفل، commit/rollback، نام آزمون و raw code را ثبت کند؛ شکست نباید با retry درون آزمون پنهان شود.

## ۸. اثر R4

در صورت تصویب A، helper/کلاینت Foundation و همه‌ی سرویس‌های دارای `$transaction` درگیر می‌شوند: Bootstrap، BusinessProfile، Capability، Evidence، IdentityClaim، IdentityVerification، Membership، Offer، PermissionGrant و Publication. در صورت تصویب B، `error-adapter.ts` و شاید `errors.ts` نیز درگیر می‌شوند. [مرجع call siteها: `origin/main:implementation/core/bootstrap-service.ts:24`; `business-profile-service.ts:31-84`; `capability-service.ts:33-76`; `evidence-service.ts:34-92`; `identity-claim-service.ts:24-57`; `identity-verification-service.ts:33-79`; `membership-service.ts:20-56`; `offer-service.ts:38-92`; `permission-grant-service.ts:16-53`; `publication-service.ts:33-34`]

برای این مسئله schema یا migration انتظار نمی‌رود، چون شواهد به transaction acquisition، pool و error mapping مربوط‌اند. Dockerfile فعلی `core` را در read-api image کپی نمی‌کند. [مرجع: `origin/main:implementation/Dockerfile:31-37,55-58`]

## ۹. تفکیک تشخیص از اجرا

همه‌ی instrumentation موقت فقط در کپی‌های خارج از repository بود. worktree محصول، schema، migration، backend و آزمون source تغییر تشخیصی نگرفتند. کپی‌ها حذف شدند و `THROWAWAY_COPIES_REMOVED=True` ثبت شد.

## ۱۰. ایمنی و پاک‌سازی

- PostgreSQL فقط با `postgres:16-alpine`، tmpfs و port 5499 اجرا شد.
- فهرست container و volume پیش و پس از اجرا ثبت شد و تغییر نکرد.
- سه container با `docker rm -f` حذف شدند.
- redaction check برای evidence logها صفر match برای URL اتصال، مقدار password و مقدار `DATABASE_URL` دارد.
- هیچ اتصال به `mlino-v1-local-db`، port 5435 یا `_PUSH_STAGING` انجام نشد.

## ۱۱. جدول R1 تا R5

| شناسه | بخش | وضعیت |
|---|---|---|
| R1 | مسئله، شواهد و diagnostic runs در CCR/گزارش | انجام شد؛ علت نهایی قطعی نیست. |
| R2 | گزینه‌های A تا D و یک پیشنهاد | انجام شد؛ تصمیم مالک باز است. |
| R3 | طرح تعیین‌پذیری و هدف ۱۰ run | انجام شد؛ ۱۰ run هنوز اجرا نشده است. |
| R4 | فایل‌ها، سرویس‌ها، schema/migration و read-api | انجام شد؛ تغییر محصولی اجرا نشده است. |
| R5 | پرسش‌های مالک با گزینه و پیشنهاد | انجام شد؛ هیچ تصمیمی گرفته نشد. |

## ۱۲. هش‌های LF

هش‌ها با UTF-8 بدون BOM و پایان خط LF محاسبه شده‌اند؛ manifest کامل در `mlino2/validation/g15-1/LF-MANIFEST.txt` است.

| مسیر | SHA-256 |
|---|---|
| CCR | `838947a877c9014b6c2dda6abe957bcfc399c78dd1f3dffd719e80db07e2bcf8` |
| `cleanup.log` | `cdb03a57d9fd0bad502edbfef156a5c14ef2c65d7fdfcbdc607589785ec1c20b` |
| `default.log` | `9534b94d6a2cec252bb70defaf08e8e68fe875a5edc66f51f034f34aa1e0e3f6` |
| `diagnostic-summary.json` | `f6cc019d13445c80b6421aa112a12326958da85dee2e4003e425c402163e5ee0` |
| `environment.txt` | `35bbc92fc1e2ecc4590ea062f0e1d544d251dfe8275d1223bbdb5b356acff348` |
| `extended.log` | `4c7d2a497236dc54627adcc128a1571556f2c8cb231f72fe3d147259c4b5a7b0` |
| `pool1.log` | `8ef6f253c918fee0329f4a56cdaad7c0faea0ea8df24143b6644e228d3e51bf5` |
| `precondition.log` | `150e8f145f4529c20e6d1be622cf9ded89e016edb11a53a9eddf04dc67f04858` |
| `redaction-check.log` | `ce81b449926b296c812bf5a764a08f9b94dbabdd4a15b07211614241ea59413a` |
| `run-g15-diagnostics.ps1` | `147445ee855abbde62b60f141efd8ab740db307e786ddd54cb4f4b9c6daeb55f` |

## ۱۳. وضعیت تحویل

**G15-1 از نظر سند و تشخیص تکمیل شد؛ CCR همچنان DRAFT است.** هیچ implementation، schema، migration، retry، تغییر error code یا تصمیم معماری اعمال نشده است.

**Commit hashهای محلی:** `91060e53a0417e74f6b9d006cdd2c9134d0ca3b9` و `d71f9e917e71985634b0e10bdd3eba69532b5bd4`؛ گزارش در commit نهایی ثبت می‌شود.

من کدکس هستم.

