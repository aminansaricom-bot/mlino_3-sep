# MLINO V2 Real UI and Assistant Design

**وضعیت:** DRAFT — نیازمند بازبینی Guardian و تصمیم مالک  
**مرحله:** U1 — طراحی فقط  
**تاریخ:** ۲۰ سپتامبر ۲۰۲۶  
**مبنای تصمیم:** U-D1 تا U-D3 و U-G1 تا U-G6 در `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_APPROVAL_REAL_UI_AND_ASSISTANT_DESIGN.md:18-35`

## ۱. هدف، مرز و اصول ثابت

این طرح رابط غنی موجود V2 را به دادهٔ واقعی `public-business.v1` وصل می‌کند، برای چند کسب‌وکار آزمایشی Offer نمونه می‌سازد و یک دستیار هوشمند واقعی را از طریق gateway سمت سرور طراحی می‌کند. این سند هیچ مجوز اجرایی، تغییر قرارداد، کلید، سرویس، داده یا استقراری ایجاد نمی‌کند.

اصول ثابت:

1. `RealPublicApp` فقط داده‌ای را نمایش می‌دهد که `PublicExportConsumer` پس از بررسی امضا، TTL و snapshot پذیرفته است؛ consumer اکنون verify را پیش از نگهداری snapshot اجرا می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/consumer.ts:32-56`).
2. اگر snapshot واقعی معتبر نباشد، رابط واقعی پیام عدم دسترسی می‌دهد و به Mock برنمی‌گردد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/RealPublicApp.tsx:52-65`).
3. مسیر Mock فقط در `DemoApp` بار می‌شود (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:178-190`) و انتخاب بین Demo و Real با متغیر build انجام می‌شود (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:867-868`).
4. تمام محتوای عمومی قرارداد واقعی از snapshot منتشرشده می‌آید؛ live-row برای content خوانده نمی‌شود (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-192`).
5. هوش مصنوعی فقط intent ساختاریافته می‌سازد. انتخاب و مرتب‌سازی کسب‌وکارها روی snapshot معتبر و داخل V2 انجام می‌شود؛ مدل هیچ Business، Offer یا Capability تولید نمی‌کند.

## ۲. وضعیت فعلی و شکاف اتصال

مسیر واقعی اکنون یک فهرست ساده با نام، توضیح، Capability و Offer می‌سازد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/RealPublicApp.tsx:62-101`). رابط غنی شامل نقشه، فیلترها، کارت‌ها، پنل جزئیات، دستیار و ویترین AR در `DemoApp` است (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:397-418,455-624,640-860`). این رابط نوع قدیمی `V2BusinessDirectoryRecord` را مصرف می‌کند که category، floor/building و products را اجباری می‌داند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:6-60`). قرارداد واقعی این سه گروه را عمداً ندارد و Offer/OfferVersion را جایگزین products کرده است (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-192`).

در نتیجه seam پیشنهادی یک **view-model فقط نمایشی** به نام موقت `PublicUiRecord` است. دادهٔ ورودی آن فقط `PublicRecord` پذیرفته‌شده است. این adapter مقدارهای غایب را جعل نمی‌کند و قرارداد واقعی را به draft-1 تبدیل نمی‌کند.

## ۳. R1 — نقشهٔ کامل فیلدهای رابط غنی

| مصرف رابط | فیلد لازم | منبع در `public-business.v1` | وضعیت/قاعده |
|---|---|---|---|
| کلید React، انتخاب، save/like/share | شناسهٔ کسب‌وکار | `business.organization_id` | موجود؛ شناسهٔ محلی همهٔ actionهای مرورگر. collectionهای فعلی رشتهٔ ID را در localStorage نگه می‌دارند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/experience/useLocalExperience.ts:3-16,37-48`). |
| کارت، جزئیات، AR | نام و توضیح | `business.name`, `business.description` | موجود. |
| marker و clustering نقشه | latitude/longitude | `business.location.latitude/longitude` | موجود ولی nullable؛ رکورد بدون زوج مختصات در فهرست می‌ماند و marker/AR ندارد. Map فعلی مختصات را برای clustering مصرف می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/components/MapView.tsx:167-178`). |
| جزئیات | نشانی | `business.location.address_text` | موجود و مستقل از مختصات. |
| کارت، marker، فیلتر و وزن AR | category | **ABSENT** | derive آفلاین طبق بخش ۵؛ فقط display guess با برچسب «حدسی». افزودن category تأییدشده نیازمند CCR قرارداد/module vocabulary است. Marker فعلی category را مصرف می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/components/MapView.tsx:31-38,200-205`). |
| فیلتر طبقه و AR داخل ساختمان | `floor_level`, `building_id` | **ABSENT** | در real v1 حذف شود/نمایش داده نشود. فعال‌سازی واقعی نیازمند CCR جداست. فیلتر فعلی هر دو را مصرف می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/BusinessDirectoryService.ts:61-82`) و AR از آن‌ها برای انتخاب صریح طبقه استفاده می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/ar/ArVitrineView.tsx:66-94`). |
| بخش «محصولات / خدمات» و AR | products | **ABSENT** | products در real mode حذف می‌شود؛ Capabilityها به عنوان «خدمات/توانمندی‌ها» و Offerها به عنوان «پیشنهادها» نمایش داده می‌شوند. محصول مستقل فقط با CCR و مدل رسمی آینده برمی‌گردد. UI قدیمی products را مستقیم نمایش می‌دهد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:695-712`). |
| خدمات/توانمندی‌ها | id، key، name، short description، freshness | `capabilities[]` | موجود؛ خروجی producer فقط Capability واجد شرایط و HUMAN_CONFIRMED را برمی‌گرداند (`origin/main:implementation/public-export/builder.ts:191-197`). |
| Offer card و AR | idها، version، name، description، shape، terms، price، currency، on_request | `offers[]` | موجود. نگاشت واقعی V2 این فیلدها را سخت‌گیرانه می‌پذیرد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/mapping.ts:7-14,110-124`). |
| badge تخفیف | `discount_percent` | **ABSENT** | drop؛ از `terms` حدس زده نمی‌شود. افزودنش CCR قرارداد و snapshot می‌خواهد. UI قدیمی درصد تخفیف را نمایش می‌دهد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:714-738`). |
| وضعیت Offer | `valid_from`, `valid_until` | `offers[]` | موجود؛ helper فعلی بازه را inclusive و fail-closed تفسیر می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/offers.ts:1-14`). |
| ارتباط Offer با خدمت | capability links | `offers[].capability_links[]` | موجود؛ فقط پیوندهای Capability قابل نمایش در export باقی می‌مانند (`origin/main:implementation/public-export/builder.ts:208-212`). |
| ساعات کار | `business.business_hours` | موجود | نمایش از schema نسخه‌دار؛ برای «الان باز است» فقط parser مشخص G14b و zone policy مجاز است، نه truthy check. |
| تماس | public phone/email/address | `business.contact_information` | موجود و allowlist شده؛ producer فقط کلیدهای عمومی را snapshot/export می‌کند (`origin/main:implementation/core/publication-service.ts:98-113,161-170`). |
| لینک‌ها | website/public social | `business.links` | موجود و allowlist شده؛ لینک فقط با validation URL و رفتار امن مرورگر باز می‌شود. |
| تازگی و traceability | published_at، publication_id، source_revision، stale | business/capability/offer metadata | موجود؛ `source_revision` برای Business/Capability است و Offer با version/publication شناخته می‌شود (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-179`). |
| distance و «نزدیک من» | مختصات کسب‌وکار + موقعیت کاربر | مختصات از snapshot؛ موقعیت از opt-in دستگاه | derive محلی؛ موقعیت کاربر بخشی از export نیست و بدون اقدام صریح خوانده یا ارسال نمی‌شود. |
| save/later/like/hide | organization ID | derive محلی | بدون تغییر قرارداد؛ این انتخاب‌ها فقط مرورگرند و matching/directory را تغییر نمی‌دهند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/experience/useLocalExperience.ts:37-48`). |
| share | نام، نشانی عمومی، website و URL صفحه | snapshot + URL محلی | derive؛ متن share فقط از public fields پذیرفته‌شده ساخته می‌شود. |
| BottomSheet | title/subtitle/count | derive محلی | component عمومی است و بدون وابستگی به draft record قابل استفاده است (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/components/BottomSheet.tsx:12-20,28-53`). |

## ۴. R2 — برنامهٔ Real Mode UI

### ۴.۱ seam داده

1. `PublicExportConsumer.read(now)` تنها ورودی business data می‌ماند.
2. یک pure adapter در مرز UI، `PublicRecord -> PublicUiRecord`، فقط view fields جدول بخش ۳ را می‌سازد.
3. نقشه، کارت، جزئیات، AR و assistant matching فقط `PublicUiRecord[]` دریافت می‌کنند؛ هیچ‌کدام transport، trust bundle یا signature را نمی‌شناسند.
4. adapter رکورد بدون مختصات را از list/detail حذف نمی‌کند؛ فقط آن را از map/nearby/AR کنار می‌گذارد.
5. هر refresh موفق، کل view-model را atomically از snapshot جدید بازسازی می‌کند. refresh ناموفق آخرین snapshot معتبر را فقط تا TTL حفظ می‌کند؛ همین رفتار فعلی consumer است (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/consumer.ts:42-69`).

