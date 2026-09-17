# طراحی مصرف‌کنندهٔ عمومی V2 — G14c-1

**وضعیت: DRAFT — برای بازبینی؛ بدون پیاده‌سازی.** مبنا: `origin/main@25d44e2` و `origin/codex/v2-intent-flow-foundation`. قرارداد `mlino.v2.public-business.v1` و تصمیم‌های S16 تا S26 ثابت‌اند؛ این سند آن‌ها را تغییر نمی‌دهد (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-192,259-269`).

## C1. مسیر خواندن و مرز مالکیت

V1 یک artifact امضاشده می‌سازد و در دایرکتوری خروجیِ خارج از مخزن، با نام `public-business.v1.json` و جایگزینی فایل موقت منتشر می‌کند. خود V1 دو نسخهٔ قبلی را نیز نگه می‌دارد؛ این رفتار، مجوز استفادهٔ V2 از نسخهٔ منقضی‌شده نیست (`origin/main:implementation/public-export/cli.ts:21-30,39-76`). V2 فقط همین artifact عمومی را می‌خواند؛ نه اتصال پایگاه دادهٔ V1، نه import ماژول‌های V1، نه اطلاعات سازمانی منتشرنشده. V2 فعلاً فایل Mock را بار می‌کند و `BusinessDirectoryService` را با `draft-1` پر می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/loader.ts:1-9`; `origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:177-188`).

| گزینهٔ انتقال | تشخیص نسخهٔ تازه | شکست‌های محتمل | هزینهٔ عملیاتی |
|---|---|---|---|
| پوشهٔ مشترک فقط‌خواندنی روی میزبان | مشاهدهٔ نام فایل ثابت و مقایسهٔ `snapshot_id` پس از خواندن کامل | mount ناپایدار، مجوز نادرست، فایل قدیمی یا خواندن ناقص | هم‌مکانی، mount و فرایندی برای رساندن فایل به مرورگر لازم است |
| کپی اتمیک به فضای خود V2 | دریافت دوره‌ای فایلِ کپی‌شده و مقایسهٔ `snapshot_id` | شکست کپی، تأخیر انتشار، باقی‌ماندن نسخهٔ قدیمی؛ temp→rename لازم است | job کپی، پایش، پاک‌سازی و هماهنگی مجوز فایل |
| HTTP fetch از endpoint محلیِ فقط‌خواندنی | polling/اعتبارسنجی پاسخ و مقایسهٔ `snapshot_id`؛ نه اعتماد صرف به ETag | قطع endpoint، timeout، پاسخ ناقص یا cache واسط قدیمی | میزبانی و پایش endpoint، محدودیت اندازه/زمان؛ در مسیر مرورگر باید مبدا امن و سیاست دسترسی روشن باشد |

**یک توصیه:** گزینهٔ HTTP fetch از endpoint محلیِ **استقرار**، با مسیر امن و قابل‌دسترسی برای مرورگر، مثلاً از همان مبدا V2. «محلی» به میزبان استقرار اشاره دارد، نه `localhost` گوشی کاربر. محل استقرار، خروجی آمادهٔ V1 را فقط برای خواندن در اختیار V2 بگذارد؛ V2 با `fetch` می‌گیرد و **پیش از** جایگزینی cache راستی‌آزمایی می‌کند. این پیشنهاد مجوز راه‌اندازی endpoint، زمان‌بندی یا تغییر V1 نیست. خود artifact فقط فیلدهای عمومی allowlist‌شده دارد؛ منبع تولید آن فیلدها snapshot انتشار است (`origin/main:implementation/public-export/builder.ts:80-98,181-190,214-224`). گزینهٔ دقیق میزبانی و URL در C8 برای مالک باز است. V2 هرگز به دیتابیس V1 وصل نمی‌شود، جدول‌های Core را نمی‌خواند، ماژول V1 را import نمی‌کند و هیچ چیزی در V1 نمی‌نویسد.

## C2. پذیرش و راستی‌آزمایی پیش از cache

