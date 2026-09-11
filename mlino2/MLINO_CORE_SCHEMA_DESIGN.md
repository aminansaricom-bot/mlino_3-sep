# طرح نخست شِمای Core Foundation در MLINO

تاریخ: ۲۰۲۶-۰۹-۱۱
نقش: MLINO Core Schema Designer
وضعیت: **پیش‌نویس طراحی؛ بدون تغییر Prisma، Migration یا کد**

## ۱. هدف و محدوده

این سند طرح منطقی نخست برای Persistence هستهٔ MLINO است تا کوچک‌ترین مسیر V1 را پوشش دهد:

```text
Organization
 → Capability
 → Offer / OfferVersion
 → Publication
 → Action
```

طرح با ADR-0001 تا ADR-0012 و اسناد زیر خوانده شده است:

- `MLINO_CORE_FOUNDATION_IMPLEMENTATION_SPEC.md`
- `MLINO_CORE_DATA_MODEL_CORRECTION_REPORT.md`
- ADR-0001، ADR-0002، ADR-0004، ADR-0005، ADR-0006، ADR-0007، ADR-0008، ADR-0009، ADR-0010، ADR-0011 و ADR-0012

این یک **مدل منطقی رابطه‌ای** است. نوع‌هایی مانند `UUID`، `timestamptz`، `varchar` و `jsonb` فقط راهنمای طراحی‌اند و به معنی مجوز تغییر `schema.prisma` یا ایجاد Migration نیستند. قیدهای کلیدی این طرح از D-55، D-61، D-68 و D-71 می‌آیند.

## ۲. قواعد کلی

- `Organization` هویت داخلی و متعارف V1 است؛ Business Identity Claim هویت آن را با کسب‌وکار واقعی ادعا و راستی‌آزمایی می‌کند.
- V1 مالک حقیقت کسب‌وکار است. V2 فقط Published Read Port را می‌خواند.
- Core دادهٔ عمومی لازم برای V2 را در Capability و OfferVersion نگه می‌دارد؛ Core برای تکمیل آن به جدول Module دسترسی ندارد.
- Clinic Module و Moduleهای آینده فقط vocabulary، محتوای صنفی و workflow خود را از راه قرارداد نسخه‌دار ارائه می‌کنند.
- هیچ Enum بسته‌ای برای `category_key`، `permission_key` یا `identifier_type` در Core ساخته نمی‌شود؛ این مقادیر رشته‌های ثبت‌شده‌اند.
- `Role` هرگز منبع Permission نیست. Permission فقط از Membership فعال و Permission Grant فعال روی همان Membership می‌آید.
- Evidence یک مالک تایپ‌شده و دقیقاً یکی دارد؛ مالکیت چندریختی آزاد مجاز نیست.
- وضعیت جاری Publication فقط روی Capability یا OfferVersion قرار دارد؛ Publication فقط سابقهٔ Gate و ممیزی افزایشی است.
- `Session`، `assistant conversation context`، `Intent` و `Context` runtime-only هستند و در این شِما جدول ندارند.
- Consent تا تصویب R8-a در این شِما وجود ندارد.
- Recommendation، Decision، Outcome و Evaluation در این پیش‌نویس جدول ندارند؛ Action مستقل است و در صورت وجود فقط به مبدأ مصوب خود ارجاع می‌دهد.

## ۳. راهنمای نوع و زمان

| نوع منطقی | کاربرد |
|---|---|
| `id` | شناسهٔ داخلی تصادفی و پایدار؛ ترجیحاً UUID |
| `key` | رشتهٔ پایدار در دامنهٔ یک Organization؛ نام کسب‌وکار یا عنوان نمایشی نیست |
| `*_key` | رشتهٔ ثبت‌شده و قابل‌گسترش؛ Enum بستهٔ Core نیست |
| `*_at` | زمان UTC با دقت کافی برای ممیزی |
| `status` | فقط چرخهٔ همان موجودیت؛ وضعیت موجودیت دیگر را در خود نگه نمی‌دارد |
| `jsonb` | فقط برای snapshot ممیزی یا payload قراردادی با مرز مشخص؛ نه جایگزین رابطهٔ قابل‌اعتبارسنجی |

## ۴. موجودیت‌ها

### ۴.۱ Organization

**هدف:** فضای کاری و هویت داخلی پایدار سازمان در V1.

