# CCR — مقاوم‌سازی تراکنش‌های Core

**وضعیت:** DRAFT

**هدف:** ثبت مسئله، شواهد تشخیصی و گزینه‌های تصمیم‌گیری برای خطاهای تراکنش تعاملی Prisma در آزمون‌های رقابتی Core.

**دامنه‌ی این CCR:** تشخیص و طراحی تغییر احتمالی برای لایه‌ی تراکنش Core. این سند هیچ تغییر محصولی را تصویب یا اجرا نمی‌کند.

**مبنای کد:** `origin/main` در مسیرهای ذکرشده در هر ارجاع؛ worktree تشخیصی `d20ad7cfeff48ca8b3f28bb0bdc284b4588139b3`.

## ۱. مسئله

در شش آزمون رقابتی قبلی، Prisma خطای `P2028` با پیام `Unable to start a transaction in the given time` تولید کرده است. شواهد مستقل ثبت کرده‌اند که این رفتار هم در کد پیش از G14a و هم در کد پس از G14a دیده شده و در آن اجرا ۶ شکست از ۶ شکست در هر دو کپی مشاهده شده است؛ بنابراین این CCR علت را به G14a نسبت نمی‌دهد. [مرجع: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2C_CONCURRENCY_DIAGNOSIS.md:15-25`]

## ۲. انگیزه

Core چند عملیات را با تراکنش تعاملی Prisma اجرا می‌کند و درون callback تراکنش، ابتدا سازمان را با `FOR UPDATE` قفل می‌کند. کد فعلی کلاینت را به‌صورت یک نمونه‌ی مشترک و بدون `transactionOptions` صریح می‌سازد. [مرجع: `origin/main:implementation/foundation/prisma-client.ts:1-9`; `origin/main:implementation/core/repositories.ts:4-9`]

هدف این CCR آن است که رفتار شروع تراکنش در فشار رقابتی قابل توضیح و قابل تکرار شود، خطای زیرساختی به caller به‌صورت پایدار ارائه شود، و آزمون‌های race بدون اتکا به شانس محیط سبز شوند.

## ۳. شواهد و ریشه‌یابی R1

### ۳.۱ تنظیمات transaction

در کد Core هیچ مقدار `maxWait` یا `timeout` به `$transaction` یا سازنده‌ی `PrismaClient` داده نشده است؛ بنابراین اجرای فعلی از پیش‌فرض Prisma نسخه‌ی ثابت‌شده‌ی 5.22.0 استفاده می‌کند. نسخه در هر دو dependency و devDependency برابر 5.22.0 است. [مرجع: `origin/main:implementation/foundation/prisma-client.ts:9`; `origin/main:implementation/package.json:22-35`]

شاهد منتشرشده‌ی قبلی مقدارهای پیش‌فرض مورد بررسی را `maxWait=2000ms` و `timeout=5000ms` ثبت کرده و پیام خام را `P2028` گزارش کرده است. این اعداد در این CCR به‌عنوان واقعیت runtime ثبت می‌شوند، اما تغییرشان هنوز تصمیم یا اجرا نشده است. [مرجع: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2C_CONCURRENCY_DIAGNOSIS.md:20-23`]

### ۳.۲ pool و connection limit

کلاینت Foundation یک نمونه‌ی مشترک است و `connection_limit` صریح در سازنده‌ی کلاینت ندارد. مقدار pool در تنظیم فعلی از قرارداد پیش‌فرض Prisma/URL می‌آید و در فایل‌های Core عدد ثابتی برای آن تعریف نشده است؛ به همین دلیل تعداد دقیق اتصال مؤثر، بدون مشاهده‌ی runtime یا تنظیم صریح URL، از روی کد قابل ادعا نیست. [مرجع: `origin/main:implementation/foundation/prisma-client.ts:4-9`; `origin/main:implementation/package.json:22-35`]