### ۴.۲ reuse و تغییر لازم

| بخش | برنامه |
|---|---|
| `BottomSheet` | reuse بدون تغییر داده‌ای؛ generic است. |
| `MapView` | reuse منطق map/cluster؛ prop از draft record به view-model حداقلی تغییر می‌کند. category مشتق و برچسب حدسی از adapter می‌آید. |
| `BusinessCard` | reuse ظاهر؛ products count و floor حذف، Capability/Offer summary جایگزین می‌شود. اکنون props به draft record و products/floor وابسته‌اند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/components/BusinessCard.tsx:22-50,53-93`). |
| Detail panel | استخراج از `DemoApp` به component مشترک؛ product section حذف و Capability/Offer/contact/hours افزوده می‌شود. save/like/share با organization ID حفظ می‌شود (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/App.tsx:640-740`). |
| `ExperiencePanel` و local experience | reuse؛ فقط شناسه‌های واقعی را می‌گیرد و business truth نمی‌سازد. |
| AR | صحنه، دوربین، heading، radius و collision layout reuse؛ data adapter جدید products را حذف و Capability/Offer را می‌دهد. AR فعلی product و discount را از draft record می‌سازد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/ar/ArOverlayService.ts:30-39,85-110`). floor/building control در real mode مخفی است تا CCR آینده. |
| Assistant session UI | lifecycle و consent UI قابل reuse است، اما متن فعلی «پردازش محلی/به بیرون ارسال نمی‌شود» برای gateway واقعی نادرست است و باید قبل از U4 عوض شود (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/discovery/AssistantFoundation.tsx:33-57`). |

