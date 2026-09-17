# طراحی تولیدکنندهٔ خروجی عمومی امضاشدهٔ V1

**وضعیت: APPROVED — تصمیم‌های Q1 تا Q10 در بخش «تصمیم مالک» زیر ثبت شده‌اند.**

### تصمیم مالک برای G14b-2

مرجع تصویب: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B2_EXPORT_IMPLEMENTATION.md` @ `9e7eef64ceee2554caa8295a97b78d716c7e0548`. در بخش‌های E1 تا E9، گزینه‌ها تاریخچهٔ طراحی‌اند؛ جدول زیر بر آن پیشنهادها حاکم است.

| شناسه | تصمیم تصویب‌شده |
|---|---|
| Q1 | Ed25519 detached؛ `algorithm=Ed25519`؛ امضا base64url بدون padding. |
| Q2 | کلید خصوصی در secret store سیستم‌عامل؛ `key_id` نسخه‌دار؛ فقط جفت‌کلید یک‌بارمصرف در توسعه/آزمون؛ دورهٔ چرخش پیش از تولید. |
| Q3 | کار زمان‌بندی‌شدهٔ ۶۰ ثانیه‌ای با CLI؛ نگه‌داری دو artifact موفق پیشین؛ خروجی بیرون مخزن. |
| Q4 | polling مصرف‌کننده و TTL با رفتار fail-closed؛ invalidation فوری در مرحلهٔ جداگانه. |
| Q5 | `business_hours` نامعتبر فقط به null تبدیل می‌شود؛ log فقط کد خطا. |
| Q6 | `terms` نامعتبر فقط Offer را حذف می‌کند؛ null اصیل مجاز است. |
| Q7 | `fresh_until` metadata زندهٔ شایستگی است، در زمان ساخت خوانده می‌شود و DTO را پر می‌کند؛ محتوای snapshot از آن ساخته نمی‌شود و CCR لازم نیست. |
| Q8 | حداکثر یک Profile منتشرشده برای هر سازمان؛ تا CCR ایندکس یکتای جزئی، سازمان دارای بیش از یکی کامل حذف و شناسهٔ سازمان همراه کد دلیل log می‌شود. |
| Q9 | Policy v1 فقط تأیید انسانی و تازگی Capability است؛ الزام مدرک دیگری ندارد. |
| Q10 | `as_of` ورودی تولید است؛ شرط بایت یکسان شامل داده، `as_of`، policy و `key_id` یکسان است. |

**مرجع ثابت:** `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-192,194-202,221-234,253-271`. قرارداد `mlino.v2.public-business.v1` و تصمیم‌های S16 تا S26 در این سند تغییر نمی‌کنند. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-192,253-271`; `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md:9-20`]

## E1. منبع حقیقت، انتخاب رویداد و دروازه‌های نمایش

هر فیلد محتوایی فقط از `Publication.publishedContent` رویداد `PUBLISHED` گرفته می‌شود. خواندن `BusinessProfile.name`، `Capability.name`، `OfferVersion.terms` یا `Organization.displayName` از ردیف جاری برای ساخت محتوا ممنوع است. ردیف‌های جاری فقط برای کنترل زندهٔ eligibility خوانده می‌شوند و می‌توانند آیتمی را **پنهان** کنند. [مرجع: `origin/main:implementation/prisma/schema.prisma:327-330,465-481,496-512,547-561,626-654`; `origin/main:implementation/core/publication-service.ts:98-138`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:189-192`]

برای هر سه نوع هدف، کلید انتخاب `(organization_id, target_kind, target_id)` است. رویدادها ابتدا با `occurred_at DESC, id DESC` مرتب می‌شوند. فقط اگر رویداد رتبهٔ اول `PUBLISHED` و snapshot آن معتبر باشد، همان رویداد انتخاب می‌شود؛ رتبهٔ اول `WITHDRAWN` هر انتشار قدیمی را نامرئی می‌کند. ترتیب خروجی رکوردها و آیتم‌ها نیز از `occurred_at ASC, id ASC` انتشار منتخب به‌صورت قطعی مشتق می‌شود. در صورت زمان یکسان، `id` tie-breaker است. `publication_status` ردیف‌های جاری جای رویداد را به‌عنوان منبع حقیقت نمی‌گیرد. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-654`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:42-49,221-234`]

طرح پرس‌وجو، صرفاً برای طراحی و **نه کد اجرایی**:

```sql
-- یک read-only transaction با snapshot سازگار؛ target_kind از ستون غیرتهی مشتق می‌شود.
WITH ranked AS (
  SELECT p.*,
         CASE WHEN p.business_profile_id IS NOT NULL THEN 'BUSINESS_PROFILE'
              WHEN p.capability_id IS NOT NULL THEN 'CAPABILITY'
              ELSE 'OFFER_VERSION' END AS target_kind,
         COALESCE(p.business_profile_id, p.capability_id, p.offer_version_id) AS target_id,
         ROW_NUMBER() OVER (
           PARTITION BY p.organization_id,
             CASE WHEN p.business_profile_id IS NOT NULL THEN 'BUSINESS_PROFILE'
                  WHEN p.capability_id IS NOT NULL THEN 'CAPABILITY'
                  ELSE 'OFFER_VERSION' END,
             COALESCE(p.business_profile_id, p.capability_id, p.offer_version_id)
           ORDER BY p.occurred_at DESC, p.id DESC
         ) AS event_rank
  FROM publications p
)
SELECT organization_id, target_kind, target_id, id, occurred_at,
       content_revision, published_content
FROM ranked
WHERE event_rank = 1 AND event_kind = 'PUBLISHED';
```

ایندکس‌های موجود `publication_business_profile_time_idx`، `publication_capability_time_idx` و `publication_offer_version_time_idx`، پیشوند `(organization_id, target_id, occurred_at)` را پوشش می‌دهند؛ مرتب‌سازی `id` ممکن است به sort اضافه نیاز داشته باشد. این مرحله ایندکس یا migration تازه‌ای پیشنهاد نمی‌کند. کنترل وجود دقیقاً یک نوع هدف به قیود Publication تکیه دارد. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-654`; `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:388-400,568-600`]