در تشخیص G15-1 سه حالت با همین head اجرا شد: URL بدون `connection_limit`، URL با `connection_limit=1`، و URL بدون محدودیت صریح همراه با `transactionOptions` بزرگ‌تر در کپی موقت. هر سه حالت در پایگاه PostgreSQL 16 با storage از نوع tmpfs سبز شدند؛ پس این اجرا اثر قطعی pool را جدا نکرد و برای تصمیم نهایی به مشاهده‌ی runtime در G15-2 نیاز است. [مرجع شواهد: `mlino2/validation/g15-1/diagnostic-summary.json`; `mlino2/validation/g15-1/default.log`; `mlino2/validation/g15-1/extended.log`; `mlino2/validation/g15-1/pool1.log`]

### ۳.۳ آیا اتصال هنگام انتظار روی قفل نگه داشته می‌شود؟

`lockOrganization` داخل callback تراکنش اجرا می‌شود و query آن `SELECT ... FOR UPDATE` است. بنابراین callback فقط پس از فراهم‌شدن transaction اجرا می‌شود؛ instrumentation موقت G15-1 زمان ورود و خروج از همین قفل را ثبت کرد. در سه اجرای جدید، زمان قفل کوتاه بود و هیچ خطای خام `P2028` ثبت نشد. این شواهد نشان نمی‌دهد که قفل سازمان علت مستقیم «شروع نشدن تراکنش» است؛ P2028 پیش از رسیدن به مسیر قفل محتمل‌تر است، اما برای اثبات کامل باید زمان دریافت connection نیز در G15-2 ثبت شود. [مرجع: `origin/main:implementation/core/repositories.ts:6-9`; `origin/main:implementation/core/business-profile-service.ts:31-32`; شواهد: `mlino2/validation/g15-1/*.log`]

### ۳.۴ فشار میزبان

در تشخیص قبلی، هنگام شکست‌ها ۷ container فعال و بار CPU بین ۳۰ تا ۵۸ درصد ثبت شده بود. [مرجع: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2C_CONCURRENCY_DIAGNOSIS.md:20-23`]

در اجرای مستقل G15-1، پیش از هر حالت تعداد containerهای در حال اجرا و بار CPU ثبت شد؛ هر حالت روی یک container تازه اجرا و سپس حذف شد و فهرست volumeهای قبل و بعد ثبت شد. هر سه حالت ۲۸ suite و ۳۶۰ آزمون موفق داشتند و هیچ raw code نداشتند. این تفاوت، وابستگی خطا به زمان‌بندی و فشار محیط را محتمل می‌کند، اما وجود فشار را به‌تنهایی علت اثبات‌شده اعلام نمی‌کند. [مرجع شواهد: `mlino2/validation/g15-1/cleanup.log`; `mlino2/validation/g15-1/default.log`; `mlino2/validation/g15-1/extended.log`; `mlino2/validation/g15-1/pool1.log`]

## ۴. نتیجه‌ی تشخیصی

نتیجه‌ی فعلی محدود است:

1. P2028 در سابقه‌ی G14a-2c در هر دو کپی head و baseline دیده شده و پسرفت G14a محسوب نشده است. [مرجع: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2C_CONCURRENCY_DIAGNOSIS.md:17-25`]
2. در اجرای مستقل G15-1، تنظیم پیش‌فرض، `maxWait/timeout` بزرگ‌تر، و `connection_limit=1` هر سه سبز شدند؛ بنابراین این اجرا هیچ‌یک از گزینه‌ها را به‌عنوان درمان قطعی ثابت نمی‌کند. [مرجع شواهد: `mlino2/validation/g15-1/diagnostic-summary.json`]
3. برای پاسخ قطعی درباره‌ی pool و زمان acquire، G15-2 باید اندازه‌گیری connection acquire، صف pool، زمان شروع callback، زمان انتظار lock و host load را هم‌زمان ثبت کند.

## ۵. گزینه‌های R2

### گزینه A — تنظیم صریح تراکنش با یک helper مشترک