`DemoApp` و draft-1 برای نمایش/توسعه باقی می‌مانند. `RealPublicApp` هرگز `mock-directory.json`، `BusinessDirectoryService.loadSnapshot(mock)` یا draft-1 validator را import نمی‌کند. verify/canonical/trust-bundle/TTL logic تغییر نمی‌کند؛ adapter بعد از پذیرش snapshot اجرا می‌شود، نه پیش از آن.

## ۵. R3 — دسته‌بندی قطعی و آفلاین (U-D1)

### ۵.۱ الگوریتم

ورودی اول `capability_key + name` همه Capabilityهای همان record است. فقط اگر هیچ match پیدا نشد، `business.name + business.description` بررسی می‌شود. متن با Unicode NFKC، تبدیل `ي→ی` و `ك→ک`، حذف اعراب، lowercase، تبدیل `_` و `-` به فاصله و collapse فاصله normalize می‌شود. match روی token یا عبارت کامل normalize‌شده است؛ substring آزاد مجاز نیست.

| اولویت | display category | token/عبارت دقیق |
|---:|---|---|
| 1 | درمان و دندان | `dental`, `dentist`, `دندان`, `دندانپزشک`, `دندانپزشکی`, `ایمپلنت`, `ارتودنسی`, `جرم گیری`, `عصب کشی` |
| 2 | زیبایی و مراقبت | `beauty`, `skin`, `laser`, `زیبایی`, `پوست`, `لیزر`, `بوتاکس`, `فیلر`, `مو` |
| 3 | کافه | `cafe`, `coffee`, `کافه`, `قهوه`, `اسپرسو`, `لاته` |
| 4 | رستوران و غذا | `restaurant`, `food`, `رستوران`, `غذا`, `کباب`, `پیتزا`, `برگر` |
| 5 | فروشگاه | `retail`, `shop`, `store`, `فروشگاه`, `خرید`, `محصول` |

