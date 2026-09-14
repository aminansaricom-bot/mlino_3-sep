# طراحی قرارداد خواندن دادهٔ منتشرشدهٔ MLINO V2

**وضعیت:** FINAL — تصمیم‌های S16 تا S26 طبق سند تصویب مالک قطعی شده‌اند.

مرجع تصویب: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md` در commit pinned `aaf878ee1dad4cb379a3007137dd174ddc92f2a1`.

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
| Evidence | خود Evidence خام منتشر نشود | فقط برای اثبات داخلی freshness/eligibility؛ در صورت نیاز، خلاصهٔ غیرحساس و تصمیم‌گیری‌شده در snapshot منتشرشده |
| Publication | رویداد انتشار و نسخهٔ منتشرشده | به‌عنوان provenance و revision در قرارداد؛ تاریخچهٔ داخلی کامل به V2 داده نشود |
| Membership / PermissionGrant | هرگز expose نشود | اطلاعات داخلی authorization |
| BusinessIdentityClaim / IdentityVerification | وضعیت داخلی claim expose نشود | فقط نتیجهٔ policy نمایش عمومی را تعیین کند |

BusinessProfile در Core فیلدهای عمومی اصلی را دارد، از جمله نام، توضیح، مختصات، تماس، لینک و ساعات کاری (`origin/main: implementation/prisma/schema.prisma:465-493`). Capability فیلدهای محتوایی و وضعیت انتشار/تأیید/freshness را دارد (`origin/main: implementation/prisma/schema.prisma:496-527`). OfferVersion محتوای نسخه، بازهٔ اعتبار و وضعیت انتشار را نگه می‌دارد (`origin/main: implementation/prisma/schema.prisma:547-576`).

## ۳. مشکل fidelity محتوای منتشرشده و گزینه‌ها

### شکاف فعلی

Publication رویداد انتشار را با نوع رویداد، `contentRevision`، actor، permission و `gateSnapshot` ثبت می‌کند (`origin/main: implementation/prisma/schema.prisma:626-654`). اما رکورد Publication یک snapshot کامل از فیلدهای BusinessProfile، Capability یا OfferVersion ندارد. محتوای Profile و Capability در ردیف‌های جاری آن‌هاست (`origin/main: implementation/prisma/schema.prisma:465-481,496-512`) و OfferVersion نیز به‌صورت ردیف immutable نگه‌داری می‌شود (`origin/main: implementation/prisma/schema.prisma:547-563`). بنابراین صرفاً خواندن جدول جاری و نام‌گذاری آن به‌عنوان «محتوای منتشرشده» می‌تواند محتوای بعد از آخرین انتشار را هم وارد V2 کند؛ این با قاعدهٔ جدا بودن `contentRevision` از `publishedContentRevision` ناسازگار است (`origin/main: implementation/prisma/schema.prisma:478-481,509-512`).

در سمت V2 نیز export فعلی `contract_version`، `generated_at` و `records` را تعریف می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:62-72`) و هر record در draft-1 شامل `products` و `offers` است (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:24-43,49-60`). Core schema فعلی Product ندارد و Offer/OfferVersion شکل دیگری دارد (`origin/main: implementation/prisma/schema.prisma:530-576`). این قرارداد نباید این شکاف را با حدس، دادهٔ ساختگی یا خواندن مستقیم ماژول‌ها پنهان کند.

### گزینه‌های fidelity

**A1 — `publications.published_content` از نوع JSONB روی Publication (تصویب‌شده):** یک ستون `published_content` اضافه می‌شود؛ برای `event_kind=PUBLISHED` مقدار آن NOT NULL و برای `WITHDRAWN` مقدار آن NULL است و این رابطه با CHECK محافظت می‌شود. `PublicationService` باید در همان transaction، پس از قفل `FOR UPDATE` ردیف هدف در revision درخواستی، فقط فیلدهای عمومی allowlist‌شده را در snapshot بنویسد؛ هرگز کل ردیف ذخیره نشود. برای OfferVersion نیز snapshot یکنواخت قرارداد ثبت می‌شود.

- **CCR:** بله؛ تغییر schema و migration لازم است.
- **D6:** بدون تغییر باقی می‌ماند؛ snapshot باید به revision همان رخداد bind شود.
- **S4، سرویس‌ها و triggerها:** S4 و E2 بدون تغییر می‌مانند؛ `ALREADY_PUBLISHED` ردیف جدید نمی‌سازد. trigger `publication_immutable_before_change` از تغییر snapshot پس از درج جلوگیری می‌کند (`origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:759-769`).
- **UX:** faithful و deterministic برای همان رخداد؛ payload بزرگ‌تر و تغییر شکل آن نیازمند versioning است.

قانون read برای A1: برای هر target، آخرین `PUBLISHED` که بعد از آن `WITHDRAWN` نیامده، با ترتیب قطعی `occurred_at` و سپس `id` انتخاب می‌شود. مقدار `published_content` برای `WITHDRAWN` تهی است؛ بنابراین read layer نباید یک snapshot قدیمی را پس از withdraw فعال فرض کند. A2 انتخاب نشده و فقط projection مشتق‌شدهٔ آینده از همین eventهاست.

**A2 — جدول projection عمومی Core:** یک projection versioned و فقط‌خواندنی برای Profile، Capability و OfferVersion نگه‌داری شود؛ Publication به revision projection اشاره کند.

- **CCR:** بله؛ مدل، migration، trigger/transaction و read boundary جدید لازم است.
- **D6:** انتشار projection باید با revision جاری و gate همان رخداد atomic باشد؛ trigger نباید راه دوم و متناقض برای نوشتن projection بسازد.
- **S4، سرویس‌ها و triggerها:** PublicationService writer مجاز باقی می‌ماند؛ Core read service از projection می‌خواند؛ C15 باید source of truth و projection را در یک transaction نگه دارد.
- **UX:** پاسخ کوچک‌تر، cache و rollback روشن‌تر، و مناسب‌تر برای V2؛ هزینهٔ storage و lifecycle بیشتر است.

**B — قفل‌کردن ویرایش پس از انتشار:** تا زمان withdraw یا ساخت نسخهٔ جدید، فیلدهای عمومی منتشرشده قابل‌ویرایش نباشند.

- **CCR:** خیر؛ این گزینه فقط service-level است و schema تغییر نمی‌کند. فقط اگر guard در سطح DB لازم شود CCR جداگانه لازم است.
- **D6:** شمارهٔ revision دیگر با ویرایش عادی بعد از انتشار جلو نمی‌رود؛ تغییر باید پس از withdraw یا در revision جدید انجام شود.
- **S4، سرویس‌ها و triggerها:** Profile/Capability service باید mutation را رد کند؛ C15 ساده‌تر می‌شود، ولی عملیات انتشار/ویرایش به هم وابسته می‌شوند.
- **UX:** fidelity بالا و رفتار قابل‌فهم، اما ویرایش کسب‌وکار کندتر و برای اصلاح فوری نامناسب‌تر است.

**C — gating با برابری revision:** ردیف جاری فقط وقتی expose شود که `content_revision = published_content_revision` و status منتشرشده باشد.

- **CCR:** خیر؛ این گزینه فقط service-level است و schema تغییر نمی‌کند. فقط اگر guard در سطح DB لازم شود CCR جداگانه لازم است؛ در schema فعلی بخشی از داده موجود است، اما این راه به‌تنهایی snapshot قدیمی را نگه نمی‌دارد.
- **D6:** با هر ویرایش revision جاری جلو می‌رود و projection status باید از انتشار قبلی جدا بماند.
- **S4، سرویس‌ها و triggerها:** read service باید برابری را enforce کند؛ trigger C15 همچنان status را محافظت می‌کند.
- **UX:** ساده و fail-closed، اما بعد از یک ویرایش نامنتشر، داده برای کاربر ناپدید می‌شود و محتوای آخرین انتشار قابل بازسازی نیست.

**توصیهٔ واحد:** **A1** طبق تصویب مالک اجرا می‌شود. A2 انتخاب نشده و بعداً فقط به‌عنوان projection مشتق‌شده از eventها قابل بررسی است. B و C به‌تنهایی snapshot قابل‌بازگشت ایجاد نمی‌کنند. «Adapter» گزینهٔ fidelity نیست، چون چیزی را که منتشر شده ذخیره نمی‌کند؛ «event» فقط در بخش transport بررسی می‌شود.

## ۴. نگاشت draft-1 V2 به Core

| فیلد draft-1 در V2 | مقصد Core/قرارداد پیشنهادی | وضعیت و پیامد |
|---|---|---|
| `business_id` | `Organization.id` | نگاشت مستقیم؛ هویت canonical در Core است (`origin/main: implementation/prisma/schema.prisma:327-353`; `origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:49-54`). |
| `organization_id` | `Organization.id` | همان مقدار برای tenant؛ V2 فقط مصرف‌کننده است (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:49-60`). |
| `category` | `Capability.categoryKey` یا vocabulary ماژول | Core نباید category کلینیکی بسازد؛ mapping vocabulary باید versioned باشد. Capability category در Core هست (`origin/main: implementation/prisma/schema.prisma:496-527`). |
| `location.floor_level` | مقصد فعلی ندارد | BusinessProfile فقط latitude/longitude/address دارد (`origin/main: implementation/prisma/schema.prisma:465-477`)، پس floor/building نیازمند تصمیم و CCR جداست؛ دادهٔ Mock فعلی واقعی تلقی نشود (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:13-22`). |
| `location.building_id` | مقصد فعلی ندارد | همان شکاف بالا؛ گزینه‌ها: فیلد typed در Profile یا extension جدا، فقط پس از تصمیم. |
| `products` | مقصد Core ندارد | Core Offer/OfferVersion دارد، Product ندارد (`origin/main: implementation/prisma/schema.prisma:530-576`). حذف از DTO واقعی، یا ساخت مدل جدید، تصمیم جداست؛ بازسازی Product از Capability مجاز نیست. |
| `offers.title` | `OfferVersion.name` | mapping معنایی ممکن است، اما contract باید نام‌گذاری را صریح کند (`origin/main: implementation/prisma/schema.prisma:547-560`; `origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:34-43`). |
| `offers.discount_percent` | مقصد مستقیم ندارد | Core price/terms دارد، اما discount_percent ندارد (`origin/main: implementation/prisma/schema.prisma:552-560`). تبدیل از terms فقط با قرارداد typed مجاز است؛ حدس در V2 ممنوع. |
| `last_synced_at` | metadata انتقال، نه business truth | از `generated_at`/sync receipt ساخته می‌شود؛ V2 فعلی آن را در cache نگه می‌دارد (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:59-60`). |