ترتیب پیشنهادی: دریافت با سقف اندازه و timeout → parse سخت‌گیرانهٔ JSON → تطبیق دقیق `contract_version` با `mlino.v2.public-business.v1` و شکل DTO → کنترل `signature.algorithm === 'Ed25519'` و `key_id` در allowlist بستهٔ trust bundle نسخه‌دار → محاسبهٔ بایت‌های امضا با **همان** الگوریتم canonical و domain separator → تأیید امضا با کلید عمومی همان `key_id` → محاسبهٔ دوبارهٔ `snapshot_id` از `contract_version` و `records` → کنترل timestamp، TTL، ترتیب/یکتایی و قواعد داده → ساخت snapshot تازه → تعویض اتمیک cache. در هر ردشدن، cache جایگزین نمی‌شود. قرارداد خروجی و شناسهٔ snapshot در V1 مشخص‌اند (`origin/main:implementation/public-export/builder.ts:5,8-28,220-224`; `origin/main:implementation/public-export/canonical.ts:48-59`).

تابع امضای V1 پیشوند `MLINO-PUBLIC-BUSINESS-V1\n` را به canonical bytes شیء می‌افزاید؛ مقدار `signature.value` از ورودی امضا کنار گذاشته می‌شود، ولی `algorithm` و `key_id` داخل آن می‌مانند. امضا Ed25519 و مقدارش base64url است (`origin/main:implementation/public-export/signing.ts:4,14-43`). canonicalization رشته‌ها را NFC، کلیدها را به ترتیب scalar Unicode، و اعداد را با قاعدهٔ شش رقم اعشار پردازش می‌کند؛ پیاده‌سازی V2 باید با بردارهای مشترک دقیقاً همان بایت‌ها را بازتولید کند (`origin/main:implementation/public-export/canonical.ts:3-49`). صرف `JSON.stringify` عادی یا هش فایل خام معادل آن نیست. برای رد دست‌کاری‌های متنیِ بی‌اثر بر parse، پذیرش فقط از بایت‌های JSON canonical تولیدشده مجاز باشد؛ این قیدِ consumer است، نه تغییر DTO. کلید خصوصی هرگز وارد V2 نمی‌شود. شیء با کلید ناشناس، امضای خراب، نسخهٔ نامعلوم یا شکل نامعتبر رد می‌شود.

**رساندن trust bundle و چرخش کلید:** پیشنهاد MVP، بستهٔ نسخه‌دارِ کلیدهای **عمومی** و allowlist شناسه‌ها همراه استقرار V2 است؛ artifact ورودی حق ندارد کلید تازه‌ای را به bundle اضافه کند. چرخش باید هم‌پوشانی داشته باشد: ابتدا کلید عمومی جدید با نسخهٔ V2 منتشر شود، سپس تولیدکننده با `key_id` جدید امضا کند، و پس از پایان عمر همهٔ snapshotهای معتبرِ کلید قدیم، شناسهٔ قدیم از allowlist برداشته شود. کلید لغوشده فوراً از bundle مؤثر حذف و artifactهای امضاشده با آن حتی پیش از TTL رد شوند؛ cache قبلی با همان کلید نیز دیگر قابل نمایش نباشد. سازوکار عملیاتی انتشار/ابطال bundle در C8 باز است. `key_id` داخل بایت‌های امضا است و lookup کلید عمومی فقط از bundle محلی انجام می‌شود (`origin/main:implementation/public-export/signing.ts:19-21,37-43`).

## C3. تازگی، زمان و fail-closed

**پیشنهاد TTL: پنج دقیقه** از `generated_at` برای کل snapshot؛ `now > generated_at + 5m` یعنی هیچ دادهٔ واقعیِ آن artifact نمایش داده نشود. timestamp آینده‌دارِ بیش از انحراف ساعتِ مجاز (پیشنهاد: ۳۰ ثانیه) نیز رد شود. دریافت تازه باید از cache پذیرفته‌شده قدیمی‌تر نباشد؛ timestamp یکسان با `snapshot_id` یکسان idempotent است، اما timestamp یکسان با ID متفاوت رد شود تا ترتیب مبهم نشود. `generated_at` در export همان `asOf` تولیدکننده است (`origin/main:implementation/public-export/builder.ts:147-148,222-224`).