یک helper مشترک در Foundation/Core همه‌ی `$transaction`های Core را با `maxWait` و `timeout` صریح اجرا کند؛ مقادیر دقیق در CCR اجرایی جداگانه تصویب شوند. همه‌ی سرویس‌های فعلی دارای تراکنش باید از همان helper عبور کنند. این گزینه مستلزم تغییر در helper/کلاینت و همه‌ی call siteهای تراکنش است، اما رفتار را یک‌جا و قابل audit می‌کند. ریسک آن طولانی‌ترشدن انتظار، پنهان‌کردن فشار pool و افزایش زمان نگه‌داری منابع است. [مرجع call siteها: `origin/main:implementation/core/bootstrap-service.ts:24`; `business-profile-service.ts:31-84`; `capability-service.ts:33-76`; `evidence-service.ts:34-92`; `identity-claim-service.ts:24-57`; `identity-verification-service.ts:33-79`; `membership-service.ts:20-56`; `offer-service.ts:38-92`; `permission-grant-service.ts:16-53`; `publication-service.ts:33-34`]

### گزینه B — نگاشت P2028 و P2034 به خطای پایدار قابل retry

`P2028` و `P2034` به‌جای `INTERNAL_ERROR` به یک خطای دامنه‌ی پایدار نگاشت شوند. وضعیت فعلی فقط خطای ناشناخته را به `INTERNAL_ERROR` می‌فرستد و error codeهای Core شامل `INTERNAL_ERROR` است. [مرجع: `origin/main:implementation/core/error-adapter.ts:1-62`; `origin/main:implementation/core/errors.ts:1-16`]

دو شکل قراردادی ممکن است:

- افزودن `RETRYABLE` یا `TRANSACTION_RETRYABLE` به `CoreErrorCode`؛ شفاف‌تر است ولی تغییر قرارداد خطاست.
- استفاده‌ی موقت از `CONFLICT`؛ تغییر قرارداد کمتری دارد ولی علت زیرساختی و conflict کسب‌وکاری را مخلوط می‌کند.

این گزینه به‌تنهایی تراکنش را موفق نمی‌کند؛ فقط رفتار failure را پایدار و قابل مشاهده می‌سازد.

### گزینه C — retry محدود داخل service

برای عملیات مشخص، retry محدود روی خطاهای retryable انجام شود. برای read یا عملیات idempotent ریسک کمتر است. برای publish، revoke، bootstrap، تصمیم verification و هر mutation چنداثری، retry می‌تواند اثر دوگانه، تکرار grant/publication یا نیاز به idempotency key ایجاد کند؛ transaction rollback باید قبل از هر retry ثابت شود. این گزینه بدون تعریف دامنه‌ی عملیات قابل اجرای عمومی نیست. [مرجع تراکنش‌های mutation: `origin/main:implementation/core/bootstrap-service.ts:24`; `origin/main:implementation/core/publication-service.ts:33-34`; `identity-verification-service.ts:33-79`]

### گزینه D — تنظیم connection limit و pool

`connection_limit` برای محیط test و runtime به‌صورت صریح تنظیم شود. برای test می‌تواند concurrency را با ظرفیت pool هماهنگ کند؛ برای runtime باید با ظرفیت PostgreSQL، تعداد processها و deployment تصمیم‌گیری شود. مقدار نامناسب می‌تواند starvation یا فشار بیش‌ازحد روی DB ایجاد کند. کد فعلی مقدار صریحی ندارد. [مرجع: `origin/main:implementation/foundation/prisma-client.ts:9`; `origin/main:implementation/package.json:22-35`]

### پیشنهاد واحد این CCR

پیشنهاد این سند: **گزینه A به‌عنوان اولین تغییر اجرایی**، همراه با اندازه‌گیری G15-2 و بدون retry خودکار در همان مرحله. گزینه B بعد از تعیین قرارداد خطا به‌صورت CCR جداگانه بررسی شود؛ گزینه C فقط برای عملیات فهرست‌شده و پس از بررسی idempotency مجاز شود؛ گزینه D ابتدا برای test و سپس با داده‌ی runtime بررسی شود. این پیشنهاد تصمیم مالک را جایگزین نمی‌کند.