### برنامهٔ نسخه

`draft-1` فقط قرارداد آزمایشی/Mock باقی بماند. قرارداد واقعی پیشنهادی `mlino.v2.public-business.v1` است و باید با DTO typed، policy انتشار و transport مصوب نهایی شود. V2 باید تا زمان migration، `draft-1` را با label آزمایشی جدا نگه دارد؛ پس از انتشار `public-business.v1`، draft-1 deprecated می‌شود و حذف آن فقط بعد از دورهٔ سازگاری و مالکیت migration مجاز است. پیامدهای schema بالا فقط گزینه‌اند و در این مرحله اعمال نمی‌شوند.

## ۵. تازگی و اعتبار

برای policy freshness این metadata باید در منبع/وضعیت cache قابل ردیابی باشد؛ در DTO نهایی فقط آن‌هایی که در بلوک نوع آمده‌اند serialize می‌شوند:

- `contract_version`
- `organization_id`
- `source_revision` یا مجموعهٔ revisionهای Profile/Capability/OfferVersion
- `published_at`
- `generated_at`
- `last_synced_at` در draft-1 legacy است و در v1 با `generated_at`، `snapshot_id` و receipt انتقال پوشش داده می‌شود؛ به‌صورت content field وارد DTO نمی‌شود.
- `fresh_until` برای Capability و Evidence در صورت اعمال policy
- `visibility` به‌صورت شرط exposure اعمال می‌شود و وضعیت داخلی claim/permission را expose نمی‌کند.