**مالکیت:** Core/V1.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `display_name` | varchar | نام نمایشی؛ معیار یکتایی کسب‌وکار نیست |
| `lifecycle_status` | `ACTIVE / ARCHIVED` | وضعیت خود Organization |
| `created_at` | timestamptz | اجباری، فقط‌افزایشی |
| `archived_at` | timestamptz nullable | با آرشیو پر می‌شود |
| `updated_at` | timestamptz | زمان آخرین تغییر مجاز |

**روابط:** یک Organization چند Claim، Membership، Capability، Offer و Action دارد.

**قیدها و Indexها:**

- PK روی `id`.
- Index روی `(lifecycle_status, created_at)`.
- `display_name` Unique نیست و هرگز منبع تشخیص هویت واقعی نیست.
- هیچ فیلد شمارهٔ پروانه، تلفن، نشانی حقوقی یا شناسهٔ کسب‌وکار واقعی در Organization قرار نمی‌گیرد؛ این‌ها در Claim یا قرارداد عمومی مربوط‌اند.

**چرخه:** `ACTIVE → ARCHIVED`. آرشیو Organization باید مصرف تازهٔ دادهٔ آن را محدود کند؛ تاریخچهٔ Claim و Action حذف نمی‌شود.

### ۴.۲ BusinessIdentityClaim

**هدف:** ادعای جداگانهٔ اینکه یک Organization نمایندهٔ کدام کسب‌وکار واقعی است.

**مالکیت:** Core/Governance؛ حقیقت ادعا در V1.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK به Organization؛ اجباری |
| `identifier_type` | varchar | کلید واژگان ثبت‌شده؛ Enum بسته نیست |
| `identifier_value` | varchar | مقدار نرمال‌شده و قابل مقایسه؛ اجباری |
| `claim_status` | `DRAFT / SUBMITTED / ACTIVE / REVOKED / EXPIRED / WITHDRAWN` | چرخهٔ Claim |
| `verification_status` | `PENDING / UNDER_REVIEW / VERIFIED / REJECTED / EXPIRED / REVOKED` | وضعیت جاری راستی‌آزمایی؛ فقط `VERIFIED` همراه `ACTIVE` واجد انتشار است |
| `submitted_at` | timestamptz | زمان ثبت ادعا |
| `verified_at` | timestamptz nullable | زمان راستی‌آزمایی موفق |
| `revoked_at` | timestamptz nullable | زمان پس‌گرفتن |
| `created_at` | timestamptz | اجباری |
| `updated_at` | timestamptz | اجباری |

**چرخه:** ادعا از `DRAFT` به `SUBMITTED` و فقط پس از Verification موفق به `ACTIVE` می‌رسد؛ سپس به `REVOKED`، `EXPIRED` یا `WITHDRAWN` می‌رود. Claim منقضی یا پس‌گرفته دوباره Active نمی‌شود و ادعای تازه رکورد تازه است.

**قیدها و Indexها:**

- PK روی `id` و FK روی `organization_id`.
- Index روی `(organization_id, claim_status)` و `(identifier_type, identifier_value)`.
- **قید D-61:** Unique جزئی روی `(identifier_type, identifier_value)` فقط برای رکوردهایی که `claim_status = ACTIVE` و `verification_status = VERIFIED` هستند.
- این قید سطح داده از تکرار همان شناسه جلوگیری می‌کند؛ دو شناسهٔ متفاوت برای یک کسب‌وکار واقعی با این Index به‌تنهایی یکی شناخته نمی‌شوند و نیازمند فرایند Verification هستند.
- ساخت Organization یا Verified شدن Claim هیچ Permission یا Grantی ایجاد نمی‌کند.

### ۴.۳ IdentityVerification

**هدف:** ثبت مستقل و تغییرناپذیر تاریخچهٔ تلاش‌ها و نتیجه‌های Verification یک Claim.