## ۶. راهبرد تعیین‌پذیری R3

هدف پذیرش G15-2 این است: مجموعه‌ی کامل V1 و Core روی پایگاه موقت تازه، در ۱۰ اجرای متوالی سبز شود و log کامیت‌شده داشته باشد.

برای رسیدن به آن:

- هر اجرا container تازه با tmpfs و port 5499 داشته باشد؛
- raceها با barrier مشخص برای شروع هم‌زمان و ثبت ترتیب lock اجرا شوند؛
- زمان acquire تراکنش، ورود callback، شروع/پایان `FOR UPDATE` و commit/rollback با یک clock ثبت شوند؛
- خطاهای P2028/P2034 خام و نام آزمون ثبت شوند؛
- `maxWait`، `timeout` و pool در ماتریس ثابت و قابل تکرار تغییر کنند؛
- هر شکست به‌عنوان شکست همان run ثبت شود و با retry درون آزمون پنهان نشود؛
- نتیجه‌ی ۱۰ اجرای متوالی همراه با hash log منتشر شود.

## ۷. اثر و دامنه‌ی R4

در صورت تصویب گزینه A، فایل‌ها و نقاط درگیر عبارت‌اند از:

- `implementation/foundation/prisma-client.ts` یا helper مشترک Foundation برای تنظیم مشترک تراکنش؛
- `implementation/core/error-adapter.ts` برای نگاشت P2028/P2034 در صورت تصویب گزینه B؛
- `implementation/core/errors.ts` فقط اگر CoreErrorCode جدید تصویب شود؛
- همه‌ی سرویس‌هایی که `$transaction` دارند: Bootstrap، BusinessProfile، Capability، Evidence، IdentityClaim، IdentityVerification، Membership، Offer، PermissionGrant و Publication؛
- آزمون‌های Core و guardهای test، فقط در CCR اجرایی جداگانه و با پایگاه disposable.

هیچ تغییر در `schema.prisma` یا migration برای این CCR انتظار نمی‌رود، چون مسئله‌ی مشاهده‌شده مربوط به آغاز transaction، pool و error mapping است و مدل داده‌ای تازه‌ای لازم ندارد. این گزاره تا بررسی اجرایی خلافش را نشان ندهد معتبر است. [مرجع schema/migration فعلی: `origin/main:implementation/prisma/schema.prisma:1-655`; call siteها: ارجاع‌های بخش ۵]

اثر مستقیم بر read-api انتظار نمی‌رود؛ Dockerfile فعلی پوشه‌ی `core` را در image runtime کپی نمی‌کند و فقط مسیرهای foundation، feed، briefing، value-engines، composition و http را کپی می‌کند. [مرجع: `origin/main:implementation/Dockerfile:31-37`; `origin/main:implementation/Dockerfile:55-58`]

## ۸. تفکیک تشخیص از اجرا

تمام instrumentation این مرحله فقط در کپی‌های موقت خارج از repository اعمال شد. worktree محصول، schema، migration، backend و test source تغییر تشخیصی نگرفتند. فایل اجرایی تشخیص در `mlino2/validation/g15-1/run-g15-diagnostics.ps1` است و خود کپی‌ها پس از اجرا حذف شدند. [مرجع شواهد: `mlino2/validation/g15-1/cleanup.log`]

## ۹. ایمنی آزمون

پایگاه‌های تشخیصی با `postgres:16-alpine`، storage از نوع tmpfs و host port 5499 ساخته شدند. قبل و بعد از مجموعه‌ی اجرا فهرست container و volume ثبت شد و هر container با `docker rm -f` حذف شد. هیچ آزمونی به `mlino-v1-local-db` یا port 5435 متصل نشد و هیچ dump، credential یا connection string در evidence لاگ نشد. [مرجع: `mlino2/validation/g15-1/environment.txt`; `mlino2/validation/g15-1/cleanup.log`]