artifact گمشده، ناخوانا، بی‌امضا، منقضی یا قدیمی‌تر از cache پذیرفته‌شده **پذیرفته نمی‌شود**. اگر cache قبلی هنوز امضا و TTL معتبر دارد، تا پایان همان TTL می‌تواند نمایش داده شود؛ پس از آن نتیجهٔ واقعی خالی است و UI حالت «اطلاعات فعلاً در دسترس نیست» را نشان می‌دهد. نبودن cache معتبر هرگز با Mock پنهانی پر نمی‌شود. در هر خواندن، تاریخ `capabilities[].fresh_until` و `offers[].valid_from/valid_until` دوباره با زمان جاری سنجیده شود تا انقضای میان دو export نمایش را ادامه ندهد. تولیدکننده این شرط‌ها را هنگام ساخت هم اعمال می‌کند (`origin/main:implementation/public-export/builder.ts:191-205`).

| رخداد دریافت | حالت قابل‌نمایش به کاربر |
|---|---|
| فایل موجود نیست، خوانده نمی‌شود یا پاسخ ناقص است | cache قبلی فقط اگر هنوز معتبر باشد؛ وگرنه پیام عدم دسترسی و هیچ رکورد واقعی |
| artifact بی‌امضا، امضای خراب، کلید ناشناس/لغوشده یا نسخهٔ نامعتبر | همان رفتار بالا؛ artifact رد می‌شود و حتی بخشی از رکوردهایش وارد cache نمی‌شود |
| `generated_at` منقضی یا بیش از حد در آینده است | همان رفتار بالا؛ مقدار `stale=false` نمی‌تواند آن را معتبر کند |
| artifact از cache پذیرفته‌شده قدیمی‌تر است | cache جدید جایگزین نمی‌شود؛ cache پیشین فقط تا انقضای خودش نمایش می‌یابد |
| cache پیشین نیز منقضی یا کلیدش لغو شده است | هیچ رکورد واقعی نمایش داده نمی‌شود؛ Mock جایگزین نمی‌شود |

فیلد امضاشدهٔ `records[].stale` **منبع تازگی cache نیست**: تولیدکننده همواره `false` می‌نویسد (`origin/main:implementation/public-export/builder.ts:214-218`). V2 آن را بازنویسی نمی‌کند؛ وضعیت معتبر/منقضی را در metadata محلی و جدا از artifact محاسبه می‌کند. تصمیم S23-B هدف انتشار withdrawal حداکثر پنج دقیقه است، اما تا زمانی که زمان‌بندی یا invalidation برقرار نشده، این هدف عملیاتی تضمین نشده است (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:234,266`). پیشنهاد اجرا: چرخهٔ دریافت حداکثر یک دقیقه، TTL پنج دقیقه؛ تأخیر واقعی باید آزموده و پایش شود. تعلیق claim در تولیدکننده باعث حذف از export بعدی می‌شود (`origin/main:implementation/public-export/builder.ts:173-180`)؛ بدون اعلان فوری، V2 فقط پس از دریافت بعدی آن را می‌فهمد. این محدودیت نباید به‌عنوان حذف آنی در V2 گزارش شود.

## C4. نگاشت DTO واقعی به نیازهای V2

قرارداد واقعی، دو سطح `PublicBusinessExportV1` و `PublicBusinessRecordV1` دارد (`origin/main:implementation/public-export/builder.ts:8-28`). قالب جاری دایرکتوری V2 `draft-1`، دارای `business_id/category/products` و مختصات غیرتهی است؛ مستقیماً قابل پذیرش برای دادهٔ واقعی نیست (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:13-22,24-72`; `origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/validate.ts:98-134`). G14c-2 باید مسیر دادهٔ واقعیِ نسخه‌دار را در مرز دایرکتوری تعریف کند و مصرف‌کننده‌های قدیمی را آگاهانه تطبیق دهد؛ **نباید** دادهٔ غایب را بسازد.