اگر چند دسته match شوند، بیشترین تعداد token متمایز برنده است؛ در تساوی، ترتیب ثابت جدول برنده است. اگر هیچ match نبود، category برابر `uncategorized` و label برابر **«بدون دسته»** است. الگوریتم بدون شبکه، مدل، زمان یا randomness است و برای ورودی یکسان همیشه خروجی یکسان می‌دهد.

در UI هر category مشتق‌شده با suffix یا badge **«حدسی»** نمایش داده می‌شود؛ حتی match قوی به دادهٔ تأییدشده تبدیل نمی‌شود، در export ذخیره نمی‌شود و برای تصمیم مجوز/انتشار استفاده نمی‌شود. parser قاعده‌محور فعلی نیز واژه‌نامه‌ای مشابه برای intent دارد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/matching/IntentParser.ts:14-21,58-94`)، اما آن parser دستهٔ خواستهٔ کاربر را تشخیص می‌دهد و منبع category کسب‌وکار نیست.

## ۶. R4 — Offerهای نمونه برای کسب‌وکارهای TEST (U-D2)

این مرحله فقط با تصویب جداگانه U3 و روی کسب‌وکارهایی اجرا می‌شود که marker رسمی دادهٔ آزمایشی دارند.

ترتیب رسمی برای هر Offer:

1. `OfferService.create(context, { organizationId, offerKey })` با permission `offer.manage`؛ سرویس uniqueness و tenant را اعمال می‌کند (`origin/main:implementation/core/offer-service.ts:31-45`).
2. `OfferService.createVersion` با `name`, `shortDescription`, `offerShape`, JSON `terms`, price/currency یا `onRequest`, و بازهٔ `validFrom/validUntil`; شماره نسخه زیر lock محاسبه می‌شود (`origin/main:implementation/core/offer-service.ts:48-77`).
3. در صورت نیاز `linkCapability` فقط پیش از اولین انتشار و فقط به Capability همان organization (`origin/main:implementation/core/offer-service.ts:80-106`).
4. `PublicationService.publish(..., 'OFFER_VERSION', versionId, reason)` با permission `publication.manage`. replacement نسخهٔ قبلی را در همان transaction ابتدا withdraw و سپس نسخهٔ جدید را publish می‌کند (`origin/main:implementation/core/publication-service.ts:60-82`).

فیلدهای لازم AR واقعی: نام Offer، توضیح کوتاه، price/currency یا `on_request`، `valid_from/valid_until` و capability links. `discount_percent` ساخته یا از terms استخراج نمی‌شود.

marker پیشنهادی قابل جست‌وجو و بی‌ابهام: `offerKey` با prefix `test-ui-vanak-` و `terms.test_marker = "MLINO_TEST_UI_OFFER_V1"`. خود title/description نیز عبارت «آزمایشی» دارد. cleanup با `PublicationService.withdraw` روی نسخهٔ منتشرشده انجام می‌شود؛ DELETE، direct SQL و پاک‌کردن تاریخچه مجاز نیست. اگر یک Offer جدید جایگزین شود، همان replacement رسمی سرویس استفاده می‌شود.

## ۷. R5 — Assistant Gateway واقعی (U-D3)

### ۷.۱ جایگاه و مرز

محل پیشنهادی `mlino2/assistant-gateway/` و process جدا از V1 Core است. Core مالک business truth، permission و publication است؛ intent و conversation context طبق ADR-0012 در تجربهٔ V2 می‌ماند. gateway فقط متن را به intent محدود تبدیل می‌کند و هیچ دسترسی DB، Core write، signing key یا public-export private key ندارد.

مرورگر فقط به gateway هم‌مبدأ/مجاز درخواست می‌دهد. API key provider فقط در سرور gateway و از secret file بیرون repository به env process تزریق می‌شود. هیچ `VITE_*` برای secret وجود ندارد.

### ۷.۲ قرارداد درخواست

```json
{
  "contract_version": "mlino.assistant.intent.v1",
  "request_id": "uuid",
  "text": "متن فارسی کاربر، 1..2000 نویسه",
  "locale": "fa-IR",
  "location": {
    "latitude": 35.72,
    "longitude": 51.33,
    "precision_meters": 1000
  }
}
```

`location` اختیاری است و فقط وقتی ارسال می‌شود که کاربر صریحاً «نزدیک من» خواسته و ارسال موقعیت تقریبی را پذیرفته باشد. مختصات پیش از ارسال به precision مصوب coarse می‌شوند. business list، snapshot، نام کسب‌وکار، saved/liked state، device identifier و تاریخچهٔ گفت‌وگو ارسال نمی‌شود.

### ۷.۳ قرارداد پاسخ

```json
{
  "contract_version": "mlino.assistant.intent.v1",
  "request_id": "uuid",
  "intent": {
    "action": "discover",
    "keywords": ["قهوه", "آرام"],
    "category": "cafe",
    "open_now": false,
    "radius_meters": 5000,
    "sort": "nearest"
  },
  "answer": "درخواستت را برای کافه‌های نزدیک بررسی می‌کنم.",
  "route": {
    "task": "intent",
    "model": "gemini-3.8-flash"
  }
}
```

مقادیر مجاز: `action ∈ {discover, refine, explain}`، حداکثر 24 keyword و هرکدام حداکثر 64 نویسه، `category ∈ {dental_clinic, beauty_clinic, cafe, restaurant, retail_shop, null}`، `radius_meters ∈ [250, 20000]`، `sort ∈ {relevance, nearest, offer}` و `answer` حداکثر 280 نویسه. `answer` فقط بازگویی intent است و نباید ادعای Business/Offer بسازد. هر کلید اضافه، نوع نادرست یا enum ناشناخته fail-closed می‌شود. قرارداد intent فعلی نیز keywordها را محدود و category را allowlist می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/matching/intentContract.ts:20-76`).