Capability در Core `freshUntil` دارد (`origin/main: implementation/prisma/schema.prisma:503-512`) و Evidence نیز `freshUntil` و status دارد (`origin/main: implementation/prisma/schema.prisma:593-612`). در V2 فعلی فقط `last_synced_at` در DTO وجود دارد و Offer با `valid_until` بررسی می‌شود (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/contract.ts:34-43,49-60`; `origin/codex/v2-intent-flow-foundation: mlino2/app/src/matching/MatchingService.ts:91-94`). این دو مفهوم باید جدا بمانند: sync freshness با business validity یکی نیست.

پیشنهاد: V2 فقط آیتمی را نمایش دهد که Publication معتبر دارد، revision آن با snapshot منتشرشده برابر است، و در زمان خواندن از بازهٔ اعتبار خارج نشده است. تاریخ نامعتبر یا دادهٔ بدون `fresh_until` معتبر باید طبق policy صریح تعیین شود، نه با حدس در client.

**Y1 — Capability:** انتشار Capability در Core طبق S14-A می‌تواند با وضعیت `UNCONFIRMED` مجاز باشد؛ S18-A اکنون تصمیم نهایی exposure است: V2 فقط `HUMAN_CONFIRMED` را expose می‌کند و قابلیت منتشرشده اما تأییدنشده را داخلی نگه می‌دارد. این قاعده با permission انتشار یکی نیست.

**Y2 — Evidence با منبع `AI_INFERRED`:** طبق ADR-0006، provenance با confirmation جداست. Evidence با source `AI_INFERRED` یا status `UNCONFIRMED` نباید به‌تنهایی public eligibility را ثابت کند. V2 نباید Evidence خام را نمایش دهد؛ Core read layer باید policy evidence لازم را اعمال کند (`origin/main: implementation/prisma/schema.prisma:593-623`).

**Y3 — پیوند Capability به Offer:** OfferVersionCapability رابطهٔ Core بین نسخهٔ Offer و Capability است (`origin/main: implementation/prisma/schema.prisma:579-590`). DTO می‌تواند برای هر OfferVersion فهرست `capability_ids` یا خلاصهٔ Capabilityهای public را برگرداند، اما فقط پیوندهای همان organization و فقط Capabilityهای واجد شرط exposure؛ نام‌گذاری category یا capability از متن آزاد V2 حدس زده نشود.

## ۶. نمایش پس از تعلیق یا انقضای claim

Core Claim را از Organization جدا نگه می‌دارد؛ وضعیت claim و زمان اعتبار در خود claim است (`origin/main: implementation/prisma/schema.prisma:356-380`). BusinessProfile نیز به claim اختیاری همان سازمان وصل می‌شود (`origin/main: implementation/prisma/schema.prisma:465-486`).

دو گزینه برای سابقهٔ تصمیم بررسی شده بود:

- **S16-A — حذف فوری از exposure:** با مشاهدهٔ SUSPENDED یا EXPIRED، read layer پروفایل را عمومی برنگرداند؛ تاریخچهٔ داخلی باقی بماند. این گزینه با fail-closed و جلوگیری از نمایش هویت حل‌نشده سازگارتر است.
- **S16-B — حفظ آخرین انتشار تا پایان TTL:** آخرین projection تا زمان مشخصی نمایش داده شود و پس از آن حذف شود. تجربهٔ پایدارتر است، ولی ممکن است اطلاعات کسب‌وکار پس از تعلیق دیده شود.

**تصمیم نهایی S16-A:** با مشاهدهٔ SUSPENDED یا EXPIRED، پروفایل بلافاصله از public output حذف می‌شود. تاریخچهٔ داخلی باقی می‌ماند و هیچ TTL برای ادامهٔ نمایش عمومی وجود ندارد.

## ۷. DTOهای نسخه‌دار

قرارداد نهایی `mlino.v2.public-business.v1` است. Export طبق S17-B باید امضا داشته باشد؛ artifact بدون امضا فقط برای Mock `draft-1` مجاز است. شکل فعلی export در V2 از `contract_version`، `generated_at` و `records` استفاده می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:62-72`). DTO نهایی:

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