تمام joinهای eligibility با **همان `organization_id`** انجام می‌شوند و یک snapshot سازگار از دیتابیس مبنای کل export است. دروازه‌های زندهٔ زیر فقط حذف می‌کنند:

| دروازه | رفتار پیشنهادی؛ هیچ فیلد محتوایی از آن خوانده نمی‌شود |
|---|---|
| Organization | فقط `lifecycleStatus=ACTIVE`؛ سازمان archived حذف می‌شود. [مرجع: `origin/main:implementation/prisma/schema.prisma:239-242,327-353`] |
| BusinessProfile و claim متصل | Profile باید `ACTIVE` باشد و claim متصلِ همان سازمان `VERIFIED` و از نظر `validUntil` معتبر باشد؛ claim ناموجود، PENDING، SUSPENDED، REJECTED یا EXPIRED نمایش را می‌بندد. S16-A حذف پس از تعلیق/انقضا را قطعی کرده است. [مرجع: `origin/main:implementation/prisma/schema.prisma:244-250,356-380,465-490`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:115-124`] |
| Capability | `capabilityStatus=ACTIVE`، `audience=CUSTOMER_FACING`، `confirmationStatus=HUMAN_CONFIRMED` و freshness مطابق policy نسخه‌دار S20-A؛ unconfirmed پنهان می‌ماند. [مرجع: `origin/main:implementation/prisma/schema.prisma:282-295,496-526`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:19-25,92-113,182-186`] |
| Offer/OfferVersion | Offer والد `ACTIVE` باشد و `validFrom <= as_of < validUntil` (اگر `validUntil` تهی است، پایان باز است)؛ بازه و وضعیت، شرط نمایش‌اند. [مرجع: `origin/main:implementation/prisma/schema.prisma:298-301,530-576`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:19-25,236-249`] |
| Evidence | خام صادر نمی‌شود؛ اگر policy نسخه‌دار برای eligibility مدرکی بخواهد، وضعیت/تازگی و تأیید آن فقط می‌تواند هدف را حذف کند. `AI_INFERRED` یا اعتماد عددی به‌تنهایی تأیید نیست. جزئیات دقیق policy در E9 باز می‌ماند. [مرجع: `origin/main:implementation/prisma/schema.prisma:593-623`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:92-113`] |

**شکاف اجرایی:** schema برای `(organization_id)` روی BusinessProfile قید یکتایی ندارد؛ ساخت دقیقاً یک `PublicBusinessRecordV1` برای سازمانی با چند Profile واجد شرایط، بدون تصمیم مالک مبهم است. همچنین snapshot Capability فعلی `fresh_until` را ثبت نمی‌کند، هرچند DTO نهایی این فیلد را دارد. هیچ مقدار از ردیف زنده برای پرکردن این شکاف‌ها استفاده نمی‌شود؛ E9 راه‌های ممکن را ثبت می‌کند. [مرجع: `origin/main:implementation/prisma/schema.prisma:465-493,496-527`; `origin/main:implementation/core/publication-service.ts:115-119`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159,189-192`]

## E2. Envelope ثابت، Record ثابت و نگاشت فیلدها

بلوک زیر **عیناً** DTO بخش ۷ سند FINAL است؛ این سند نوع، نام یا فیلدی به آن اضافه نمی‌کند. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-180`]