**مالکیت:** Core/Governance.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `claim_id` | UUID | FK به BusinessIdentityClaim؛ اجباری |
| `attempt_number` | integer | شمارهٔ یکتا در محدودهٔ Claim |
| `method_key` | varchar | روش ثبت‌شده؛ taxonomy صنفی از Module می‌آید |
| `status` | `PENDING / UNDER_REVIEW / VERIFIED / REJECTED / EXPIRED / REVOKED` | وضعیت همان تلاش |
| `evidence_locator` | varchar/jsonb nullable | اشارهٔ محدود به مدرک Verification؛ در Evidence عمومی ادغام نمی‌شود |
| `reviewed_by_membership_id` | UUID nullable | ارجاع به عضو خارجیِ بازبین در صورت وجود؛ User داخلی نیست |
| `decision_reason` | text nullable | برای رد، انقضا یا لغو در صورت نیاز اجباری |
| `started_at` | timestamptz | اجباری |
| `decided_at` | timestamptz nullable | پس از نتیجه پر می‌شود |
| `created_at` | timestamptz | اجباری |

**روابط:** هر Claim چند Verification attempt دارد؛ آخرین وضعیت معتبر Claim باید در همان تراکنش با نتیجهٔ جاری همگام شود. IdentityVerification منبع اعطای Permission نیست.

**قیدها و Indexها:**

- PK روی `id` و FK روی `claim_id`.
- Unique روی `(claim_id, attempt_number)`.
- Index روی `(claim_id, created_at)` و `(status, decided_at)`.
- Evidence هویت به Claim/Verification تعلق دارد، نه به جدول عمومی Evidence؛ هیچ `evidence.owner_type` عمومی برای Claim وجود ندارد.

### ۴.۴ Membership

**هدف:** اتصال یک Subject از ارائه‌دهندهٔ هویت خارجی به Organization.

**مالکیت:** Core.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK به Organization؛ اجباری |
| `identity_provider` | varchar | صادرکنندهٔ خارجی؛ مقدار نهایی تابع OD-08 |
| `external_subject` | varchar | Subject پایدار نزد همان صادرکننده؛ اجباری |
| `membership_status` | `ACTIVE / REVOKED / EXPIRED` | وضعیت عضویت |
| `created_at` | timestamptz | اجباری |
| `revoked_at` | timestamptz nullable | زمان لغو |
| `expires_at` | timestamptz nullable | در صورت وجود انقضا |

**چرخه:** `ACTIVE → REVOKED/EXPIRED`. عضویت تاریخی حذف نمی‌شود.

**قیدها و Indexها:**

- PK روی `id` و FK روی `organization_id`.
- **قید هویت خارجی:** Core هیچ User داخلی، نام کاربری، گذرواژه یا Credential ندارد.
- Unique جزئی روی `(organization_id, identity_provider, external_subject)` برای Membershipهای `ACTIVE`؛ رکوردهای Revoked تاریخی می‌توانند باقی بمانند.
- Index روی `(identity_provider, external_subject)` و `(organization_id, membership_status)`.
- هیچ `role` یا `role_id` در Membership منبع Permission نیست؛ اگر مسئولیت عمومی برای مسیریابی لازم باشد، خارج از مسیر اعطای Permission نگه داشته می‌شود.

### ۴.۵ PermissionGrant

**هدف:** اعطای صریح یک عمل به یک Membership.

**مالکیت:** Core/Governance.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `membership_id` | UUID | FK به Membership؛ اجباری |
| `permission_key` | varchar | رشتهٔ ثبت‌شده و قابل‌گسترش؛ Enum بسته نیست |
| `grant_status` | `ACTIVE / REVOKED / EXPIRED` | وضعیت Grant |
| `basis_key` | varchar | فقط مبناهای مصوب: `founding`، `member_grant`، `designated_succession`، `ownership_recovery` |
| `granted_by_membership_id` | UUID nullable | عضو مجاز اعطاکننده؛ برای `founding` ممکن است تهی باشد |
| `reason` | text nullable | توضیح ممیزی |
| `granted_at` | timestamptz | اجباری |
| `revoked_at` | timestamptz nullable | زمان لغو |
| `expires_at` | timestamptz nullable | در صورت وجود انقضا |

**چرخه:** `ACTIVE → REVOKED/EXPIRED`. Grant برگشت‌پذیر نیست؛ اعطای مجدد رکورد تازه است.

**قیدها و Indexها:**

- PK، FK به Membership و FK اختیاری `granted_by_membership_id`.
- Unique جزئی روی `(membership_id, permission_key)` برای Grantهای `ACTIVE`.
- Index روی `(membership_id, grant_status)` و `(permission_key, grant_status)`.
- `permission_key` می‌تواند بعداً کلید فضانام‌دار Module باشد، به شرط ثبت در Registry و عبور از Governance.
- Role، مالکیت حقوقی، راستی‌آزمایی Claim، متن UI، پاسخ Assistant و مدیر Platform هیچ‌کدام منبع Grant نیستند.
- `ADMIN_ACTION` مبنای Grant نیست.