قواعد DTO نهایی:

- S18-A: فقط Capability با `HUMAN_CONFIRMED` در `capabilities` و capability links عمومی می‌آید؛ انتشار unconfirmed طبق S14-A در Core مجاز می‌ماند اما در public output پنهان است.
- S20-A: freshness در زمان read با policy versioned اعمال می‌شود؛ stale marker باید وضعیت cache/withdraw را صادقانه نشان دهد.
- S24-B: capability links فقط به Capabilityهایی اشاره می‌کنند که از S18-A عبور کرده‌اند.
- S25: در `public-business.v1` هیچ `category`، `floor_level` یا `building_id` وجود ندارد. category آینده فقط از vocabulary نسخه‌دار اولین module می‌آید؛ floor/building در V2 فعلاً mock/null می‌ماند.
- S26: `products` از قرارداد واقعی حذف شده است؛ Offer/OfferVersion جای آن را می‌گیرد. `draft-1` با products فقط Mock و deprecated است.
- `Membership`، `PermissionGrant`، claim status، Evidence خام و PII غیر allowlist‌شده هرگز برنمی‌گردند.
- اگر یکی از latitude یا longitude تهی باشد، هر دو مختصات در DTO تهی می‌شوند؛ `address_text` مستقل باقی می‌ماند. مقدار Decimal مختصات به number با حداکثر ۶ رقم اعشار تبدیل می‌شود (`origin/main: implementation/prisma/schema.prisma:472-477`).
- `business_hours` و `terms` باید JSON مطابق schema نسخه‌داری باشند که در G14b تعریف می‌شود؛ `unknown` در بلوک TypeScript فقط نشان‌دهندهٔ قرارداد schema جداگانه است، نه مجوز عبور JSON دلخواه.
- هر content field از `publications.published_content` در S19-A1 می‌آید؛ read layer هیچ live-row را برای محتوای DTO نمی‌خواند. `Organization.id` فقط شناسهٔ tenant است و `Organization.displayName` مستقیماً وارد DTO نمی‌شود؛ اگر نام نمایشی لازم شود فقط از allowlist snapshot BusinessProfile در G14a افزوده می‌شود. منابع schema: Organization/BusinessProfile (`origin/main: implementation/prisma/schema.prisma:327-353,465-493`)، Capability (`origin/main: implementation/prisma/schema.prisma:496-527`)، Offer/OfferVersion (`origin/main: implementation/prisma/schema.prisma:530-576`)، Publication (`origin/main: implementation/prisma/schema.prisma:626-654`). `signature`، `generated_at`، `snapshot_id`، `stale` و `ordering` metadata هستند؛ `category`، `floor_level`، `building_id` و `products` عمداً در DTO نهایی نیستند.

