# برنامهٔ اعتبارسنجی PostgreSQL برای G1 / C15

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** هماهنگ‌کنندهٔ اعتبارسنجی پیش از Prisma  
**INSTRUCTION_ID:** `CODEX-20260912-POSTGRES-VALIDATION-DESIGN-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**وضعیت:** `G1_PLAN_READY — VALIDATION_NOT_EXECUTED`

## ۱. هدف و مرز این سند

این سند روش بستن گیت G1، یعنی اعتبارسنجی PostgreSQL و قید C15، را پیش از ساخت `schema.prisma` تعریف می‌کند. سند حاضر فقط برنامه و معیار پذیرش است؛ اجرای پایگاه‌داده، ساخت اسکریپت SQL، ساخت test harness، تغییر `schema.prisma`، migration، کد برنامه، شاخه یا ADR در این مرحله انجام نمی‌شود.

منابع اصلی این برنامه:

- `MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`؛
- `MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`؛
- `MLINO_PRISMA_PRE_IMPLEMENTATION_GATE_REPORT.md`؛
- `mlino_book/MLINO_CORE_PRISMA_FINAL_READINESS_REVIEW.md` در `origin/main`.

اعتبارسنجی باید در PostgreSQL ایزوله انجام شود و هرگز روی دیتابیس واقعی، volume مشترک یا دیتابیس دارای دادهٔ کسب‌وکار اجرا نشود. هدف، اثبات رفتار قیدها و انتخاب سازوکار نهایی C15 است؛ این کار به‌تنهایی مجوز ساخت شِمای production یا migration نیست.

## ۲. مبنای فنی و محیط اعتبارسنجی

### ۲.۱ مرجع شاخه و زنجیرهٔ migration

در ابتدای اجرای واقعی، این موارد باید با خروجی گزارش نتیجهٔ G1 ثبت شوند:

| مورد | الزام |
|---|---|
| شاخه | `codex/v2-intent-flow-foundation`؛ بدون merge، rebase یا cherry-pick |
| commit شاخه در شروع | با hash کامل ثبت شود؛ مبنای مشاهده‌شدهٔ این طرح `e79e65add06ec2d802e4753cf6ae0036952c7f74` است |
| `origin/main` در شروع | دوباره خوانده و ثبت شود؛ مقدار مشاهده‌شدهٔ این طرح `dd374dfd8e8b0b29b7dccf3f025fd500069e7663` است |
| Prisma | `5.20.0` در اسناد موجود؛ نسخهٔ واقعی محیط آزمون باید ثبت و تطبیق داده شود |
| ترتیب migration | `20260814065924_init` → `20260815033018_add_situation_key` → `20260815113714_rename_actor_core_entity_id_to_actor_id` → `20260906001500_add_ownership_type` → `20260910020000_add_external_workspace_link` |
| قفل migration | همان `migration_lock.toml` زنجیرهٔ معتبر؛ اجرای بخشی از زنجیره ممنوع است |

درخت کامل migration و وابستگی‌های `ExternalWorkspaceLink` باید پیش از آزمون خوانده شود. در وضعیت فعلی، مدل و migration و service آن در `origin/main` وجود دارند ولی در baseline فعلی شاخهٔ هدف حاضر نیستند. این واقعیت باید در گزارش G1 ثبت شود و تا تعیین تکلیف G2، این artefactها انتقال‌نیافته تلقی شوند. اعتبارسنجی Core نباید با حذف یا بازسازی خاموش آن‌ها انجام شود.

### ۲.۲ محیط جداشده

محیط آزمون باید:

1. یک PostgreSQL تازه با نام و دسترسی آزمون مستقل داشته باشد؛
2. به volume یا دیتابیس توسعه/production متصل نباشد؛
3. زنجیرهٔ کامل migration آزمایشی یا fixture کنترل‌شدهٔ خارج از production را با مبنای دقیق اجرا کند؛
4. پس از آزمون حذف یا دورریخته شود؛
5. نسخهٔ PostgreSQL، نسخهٔ Prisma، timezone، isolation level و نوع اجرای تراکنش‌ها را ثبت کند.

اگر `schema.prisma` هنوز برای ایجاد محیط کافی نیست، آزمایش با fixture موقت و صریح خارج از شِمای production طراحی می‌شود. fixture نباید به‌عنوان schema یا migration محصول وارد مخزن شود و بررسی متنی نباید به‌جای اجرای PostgreSQL ثبت شود.

## ۳. اعتبارسنجی سازگاری Publication

### ۳.۱ منبع حقیقت

`Publication` منبع حقیقت رخدادهای انتشار و پس‌گرفتن انتشار است. هر ردیف باید append-only باشد و هدف، نسخه یا revision، نوع رخداد، زمان و actor ممیزی‌شده را نگه دارد.

`publication_status` روی `BusinessProfile`، `Capability` و `OfferVersion` یک projection جاری است. این ستون منبع رخداد مستقل نیست و نباید مسیر موازی برای اعلام انتشار ایجاد کند. مقدار projection فقط در همان تراکنشی تغییر می‌کند که رخداد Publication را ثبت می‌کند.

نگاشت پایه:

| رخداد Publication | projection مورد انتظار |
|---|---|
| `PUBLISHED` | `publication_status = PUBLISHED` و ثبت revision/time منتشرشده مطابق هدف |
| `WITHDRAWN` | `publication_status = WITHDRAWN` یا وضعیت معادل تعریف‌شده برای هدف، بدون حذف تاریخچهٔ رخداد |

`PUBLISHED` فقط وقتی معتبر است که revision منتشرشده با نسخهٔ هدف سازگار باشد. خواندن برای V2 نیز باید علاوه بر projection، وضعیت فعال Organization، اعتبار Claim، freshness، بازهٔ Offer و Evidence لازم را در لحظهٔ خواندن بررسی کند؛ `PUBLISHED` به‌تنهایی مجوز نمایش نیست.

### ۳.۲ ترتیب جایگزینی نسخه

به‌دلیل unique جزئی روی یک نسخهٔ منتشرشده برای هر Offer، جایگزینی باید در همان تراکنش این ترتیب را داشته باشد:

1. رخداد و projection نسخهٔ قبلی به `WITHDRAWN` برسد؛
2. نبود نسخهٔ فعال قبلی بررسی شود؛
3. رخداد `PUBLISHED` نسخهٔ جدید درج شود؛
4. projection نسخهٔ جدید به‌روزرسانی شود؛
5. تراکنش commit شود.

انتشار نسخهٔ جدید پیش از پس‌گرفتن نسخهٔ قبلی باید با قید یکتایی رد شود یا به ترتیب معتبر اصلاح شود. پاک‌کردن Publication برای آزادکردن قید مجاز نیست.

### ۳.۳ سناریوهای رقابت تراکنشی

حداقل این سناریوها با دو یا چند تراکنش هم‌زمان اجرا و نتیجهٔ واقعی PostgreSQL ثبت شوند:

| سناریو | رفتار مورد انتظار |
|---|---|
| دو `PUBLISHED` هم‌زمان برای دو نسخهٔ یک Offer | حداکثر یکی commit شود؛ دیگری با unique جزئی یا قاعدهٔ تراکنشی رد/rollback شود |
| `WITHDRAWN` قدیمی هم‌زمان با `PUBLISHED` جدید | فقط ترتیب معتبر commit شود و رخداد و projection سازگار بمانند |
| تغییر مستقیم `publication_status` در تراکنش رقیب | بدون مسیر مجاز Publication رد شود و projection جعلی ایجاد نکند |
| درج Publication و شکست بعدی تراکنش | رخداد و projection هر دو rollback شوند |
| دو رخداد متضاد برای یک هدف | وضعیت نهایی قابل‌ردیابی و بدون دوگانگی بسازد |
| انتشار مجدد همان revision | فقط در صورت مجازبودن در تصمیم نهایی پذیرفته شود؛ در غیر این صورت رد شود |

### ۳.۴ انتخاب و اثبات C15

راهکار مبنا برای آزمون، triggerهای محدود و صریح PostgreSQL است:

- trigger `AFTER INSERT` روی `publications` projection هدف را به‌روزرسانی کند؛
- trigger روی هدف، تغییر مستقیم `publication_status`، `published_content_revision` یا `published_at` را رد کند؛
- فقط مسیر داخلی رخداد با پرچم transaction-local و کوتاه‌عمر اجازهٔ به‌روزرسانی projection داشته باشد؛
- درج رخداد، projection و قید unique در همان تراکنش اجرا شوند.

این انتخاب باید با آزمون direct update، درج رخداد، rollback و رقابت تراکنشی اثبات شود. اگر trigger با Prisma یا زنجیرهٔ migration قابل نگهداری نبود، domain service فقط با این شروط می‌تواند جایگزین شود:

1. مسیر نوشتن دیگری از نظر privilege پایگاه‌داده وجود نداشته باشد؛
2. تست یکپارچهٔ مستقیم و رقابتی همان invariant را اثبات کند؛
3. تغییر در CCR بعدی صریحاً تصویب شود.

تا ثبت نتیجه، C15 از نظر طراحی الزام‌آور ولی از نظر اجرا تأییدنشده است.

## ۴. اعتبارسنجی Foreign Key و جداسازی سازمانی

### ۴.۱ سیاست حذف و به‌روزرسانی

سیاست پایه و الزامی همهٔ روابط Core:

- `ON DELETE RESTRICT`؛
- `ON UPDATE RESTRICT`؛
- هیچ `CASCADE`، `SET NULL` یا حذف خاموش برای روابط تاریخی.

این سیاست حذف Organization، Claim، Membership، Publication یا رکوردهای مرجع‌شده را متوقف می‌کند. archive/deactivation یا revoke باید جای حذف فیزیکی روابط دارای سابقه را بگیرد.

### ۴.۲ الگوی tenant isolation

Organization ریشهٔ tenant است. هر موجودیت سازمان‌محور باید `organization_id` داشته باشد. برای جلوگیری از cross-organization reference، FKهای حساس باید به زوج کلیدی هم‌ساز متصل شوند؛ الگوی مورد انتظار، unique روی `[id, organization_id]` در والد و FK مرکب `[target_id, organization_id]` در فرزند است.

آزمون باید ثابت کند:

1. ارجاع فرزند سازمان A به والد هم‌نام در سازمان B رد می‌شود؛
2. تغییر `organization_id` والد یا فرزند در حضور رابطهٔ فعال رد می‌شود؛
3. زوج shadow اختیاری یا هر دو `NULL` هستند یا هر دو مقدار برابر دارند؛
4. archive شدن Organization تاریخچهٔ Claim/Publication/ExternalWorkspaceLink را از بین نمی‌برد؛
5. Membership سازمان A نمی‌تواند PermissionGrant یا دادهٔ سازمان B را مالک شود؛
6. `ExternalWorkspaceLink` فقط mapping صریح workspace به Organization است و منبع دوم هویت نیست؛ FK نهایی آن پس از تعیین مدل و انتقال امن artefactها جداگانه تأیید می‌شود.

### ۴.۳ آزمون‌های حذف و تغییر کلید

در محیط ایزوله، حذف Organization دارای Membership، Claim، Profile، Capability، Offer، Evidence، Publication یا لینک خارجی آزموده شود و هر مورد با Restrict رد شود. تغییر مقدار `Organization.id` نیز باید رد شود، چون شناسهٔ سازمان پایهٔ هویت canonical و تاریخچه است.

## ۵. اعتبارسنجی Business Identity Claim

### ۵.۱ یکتایی شناسه

قید C1 باید unique index جزئی روی `(identifier_type, identifier_value)` داشته باشد، فقط برای Claimهای با وضعیت `VERIFIED` یا `SUSPENDED`. وضعیت `SUSPENDED` شناسه را همچنان اشغال می‌کند تا دو Organization هم‌زمان مدعی یک شناسهٔ فعال نباشند.

موارد مورد انتظار:

- Claimهای همسان در `PENDING`، `REJECTED` یا `EXPIRED` می‌توانند سابقهٔ تلاش‌های جداگانه باشند؛
- دومین Claim همسان در `VERIFIED` یا `SUSPENDED` رد شود؛
- پس از رد یا انقضای Claim قبلی، Claim جدید طبق سیاست وضعیت‌ها قابل ثبت باشد؛
- تغییر Claim فعال به `SUSPENDED` تاریخچه را حفظ کند و uniqueness را آزاد نکند؛
- normalization و مقایسهٔ `identifier_type` و `identifier_value` ثابت باشد و جزئیات آن پیش از اجرا در CCR ثبت شود.

### ۵.۲ اعتبارسنجی verification فعال

هر تلاش `IdentityVerification` یک ردیف تاریخی مستقل با `(claim_id, attempt_number)` یکتا است و ردیف تصمیم‌شده immutable می‌ماند. آزمون باید ثابت کند:

- Claim با `VERIFIED` یا `SUSPENDED` بدون `verified_at` پذیرفته نشود؛
- verification تصمیم‌شده بدون actor پلتفرمی، زمان تصمیم و دلیل لازم پذیرفته نشود؛
- reviewer به‌صورت Membership سازمان ثبت نشود؛ actor پلتفرم باید reference مستقل و placeholder معماری داشته باشد؛
- دو verification فعال ناسازگار برای یک Claim هم‌زمان معتبر نماند؛
- Verification قدیمی update/delete نشود و تلاش تازه با شمارهٔ جدید ایجاد شود؛
- verification ناموفق به‌تنهایی مالکیت Organization را اثبات نکند.

## ۶. قیدهایی که Prisma به‌تنهایی کامل بیان نمی‌کند

در گزارش اجرای G1 باید DDL مشاهده‌شده برای هر مورد ثبت شود:

| قید | نیاز به PostgreSQL یا روش تکمیلی |
|---|---|
| C1 | unique جزئی Claim برای وضعیت‌های فعال |
| C2 | unique جزئی Membership فعال در scope سازمان/هویت خارجی |
| C3 | unique جزئی PermissionGrant فعال |
| C4 | unique جزئی Claim متصل به BusinessProfile |
| C5 | unique جزئی OfferVersion منتشرشده برای هر Offer |
| C6 | `CHECK` برای زوج‌های shadow: null/null یا برابری سازمان |
| C7 | `CHECK` XOR برای مالکیت Evidence و target انتشار |
| C8 | `CHECK`/trigger برای کامل‌بودن audit fields |
| C9 | `CHECK` برای basis و founding relation مجاز |
| C10 | `CHECK`های cross-field برای بازهٔ اعتبار، قیمت، confidence، revision و Published |
| C11 | `CHECK` برای هم‌زمانی confirmation با confirmer و زمان |
| C12 | trigger یا محدودسازی privilege برای append-only بودن Publication |
| C13 | trigger برای immutable بودن محتوای OfferVersion و پیوند Capability پس از انتشار |
| C14 | trigger برای فقط‌خواندنی بودن IdentityVerification تصمیم‌شده |
| C15 | trigger/سازوکار تراکنشی برای هم‌ترازی Publication event و projection |

partial uniqueها، triggerها و checkهای دستی باید بعد از یک migration آزمایشی دوم با تغییر نامرتبط دوباره خوانده شوند. حذف یا بازنویسی هرکدام نتیجهٔ شکست G1 است و روش حفظ DDL باید پیش از `schema.prisma` در CCR روشن شود.

## ۷. موارد آزمون اجباری پیش از ساخت `schema.prisma`

گزارش نتیجه باید برای هر آزمون `PASS`، `FAIL` یا `NOT_EXECUTED`، SQL/پیغام مشاهده‌شده و تفسیر کوتاه داشته باشد:

| شماره | آزمون | معیار پذیرش |
|---:|---|---|
| ۱ | FK مرکب tenant | رابطهٔ هم‌ساز پذیرفته و cross-organization رد شود |
| ۲ | زوج shadow و C6 | null/null یا برابر پذیرفته؛ نیمه‌پر یا نابرابر رد شود |
| ۳ | C1 تا C5 | ردیف دوم در scope فعال رد؛ سوابق تاریخی طبق وضعیت مجاز پذیرفته شوند |
| ۴ | C7 تا C11 | همهٔ حالت‌های نامعتبر Evidence، audit، basis، بازه، قیمت، confirmation و confidence رد شوند |
| ۵ | C12 تا C14 | Update/Delete ممنوع رد؛ تغییرهای صراحتاً مجاز باقی بمانند |
| ۶ | حفظ DDL پس از migration دوم | partial index، check و trigger دستی پس از migration نامرتبط وجود و رفتار قبلی را حفظ کنند |
| ۷ | الگوی write مرکب Prisma | create/connect/update تو‌در‌تو با کلید مرکب بدون شکستن tenant boundary اجرا شود |
| ۸ | روابط چرخه‌ای Organization/Membership و self-reference | ایجاد ترتیب‌دار، FK و Restrict مطابق طراحی عمل کند |
| ۹ | شناسهٔ Organization از نوع TEXT | شناسهٔ غیر UUID بدون coercion نادرست ذخیره و در FKها ردیابی شود |
| ۱۰ | C15 پایه | direct status update رد؛ Publication projection را در همان تراکنش تغییر دهد؛ rollback هر دو را برگرداند |
| ۱۱ | رقابت Publication | دو publish هم‌زمان، publish/withdraw رقیب و rollback فقط یک وضعیت معتبر بسازند |
| ۱۲ | ExternalWorkspaceLink | زنجیرهٔ کامل و artefactهای مدل/migration/service/test پس از انتقال انتخابی با FK سازمانی و active-link invariant اعتبارسنجی شوند |
| ۱۳ | verification فعال | uniqueness Claim، verified_at، actor پلتفرم، attempt history و immutable decision اثبات شوند |

موارد ۱ تا ۱۱ هستهٔ آزمون شِمای Core هستند. مورد ۱۲ به‌دلیل وضعیت فعلی شاخه بخشی از gate انتقال/همگام‌سازی G2 است و نباید با fixture ناقص موفق تلقی شود. مورد ۱۳ جزئیات لازم برای اثبات C1 و C14 است.

## ۸. ترتیب اجرای مجاز

۱. hash واقعی شاخه و `origin/main` و وضعیت working tree ثبت شود؛ سه فایل untracked قدیمی دست‌نخورده بمانند.  
۲. زنجیرهٔ migration و `migration_lock.toml` کامل بررسی و مبنا ثبت شود.  
۳. محیط PostgreSQL ایزوله ایجاد شود؛ دیتابیس واقعی استفاده نشود.  
۴. fixture/DDL آزمایشی و نسخهٔ واقعی PostgreSQL/Prisma ثبت شود؛ چیزی وارد `schema.prisma` یا migration محصول نشود.  
۵. FKها، Restrictها، partial uniqueها، checkها و قواعد Identity Claim اجرا و نتیجه‌برداری شوند.  
۶. Publication و سناریوهای رقابتی C15 در چند تراکنش اجرا شوند.  
۷. rollback و migration دوم برای حفظ DDL دستی اجرا شوند.  
۸. برای هر C1 تا C15 و آزمون‌های ۱ تا ۱۳ نتیجه و شواهد ثبت شود.  
۹. سازوکار نهایی C15، trigger یا domain service، فقط بر پایهٔ نتیجهٔ واقعی و در CCR بعدی ثبت شود.  
۱۰. گزارش مستقل G1 صادر شود؛ فقط پس از بسته‌شدن G1، G2 و G3 و صدور دستور جداگانه می‌توان به طراحی/پیاده‌سازی `schema.prisma` رفت.

این ترتیب مجوز merge، rebase، cherry-pick، انتقال خودکار artefact، تغییر ADR یا توسعهٔ backend نیست.

## ۹. معیار خروج G1

G1 فقط زمانی `CLOSED / VALIDATED` می‌شود که:

- محیط آزمون ایزوله و نسخه‌های آن ثبت شده باشد؛
- زنجیرهٔ migration مبنا و وضعیت `ExternalWorkspaceLink` شفاف ثبت شده باشد؛
- `ON DELETE RESTRICT`، `ON UPDATE RESTRICT` و tenant isolation اثبات شده باشد؛
- uniqueness و verification lifecycle مربوط به Identity Claim اثبات شده باشد؛
- C1 تا C15، شامل rollback و رقابت Publication، نتیجهٔ واقعی داشته باشند؛
- حفظ قیدهای دستی پس از migration دوم اثبات شده باشد؛
- روش نهایی C15 در CCR ثبت و برای تصمیم مالک آماده شده باشد؛
- مورد `FAIL` یا `NOT_EXECUTED` باقی نمانده باشد یا به‌عنوان blocker صریح ثبت شده باشد؛
- اجرای این برنامه با ساخت `schema.prisma`، migration، backend یا تغییر شاخه اشتباه گرفته نشود.

## ۱۰. وضعیت فعلی

این سند برنامهٔ اعتبارسنجی را آماده کرده است. هیچ آزمون PostgreSQL، اسکریپت SQL یا validation harness در این مرحله اجرا یا ایجاد نشده است؛ بنابراین G1 هنوز بسته نشده است:

`G1_PLAN_READY — VALIDATION_NOT_EXECUTED`

من کدکس هستم.