## ۵. حقیقت عمومی کسب‌وکار

### ۵.۱ Capability

**هدف:** توانمندی عمومی قابل‌ارائه، مستقل از Clinic یا هر Vertical.

**مالکیت:** Core/V1؛ vocabulary و محتوای صنفی از راه قرارداد Module وارد می‌شود.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK؛ اجباری |
| `capability_key` | varchar | کلید پایدار در Organization |
| `name` | varchar | فیلد عمومی قابل‌انتشار |
| `short_description` | text | فیلد عمومی قابل‌انتشار |
| `category_key` | varchar | رشتهٔ ثبت‌شده؛ Enum عمودی نیست |
| `capability_status` | `PLANNED / ACTIVE / RETIRED` | بُعد توانایی |
| `audience` | `INTERNAL / CUSTOMER_FACING` | بُعد مخاطب |
| `confirmation_status` | `UNCONFIRMED / HUMAN_CONFIRMED` | بُعد تأیید |
| `confirmed_by_membership_id` | UUID nullable | بازبین انسانی در صورت تأیید |
| `confirmed_at` | timestamptz nullable | زمان تأیید |
| `publication_status` | `UNPUBLISHED / PUBLISHED / WITHDRAWN` | منبع حقیقت وضعیت انتشار |
| `fresh_until` | timestamptz nullable | افق تازگیِ قرارداد/Module |
| `created_at` | timestamptz | اجباری |
| `updated_at` | timestamptz | اجباری |

**قیدها و Indexها:**

- PK، FK به Organization و Unique روی `(organization_id, capability_key)`.
- Index روی `(organization_id, capability_status, audience)`، `(publication_status, category_key)` و `fresh_until`.
- چهار بُعد توانایی، مخاطب، تأیید و انتشار مستقل‌اند؛ `ACTIVE + UNPUBLISHED` معتبر است.
- `category_key`، نام و توضیح عمومی Core هستند؛ تخصص درمانگر، نوع درمان و vocabulary اختصاصی Clinic ستون Core نیستند.
- Capability با `CUSTOMER_DATA` تا تصویب R8-a وارد Business Context یا Published نمی‌شود.

### ۵.۲ Offer

**هدف:** هویت پایدار یک قلم، بسته یا کمپین که نسخه‌های تغییرناپذیر دارد.

**مالکیت:** Core/V1.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK؛ اجباری |
| `offer_key` | varchar | کلید پایدار Offer در Organization |
| `lifecycle_status` | `ACTIVE / RETIRED` | چرخهٔ هویت Offer، نه Publication |
| `created_at` | timestamptz | اجباری |
| `retired_at` | timestamptz nullable | زمان بازنشستگی |

**قیدها و Indexها:**

- PK، FK به Organization و Unique روی `(organization_id, offer_key)`.
- Index روی `(organization_id, lifecycle_status)`.
- Offer منبع حقیقت محتوای نسخه نیست؛ محتوای عمومی و Publication روی `OfferVersion` نگه داشته می‌شود.
- Offer دارای وضعیت Publication مستقل و موازی با نسخه نیست؛ از دو منبع حقیقت جلوگیری می‌شود.

**چرخه:** ایجاد Offer → افزودن Version → بازنشستگی. Versionهای تاریخی حذف یا بازنویسی نمی‌شوند.

### ۵.۳ OfferVersion

**هدف:** نسخهٔ تغییرناپذیر و قابل‌انتشار یک Offer.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `offer_id` | UUID | FK به Offer؛ اجباری |
| `version_number` | integer | شمارهٔ افزایشی |
| `name` | varchar | نام عمومی نسخه |
| `short_description` | text | توضیح عمومی نسخه |
| `offer_shape` | `ITEM / BUNDLE / CAMPAIGN` | سه شکل عمومی D-53؛ دامنه‌گستر نیست |
| `terms` | text/jsonb | شرایط عمومی Offer |
| `price_amount` | decimal nullable | قیمت در صورت وجود |
| `price_currency` | varchar nullable | همراه قیمت |
| `on_request` | boolean | اگر قیمت اعلام نمی‌شود |
| `valid_from` | timestamptz | اجباری |
| `valid_until` | timestamptz nullable | تهی یعنی پایان نامحدود |
| `publication_status` | `UNPUBLISHED / PUBLISHED / WITHDRAWN` | منبع حقیقت انتشار همین نسخه |
| `created_at` | timestamptz | اجباری |
| `published_at` | timestamptz nullable | زمان انتشار |