```ts
type PublicBusinessExportV1 = {
  contract_version: 'mlino.v2.public-business.v1';
  generated_at: string; // metadata
  snapshot_id: string; // metadata
  signature: { algorithm: string; key_id: string; value: string }; // required; algorithm/key management deferred to G14b
  records: PublicBusinessRecordV1[];
};

type PublicBusinessRecordV1 = {
  business: {
    organization_id: string; // Organization.id
    name: string;
    description: string | null;
    location: { latitude: number | null; longitude: number | null; address_text: string | null } | null; // S21-B
    contact_information: { public_phone?: string; public_email?: string; public_address?: string } | null; // S22-A
    links: { website?: string; public_social?: string[] } | null; // S21-B
    business_hours: unknown | null; // versioned JSON schema in G14b
    published_at: string;
    publication_id: string;
    source_revision: number;
  };
  capabilities: Array<{
    capability_id: string;
    capability_key: string;
    name: string;
    short_description: string | null;
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
    terms: unknown | null; // versioned JSON schema in G14b
    price_amount: string | null;
    price_currency: string | null;
    on_request: boolean;
    valid_from: string;
    valid_until: string | null;
    capability_links: Array<{ capability_id: string; capability_key: string; name: string }>;
    published_at: string;
    publication_id: string;
  }>;
  stale: boolean; // S20-A / S23-B metadata
  ordering: { primary: 'publication.occurred_at'; tie_breaker: 'publication.id' }; // metadata
};
```

| فیلدهای DTO | منبع مجاز |
|---|---|
| `contract_version` | ثابت مصوب `mlino.v2.public-business.v1`. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137`] |
| `generated_at`، `snapshot_id`، `signature.algorithm/key_id/value` | metadata تولید و امضای کل snapshot، نه محتوای کسب‌وکار؛ روش پیشنهادی E3/E4. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,182-192,221-226`] |
| `business.organization_id` | `Publication.organizationId`/شناسهٔ tenant برای انتشار Profile؛ هر join باید با همان سازمان بماند. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-650`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,204-217`] |
| `business.name/description` | `published_content.content.name/description` همان Publication پروفایل؛ `Organization.displayName` استفاده نمی‌شود. [مرجع: `origin/main:implementation/core/publication-service.ts:98-113`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,189-192`] |
| `business.location.latitude/longitude/address_text` | snapshot پروفایل؛ اگر یکی از مختصات null باشد هر دو null و `address_text` مستقل است؛ Decimal به عدد حداکثر ۶ رقم اعشار تبدیل شده است. [مرجع: `origin/main:implementation/core/publication-service.ts:98-112`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,189-190`] |
| `business.contact_information` و `links` | فقط کلیدهای sanitize‌شدهٔ snapshot پروفایل؛ allowlist در E7. [مرجع: `origin/main:implementation/core/publication-service.ts:109-112,161-170`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:144-146,204-219`] |
| `business.business_hours` | `published_content.content.business_hours` پس از اعتبارسنجی E6؛ مقدار null مجاز. [مرجع: `origin/main:implementation/core/publication-service.ts:111`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:147,189-191`] |
| `business.published_at/publication_id/source_revision` | به‌ترتیب `Publication.occurredAt/id/contentRevision` انتشار منتخب پروفایل، نه فیلد جاری Profile. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-653`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:147-151`] |
| `capabilities[].capability_id` | `Publication.capabilityId` انتشار منتخب در همان tenant. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-653`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159`] |
| `capabilities[].capability_key/name/short_description` | `published_content.content` همان انتشار Capability. [مرجع: `origin/main:implementation/core/publication-service.ts:115-119`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159`] |
| `capabilities[].fresh_until` | DTO ثابت این فیلد را می‌خواهد، اما snapshot Capability فعلی آن را ندارد. مقدار زنده نباید به‌عنوان محتوا جایگزین شود؛ راه پرکردن وفادارانه، در E9 باز است. [مرجع: `origin/main:implementation/core/publication-service.ts:115-119`; `origin/main:implementation/prisma/schema.prisma:512`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159,189-192`] |
| `capabilities[].source_revision` | `Publication.contentRevision` همان Capability. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-653`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159`] |
| `offers[].offer_id/version_number/name/short_description/offer_shape/terms/price_amount/price_currency/on_request/valid_from/valid_until` | فقط کلیدهای متناظر `published_content.content` انتشار منتخب OfferVersion؛ `terms` با E6 اعتبارسنجی می‌شود. [مرجع: `origin/main:implementation/core/publication-service.ts:121-138`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176`] |
| `offers[].offer_version_id/published_at/publication_id` | `Publication.offerVersionId/occurredAt/id` همان رویداد؛ نه ردیف جاری. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-653`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176`] |
| `offers[].capability_links` | شناسه‌های `published_content.content.capability_link_ids` انتشار OfferVersion، که فقط با snapshotهای Capability منتخب و واجد S18-A از **همان tenant** به `capability_id/key/name` تبدیل می‌شوند؛ دادهٔ زندهٔ Capability خوانده نمی‌شود. [مرجع: `origin/main:implementation/core/publication-service.ts:121-138`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:173-186`] |
| `stale` و `ordering` | metadata؛ `ordering` ثابت مصوب و `stale` فقط بر اساس اعتبار export/سیاست S20-A و S23-B، نه محتوای ردیف جاری. محدودیت stale پس از withdrawal در E5/E9 آمده است. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:177-192,221-234`] |

`category`، `floor_level`، `building_id` و `products` در این DTO **وجود ندارند**؛ `Capability.categoryKey` منبع category عمومی v1 نیست و `discount_percent` نیز از `terms` مشتق نمی‌شود. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:74-88,182-192,253-269`]