## ۱۰. rollback

این CCR در وضعیت DRAFT است و rollback اجرایی ندارد. اگر تغییر اجرایی بعداً تصویب و commit شود، بازگشت باید با `git revert` همان commit یا merge commit انجام شود؛ migration یا تغییر schema برای دامنه‌ی فعلی پیش‌بینی نشده است. هر rollback وابسته به retry یا error contract باید جداگانه در گزارش اجرایی ثبت شود.

## ۱۱. پرسش‌های باز مالک R5

### S-G15-1-1 — قرارداد خطای retryable

- **A:** افزودن `TRANSACTION_RETRYABLE` به `CoreErrorCode`؛ معنای روشن‌تر، تغییر قرارداد خطا.
- **B:** استفاده از `CONFLICT`؛ بدون کد تازه، اما با معنای مشترک با conflict دامنه.
- **پیشنهاد:** A، مشروط به تصویب قرارداد transport و مصرف‌کننده.

### S-G15-1-2 — مقادیر صریح transaction options

- **A:** مقدار محافظه‌کارانه‌ی `maxWait` با timeout فعلی.
- **B:** افزایش هر دو مقدار برای raceهای Core.
- **C:** مقدار متفاوت برای test و runtime.
- **پیشنهاد:** C فقط پس از اندازه‌گیری pool و تصویب operational policy؛ عدد نهایی باز است.

### S-G15-1-3 — retry خودکار

- **A:** بدون retry در Core؛ caller تصمیم بگیرد.
- **B:** retry محدود فقط برای عملیات read/idempotent.
- **C:** retry در helper مشترک برای همه‌ی mutationها.
- **پیشنهاد:** B، پس از فهرست‌کردن عملیات idempotent و آزمون rollback.

### S-G15-1-4 — connection limit

- **A:** فقط در test صریح شود.
- **B:** در runtime نیز از configuration deployment خوانده شود.
- **C:** فعلاً بدون تغییر و فقط مشاهده‌ی pool.
- **پیشنهاد:** A در G15-2 و B پس از داده‌ی deployment؛ تصمیم نهایی باز است.

هیچ‌یک از S-G15-1-1 تا S-G15-1-4 در این CCR تصمیم‌گیری نشده است.

## ۱۲. ماتریس انطباق

| اصل | وضعیت این CCR |
|---|---|
| Core و Module جدا | فقط Core transaction boundary بررسی می‌شود؛ ماژول جدیدی ایجاد نمی‌شود. |
| V1 مالک business truth | حفظ می‌شود؛ هیچ داده‌ی کسب‌وکاری یا connector تغییر نمی‌کند. |
| session/intent persistence ممنوع | هیچ تغییری در آن‌ها ندارد. |
| schema/migration ممنوع | این CCR فقط طراحی و تشخیص است؛ schema/migration تغییر نمی‌کند. |
| test safety | فقط tmpfs/5499؛ پایگاه زنده ممنوع. |
| read-api boundary | Dockerfile فعلی core را وارد image نمی‌کند؛ اثر runtime انتظار نمی‌رود. [مرجع: `origin/main:implementation/Dockerfile:31-37`] |

## ۱۳. وضعیت تحویل

- **R1 ریشه‌یابی:** انجام شد در حد شواهد موجود؛ علت نهایی هنوز قطعی نیست.
- **R2 گزینه‌ها و یک پیشنهاد:** انجام شد؛ تصمیم مالک باز است.
- **R3 تعیین‌پذیری آزمون:** طرح پذیرش G15-2 ثبت شد؛ ۱۰ اجرای متوالی هنوز انجام نشده است.
- **R4 اثر فایل‌ها و سرویس‌ها:** انجام شد؛ تغییر محصولی اجرا نشده است.
- **R5 پرسش‌های مالک:** ثبت شد؛ هیچ تصمیمی گرفته نشد.

**این CCR همچنان DRAFT است و هیچ مجوزی برای اجرای تغییر محصولی ایجاد نمی‌کند.**