**روابط:** یک Offer چند Version دارد. هر Version می‌تواند به چند Capability عمومی از راه جدول پیوند تایپ‌شده متصل شود.

**قیدها و Indexها:**

- PK، FK به Offer و Unique روی `(offer_id, version_number)`.
- Version پس از انتشار تغییرناپذیر است؛ تغییر محتوا Version تازه می‌سازد.
- Check منطقی: `valid_until IS NULL OR valid_until > valid_from`.
- Offer آینده، منقضی یا تاریخ‌نامعتبر در مصرف معتبر تلقی نمی‌شود.
- Index روی `(offer_id, publication_status)`، `(valid_from, valid_until)` و `publication_status`.
- ارجاع Capability باید روی Version باشد، نه فقط روی Offer؛ تاریخچهٔ Version قبلی با تغییر Version تازه بازنویسی نمی‌شود.
- `price_amount` و `price_currency` یا `on_request` باید سازگار باشند؛ این طرح منطق پولی کامل را تعریف نمی‌کند.

**جدول پیوند مفهومی `OfferVersionCapability`:**

- `offer_version_id` و `capability_id` هر دو اجباری‌اند.
- PK مرکب روی `(offer_version_id, capability_id)` و Index معکوس روی `(capability_id, offer_version_id)`.
- جدول پیوند، Entity دامنه‌ای جدید نیست؛ فقط رابطهٔ تایپ‌شدهٔ قابل‌اعتبارسنجی است.
- OfferVersion بدون Capability واجد شرایط وارد Published Read Port نمی‌شود.

## ۶. Evidence

**هدف:** ثبت شاهد، منشأ، تازگی، confidence و تأیید برای Capability یا OfferVersion.

**مالکیت:** Core؛ روش و منبع صنفی را Module فراهم می‌کند.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK؛ اجباری و باید با مالک موضوع سازگار باشد |
| `capability_id` | UUID nullable | مالک تایپ‌شدهٔ اول |
| `offer_version_id` | UUID nullable | مالک تایپ‌شدهٔ دوم |
| `source_kind` | `HUMAN / CUSTOMER_DATA / SYSTEM / AI_INFERRED / INTEGRATION` | پنج منبع مفهومی؛ Customer Data فعلاً Blocked |
| `source_ref` | varchar/jsonb nullable | ارجاع به منبع بدون FK به جدول Module |
| `method_key` | varchar nullable | روش ثبت‌شده؛ Enum بسته نیست |
| `captured_at` | timestamptz | زمان دریافت شاهد |
| `observed_at` | timestamptz nullable | زمان مشاهدهٔ واقعیت |
| `fresh_until` | timestamptz nullable | افق تازگی منبع/Module |
| `confidence` | decimal nullable | مقدار توضیحی؛ جایگزین تأیید نیست |
| `confirmation_status` | `UNCONFIRMED / HUMAN_CONFIRMED` | وضعیت تأیید |
| `confirmed_by_membership_id` | UUID nullable | تأییدکنندهٔ انسانی در صورت وجود |
| `confirmed_at` | timestamptz nullable | زمان تأیید |
| `evidence_status` | `ACTIVE / EXPIRED / WITHDRAWN` | وضعیت خود شاهد |
| `created_at` | timestamptz | اجباری |

**قیدهای مالکیت:**

- دقیقاً یکی از `capability_id` و `offer_version_id` باید مقدار داشته باشد؛ این قید باید با Check یا دو جدول پیوند جدا enforce شود.
- `organization_id` باید با Organization مالک Capability/OfferVersion یکسان باشد.
- Claim/IdentityVerification مالک Evidence عمومی نیستند؛ شاهد هویت در سابقهٔ Verification می‌ماند.
- استفادهٔ مشترک ضمنی از یک Evidence برای دو موضوع ممنوع است؛ اشتراک آینده فقط با قرارداد تایپ‌شدهٔ جداگانه مجاز است.

**قیدها و Indexها:**