## E3. امضا، کلیدها و گردش آن‌ها — گزینه‌های تصمیم مالک

امضا برای کل `PublicBusinessExportV1` لازم است؛ تنها Mock قدیمی `draft-1` می‌تواند بی‌امضا باشد. V2 باید نسخهٔ قرارداد، شناسهٔ کلید، اعتبار امضا و زمان/سیاست cache را **پیش از پذیرش atomic** یک artifact بررسی کند. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,182-192,194-202,221-230`]

| گزینهٔ الگوریتم | مدل اعتماد، کار V2 و rotation | توصیه |
|---|---|---|
| Ed25519 با امضای detached | V1 کلید خصوصی را نگه می‌دارد؛ V2 فقط کلید عمومی allowlist‌شده را دارد. نشت کلید V2 به V1 امکان جعل نمی‌دهد. چند کلید عمومی در دورهٔ rotation پذیرفته می‌شوند. | **پیشنهاد E3-A**: جداسازی روشن producer/consumer. |
| HMAC-SHA256 | V1 و V2 یک secret مشترک دارند؛ پیاده‌سازی ساده است اما هر مصرف‌کنندهٔ دارای secret می‌تواند artifact جعلی بسازد. rotation باید هم‌زمان در دو طرف انجام شود. | جایگزین کم‌هزینه، با دامنهٔ اعتماد گسترده‌تر. |
| الگوریتم دیگری با توضیح فنی | نیازمند ثبت parser، کلید، کتابخانه، اندازهٔ signature و سیاست rotation جداگانه است. | فقط اگر نیاز مستند تازه‌ای باشد. |

این جدول **پیشنهاد طراحی** است؛ انتخاب الگوریتم، قالب encoding و دورهٔ پذیرش کلید قدیم در E9 باز می‌ماند. برای Ed25519، پیشنهاد `algorithm='Ed25519'`، `value=base64url(signature bytes, بدون padding)` و `key_id` به‌صورت شناسهٔ نسخه‌دارِ public key است. `key_id` باید در bytes امضاشده باشد و V2 آن را فقط در allowlist محلی کلیدهای عمومی جست‌وجو کند؛ ناشناخته/لغوشده fail-closed است. [مرجع دامنهٔ metadata: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:131-136,182-192,204-219`]

| گزینهٔ نگه‌داری کلید خصوصی | پیامد | توصیه |
|---|---|---|
| متغیر محیطی در زمان اجرا | استقرار ساده؛ خطر نشت در crash dump، process inspection یا env log. | فقط در محیط توسعه با کلید آزمایشی. |
| OS/secret store با مجوز محدود | جداسازی دسترسی و rotation قابل‌ممیزی؛ نیازمند آماده‌سازی عملیاتی. | **پیشنهاد E3-B** برای استقرار. |
| فایل بیرون از repository | قابل اجرا روی میزبان محدود؛ مجوز فایل و backup آن باید سخت‌گیرانه مدیریت شود. | جایگزین با کنترل دسترسی اثبات‌شده. |

**قاعدهٔ سخت:** هیچ کلید خصوصی یا secret واقعی در repository، log، evidence یا artifact خروجی نوشته نمی‌شود. این طراحی هرگز نیاز ندارد Codex کلید واقعی را بخواند. خروجی فقط `key_id` و امضا را حمل می‌کند. پیشنهاد rotation: کلید جدید برای signing فعال شود؛ V2 قبل از آن public key جدید را دریافت کند؛ کلید قدیم تا پایان پنجرهٔ مجازِ artifactهای قبلی verify شود و سپس از allowlist برداشته شود. در revocation اضطراری V2 فوراً کلید را رد و cacheهای وابسته را بی‌اعتبار کند. دوره‌ها و توزیع trust bundle در E9 بازند. [مرجع الزام امضا و cache: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,194-202,204-230`]

## E4. Canonicalization و bytes تحت امضا — پیشنهاد قابل‌بازتولید

برای رفع وابستگی به serializer زبان، G14b-2 باید **یک** پیاده‌سازی مشترک آزموده‌شده برای byte rules زیر داشته باشد؛ این‌ها طرح پیشنهادی‌اند تا مالک تصویب کند. امضا روی snapshot کامل انجام می‌شود، نه روی تک‌تک Recordها. [مرجع الزام atomic snapshot و signature: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,221-230`]

