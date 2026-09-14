# طراحی قرارداد خواندن دادهٔ منتشرشدهٔ MLINO V2

**وضعیت:** پیش‌نویس طراحی برای بازبینی مالک؛ هیچ‌یک از S16 تا S20 در این سند تصمیم قطعی نیست.

**دامنه:** طراحی قرارداد خواندنی V1 → V2. این سند کد، schema، migration، HTTP endpoint یا اتصال عملیاتی ایجاد نمی‌کند.

## ۱. هدف و مصرف‌کننده

این قرارداد باید یک مسیر یک‌طرفه و فقط‌خواندنی برای نمایش دادهٔ عمومی کسب‌وکار در V2 تعریف کند. V1 مالک حقیقت کسب‌وکار، انتشار و اعتبار داده است؛ V2 فقط نسخهٔ قابل‌خواندن را مصرف و cache می‌کند.

مصرف‌کنندهٔ فعلی V2، `BusinessDirectoryService` است. این سرویس snapshot را اعتبارسنجی و در cache نگه می‌دارد و بقیهٔ سرویس‌ها و UI از آن می‌خوانند؛ خود سرویس در طراحی فعلی منبع داده را می‌شناسد (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/BusinessDirectoryService.ts:1-12,31-43`). رکورد دایرکتوری نیز صریحاً cache خواندنی است و منبع حقیقت را V1 اعلام می‌کند (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:45-60`).

در مرحلهٔ طراحی، V2 باید فقط از قرارداد versioned بخواند و هرگز جدول‌های Core یا ماژول‌های V1 را مستقیم نخواند. سند یکپارچگی فعلی نیز جهت انتقال را V1 → V2 و بدون نوشتن V2 تعریف می‌کند (`origin/main: mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md:5-8,62-70`).

## ۲. دامنهٔ exposure برای هر موجودیت

| موجودیت Core | دادهٔ عمومی پیشنهادی برای V2 | شرط نمایش |
|---|---|---|
| Organization | شناسهٔ پایدار و ارتباط tenant | فقط به‌عنوان هویت فنی؛ جزئیات داخلی منتشر نشود |
| BusinessProfile | نام، توضیح، مکان، راه تماس، لینک‌ها، ساعات کاری | پروفایل قابل‌نمایش و claim مربوطه طبق تصمیم مالک |
| Capability | شناسهٔ عمومی، کلید، نام، توضیح کوتاه، دسته، audience | انتشار شده، `CUSTOMER_FACING`، تأیید انسانی و تازه بودن |
| Offer / OfferVersion | شناسه، عنوان/توضیح نسخه، شکل، شرایط، قیمت، ارز، بازهٔ اعتبار | فقط نسخهٔ منتشرشده و معتبر؛ Offer والد به‌تنهایی محتوای customer-facing نیست |
| Evidence | خود Evidence خام منتشر نشود | فقط برای اثبات داخلی freshness/eligibility؛ در صورت نیاز، خلاصهٔ غیرحساس و تصمیم‌گیری‌شده در projection |
| Publication | رویداد انتشار و نسخهٔ منتشرشده | به‌عنوان provenance و revision در قرارداد؛ تاریخچهٔ داخلی کامل به V2 داده نشود |
| Membership / PermissionGrant | هرگز expose نشود | اطلاعات داخلی authorization |
| BusinessIdentityClaim / IdentityVerification | وضعیت داخلی claim expose نشود | فقط نتیجهٔ policy نمایش عمومی را تعیین کند |

BusinessProfile در Core فیلدهای عمومی اصلی را دارد، از جمله نام، توضیح، مختصات، تماس، لینک و ساعات کاری (`origin/main: implementation/prisma/schema.prisma:465-493`). Capability فیلدهای محتوایی و وضعیت انتشار/تأیید/freshness را دارد (`origin/main: implementation/prisma/schema.prisma:496-527`). OfferVersion محتوای نسخه، بازهٔ اعتبار و وضعیت انتشار را نگه می‌دارد (`origin/main: implementation/prisma/schema.prisma:547-576`).