## ۸. گزینه‌های انتقال

**S17-A — Read API versioned:** مسیر فقط‌خواندنی با DTO نسخه‌دار، tenant filter و cursor/etag.

**S17-B — Export snapshot:** فایل JSON امضاشده یا artifact versioned که V2 وارد cache می‌کند. این گزینه با مکانیزم فعلی Mock هم‌راستاست (`origin/main: mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md:52-60`).

**S17-C — Event feed:** رخدادهای انتشار برای ساخت cache V2.

**تصمیم نهایی S17-B:** اولین transport، export امضاشدهٔ versioned و فقط‌خواندنی است. API بعداً همان DTO را ارائه می‌کند و event feed فعلاً خارج از scope است. این انتخاب با توصیهٔ export-first سند یکپارچگی هم‌راستاست (`origin/main: mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md:52-60`).

## ۹. امنیت و tenancy

V2 نباید `organization_id` را از ورودی کاربر به‌عنوان مجوز اعتماد کند. V1 باید داده را با tenant صحیح تولید کند و V2 باید در import/read مسیر tenant و شناسهٔ پایدار را فقط به‌صورت دادهٔ read-only نگه دارد.

Core در مدل‌ها organization را به‌صورت FK نگه می‌دارد و روابط چندسازمانی را با زوج شناسه محدود می‌کند؛ نمونهٔ Profile و Capability به Organization وصل‌اند (`origin/main: implementation/prisma/schema.prisma:465-486,496-520`). Publication و performed-by membership نیز در همان organization قید شده‌اند (`origin/main: implementation/prisma/schema.prisma:626-647`).

read contract باید:

- فقط محتوای publish‌شده را برگرداند؛
- هیچ permission، membership یا شناسهٔ platform actor را expose نکند؛
- دادهٔ یک organization را در پاسخ organization دیگر وارد نکند؛
- خطای نبودن tenant را با جزئیات داخلی افشا نکند؛
- cache key را حداقل بر `organization_id` و نسخهٔ contract متکی کند؛
- V2 را از write، claim، publication و تغییر business truth منع کند.

مصرف‌کنندهٔ V2 باید با credential سرویس‌به‌سرویس یا artifact امضاشده احراز شود؛ endpoint عمومی بدون auth برای دادهٔ Core مجاز نیست. transport باید rate limit و سقف payload داشته باشد. طبق S22-A، `contact_information` فقط از allowlist عمومی عبور می‌کند و policy privacy باید شماره/ایمیل خصوصی و opt-out را پوشش دهد.

## ۱۰. consistency و caching

منبع اصلی V2 فعلاً snapshot در حافظه است و با `loadSnapshot` جایگزین می‌شود (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/directory/BusinessDirectoryService.ts:31-43`). بنابراین قرارداد واقعی باید این موارد را مشخص کند:

1. atomic بودن snapshot کامل؛ V2 نباید نصف دادهٔ revision قدیم و نصف revision جدید را بگیرد؛
2. شناسهٔ snapshot و `generated_at`؛
3. رفتار cache هنگام منقضی شدن؛
4. حذف یا پنهان‌شدن آیتمی که دیگر published نیست؛
5. retry و rollback به آخرین snapshot معتبر؛
6. عدم استفاده از snapshot قدیمی برای ادعای «فعال» بودن Offer خارج از `valid_until`.

Matching فعلی فقط از Directory استفاده می‌کند و دادهٔ جدید تولید نمی‌کند (`origin/codex/v2-intent-flow-foundation: mlino2/app/src/matching/MatchingService.ts:1-13,56-72`). هر نتیجهٔ match باید به رکوردی از snapshot معتبر اشاره کند؛ اگر snapshot با context یا intent تغییرکند، نتیجه باید دوباره ارزیابی شود و cache قدیمی نباید به‌عنوان نتیجهٔ تازه عرضه شود.

ترتیب رکوردها در export باید بر اساس `Publication.occurred_at` و سپس `Publication.id` deterministic باشد (`origin/main: implementation/prisma/schema.prisma:635-653`). طبق S23-B هدف propagation withdrawal حداکثر ۵ دقیقه است؛ با S17-B یا export cycle باید حداکثر ۵ دقیقه باشد یا withdrawal یک invalidation فوری بفرستد. در بازهٔ تأخیر، پاسخ باید stale marker داشته باشد و freshness را ادعا نکند.

## ۱۱. راهبرد آزمون

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

## ۱۲. تصمیم‌های مالک (DECIDED) و ماتریس ADR

### تصمیم‌های باز

| شناسه | موضوع | گزینه‌ها | توصیهٔ طراحی | وضعیت |
|---|---|---|---|---|
| S16 | claim تعلیق/انقضا یافته | A حذف فوری، B حفظ تا TTL (not chosen) | A — حذف فوری و fail-closed | DECIDED |
| S17 | transport اولیه | A API (not chosen)، B export امضاشدهٔ versioned، C event feed (not chosen) | B — API بعداً همان DTO را ارائه می‌کند | DECIDED |
| S18 | exposure Capability تأییدنشده | A فقط HUMAN_CONFIRMED، B انتشار طبق S14-A در public (not chosen) | A — unconfirmed پنهان می‌ماند | DECIDED |
| S19 | fidelity محتوای منتشرشده | A1 `published_content` JSONB روی Publication، A2 projection table (not chosen)، B قفل ویرایش (not chosen)، C revision gating (not chosen) | A1 — A2 بعداً فقط مشتق‌شده از eventها | DECIDED |
| S20 | freshness Evidence/Capability | A فیلتر read با policy versioned، B snapshot freeze (not chosen)، C حذف با stale شدن هر evidence (not chosen) | A | DECIDED |
| S21 | شکل location/contact/links | A JSON فعلی (not chosen)، B DTO typed/versioned، C افزودن فیلد Profile (not chosen) | B؛ C فقط CCR جدا | DECIDED |
| S22 | PII در contact_information | A allowlist عمومی، B حذف contact (not chosen)، C policy کشورمحور (not chosen) | A همراه policy privacy | DECIDED |
| S23 | withdrawal propagation | A فوری (not chosen)، B هدف حداکثر ۵ دقیقه با cycle یا invalidation، C batch روزانه (not chosen) | B با stale marker | DECIDED |
| S24 | Offer capability exposure | A فقط capability_id (not chosen)، B خلاصهٔ public، C عدم نمایش پیوند (not chosen) | B با شرط S18-A | DECIDED |
| S25 | category/floor/building در public DTO | A افزودن به v1 (not chosen)، B حذف از v1 و mapping آیندهٔ module، C mock/null در V2 (not chosen as public fields) | B؛ floor/building فعلاً mock/null | DECIDED |
| S26 | products در public DTO | A نگه‌داشتن products (not chosen)، B حذف و جایگزینی با Offer/OfferVersion، C تبدیل حدسی (not chosen) | B؛ draft-1 فقط Mock | DECIDED |

S16 تا S26 در جدول بالا تصمیم‌های مالک هستند؛ گزینه‌های ردشده فقط برای traceability با برچسب «not chosen» نگه داشته شده‌اند.

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

## ۱۳. برنامهٔ پیشنهادی G14 برای implementation

این برنامه فقط پیشنهاد است؛ هر گام نیازمند تصویب جداگانهٔ مالک است و هیچ‌کدام با این سند مجوز اجرا ندارند.

### G14a — CCR برای `published_content`

- **Scope:** افزودن JSONB به Publication، CHECK برای PUBLISHED/WITHDRAWN، allowlist snapshot، قفل `FOR UPDATE` و نوشتن snapshot در همان transaction. `Organization.displayName` فقط در صورت نیاز و فقط از allowlist Profile snapshot وارد می‌شود؛ live-row هرگز خوانده نمی‌شود.
- **فایل‌ها:** schema/migration و PublicationService فقط پس از CCR مستقل؛ آزمون‌های constraint و rollback در validation جدا.
- **ممنوع:** تغییر V2، ساخت HTTP، تغییر Offer lifecycle یا backfill بدون تصمیم.
- **آزمون:** fidelity هر target، snapshot OfferVersion، immutable trigger، ALREADY_PUBLISHED، withdraw و migration stability.
- **Rollback:** طبق CCR مصوب، revert migration و کد بدون حذف دادهٔ تاریخی منتشرشده.

### G14b — producer خروجی signed V1

- **Scope:** تولید export versioned مطابق `public-business.v1`، امضا/metadata، S22-A، S23-B و ترتیب `occurred_at` سپس `id`.
- **فایل‌ها:** producer و تست‌های export در V1؛ policy privacy و کلید امضا باید جداگانه تعیین شوند.
- **ممنوع:** اتصال مستقیم V2 به جدول‌های Core، expose کردن membership/permission، و اجرای event feed به‌جای export مصوب.
- **آزمون:** DTO contract، امضا، tenant isolation، PII allowlist، withdrawal cycle/invalidation و stale marker.
- **Rollback:** توقف انتشار export جدید و بازگشت به آخرین artifact معتبر؛ جزئیات باید در CCR producer بیاید.

### G14c — انتقال consumer V2 به `public-business.v1`

- **Scope:** consumer فقط export امضاشده را بخواند، `draft-1` را برای Mock نگه دارد و دادهٔ products را از مسیر واقعی حذف کند.
- **فایل‌ها:** فقط شاخهٔ V2 و قراردادهای consumer پس از تصویب؛ Core و V1 تغییر نمی‌کنند.
- **ممنوع:** lookup مستقیم DB/ماژول V1، ساخت business truth، category حدسی، floor/building واقعی بدون CCR.
- **آزمون:** verify signature، version compatibility، snapshot atomic، stale/withdraw، capability confirmation و mapping OfferVersion.
- **Rollback:** بازگشت consumer به آخرین export معتبر یا Mock علامت‌گذاری‌شده، بدون جعل اتصال واقعی.

## نتیجهٔ این مرحله

این سند قرارداد نهایی طراحی است، اما G14 هنوز مجوز implementation نیست. هر گام G14 باید جداگانه بازبینی و تصویب شود.

من کدکس هستم.