1. `records` پیش از serialization با کلید `(business.published_at, business.publication_id, business.organization_id)` صعودی مرتب شود؛ `capabilities` و `offers` هرکدام با `(published_at, publication_id)` صعودی، و `capability_links` با `capability_id` صعودی مرتب شوند. مقدارهای تکراری و شناسهٔ ناسازگار رد شوند. تاریخ انتشار در Capability داخل DTO نیست، ولی metadata رویداد برای ترتیب‌سازی در producer باقی می‌ماند. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-653`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-179,221-234`]
2. object keyها با ترتیب Unicode scalar value صعودی، مستقل از ترتیب درج، نوشته شوند؛ آرایه‌ها فقط با ترتیب صریح بالا. همهٔ رشته‌ها Unicode NFC و UTF-8 معتبر باشند؛ surrogate نامعتبر رد شود. خروجی JSON بدون BOM، بدون whitespace، با escape استاندارد `"`، `\` و control characterها باشد؛ در انتهای bytes امضاشده newline قرار نگیرد.
3. اعداد صحیح ده‌دهی بدون صفر پیشرو؛ مختصات عددی در بازهٔ مجاز و با حداکثر ۶ رقم اعشار، بدون exponent و با تبدیل `-0` به `0`؛ NaN/Infinity ممنوع. `price_amount` رشتهٔ decimal snapshot باقی بماند و به float تبدیل نشود. `null` صریح از omission متمایز است. [مرجع شکل Decimal و price: `origin/main:implementation/prisma/schema.prisma:472-473,556-557`; `origin/main:implementation/core/publication-service.ts:100-107,130-136`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:143-176,189-190`]
4. همهٔ timestampها UTC به صورت `YYYY-MM-DDTHH:mm:ss.SSSZ`، با precision سه رقم اعشار؛ offsetهای دیگر پیش از canonicalization به UTC تبدیل شوند. مقدارهای زمانی نامعتبر رد شوند. [مرجع precision DB و snapshot Offer: `origin/main:implementation/prisma/schema.prisma:559-560,642`; `origin/main:implementation/core/publication-service.ts:134-135`]
5. `snapshot_id` پیشنهاد می‌شود `sha256:` به‌علاوهٔ lowercase hex SHA-256 از bytes canonical شیء `{contract_version, records}` باشد؛ بنابراین metadata امضا/زمان خودارجاع ایجاد نمی‌کند. ورودی deterministic تولید باید شامل **زمان ارزیابی ثابت `as_of`**، نسخهٔ policy و `key_id` باشد؛ `generated_at` از همان `as_of` در UTC گرفته شود. دو اجرا روی همان داده **و همان context ثابت** bytes یکسان می‌دهند. چرخه‌ای با `as_of` تازه، حتی اگر محتوای DB عوض نشده باشد، artifact تازه با `generated_at` تازه می‌سازد تا اعتبار زمانی امضا قابل سنجش بماند؛ بنابراین شرط «دو اجرای مستقل در دو زمان متفاوت روی DB یکسان، bytes یکسان» با `generated_at` واقعی و TTL هم‌زمان قابل تضمین نیست. این تعارض در E9 به تصمیم مالک گذاشته شده است. [مرجع metadata DTO و freshness: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:131-137,177-192,221-234`]
6. شیء تحت امضا دقیقاً envelope نهایی است که در آن `signature` فقط `{algorithm,key_id}` دارد و `value` حذف شده است. bytes امضا برابرند با UTF-8 رشتهٔ domain separator `MLINO-PUBLIC-BUSINESS-V1\n`، سپس bytes canonical آن شیء. بنابراین `contract_version`، `snapshot_id`، `generated_at`، همهٔ recordها، `stale`، `ordering`، `algorithm` و `key_id` در امضا مشارکت دارند؛ فقط خود `signature.value` بیرون است. V2 با همین قواعد bytes را بازسازی و verify می‌کند؛ هر parse/format ناهمسان رد می‌شود. [مرجع envelope و atomic بودن: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:131-179,221-230`]

## E5. شکل اجرا، نوشتن atomic و S23-B

تولیدکننده فقط خوانندهٔ V1 است و **هرگز به پایگاه داده نمی‌نویسد**؛ مسیر ذخیرهٔ artifact بیرون repository و با مالکیت حساب سرویس است. انتخاب transportِ مرحلهٔ نخست S17-B همان export امضاشده باقی می‌ماند. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:194-202,204-219,290-315`]

| گزینه | پیامد | توصیه |
|---|---|---|
| CLI دستی | مناسب validation و بازتولید؛ به‌تنهایی هدف پنج‌دقیقه‌ای withdrawal را تضمین نمی‌کند. | ابزار داخلیِ مسیر توصیه‌شده باشد. |
| scheduled task که CLI را هر ۶۰ ثانیه اجرا کند | عمر کوتاه process، نظارت ساده؛ باید اجرای هم‌پوشان را رد کند و consumer نیز زمان‌بندی داشته باشد. | **پیشنهاد E5-A** برای MVP. |
| سرویس دائمی | امکان واکنش فوری؛ هزینهٔ نگه‌داری، بازراه‌اندازی و observability بیشتر. | فقط با نیاز latency واقعی. |

هر چرخه یک read consistent می‌گیرد، DTO را کامل می‌سازد، امضا را می‌سنجد، فایل موقت را در همان filesystem با دسترسی محدود می‌نویسد، آن را flush می‌کند و با rename اتمیک جای artifact جاری می‌گذارد. دو نسخهٔ موفق پیشین به‌صورت read-only برای rollback نگه داشته شوند؛ شکست validation/signing/rename هیچ فایل ناقص یا unsigned را current نمی‌کند. rollback فقط به آخرین artifact معتبر در محدودهٔ TTL/claim/freshness مجاز است. جزئیات مسیر استقرار و retention در E9 باز می‌ماند. [مرجع الزام atomic/cache و artifact امضاشده: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:194-202,221-234`]