## ۳. مشکل fidelity محتوای منتشرشده و گزینه‌ها

### شکاف فعلی

Publication رویداد انتشار را با نوع رویداد، `contentRevision`، actor، permission و `gateSnapshot` ثبت می‌کند (`origin/main: implementation/prisma/schema.prisma:626-654`). اما رکورد Publication یک snapshot کامل از فیلدهای BusinessProfile، Capability یا OfferVersion ندارد. محتوای Profile و Capability در ردیف‌های جاری آن‌هاست (`origin/main: implementation/prisma/schema.prisma:465-481,496-512`) و OfferVersion نیز به‌صورت ردیف immutable نگه‌داری می‌شود (`origin/main: implementation/prisma/schema.prisma:547-563`). بنابراین صرفاً خواندن جدول جاری و نام‌گذاری آن به‌عنوان «محتوای منتشرشده» می‌تواند محتوای بعد از آخرین انتشار را هم وارد V2 کند؛ این با قاعدهٔ جدا بودن `contentRevision` از `publishedContentRevision` ناسازگار است (`origin/main: implementation/prisma/schema.prisma:478-481,509-512`).

در سمت V2 نیز DTO فعلی `products` و `offers` را لازم می‌داند (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:24-43,49-60`)، در حالی که Core schema فعلی Product ندارد و Offer/OfferVersion شکل دیگری دارد (`origin/main: implementation/prisma/schema.prisma:530-576`). این قرارداد نباید این شکاف را با حدس، دادهٔ ساختگی یا خواندن مستقیم ماژول‌ها پنهان کند.

### گزینه‌ها

**A — بازسازی در consumer:** V2 ردیف‌های جاری را بخواند و با status فیلتر کند.

- مزیت: کمترین تغییر اولیه.
- ریسک: fidelity تضمین نمی‌شود؛ تغییر پس از انتشار ممکن است به V2 نشت کند؛ V2 به جزئیات storage Core وابسته می‌شود.

**B — projection عمومی مالک‌شده توسط Core:** هنگام انتشار، Core یک projection versioned و فقط‌خواندنی از محتوای مجاز بسازد یا همان transaction آن را به‌روزرسانی کند. Read contract فقط projection را expose کند.

- مزیت: محتوای نمایش‌داده‌شده دقیقاً به revision و gate همان انتشار متصل است؛ V2 به جدول ماژول وابسته نمی‌شود.
- هزینه: نیازمند تصمیم CCR و طراحی storage/read API جداگانه است.

**C — Export adapter از سرویس Core:** Core در زمان درخواست یا ساخت snapshot، DTO را از دادهٔ منتشرشده تولید کند، بدون اینکه projection دائمی اضافه شود.

- مزیت: storage جدید کمتر.
- ریسک: تضمین consistency و snapshot تکرارپذیر سخت‌تر است؛ باید ترتیب خواندن و transaction روشن شود.

**D — رویداد انتشار و cache در V2:** هر Publication یک پیام versioned برای V2 تولید کند.

- مزیت: مناسب مقیاس و همگام‌سازی غیرهم‌زمان.
- ریسک: event delivery، replay، حذف، ordering و امنیت هنوز در این مرحله طراحی نشده‌اند.

**توصیهٔ طراحی:** گزینهٔ **B** برای fidelity نهایی مناسب‌تر است. این توصیه تصمیم اجرایی نیست؛ قبل از implementation باید مالک دربارهٔ projection، شکل دقیق آن و CCR مربوط تصمیم بگیرد. تا آن زمان، export دوره‌ای Mock فعلی فقط برای توسعهٔ V2 معتبر است، نه ادعای اتصال واقعی به V1 (`origin/main: mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md:48-60`).

## ۴. تازگی و اعتبار

هر رکورد خواندنی باید این metadata را داشته باشد:

- `contract_version`
- `organization_id`
- `source_revision` یا مجموعهٔ revisionهای Profile/Capability/OfferVersion
- `published_at`
- `generated_at`
- `last_synced_at`
- `fresh_until` برای Capability و Evidence در صورت اعمال policy
- `visibility` یا وضعیت عمومی نهایی، بدون expose کردن وضعیت‌های داخلی

Capability در Core `freshUntil` دارد (`origin/main: implementation/prisma/schema.prisma:503-512`) و Evidence نیز `freshUntil` و status دارد (`origin/main: implementation/prisma/schema.prisma:593-612`). در V2 فعلی فقط `last_synced_at` در DTO وجود دارد و Offer با `valid_until` بررسی می‌شود (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:34-43,49-60`; `origin/codex/v2-intent-flow-foundation: mlino2/app/src/matching/MatchingService.ts:91-94`). این دو مفهوم باید جدا بمانند: sync freshness با business validity یکی نیست.