| فیلد واقعی `public-business.v1` | مصرف/تطبیق V2 | حد و منبع |
|---|---|---|
| `contract_version` | انتخاب validator فقط برای v1؛ هر نسخهٔ دیگر رد | `draft-1` validator فعلی فقط Mock است (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/validate.ts:116-134`) |
| `generated_at` | مبنای TTL و metadata دریافت؛ مبنای `last_synced_at` فقط پس از پذیرش | `last_synced_at` قالب قدیمی معنی دیگری را القا می‌کند؛ به زمان ویرایش رکورد تبدیل نشود (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:49-61`) |
| `snapshot_id` | کنترل دوبارهٔ hash و تشخیص snapshot یکسان/قدیمی؛ metadata داخلی | الگوریتم در `origin/main:implementation/public-export/canonical.ts:52-54` |
| `signature` | راستی‌آزمایی با trust bundle؛ از UI و جست‌وجو جدا | الگوریتم در `origin/main:implementation/public-export/signing.ts:14-43` |
| `records[].business.organization_id` | شناسهٔ پایدار کسب‌وکار و کلید cache؛ برای نیاز قدیمی `business_id` همان ID است، نه شناسهٔ تازه | تولیدکننده در `origin/main:implementation/public-export/builder.ts:214-216`؛ نیاز قدیمی در `origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:49-54` |
| `business.name`, `description` | عنوان و شرح جزئیات کسب‌وکار؛ شرح در نوع قدیمی افزوده نشده بود | فقط snapshot منتشرشده (`origin/main:implementation/public-export/builder.ts:181-188,214-216`) |
| `business.location.latitude/longitude/address_text` | موقعیت و آدرس؛ مختصات null → نمایش جزئیات آدرس، حذف از «نزدیک من» و نقشه | `findNear` فعلی number لازم دارد؛ null را ۰ یا مختصات ساختگی نکنید (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/BusinessDirectoryService.ts:65-82`) |
| `business.contact_information`, `links` | نمایش فقط کلیدهای عمومی موجود؛ نبودشان یعنی عدم نمایش راه تماس/پیوند | allowlist V1 (`origin/main:implementation/public-export/builder.ts:80-98`) |
| `business.business_hours` | نمایش ساعات فقط پس از validation schema نسخه‌دار؛ null یعنی نامعلوم | validation تولیدکننده (`origin/main:implementation/public-export/builder.ts:114-137`) |
| `business.published_at`, `publication_id`, `source_revision` | metadata انتشار، ردیابی و تغییر؛ در UI فقط در صورت نیاز محصول | فیلدهای واقعی در `origin/main:implementation/public-export/builder.ts:8-20,214-218` |
| `capabilities[].capability_id/key/name/short_description` | فهرست توانمندی عمومی؛ نام به‌جای `products` نیست | producer تنها capability مجاز و تأییدشده را می‌آورد (`origin/main:implementation/public-export/builder.ts:191-198`) |
| `capabilities[].fresh_until/source_revision` | فیلتر زمان در لحظهٔ read و metadata نسخه | `origin/main:implementation/public-export/builder.ts:191-198` |
| `offers[].offer_id/offer_version_id/version_number` | شناسه و نسخهٔ پیشنهاد؛ انتخاب همان نسخهٔ منتشرشده | `origin/main:implementation/public-export/builder.ts:199-213` |
| `offers[].name/short_description/offer_shape` | عنوان، شرح و شکل پیشنهاد؛ `name` جای عنوان قدیمی است | `origin/main:implementation/public-export/builder.ts:199-213`; عنوان قدیمی در `origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:34-43` |
| `offers[].terms/price_amount/price_currency/on_request` | جزئیات و قیمت/درخواست؛ مبلغ رشته باقی می‌ماند، تخفیف درصدی حدس زده نمی‌شود | `origin/main:implementation/public-export/builder.ts:140-145,199-213` |
| `offers[].valid_from/valid_until` | فیلتر اعتبار زمانی در هر read؛ تاریخ پایان null یعنی بی‌پایان قراردادی | `origin/main:implementation/public-export/builder.ts:203-213` |
| `offers[].capability_links` | خلاصهٔ ID/key/name؛ هر پیوند فقط وقتی پذیرفته شود که `capability_id` در `capabilities` **همان رکورد** حضور دارد | تولیدکننده از مجموعهٔ visible می‌سازد (`origin/main:implementation/public-export/builder.ts:198,208-212`) |
| `offers[].published_at/publication_id` | metadata انتشار نسخه | `origin/main:implementation/public-export/builder.ts:212-213` |
| `records[].stale`, `ordering` | `stale` صرفاً دادهٔ امضاشده، نه TTL؛ ترتیب ثابت برای نمایش/ردیابی | تولیدکننده `false` و ترتیب مشخص می‌نویسد (`origin/main:implementation/public-export/builder.ts:214-220`) |

چهار انتظار قالب قدیمی باید برای مسیر واقعی کنار گذاشته شوند: `category` از Core قابل استخراج نیست؛ `floor_level` و `building_id` در v1 وجود ندارند؛ `products` حذف شده است. هر سه گروه طبق S25/S26 صرفاً در Mock قدیمی می‌مانند و فیلترهای category/floor/building تا رسیدن دادهٔ قراردادیِ آینده برای رکوردهای واقعی ارائه نمی‌شوند. `discount_percent` نیز منبعی در v1 ندارد و از `terms` محاسبه نمی‌شود (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:80-85,187-188`; `origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:34-43`; `origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:194-205`).