برای S23-B، پیشنهاد چرخهٔ producer **هر ۶۰ ثانیه** و دریافت consumer **حداکثر هر ۶۰ ثانیه** است؛ در حالت سالم، withdraw در حداکثر حدود ۱۲۰ ثانیه به cache می‌رسد. برای شکست چرخه یا انتقال، V2 باید artifact بیش از ۱۸۰ ثانیه از `generated_at` را برای نمایش «فعال» رد کند؛ حتی اگر signature معتبر باشد. این اعداد پیشنهادی و نیازمند تصمیم مالکند. `stale` داخل artifact امضاشده را consumer نمی‌تواند بدون شکستن امضا تغییر دهد؛ consumer باید وضعیت cache/age را بیرون از artifact ارزیابی و نمایش را fail-closed کند. بدون سیگنال invalidation یا export تازه، producer نمی‌تواند در لحظهٔ withdrawal، stale بودن artifact قبلی را بداند؛ این محدودیت در E9 باز ثبت شده است. [مرجع S23-B و stale/atomic: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:177-185,221-234,253-269`]

## E6. JSON نسخه‌دار `business_hours` و `terms`

OQ-4 A′ اجازه داده که این دو فیلد هنگام انتشار همان JSON ذخیره‌شده باشند؛ producer باید پیش از خروج، آن‌ها را با schema نسخه‌دار اعتبارسنجی یا حذف کند. `null` همچنان در DTO مجاز است. [مرجع: `origin/main:implementation/core/publication-service.ts:98-113,121-136`; `origin/main:implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md:275-284`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:147,167,189-191`]

**پیشنهاد schema ساعات کاری:** اگر non-null باشد، object با کلیدهای دقیق `schema_version: 'mlino.business-hours.v1'`، `timezone: <IANA zone>`، `weekly: [{ day: 1..7, intervals: [{ open: 'HH:mm', close: 'HH:mm' }] }]` و `exceptions?: [{ date: 'YYYY-MM-DD', closed: boolean, intervals?: [...] }]`. روزها یکتا، زمان‌ها ۲۴ساعته، `open < close` و بازه‌ها بدون هم‌پوشانی باشند؛ بازهٔ شبانه در دو روز شکسته شود. کلید اضافی، رشتهٔ آزاد به‌جای object و schema ناشناخته رد شوند. این تعریف، پیشنهاد برای تصویب است. [مرجع فیلد snapshot/DTO: `origin/main:implementation/core/publication-service.ts:101-112`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,189-191`]

برای ساعات کاری نامعتبر سه انتخاب وجود دارد: کل Record رد شود (از دست‌رفتن کل کسب‌وکار)، فقط `business_hours` به `null` سرکوب شود (دیگر ساعت نامعتبر ادعا نمی‌شود)، یا کل export شکست بخورد (یک رکورد همه را متوقف می‌کند). **توصیهٔ E6-A:** فقط فیلد را null کنید و خطای ساختاریِ بدون مقدار خام را ثبت کنید؛ هیچ ساعت یا وضعیت «باز است» حدس زده نشود. [مرجع null بودن فیلد و fail-closed: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:147,182-192,204-219`]

**پیشنهاد schema شرایط Offer:** اگر non-null باشد، object با کلیدهای دقیق `schema_version: 'mlino.offer-terms.v1'`، `summary: <رشتهٔ غیرتهی>` و `conditions: <آرایهٔ مرتبِ رشته‌های غیرتهی>`؛ طول و تعداد در schema اجرایی محدود شود، HTML و کلید اضافه رد شوند. `price_amount`/`price_currency` همچنان فیلد جداگانهٔ DTO هستند و از `terms` استخراج نمی‌شوند. این تعریف، پیشنهاد برای تصویب است. [مرجع snapshot/DTO: `origin/main:implementation/core/publication-service.ts:121-136`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176,74-88,189-191`]

برای `terms` نامعتبر نیز گزینه‌ها حذف فیلد به null، حذف همان Offer، یا شکست کل export هستند. **توصیهٔ E6-B:** Offer دارای `terms` غیرتهی و نامعتبر حذف شود؛ نمایش Offer بدون شرطی که کسب‌وکار درج کرده می‌تواند گمراه‌کننده باشد. Offer با `terms=null` منتشرشده، با همان null باقی می‌ماند. خطای حذف فقط به‌صورت شناسهٔ رویداد و کد validation در log بیاید. [مرجع null بودن terms و جدایی قیمت: `origin/main:implementation/core/publication-service.ts:121-136`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176,189-191`]

## E7. امنیت، حریم خصوصی و مرز tenant