پس از validation پاسخ، app روی `PublicRecord[]` معتبر خودش filter/sort می‌کند. `open_now` فقط با business-hours parser نسخه‌دار اجرا می‌شود؛ تا قبل از آن از intent حذف/غیرفعال است. مدل هرگز organization ID یا رتبهٔ نهایی برنمی‌گرداند.

### ۷.۴ routing، محدودیت و fallback

| کار | مسیر پیشنهادی | سیاست |
|---|---|---|
| intent پرتکرار | `gemini-3.8-flash`، fallback `deepseek-v4.1-flash` | timeout کل 4s؛ یک retry فقط برای timeout/429/5xx با jitter؛ سقف input 2000 نویسه و output 350 token |
| پاسخ کوتاه توضیحی | `claude-sonnet-5` | فقط وقتی کاربر پاسخ توضیحی خواسته؛ timeout 7s؛ بدون retry روی 4xx؛ output حداکثر 500 token |
| ساخت/آزمایش | variantهای `free/` همان مدل‌ها در صورت وجود نزد provider مالک | فقط محیط توسعه؛ هر ID واقعی باید پیش از U4 از provider catalog مالک تأیید شود |

gateway per-client rate limit پیشنهادی 10 درخواست در دقیقه با burst پنج، سقف هم‌زمانی دو و daily circuit breaker هزینه دارد. client identity باید opaque و کوتاه‌عمر باشد؛ IP خام یا متن کاربر log نمی‌شود. log مجاز: timestamp، request_id تصادفی، route/model ID، status/error code، latency، input/output token count و rate-limit outcome. متن، مختصات، headers احراز هویت و پاسخ مدل log نمی‌شوند.