- PK و FKهای تایپ‌شده به Capability یا OfferVersion.
- Index جدا روی `(capability_id, evidence_status, fresh_until)` و `(offer_version_id, evidence_status, fresh_until)`.
- Index روی `(source_kind, confirmation_status)` و `fresh_until`.
- تا تصویب R8-a، هر ورودی `CUSTOMER_DATA` باید در مرز Domain رد شود؛ هیچ ingestion یا bypass در شِما تعریف نمی‌شود.
- Evidence با `AI_INFERRED` و confidence بالا خودکار Fact یا Capability معتبر نمی‌شود؛ `confirmed_by_membership_id` انسانی لازم است.

## ۷. Publication

**هدف:** Gate انتشار و سابقهٔ ممیزی عمل انتشار یا پس‌گرفتن.

**منبع حقیقت:** `publication_status` روی Capability و OfferVersion است. این جدول وضعیت جاری جداگانه‌ای برای همان موضوع ندارد.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK؛ اجباری |
| `capability_id` | UUID nullable | هدف تایپ‌شدهٔ اول |
| `offer_version_id` | UUID nullable | هدف تایپ‌شدهٔ دوم |
| `event_kind` | `PUBLISHED / WITHDRAWN / EXPIRED` | رویداد ممیزی، نه وضعیت جاری |
| `performed_by_membership_id` | UUID | عضو دارای Grant لازم؛ اجباری برای عمل انسانی |
| `permission_key` | varchar | کلید Permission مصرف‌شده |
| `gate_snapshot` | jsonb | شروط بررسی‌شده در همان لحظه؛ snapshot ممیزی |
| `reason` | text nullable | دلیل پس‌گرفتن/انقضا یا توضیح عمل |
| `occurred_at` | timestamptz | زمان رخداد |

**قیدهای Gate:**

- دقیقاً یکی از `capability_id` و `offer_version_id` هدف باشد.
- Capability باید `ACTIVE`، `CUSTOMER_FACING`، `HUMAN_CONFIRMED` و دارای Evidence غیراستنتاجی تازه باشد.
- BusinessIdentityClaim فعال و Verified برای کسب‌وکار واقعی باید وجود داشته باشد.
- Membership و Grant فعال باید Permission لازم را داشته باشند؛ Claim یا Role به‌تنهایی کافی نیست.
- OfferVersion علاوه بر شروط خودش باید Capabilityهای ارجاع‌شدهٔ واجد شرایط و Published داشته باشد.
- انتشار خودکار یا انتشار بدون عمل انسانی مجاز نیست؛ انقضای ایمنی فقط می‌تواند وضعیت را به جهت امن ببندد.

**قیدها و Indexها:**

- PK و FK به هدف تایپ‌شده، با همان قاعدهٔ XOR.
- Index روی `(capability_id, occurred_at)`، `(offer_version_id, occurred_at)` و `(organization_id, occurred_at)`.
- این جدول Append-only است؛ Update برای بازنویسی تاریخچه مجاز نیست.
- Unique روی رخدادها لازم نیست؛ یک موضوع می‌تواند چند چرخهٔ انتشار/پس‌گرفتن تاریخی داشته باشد.
- V2 فقط Capability/OfferVersion با وضعیت جاری `PUBLISHED` را از Read Port می‌بیند.

## ۸. Action Foundation

**نام منطقی:** `Action` یا `ActionRecord`، مطابق ADR-0007. این Entity مستقل است و Recommendation تنها یکی از مبدأهای ممکن آن است.

**هدف:** ثبت کاری که برای اجرا انتخاب، تخصیص یا اجرا شده است؛ بدون ادعای Outcome یا Evaluation.