پیشنهاد: V2 فقط آیتمی را نمایش دهد که Publication معتبر دارد، revision آن با محتوای projection برابر است، و در زمان خواندن از بازهٔ اعتبار خارج نشده است. تاریخ نامعتبر یا دادهٔ بدون `fresh_until` معتبر باید طبق policy صریح تعیین شود، نه با حدس در client.

## ۵. نمایش پس از تعلیق یا انقضای claim

Core Claim را از Organization جدا نگه می‌دارد؛ وضعیت claim و زمان اعتبار در خود claim است (`origin/main: implementation/prisma/schema.prisma:356-380`). BusinessProfile نیز به claim اختیاری همان سازمان وصل می‌شود (`origin/main: implementation/prisma/schema.prisma:465-486`).

دو سیاست قابل‌تصمیم است:

- **S16-A — حذف فوری از exposure:** با مشاهدهٔ SUSPENDED یا EXPIRED، read layer پروفایل را عمومی برنگرداند؛ تاریخچهٔ داخلی باقی بماند. این گزینه با fail-closed و جلوگیری از نمایش هویت حل‌نشده سازگارتر است.
- **S16-B — حفظ آخرین انتشار تا پایان TTL:** آخرین projection تا زمان مشخصی نمایش داده شود و پس از آن حذف شود. تجربهٔ پایدارتر است، ولی ممکن است اطلاعات کسب‌وکار پس از تعلیق دیده شود.

**توصیه:** S16-A، مگر اینکه مالک برای continuity کسب‌وکار سیاست دیگری تصویب کند. اینجا تصمیمی گرفته نشده است.

## ۶. DTOهای نسخه‌دار

قرارداد پیشنهادی باید namespace و version مستقل داشته باشد، مثلاً `mlino.v2.public-business.v1`، و هر پاسخ شامل `contract_version` باشد. DTO پیشنهادی:

```ts
type PublicBusinessReadV1 = {
  contract_version: 'mlino.v2.public-business.v1';
  organization_id: string;
  profile: {
    name: string;
    description: string | null;
    location: { latitude: number; longitude: number; address_text: string | null } | null;
    contact_information: unknown | null;
    links: unknown | null;
    business_hours: unknown | null;
  };
  capabilities: Array<{
    capability_id: string;
    capability_key: string;
    name: string;
    short_description: string | null;
    category_key: string;
    fresh_until: string | null;
    source_revision: number;
  }>;
  offers: Array<{
    offer_id: string;
    offer_version_id: string;
    version_number: number;
    name: string;
    short_description: string | null;
    offer_shape: string;
    terms: unknown | null;
    price_amount: string | null;
    price_currency: string | null;
    valid_from: string;
    valid_until: string | null;
  }>;
  generated_at: string;
  source_revisions: Record<string, number>;
};
```