اگر gateway یا provider در دسترس نباشد، timeout شود، پاسخ نامعتبر دهد یا rate limit شود، V2 به `RuleBasedIntentParser` محلی برمی‌گردد. parser فعلی deterministic است و business data تولید نمی‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/matching/IntentParser.ts:58-94`). UI باید fallback را صادقانه با «پردازش محلی» نشان دهد.

### ۷.۵ کلید و rotation

1. کلید تازه در secret file خارج repository با ACL حساب سرویس قرار می‌گیرد و هنگام start به env process تزریق می‌شود.
2. browser، build args، logs، error response و repository هرگز کلید را دریافت نمی‌کنند.
3. rotation: کلید جدید ایجاد، secret file atomically جایگزین، gateway restart/health-check، کلید قبلی revoke، سپس leak scan. rollback فقط تا قبل از revoke و با secret قبلی محفوظ خارج repo ممکن است.
4. کلیدی که قبلاً در گفت‌وگو نوشته شده طبق U-G4 compromised فرض و پیش از U4 revoke می‌شود (`origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_APPROVAL_REAL_UI_AND_ASSISTANT_DESIGN.md:28-35`).

### ۷.۶ حریم خصوصی

متن پرسش برای پردازش به سرویس ثالث مالک ارسال می‌شود و UI پیش از اولین ارسال باید این موضوع را روشن بگوید. موقعیت دقیق، public snapshot، لیست نتایج، رفتار saved/liked، شماره تماس کاربر، شناسه دستگاه و متن‌های قبلی ارسال نمی‌شوند. coarse location فقط opt-in و فقط برای نیاز مکانی ارسال می‌شود. نگهداری provider و region پردازش باید در U4 مشخص شود؛ تا آن زمان gateway production مجاز نیست.

## ۸. R6 — تهدیدها و خرابی‌ها

| حالت | اثر | کنترل طراحی | تجربهٔ کاربر |
|---|---|---|---|
| gateway down/DNS failure | intent هوشمند نمی‌رسد | timeout کوتاه، circuit breaker، fallback محلی | برچسب «پردازش محلی»؛ جست‌وجو ادامه دارد |
| provider down/429/5xx | پاسخ ندارد یا کند است | یک retry محدود، model fallback، token cap | پاسخ محلی؛ بدون از دست رفتن snapshot |
| مدل کند | UI معطل می‌شود | abort در 4/7 ثانیه، request_id و latest-response-wins | spinner محدود و سپس fallback |
| prompt injection در متن کاربر | تلاش برای گرفتن secret یا جعل کسب‌وکار | system contract ثابت، خروجی JSON allowlist، بدون tool/DB/key، business selection محلی از snapshot امضاشده | ورودی نامعتبر رد یا محلی parse می‌شود؛ داده امضاشده تغییر نمی‌کند |
| مدل نام/Offer جعلی برمی‌گرداند | misinformation | schema اصلاً business data/IDs را نمی‌پذیرد؛ answer فقط paraphrase intent | فقط نتایج local matcher دیده می‌شوند |
| cost abuse/bot | هزینه و اشباع | rate limit، concurrency cap، daily budget، payload cap، circuit breaker | 429 عمومی؛ fallback محلی |
| پاسخ malformed/extra keys | contract drift | strict validation و enum/length bounds | fallback محلی |
| کلید لو برود | سوءاستفاده provider | secret بیرون repo، redaction، rotation/revoke، browser never receives key | gateway تا rotation fail-closed می‌شود |
| offline | gateway و map tile نیست | local rule parser و آخرین snapshot معتبر تا TTL؛ map error مستقل | list/search محلی؛ هیچ Mock جای real data نمی‌آید |
| snapshot منقضی/بدامضا | داده قابل اعتماد نیست | منطق پذیرش فعلی دست‌نخورده و fail-closed | «اطلاعات واقعی در دسترس نیست» |
| location بدون رضایت | نقض حریم خصوصی | field اختیاری، opt-in صریح، coarse precision، no logs | جست‌وجوی غیرمکانی ادامه دارد |

## ۹. راهبرد آزمون

### U2 — UI wiring

- adapter unit tests برای هر فیلد، null coordinates، category mapping/tie/fallback و badge حدسی؛
- component tests برای map/list/detail/AR با `PublicRecord` واقعی؛
- اثبات اینکه real mode هیچ Mock import/fallback ندارد؛
- mutation test که bypass کردن consumer/verify یا وارد کردن draft record را شکست دهد؛
- save/like/share فقط با organization ID و public fields؛
- عدم نمایش floor/building/products/discount.

### U3 — sample offers

- disposable DB؛ create/version/link/publish از serviceها؛
- marker و tenant isolation؛
- export شامل Offerهای فعال و AR adapter آن‌ها؛
- withdraw از service و حذف از export بعدی؛
- idempotency و عدم کاهش تاریخچه/row count.

### U4 — assistant gateway

- schema tests request/response، bounds و extra-key rejection؛
- fake provider برای routing/timeout/retry/token cap/rate limit؛
- privacy/leak grep و اثبات نبود متن/location/API key در log؛
- prompt-injection tests و اثبات اینکه business IDs فقط از snapshot محلی‌اند؛
- browser bundle scan برای secret؛
- integration test gateway-down و provider-down → parser محلی؛
- consent/location tests و no-location default.

هیچ آزمون این طرح به DB واقعی، port 5435، کلید واقعی یا provider شبکه‌ای متصل نمی‌شود.

## ۱۰. R7 — تصمیم‌های باز مالک

| شناسه | تصمیم | گزینه‌ها و پیامد | توصیه |
|---|---|---|---|
| U1-O1 | شکل seam رابط | A: `PublicUiRecord` مستقل؛ B: پرکردن draft-1 با مقدار جعلی | **A**؛ غیبت فیلدها صادقانه می‌ماند. |
| U1-O2 | قابلیت‌های غایب در real v1 | A: حذف floor/products/discount؛ B: CCR جدا | **A برای U2**؛ هر نیاز واقعی بعداً CCR مستقل. |
| U1-O3 | جدول category و نمایش حدس | A: جدول بخش ۵ و badge «حدسی»؛ B: فقط «بدون دسته» | **A** طبق U-D1/U-G3. |
| U1-O4 | دامنهٔ U3 | A: فقط چند business با marker رسمی و withdraw cleanup؛ B: همهٔ businessهای تست | **A** برای کنترل و rollback. |
| U1-O5 | endpoint gateway | A: same-origin `/assistant/intent`; B: origin جدا با CORS | **A**؛ سطح حمله و تنظیم مرورگر کمتر. |
| U1-O6 | model routing اولیه | A: Flash برای intent و Sonnet فقط explain؛ B: یک مدل برای همه | **A**؛ هزینه و latency محدودتر. IDها باید از catalog provider مالک تأیید شوند. |
| U1-O7 | ارسال موقعیت | A: opt-in و coarse 1km فقط برای near-me؛ B: بدون location؛ C: دقیق | **A**؛ کارایی مکانی با کمینه‌سازی داده. |
| U1-O8 | retention provider | A: no-retention قراردادی؛ B: retention محدود اعلام‌شده | **A**؛ اگر provider تضمین نکند، location ارسال نشود و production متوقف بماند. |
| U1-O9 | پاسخ گفت‌وگویی | A: حداکثر 280 نویسه و فقط paraphrase intent؛ B: پاسخ آزاد | **A**؛ business truth محلی می‌ماند. |
| U1-O10 | ترتیب اجرا | A: U2 سپس U3 سپس U4؛ B: موازی | **A**؛ ابتدا ارزش رابط واقعی بدون وابستگی AI قابل بررسی می‌شود. |

هیچ گزینه‌ای با این سند تصمیم‌شده محسوب نمی‌شود. مالک باید آن‌ها را صریح تصویب کند.

## ۱۱. تقسیم اجرای پیشنهادی و دروازه‌ها

1. **U2 — Real UI wiring:** فقط V2؛ ساخت adapter، اتصال componentها و آزمون‌های real mode. نیازمند تصویب مستقل.
2. **U3 — Sample Offer data:** ابزار/اجرای محدود از Core service روی businessهای TEST، backup و withdrawal runbook. نیازمند تصویب مستقل و کنترل DB.
3. **U4 — Assistant gateway:** ابتدا CCR/contract و threat review، سپس process سمت سرور، secret provisioning و اتصال UI. نیازمند تصویب مستقل؛ کلید قدیمی باید پیش از اجرا revoke شده باشد.

هر مرحله پس از گزارش Codex متوقف می‌شود و مرحلهٔ بعد فقط پس از Guardian review و تصویب مالک آغاز می‌شود.

## ۱۲. R8 — خارج از دامنه

- هر تغییر کد، schema، migration، DTO یا قرارداد `public-business.v1`؛
- اجرای Offer نمونه، تغییر DB یا دادهٔ موجود؛
- ایجاد gateway، endpoint، provider call یا تهیه/چرخش کلید؛
- تغییر verification، canonicalization، trust bundle، TTL یا امضای export؛
- floor/building، Product، discount percentage یا category تأییدشده در قرارداد واقعی؛
- persistence متن intent/session/conversation در Core؛
- ارسال snapshot یا business data به مدل؛
- voice search، recommendation learning، analytics، CRM، marketplace یا production deployment؛
- AR جدید یا تغییر sensor policy؛ فقط اتصال data adapter در U2 آینده مطرح است.

## ۱۳. نتیجه

مسیر ایمن برای تجربهٔ واقعی V2 این است که رابط غنی بعد از consumer امضاشده روی یک view-model صادقانه قرار گیرد، قابلیت‌های غایب حذف یا صرفاً به شکل حدس نمایشی مشخص شوند، Offerهای آزمایشی فقط از service رسمی Core عبور کنند و AI به یک gateway محدود به intent منتقل شود. Business truth، رتبه‌بندی نهایی و نمایش نتیجه همیشه در V2 و بر پایهٔ snapshot امضاشده باقی می‌ماند.

من کدکس هستم