| فیلد | نوع منطقی | الزام و قاعده |
|---|---|---|
| `id` | UUID | کلید اصلی |
| `organization_id` | UUID | FK؛ اجباری |
| `title` | varchar | شرح کوتاه اقدام |
| `description` | text | شرح قابل‌فهم اقدام |
| `origin_kind` | `RECOMMENDATION / DECISION / AUTOMATED / UNDECLARED` | مبدأ اقدام طبق ADR-0007 |
| `recommendation_id` | UUID nullable | ارجاع اختیاری؛ جدول Recommendation در این Draft ساخته نمی‌شود |
| `decision_id` | UUID nullable | ارجاع اختیاری؛ جدول Decision در این Draft ساخته نمی‌شود |
| `rule_ref` | varchar nullable | برای مبدأ automated؛ اشاره به قاعدهٔ ساخته‌شده توسط انسان |
| `origin_reason` | text | برای `UNDECLARED` اجباری؛ برای سایر موارد نیز قابل ثبت |
| `provenance_source` | `HUMAN / SYSTEM / INTEGRATION` | منشأ دانستن رخداد؛ Customer Data در این بخش نیست |
| `authorized_by_membership_id` | UUID nullable | انسان مجاز؛ تهی یعنی صریحاً ناشناخته، نه User جعلی |
| `assigned_to_membership_id` | UUID nullable | اجراکنندهٔ انسانی در صورت تخصیص؛ با authorizedBy یکی نیست |
| `action_status` | `PLANNED / ASSIGNED / EXECUTED / CANCELLED` | چرخهٔ خود Action |
| `created_at` | timestamptz | اجباری |
| `assigned_at` | timestamptz nullable | زمان تخصیص |
| `executed_at` | timestamptz nullable | زمان اجرای واقعی Action |
| `cancelled_at` | timestamptz nullable | زمان لغو |
| `updated_at` | timestamptz | اجباری |

**چرخه:** `PLANNED → ASSIGNED → EXECUTED` یا `CANCELLED`. اقدام می‌تواند از `DECISION` یا `RECOMMENDATION` بیاید، اما `recommendation_id` اجباری نیست.

**قیدها و Indexها:**

- PK، FK به Organization و FKهای اختیاری به Membershipهای مجاز.
- Index روی `(organization_id, action_status, created_at)`، `(assigned_to_membership_id, action_status)` و `executed_at`.
- برای `origin_kind = RECOMMENDATION`، ارجاع Recommendation در آینده اختیاری می‌ماند و پذیرش ثبت‌شده روی خود Recommendation منبع `authorized_by` است.
- برای `origin_kind = DECISION`، ارجاع Decision در آینده قابل اضافه‌شدن است.
- برای `origin_kind = AUTOMATED`، `rule_ref` و `authorized_by_membership_id` پیکربندی‌کننده باید وجود داشته باشد؛ اجرای خودکار Permission یا Business Authority نمی‌سازد.
- Outcome و Evaluation فیلد یا جدول پنهان Action نیستند و در این Draft ایجاد نمی‌شوند.
- Action ثبت‌شده به‌تنهایی Visit، Lead، Booking، Purchase، Revenue یا موفقیت را ثابت نمی‌کند.

## ۹. روابط اصلی

```text
Organization
 ├── BusinessIdentityClaim ── IdentityVerification history
 ├── Membership ── PermissionGrant
 ├── Capability ── typed Evidence
 │       └── OfferVersion ── typed Evidence
 ├── Offer ── OfferVersion ── OfferVersionCapability ── Capability
 ├── Capability / OfferVersion ── Publication audit history
 └── Action
```

قواعد رابطه:

- Organization با Claim یکی نیست و Claim با Verification history یکی نیست.
- Membership با external subject شناخته می‌شود؛ Core User داخلی ندارد.
- Grant روی Membership ثبت می‌شود؛ Role هرگز Permission source نیست.
- Capability و OfferVersion دادهٔ عمومی Core و ورودی Published Read Port را نگه می‌دارند.
- Core برای خواندن یا ساخت Published به جدول Clinic Module یا Content Studio وابسته نیست.
- Evidence از راه رابطهٔ تایپ‌شده به Capability یا OfferVersion وصل است.
- Publication وضعیت جاری را کپی نمی‌کند؛ فقط تصمیم Gate و رخداد تاریخی را ثبت می‌کند.
- Action مستقل از Recommendation و Decision است؛ Outcome و Evaluation جدا باقی می‌مانند.

## ۱۰. مرز Core و Module طبق D-71

### در Core

- هویت داخلی Organization و Claim/Verification؛
- Membership و PermissionGrant؛
- قرارداد عمومی Capability و Offer/OfferVersion؛
- دادهٔ عمومی نام، توضیح، دسته، شکل Offer، شرایط، قیمت/`on_request` و اعتبار زمانی؛
- Evidence با provenance و confirmation؛
- Publication status و Gate history؛
- Action Foundation و ارجاع‌های اختیاری چرخهٔ مستقل.

### در Clinic Module یا Module آینده