این DTO پیشنهادی عمداً `Membership`، `PermissionGrant`، claim status، Evidence خام و دادهٔ خصوصی را برنمی‌گرداند. `products` فعلی V2 تا زمان وجود منبع Core معتبر باید یا deprecated شود یا فقط در قرارداد Mock جدا باقی بماند؛ نباید به‌عنوان دادهٔ واقعی V1 معرفی شود.

## ۷. گزینه‌های انتقال

**S17-A — Read API versioned:** مسیر فقط‌خواندنی با DTO نسخه‌دار، tenant filter و cursor/etag.

**S17-B — Export snapshot:** فایل JSON امضاشده یا artifact versioned که V2 وارد cache می‌کند. این گزینه با مکانیزم فعلی Mock هم‌راستاست (`origin/main: mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md:52-60`).

**S17-C — Event feed:** رخدادهای انتشار برای ساخت cache V2.

**توصیه:** برای اولین اتصال واقعی، S17-A یا S17-B باید با یک CCR مشترک انتخاب شود؛ S17-C به زمانی موکول شود که نیاز مقیاس و replay روشن باشد. انتخاب نهایی باز است.

## ۸. امنیت و tenancy

V2 نباید `organization_id` را از ورودی کاربر به‌عنوان مجوز اعتماد کند. V1 باید داده را با tenant صحیح تولید کند و V2 باید در import/read مسیر tenant و شناسهٔ پایدار را فقط به‌صورت دادهٔ read-only نگه دارد.

Core در مدل‌ها organization را به‌صورت FK نگه می‌دارد و روابط چندسازمانی را با زوج شناسه محدود می‌کند؛ نمونهٔ Profile و Capability به Organization وصل‌اند (`origin/main: implementation/prisma/schema.prisma:465-486,496-520`). Publication و performed-by membership نیز در همان organization قید شده‌اند (`origin/main: implementation/prisma/schema.prisma:626-647`).

read contract باید:

- فقط محتوای publish‌شده را برگرداند؛
- هیچ permission، membership یا شناسهٔ platform actor را expose نکند؛
- دادهٔ یک organization را در پاسخ organization دیگر وارد نکند؛
- خطای نبودن tenant را با جزئیات داخلی افشا نکند؛
- cache key را حداقل بر `organization_id` و نسخهٔ contract متکی کند؛
- V2 را از write، claim، publication و تغییر business truth منع کند.

## ۹. consistency و caching

منبع اصلی V2 فعلاً snapshot در حافظه است و با `loadSnapshot` جایگزین می‌شود (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/BusinessDirectoryService.ts:31-43`). بنابراین قرارداد واقعی باید این موارد را مشخص کند:

1. atomic بودن snapshot کامل؛ V2 نباید نصف دادهٔ revision قدیم و نصف revision جدید را بگیرد؛
2. شناسهٔ snapshot و `generated_at`؛
3. رفتار cache هنگام منقضی شدن؛
4. حذف یا پنهان‌شدن آیتمی که دیگر published نیست؛
5. retry و rollback به آخرین snapshot معتبر؛
6. عدم استفاده از snapshot قدیمی برای ادعای «فعال» بودن Offer خارج از `valid_until`.

Matching فعلی فقط از Directory استفاده می‌کند و دادهٔ جدید تولید نمی‌کند (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/matching/MatchingService.ts:1-13,56-72`). هر نتیجهٔ match باید به رکوردی از snapshot معتبر اشاره کند؛ اگر snapshot با context یا intent تغییرکند، نتیجه باید دوباره ارزیابی شود و cache قدیمی نباید به‌عنوان نتیجهٔ تازه عرضه شود.

## ۱۰. راهبرد آزمون

پیش از implementation قرارداد:

- تست schema/DTO برای فیلدهای اجباری و version؛
- تست رد دادهٔ unpublished، revision mismatch و claim نامعتبر؛
- تست tenant isolation با دو organization؛
- تست نشت Membership، PermissionGrant، claim داخلی و Evidence خام؛
- تست Offer validity برای قبل از `valid_from`، داخل بازه، بعد از `valid_until` و پایان نامحدود؛
- تست snapshot atomic، تکرار idempotent و حذف/withdraw؛
- تست backward compatibility بین versionهای قرارداد؛
- تست cache fallback و stale marker؛
- تست عدم دسترسی V2 به DB/ماژول‌های V1؛
- تست اینکه Mock export با label آزمایشی از دادهٔ واقعی جدا می‌ماند.

برای V2 فعلی، ورودی snapshot در `validateExportSnapshot` قبل از cache اعتبارسنجی می‌شود (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/BusinessDirectoryService.ts:35-43`; `origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/validate.ts:117-123`). این مسیر می‌تواند harness اولیه باشد، اما جایگزین آزمون contract واقعی V1 نمی‌شود.

## ۱۱. تصمیم‌های باز مالک و ماتریس ADR

### تصمیم‌های باز

| شناسه | موضوع | گزینه‌ها | توصیهٔ طراحی | وضعیت |
|---|---|---|---|---|
| S16 | claim تعلیق/انقضا یافته | A حذف فوری، B حفظ تا TTL | A | OPEN — مالک باید تصمیم بگیرد |
| S17 | transport | A API، B snapshot export، C event feed | A یا B برای فاز اول | OPEN |
| S18 | fidelity | A بازسازی V2، B projection Core، C adapter، D event | B | OPEN |
| S19 | freshness Evidence/Capability | A فیلتر در read، B snapshot freeze، C حذف با stale شدن هر evidence | A با policy صریح | OPEN |
| S20 | شکل location/contact/links | JSON فعلی یا DTOهای typed نسخه‌دار | DTO typed با سازگاری تدریجی | OPEN |

این جدول پیشنهاد می‌دهد و هیچ S item را به‌صورت قطعی تصویب نمی‌کند.

### ماتریس سازگاری ADR

| ADR | اثر این قرارداد | وضعیت |
|---|---|---|
| ADR-0001 | V1 منبع حقیقت کسب‌وکار است؛ V2 consumer است | سازگار |
| ADR-0002 | مرز repository با contract versioned حفظ می‌شود | سازگار |
| ADR-0003 | Recommendation در این read contract ساخته یا ادغام نمی‌شود | سازگار |
| ADR-0004 | organization هویت canonical و mapping صریح باقی می‌ماند | سازگار |
| ADR-0005 | lifecycleهای Recommendation در این قرارداد مدل نمی‌شوند | سازگار |
| ADR-0006 | provenance و confirmation با هم قاطی نمی‌شوند؛ Evidence خام expose نمی‌شود | سازگار |
| ADR-0007 | Action به‌عنوان read business profile ساخته نمی‌شود | سازگار |
| ADR-0008 | V2 فقط دادهٔ منتشرشده را می‌خواند و چرخهٔ Recommendation را تغییر نمی‌دهد | سازگار |
| ADR-0009 | Permission در Core مصرف می‌شود؛ V2 مجوز ایجاد نمی‌کند | سازگار |
| ADR-0010 | V2 پلتفرم اجراکنندهٔ اختیار کسب‌وکار نیست | سازگار |
| ADR-0011 | Core مالک publication/public read representation است؛ ماژول‌ها از Core جدا می‌مانند | سازگار |
| ADR-0012 | Intent/Session/Assistant در V2 می‌مانند و persistence Core ایجاد نمی‌شود | سازگار |

## نتیجهٔ این مرحله

این سند قرارداد اجرایی نهایی یا مجوز پیاده‌سازی نیست. شکاف fidelity، سیاست claim، freshness و transport باید با تصمیم مالک و در صورت نیاز CCR بسته شوند. پس از تصویب، مرحلهٔ بعد طراحی دقیق projection/DTO یا transport انتخاب‌شده است.

من کدکس هستم.