| انتظار قدیمی | توصیهٔ واحد برای مسیر واقعی |
|---|---|
| `category` | حذف فیلتر و برچسب دستهٔ واقعی تا منبع قراردادیِ module فراهم شود؛ مقدار «نامعلوم» فقط در متن توضیحی مجاز است، نه دستهٔ حدسی |
| `floor_level` | حذف فیلتر طبقه برای رکورد واقعی؛ عدد ساختگی یا `null` به‌عنوان دادهٔ منتشرشده نسازید |
| `building_id` | حذف فیلتر ساختمان برای رکورد واقعی؛ شناسهٔ ساختگی نسازید |
| `products` | حذف فهرست محصول واقعی و نمایش فهرست `capabilities` و `offers` با عنوان درست خودشان |
| `discount_percent` | حذف نشان تخفیف درصدی؛ فقط `price_amount`/`terms` منتشرشده در جزئیات نمایش داده شود |

## C5. جدایی Mock `draft-1`

مسیر فعلی `loadMockSnapshotRaw()` فایل JSON همراه برنامه را وارد `directoryService.loadSnapshot` می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/loader.ts:5-9`; `origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:177-184`). validator فعلی نسخه را صریحاً `draft-1` می‌خواهد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/validate.ts:116-134`). **یک توصیه:** Mock فقط در حالت demo جدا و با برچسب آشکار «دادهٔ آزمایشی» در UI و log بماند؛ حالت واقعی هرگز loader Mock را صدا نزند. cache واقعی و Mock دو namespace/نمونهٔ جدا داشته باشند؛ هیچ fallback، merge یا تبدیل خودکار `draft-1` به `public-business.v1` مجاز نیست. در نبود artifact واقعیِ معتبر، UI واقعی حالت خالی/عدم دسترسی نشان می‌دهد.

## C6. cache، تعویض اتمیک و خواندن هم‌زمان

یک شیء immutable شامل artifact تأییدشده، indexهای ساخته‌شده، `snapshot_id` و زمان پذیرش در حافظه نگه داشته شود. دانلود، بررسی امضا، شکل، timestamp، یکتایی organization_id، snapshot_id و ساخت indexها **خارج از cache فعال** انجام شود؛ سپس فقط یک reference اتمیک عوض شود. این پیشنهاد شکاف الگوی فعلی را می‌بندد: سرویس Mock، `snapshot` و `byId` را جداگانه انتساب می‌دهد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/BusinessDirectoryService.ts:31-43`). هر درخواستِ در جریان یک reference ثابت را تا پایان می‌خواند؛ درخواست بعدی نسخهٔ تازه را می‌بیند. تکرار snapshot یکسان no-op است. خطا cache معتبر پیشین را پاک نمی‌کند، اما TTL آن همچنان ادامه دارد؛ پس از انقضا حتی نسخهٔ پیشین نمایش داده نمی‌شود. `getAll/getById/findNear` برای مسیر واقعی باید به همین snapshot معتبر و فیلترهای لحظهٔ read متکی باشند؛ فعال‌کردن Matching و AR جزو این سند نیست (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/BusinessDirectoryService.ts:53-83`; `origin/codex/v2-intent-flow-foundation:mlino2/app/src/matching/container.ts:1-7`).

## C7. آزمون‌های لازم برای G14c-2 (فقط فهرست)