- Doctor، Specialist، Treatment، Appointment، ClinicCapacity؛
- واژگان و ویژگی‌های اختصاصی Vertical؛
- روش و مدارک صنفی Verification؛
- داده‌هایی که برای تصویر عمومی Core قرارداد نشده‌اند؛
- workflow و repository داخلی Module.

Module باید محتوای عمومی را از راه قرارداد به Core ارسال کند. Core نباید با FK، query، view یا repository مستقیم به جدول Module متصل شود. فیلد `source_ref` در صورت نیاز فقط ارجاع قراردادی/ممیزی است و مالکیت یا دسترسی به جدول Module ایجاد نمی‌کند.

## ۱۱. چیزهایی که عمداً در این Draft وجود ندارند

- هیچ جدول Clinic، Doctor، Treatment، Appointment، Patient، Inventory یا Menu؛
- هیچ جدول Intent، Session، assistant conversation context یا Context؛
- هیچ جدول Consent تا تصویب R8-a؛
- هیچ جدول Recommendation، Decision، Outcome یا Evaluation؛
- هیچ جدول Business Directory یا Business Twin برای V2؛
- هیچ اتصال مستقیم V2 به Database یا Module؛
- هیچ User داخلی، Password، Credential یا Permission مشتق‌شده از Role؛
- هیچ EventLog یا `domainTag` جدید؛
- هیچ schema Content Studio، `organization_id` در Content Studio یا migration آن؛
- هیچ فیلد عمودی Clinic در Core؛
- هیچ دادهٔ Customer Data در وضعیت ACCESS_BLOCKED؛
- هیچ Availability زنده، رزرو واقعی، Lead، Visit، درآمد یا Outcome ساختگی.

## ۱۲. قیدهای حیاتی قابل‌آزمون در مرحلهٔ بعد

پیش از تبدیل این Draft به CCR و شِمای واقعی، این موارد باید به تست‌های Persistence تبدیل شوند:

۱. دو Claim فعال و Verified با `(identifier_type, identifier_value)` یکسان هم‌زمان پذیرفته نشوند.

۲. یک Claim Verified در Organization دیگر با شناسهٔ متفاوت فقط از راه Verification و فرایند Governance بررسی شود؛ نام یا شناسهٔ داخلی Organization کافی نیست.

۳. دو Membership فعال با Subject خارجی یکسان در یک Organization هم‌زمان پذیرفته نشوند؛ Membershipهای Revoked تاریخی باقی بمانند.

۴. Grant فعال فقط با Membership فعال مصرف شود؛ Role بدون Grant دسترسی نسازد.

۵. Permission key جدید بدون تغییر Enum بسته قابل ثبت باشد، اما فقط پس از Registry/Governance معتبر شود.

۶. Evidence بدون دقیقاً یک مالک تایپ‌شده رد شود؛ Evidence Claim به جدول عمومی Evidence راه پیدا نکند.

۷. OfferVersion نسخهٔ قبلی را بازنویسی نکند و Capability reference روی نسخهٔ درست باقی بماند.

۸. Publication فقط پس از Gate کامل ثبت شود و وضعیت جاری فقط از Capability/OfferVersion خوانده شود.

۹. دادهٔ لازم برای V2 از Core Read Port قابل خواندن باشد و برای آن query به Module لازم نباشد.

۱۰. Action بدون Recommendation نیز قابل ثبت باشد و `authorized_by` هرگز به User جعلی یا MLINO نسبت داده نشود.

۱۱. Session، Intent، Context و Consent در فهرست جدول‌های Core وجود نداشته باشند.

## ۱۳. گام بعدی پیشنهادی

این Draft هنوز شِمای اجرایی نیست. مرحلهٔ بعد باید یک CCR کوچک و مستقل برای **هویت، اختیار و حقیقت عمومی کسب‌وکار** تهیه کند و در آن موارد زیر را نهایی کند:

- نام دقیق جدول‌ها و ستون‌ها؛
- نوع نهایی statusها و Registryهای رشته‌ای؛
- روش اعمال Unique جزئی D-61؛
- روش اعمال مالکیت XOR برای Evidence و Publication؛
- جای فیزیکی Storage طبق D-71؛
- سیاست نگهداری و immutable بودن تاریخچه‌ها؛
- قرارداد Published Read Port.

Persistence Recommendation v1.1 و Action در CCR جداگانه بیاید؛ این دو مرحله با CCR هویت و حقیقت کسب‌وکار مخلوط نشوند.

من کدکس هستم