`contact_information` فقط `public_phone`، `public_email` و `public_address` را می‌پذیرد؛ `links` فقط `website` و `public_social` را. آن‌ها هنگام snapshot نیز allowlist می‌شوند و producer دوباره شکل و نوع را می‌سنجد. opt-out یا محدودیت privacy مانع نمایش مقدار می‌شود، حتی اگر snapshot تاریخی آن را نگه داشته باشد؛ اجرای دقیق این policy در G14b-2 نیاز به منبع مصوب دارد. [مرجع: `origin/main:implementation/core/publication-service.ts:98-112,161-170`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,204-219,253-269`]

خروجی هرگز Membership، PermissionGrant، actor، grant، claim/verification داخلی، Evidence خام، confidence یا provenance خام را حمل نمی‌کند. شناسهٔ organization و publication طبق DTO، metadata عمومی مجازند؛ هیچ شناسهٔ عضویت/مجوز یا `gate_snapshot` از Publication کپی نمی‌شود. joinها با organization-id یکسان و snapshotهای منتشرشده انجام می‌شوند؛ پیوند Offer به Capability فقط پس از عبور Capability از S18-A صادر می‌شود. [مرجع: `origin/main:implementation/prisma/schema.prisma:626-654`; `origin/main:implementation/core/publication-service.ts:141-157`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-192,204-219`]

فایل موقت و جاری فقط برای حساب producer و مسیر توزیعِ مجاز قابل‌خواندن باشند؛ private key هرگز کنار artifact قرار نگیرد. log فقط زمان، شمارش، `snapshot_id`، `key_id`، کد خطا و وضعیت انتشار را ثبت کند؛ محتوای تماس، JSON business_hours/terms، secret، connection string، کلید خصوصی، signature raw یا payload خام در log/evidence نیاید. V2 قبل از جایگزینی cache، امضا و نسخه را verify کند و import ناقص را رد کند. [مرجع الزام امضا، PII و atomic cache: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,204-230`]

## E8. برنامهٔ آزمون G14b-2 — فقط فهرست

همهٔ آزمون‌های نیازمند DB فقط روی PostgreSQL یک‌بارمصرف در `127.0.0.1:5499` اجرا شوند؛ این مرحله هیچ آزمون DB یا کدی اجرا نمی‌کند. [مرجع دامنهٔ مصوب: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md:9-20,23-78`]

1. انتخاب Profile/Capability/OfferVersion منتشرشده؛ tie روی `occurred_at` با `id`؛ WITHDRAWN و REPLACED باید snapshot قدیمی را حذف کنند. [مرجع: `origin/main:implementation/core/publication-service.ts:60-82`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:42-49,221-234`]
2. Capability منتشرشده ولی `UNCONFIRMED`، Capability stale/retired/internal و لینک Offer به آن پنهان شوند؛ Evidence stale/AI_INFERRED خام به خروجی راه نیابد. [مرجع: `origin/main:implementation/prisma/schema.prisma:282-319,496-526,593-623`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:92-113,182-186`]
3. Organization یا Profile archived و Offer retired پنهان شوند؛ claim معلق/منقضی فوراً exposure را ببندد. [مرجع: `origin/main:implementation/prisma/schema.prisma:239-250,270-301,327-380,465-490,530-543`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:115-124`]
4. دو سازمان با شناسه‌های مشابه: هیچ content/link/claim/evidence از tenant دیگر وارد export نشود؛ هیچ live-row content نشت نکند. [مرجع: `origin/main:implementation/prisma/schema.prisma:465-490,579-590,626-650`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:189-192,204-217`]
5. با ورودی و context یکسان دو بار تولید شود و bytes و `snapshot_id` برابر باشند؛ تغییر یک byte، تغییر version، جابه‌جایی رکورد و tampering باید verify را fail کند. [مرجع الزام signature/atomic: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,221-230`]
6. کلید آزمایشیِ غیرواقعی برای sign/verify، unknown/revoked `key_id` و rotation آزمایشی؛ هیچ کلید واقعی در شواهد نباشد. [مرجع الزام امضا: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-137,194-202`]
7. `business_hours` و `terms` معتبر/نامعتبر طبق انتخاب E6؛ contact و links خارج از allowlist حذف شوند؛ هیچ مقدار حساس در log نیاید. [مرجع: `origin/main:implementation/core/publication-service.ts:98-112,121-138,161-170`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-176,204-219`]
8. یک withdraw در هر نقطهٔ چرخه رخ دهد: زمان تا artifact جدید و cache V2 اندازه‌گیری شود؛ حد پنج دقیقه، stale/expiry، شکست تولید، و سالم ماندن artifact قبلی آزموده شود. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:177-185,221-249,253-269`]

## E9. پرسش‌های باز برای مالک — هیچ‌کدام در این سند تصمیم‌گیری نشده‌اند