1. artifact واقعی معتبر با کلید شناخته‌شده، نسخه و `snapshot_id` درست پذیرفته و به رکوردهای واقعی تبدیل شود؛ Mock وارد همان cache نشود.
2. تغییر یک بایت مؤثر در محتوای امضاشده، تغییر `key_id` یا canonicalization نادرست رد شود؛ cache تغییر نکند.
3. `key_id` ناشناس **یا لغوشده** یا الگوریتم غیر Ed25519 رد شود؛ لغو کلیدِ cache پیشین نیز نمایش آن را متوقف کند و نبود کلید خصوصی در V2 تأیید شود.
4. artifact منقضی، آینده‌دار بیش از حد مجاز، یا قدیمی‌تر از cache رد شود؛ انقضای cache در زمان read آزمایش شود.
5. artifact جدید نامعتبر در حالی که cache قبلی هنوز TTL معتبر دارد، cache قبلی را حفظ کند؛ پس از TTL همان cache پنهان شود.
6. بدون هیچ artifact معتبر، نتیجهٔ واقعی خالی و وضعیت عدم دسترسی باشد؛ هیچ fallback به Mock رخ ندهد.
7. همهٔ فیلدهای جدول C4، از جمله null مختصات، قیمت رشته‌ای، terms/hours نسخه‌دار، capability links و metadata با fixture واقعی نگاشت شوند؛ `category/floor/building/products/discount_percent` ساخته نشوند.
8. تعویض اتمیک در برابر خواندن هم‌زمان؛ هیچ ترکیب index و records از دو snapshot مشاهده نشود.
9. `fresh_until` و `valid_until` میان دو دریافت منقضی شوند و بلافاصله از نتیجهٔ خواندن حذف شوند.
10. Mock `draft-1` فقط در حالت نمایشی برچسب‌دار دیده شود؛ UI واقعی هیچ‌گاه آن را دادهٔ منتشرشده معرفی نکند.

## C8. پرسش‌های باز برای مالک (هیچ‌کدام در این سند تصمیم نشده‌اند)

| پرسش | گزینه‌ها و پیامد | توصیهٔ طراحی |
|---|---|---|
| C8-1 محل تحویل artifact به V2 | A پوشهٔ مشترک: وابستگی به هم‌مکانی؛ B کپی اتمیک: نیازمند چرخهٔ انتشار؛ C endpoint محلیِ فقط‌خواندنی با مسیر امن برای مرورگر: نیازمند میزبانی/پایش | **C** برای نسخهٔ مرورگری؛ URL و اختیار انتشار باید جداگانه تصویب شود |
| C8-2 دورهٔ دریافت و TTL | A دریافت ≤۱ دقیقه/TTL پنج دقیقه: قطع سرویس حداکثر پنج دقیقه بعد مخفی می‌شود؛ B بازهٔ بلندتر: فشار کمتر، withdrawal دیرتر | **A**، همراه سنجش واقعی هدف S23-B و پرهیز از ادعای حذف آنی |
| C8-3 trust bundle و چرخش کلید | A کلیدهای عمومیِ allowlist‌شده همراه نسخهٔ V2: ساده ولی چرخش/لغو نیازمند انتشار سریع؛ B بستهٔ عمومی امضاشدهٔ جدا: چرخش آسان‌تر ولی زنجیرهٔ اعتماد تازه | **A** برای MVP؛ کلید خصوصی هرگز همراه V2 نباشد و سازوکار لغو فوری پیش از بهره‌برداری تأیید شود |
| C8-4 رفتار فیلترهای قدیمی بدون دادهٔ واقعی | A حذف/غیرفعال‌سازی آشکار برای رکورد واقعی: صادقانه؛ B نمایش فیلتر با نتیجهٔ تهی: گمراه‌کننده؛ C حدس از capability: نقض S25 | **A**؛ Mock فقط در حالت جداگانه |
| C8-5 نیاز به invalidation فوری برای تعلیق claim | A فقط چرخهٔ export: حداکثر تأخیر چرخه؛ B اعلان invalidation جدا: مرز عملیاتی تازه و طراحی مستقل | **A** برای شروع با محدودیت آشکار؛ اگر حذف فوری در V2 لازم است، تصمیم جداگانه برای B |

**مرز گام بعد:** G14c-2 تنها پس از بازبینی این سند و تصویب جداگانهٔ پیاده‌سازی شروع می‌شود. تا آن زمان هیچ دادهٔ واقعی V1 وارد V2 نمی‌شود.

من کدکس هستم