| پرسش | گزینه‌ها و پیامد | یک توصیه |
|---|---|---|
| Q1 الگوریتم امضا | Ed25519: public-key verification و جدایی اعتماد؛ HMAC-SHA256: پیاده‌سازی ساده‌تر ولی secret مشترک و قابلیت جعل در هر دو طرف؛ گزینهٔ دیگر: نیازمند specification تازه. [مرجع شکل signature: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:131-136,194-202`] | Ed25519، با قالب پیشنهادی E3. |
| Q2 محل کلید و `key_id` | OS/secret store: کنترل و rotation بهتر؛ env: ساده ولی در معرض نشت؛ فایل بیرون repo: نیازمند ACL/backup. `key_id` می‌تواند fingerprint عمومی یا شناسهٔ opaque نسخه‌دار باشد؛ V2 باید trust bundle سازگار داشته باشد. [مرجع الزام key_id: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:131-136,204-219`] | secret store و `key_id` نسخه‌دارِ public key؛ دورهٔ rotation پیش از اجرا تصویب شود. |
| Q3 شکل اجرا/مسیر/retention | CLI دستی: بدون تضمین latency؛ scheduled ۶۰ثانیه‌ای: ساده‌تر؛ سرویس دائم: واکنش سریع‌تر با هزینهٔ عملیاتی. تعداد artifactهای نگه‌داری‌شده و مسیر بیرون repo باید تعیین شود. [مرجع S17-B/S23-B: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:194-202,221-234,253-269`] | scheduled task + CLI داخلی؛ دو artifact قبلی. |
| Q4 stale و withdraw در cache | polling ۶۰ثانیه‌ای با TTL ۱۸۰ثانیه‌ای: سقف سالم حدود ۱۲۰ثانیه اما stale فوریِ رویداد ناشناخته را تشخیص نمی‌دهد؛ invalidation signal کنار export: تشخیص سریع‌تر، مرز تازهٔ عملیاتی. `stale` در امضای artifact قابل ویرایش نیست. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:177-185,221-234,253-269`] | polling + TTL fail-closed برای MVP؛ اگر stale فوری لازم است، invalidation جداگانه پیش از G14b-2 تصویب شود. |
| Q5 ساعات کاری نامعتبر | حذف Record، null کردن همان فیلد، یا شکست کل export؛ پیامد به‌ترتیب افت پوشش، حذف ادعای ساعات، یا توقف همه. [مرجع null بودن DTO و OQ-4: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,189-191`; `origin/main:implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md:275-284`] | null کردن فیلد با ثبت کد خطا. |
| Q6 terms نامعتبر | null کردن، حذف Offer یا شکست کل export؛ null ممکن است شرط تجاری را مخفی کند. [مرجع: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176,189-191`] | حذف همان Offer؛ `terms=null` اصیل همچنان مجاز. |
| Q7 `fresh_until` Capability | افزودن به snapshot آینده با CCR و republish؛ یا null برای snapshot قدیم؛ یا حذف Capability فاقد کلید. live row منبع محتوا نیست. [مرجع: `origin/main:implementation/core/publication-service.ts:115-119`; `origin/main:implementation/prisma/schema.prisma:512`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159,189-192`] | CCR کوچک برای snapshot آینده، و تا republish حذف fail-closedِ Capability فاقد مقدار معتبر. |
| Q8 چند Profile برای یک Organization | انتخاب آخرین Profile: ممکن است کسب‌وکار اشتباه را نشان دهد؛ صدور چند Record با organization_id یکسان: هویت V2 مبهم می‌شود؛ الزام یک Profile عمومی با validation/CCR: گام اضافی، اما روشن. [مرجع: `origin/main:implementation/prisma/schema.prisma:465-493`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,204-217`] | یک Profile عمومیِ مصوب برای هر Organization؛ تا تصویب، سازمان مبهم fail-closed. |
| Q9 policy Evidence و freshness | فقط Capability/Offer time gates: ساده ولی شواهد stale را در eligibility دخیل نمی‌کند؛ policy نسخه‌دار بر اساس Evidence تأییدشده/تازه: دقیق‌تر ولی باید مشخص کند کدام evidence الزام‌آور است. [مرجع: `origin/main:implementation/prisma/schema.prisma:503-512,593-623`; `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:92-113,253-269`] | policy نسخه‌دار Core با فهرست روشن الزامات؛ AI inference به‌تنهایی کافی نباشد. |
| Q10 timestamp و determinism مستقل | `as_of` ثابت به‌عنوان بخشی از input: bytes در replay همان context یکسان است و artifact هر چرخه تازه می‌شود؛ reuse artifact قبلی: bytes چرخه‌های متوالی یکی، ولی `generated_at` پیر می‌شود و TTL مصرف‌کننده نمایش را می‌بندد؛ watermark داده: مستقل‌تر از ساعت اجرا، ولی تغییر gateهای بدون timestamp را پوشش نمی‌دهد. [مرجع metadata و atomicity: `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:131-137,221-234`] | `as_of` ثابت برای replay/test و timestamp تازه برای چرخهٔ واقعی؛ تصریح شود «دادهٔ یکسان» در شرط byte identity شامل context زمانی است. |

تا بسته‌شدن تصمیم‌های مؤثر بر fidelity، امضا و latency، G14b-2 نباید به‌عنوان پیاده‌سازی آمادهٔ تولید تلقی شود. این جمله پیشنهاد بازبینی است و وضعیت Handoff یا تصمیم‌های S16 تا S26 را تغییر نمی‌دهد. [مرجع دامنهٔ مرحله: `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md:9-20,23-78`]
