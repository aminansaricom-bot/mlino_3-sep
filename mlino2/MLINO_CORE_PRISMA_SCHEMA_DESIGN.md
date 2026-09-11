# طراحی نخست شِمای Prisma برای MLINO Core Foundation

**تاریخ:** ۲۰۲۶-۰۹-۱۱  
**نقش:** MLINO Core Prisma Schema Architect  
**وضعیت:** پیش‌نویس طراحی پیاده‌سازی؛ فقط مستندات  
**دامنه:** طراحی Prisma برای بازبینی پیش از CCR و Migration

## ۱. ماهیت این سند

این سند تبدیل طراحی منطقی Core به یک طرح اجرایی Prisma را توضیح می‌دهد. این فایل خودش `schema.prisma` نیست و هیچ مجوزی برای ایجاد Migration، تغییر کد یا تغییر ADR ایجاد نمی‌کند.

در این مرحله هیچ‌یک از موارد زیر تغییر نمی‌کند:

- `implementation/prisma/schema.prisma`؛
- Migrationهای Prisma؛
- کد برنامه یا Repository؛
- ADR-0001 تا ADR-0012؛
- Content Studio یا Schema آن؛
- API، Connector یا V2.

این طراحی از `MLINO_CORE_SCHEMA_DESIGN_V2.md` و تصمیم‌های آماده‌سازی Prisma استفاده می‌کند. دو محدودیت مهم همچنان باز هستند و پیش از اجرای شِما باید در CCR بسته شوند:

1. پایهٔ شاخهٔ پیاده‌سازی Prisma باید با `origin/main` و مدل `ExternalWorkspaceLink` همگام باشد؛
2. قاعدهٔ کلید مرکب برای جلوگیری از ارجاع بین سازمانی باید در همهٔ روابط اعمال شود.

## ۲. منابع و مبانی معماری

منابع بررسی‌شده:

- `MLINO_CORE_SCHEMA_DESIGN_V2.md`؛
- `MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md`؛
- `MLINO_PRE_PRISMA_DECISION_NOTE.md`؛
- `PRISMA_COMPOSITE_KEY_VALIDATION.md`؛
- ADR-0001 تا ADR-0012.

مبانی اصلی:

- `Organization` با `BusinessIdentityClaim` یکی نیست؛ سازمان ریشهٔ داخلی V1 است و Claim ارتباط آن با کسب‌وکار واقعی را ادعا و راستی‌آزمایی می‌کند؛
- Permission فقط از Membership فعال و Permission Grant فعال می‌آید؛ Role هرگز منبع Permission نیست؛
- بازبین پلتفرم، Business Membership نیست و با ارجاع هویت پلتفرمی ثبت می‌شود؛
- Core مالک حقیقت کسب‌وکار و دادهٔ عمومی لازم برای V2 است؛ V2 مستقیماً جدول Module را نمی‌خواند؛
- Capability، Offer و Publication در Core عمومی و مستقل از Vertical هستند؛
- هیچ Entity اختصاصی Clinic در Core قرار نمی‌گیرد؛
- Action، Intent، Session persistence، Consent persistence و Customer Data در این شِما نیستند؛
- `Recommendation`، `Decision`، `Outcome` و `Evaluation` نیز در شِمای این فاز جدول ندارند و طبق ADR-0005 موجودیت‌های چرخهٔ جداگانهٔ آینده‌اند.

## ۳. قرارداد فیزیکی مشترک Prisma

### ۳.۱ پایگاه داده و نوع‌ها

هدف نهایی PostgreSQL است. آزمایش مستقل `PRISMA_COMPOSITE_KEY_VALIDATION.md` با Prisma CLI و Client نسخهٔ `5.20.0` روی SQLite موفق بوده است؛ رفتار اختصاصی PostgreSQL برای Index جزئی و Checkهای چندستونه باید در CCR و Migration جداگانه تأیید شود.

| مفهوم | پیشنهاد Prisma/PostgreSQL | قاعده |
|---|---|---|
| شناسه | `String @db.Uuid` | تصادفی، پایدار و بدون معنای کسب‌وکاری |
| زمان | `DateTime @db.Timestamptz(3)` | UTC و قابل ممیزی |
| متن کوتاه | `String @db.VarChar(...)` | طول نهایی در CCR تعیین شود |
| متن بلند | `String @db.Text` | برای توضیح و دلیل |
| مقدار پولی | `Decimal @db.Decimal(12, 2)` | منطق پولی کامل در این فاز نیست |
| دادهٔ ساختاریافته | `Json @db.JsonB` | فقط قرارداد عمومی محدود یا Snapshot ممیزی؛ نه جایگزین رابطه |
| مقادیر ثبت‌شده | `String` | برای `*_key`، `permission_key` و `identifier_type` Enum بسته ساخته نمی‌شود |
| وضعیت پایدار | Prisma Enum یا رشتهٔ ثبت‌شده | فقط جایی Enum شود که دامنه واقعاً بسته و مصوب است |

### ۳.۲ کلید Tenant

`Organization` ریشهٔ Tenant است و فقط `id` به‌عنوان کلید اصلی دارد. هر مدل دیگر در این سند Organization-scoped است و باید این دو ستون را داشته باشد:

```text
id
organization_id
```

کلید اصلی پیشنهادی برای هر مدل سازمانی:

```text
@@id([id, organization_id])
```

هر مدل سازمانی همچنین باید زوج `(id, organization_id)` را برای ارجاع مرکب در دسترس قرار دهد؛ در Prisma همین کلید مرکب مرجع `references` است. هر Foreign Key داخلی باید شناسهٔ والد و `organization_id` را با هم حمل کند:

```text
fields:    [parent_id, organization_id]
references:[id, organization_id]
```

نتیجه: وجود `parent_id` متعلق به سازمان دیگر به‌تنهایی برای ساخت رابطه کافی نیست و Database آن را رد می‌کند. این قاعده در کنار فیلتر سازمانی Query و Permission بررسی می‌شود و جای آن‌ها را نمی‌گیرد.

### ۳.۳ روابط اختیاری مرکب

در Prisma هر رابطهٔ مرکب اختیاری باید تمام Scalar Fieldهای رابطه را nullable داشته باشد. بنابراین برای رابطه‌ای مثل Claim اختیاری روی BusinessProfile، زوج زیر استفاده می‌شود:

```text
business_identity_claim_id              String?
business_identity_claim_organization_id String?
```

برای این زوج، Check پایگاه داده باید مشخص کند که یا هر دو تهی‌اند یا هر دو پرند و `business_identity_claim_organization_id` با `organization_id` رکورد برابر است. این Check و رابطهٔ مرکب، دو لایهٔ جدا هستند.

### ۳.۴ قیدهایی که Prisma به‌تنهایی کافی نیست

موارد زیر در طراحی ثبت می‌شوند اما اجرای کامل آن‌ها نیازمند PostgreSQL DDL بررسی‌شده در Migration مصوب است:

- Unique جزئی برای Claimهای فعال و Verified؛
- Unique جزئی برای تنها یک OfferVersion فعال و Published؛
- XOR برای مالک Evidence و هدف Publication؛
- برابری Organization در زوج‌های مالکیت اختیاری؛
- بازهٔ `valid_from < valid_until`؛
- سازگاری قیمت با `on_request`؛
- Append-only بودن Publication و تغییرناپذیری OfferVersion.

هیچ‌کدام از این قیدها نباید با یک بررسی صرفاً Application-level جایگزین شوند.

## ۴. مدل‌ها

## ۴.۱ Organization

**هدف:** ریشهٔ هویت داخلی و Tenant در MLINO V1. ایجاد Organization به‌معنی اثبات هویت کسب‌وکار واقعی نیست.

**مالکیت:** Core/V1.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | کلید اصلی ریشه |
| `display_name` | `String @db.VarChar` | نام نمایشی؛ Unique نیست |
| `lifecycle_status` | `OrganizationLifecycle` | `ACTIVE` یا `ARCHIVED` |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `updated_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `archived_at` | `DateTime? @db.Timestamptz(3)` | هنگام آرشیو پر می‌شود |

**روابط:** یک سازمان چند Claim، Verification، Membership، PermissionGrant، BusinessProfile، Capability، Offer و Publication دارد.

**کلیدها و Unique:**

- `PRIMARY KEY (id)`؛
- `display_name` Unique نیست؛
- هیچ شمارهٔ مجوز، تلفن، نشانی حقوقی یا شناسهٔ کسب‌وکار واقعی در این مدل نیست.

**Indexها:**

- `(lifecycle_status, created_at)`؛
- در صورت نیاز `(updated_at)` برای پردازش‌های نگهداری.

**چرخه:** `ACTIVE → ARCHIVED`. آرشیو سازمان، تاریخچهٔ Claim و روابط را حذف نمی‌کند.

**Tenant isolation:** Organization ریشه است و `organization_id` ندارد. همهٔ مدل‌های دیگر باید FK به `Organization.id` داشته باشند؛ هر رابطهٔ داخلی دیگر باید از کلید مرکب استفاده کند.

## ۴.۲ BusinessIdentityClaim

**هدف:** ثبت ادعای یک Organization دربارهٔ هویت یک کسب‌وکار واقعی. Claim مالک Organization نیست و با خود Organization جایگزین نمی‌شود.

**مالکیت:** Core/Governance.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه `organization_id` کلید مرکب |
| `organization_id` | `String @db.Uuid` | FK به Organization |
| `identifier_type` | `String @db.VarChar` | واژگان ثبت‌شده و قابل‌گسترش |
| `identifier_value` | `String @db.VarChar` | مقدار نرمال‌شده و قابل مقایسه |
| `claim_status` | `ClaimStatus` | `DRAFT`, `SUBMITTED`, `ACTIVE`, `REVOKED`, `WITHDRAWN`؛ وضعیت نهایی هنوز باید با YR1 بررسی شود |
| `verification_status` | `VerificationStatus` | وضعیت جاری راستی‌آزمایی؛ تکرار وضعیت Claim در YR1 باز است |
| `submitted_at` | `DateTime? @db.Timestamptz(3)` | زمان ارسال |
| `verified_at` | `DateTime? @db.Timestamptz(3)` | زمان Verified شدن |
| `revoked_at` | `DateTime? @db.Timestamptz(3)` | زمان پس‌گرفتن؛ ممیزی کامل لغو در YR2 هنوز باز است |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `updated_at` | `DateTime @db.Timestamptz(3)` | اجباری |

**روابط:** هر Claim متعلق به یک Organization و دارای چند IdentityVerification است. BusinessProfile می‌تواند در طرح شعبه‌ای به یک Claim فعال و Verified اشاره کند.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- Unique جزئی سراسری روی `(identifier_type, identifier_value)` فقط برای `claim_status = ACTIVE` و `verification_status = VERIFIED`؛
- Unique جزئی بالا باید با SQL PostgreSQL اجرا شود؛ دو شناسهٔ متفاوت برای یک کسب‌وکار به‌تنهایی معادل تلقی نمی‌شوند.

**Indexها:**

- `(organization_id, claim_status)`؛
- `(organization_id, verification_status)`؛
- `(identifier_type, identifier_value)` برای جست‌وجوی Verification.

**چرخه:** ایجاد Organization آزاد است، Claim باید جداگانه ایجاد شود، سپس ارسال و Verification انجام می‌شود. Claim پس‌گرفته یا مردود دوباره Active نمی‌شود؛ ادعای تازه رکورد تازه است. یک وضعیت واحد و ممیزی لغو باید در CCR مربوط تعیین تکلیف شود.

**Tenant isolation:** FK مرکب به Organization لازم است. هیچ Claim سازمان A نمی‌تواند با BusinessProfile، Membership یا Evidence سازمان B رابطهٔ داخلی بسازد.

## ۴.۳ IdentityVerification

**هدف:** تاریخچهٔ مستقل و قابل ممیزی تلاش‌های راستی‌آزمایی یک Claim.

**مالکیت:** Core/Governance.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه `organization_id` کلید مرکب |
| `organization_id` | `String @db.Uuid` | Tenant و جزء FK Claim |
| `claim_id` | `String @db.Uuid` | همراه Organization به Claim اشاره می‌کند |
| `attempt_number` | `Int` | شمارهٔ یکتا در محدودهٔ Claim |
| `method_key` | `String @db.VarChar` | روش ثبت‌شده؛ روش تخصصی از Module می‌آید |
| `status` | `VerificationAttemptStatus` | `PENDING`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `EXPIRED`, `REVOKED` |
| `evidence_locator` | `Json?` | اشارهٔ محدود به مدرک Verification؛ Evidence عمومی نیست |
| `reviewed_by_platform_identity_ref` | `String? @db.VarChar` | ارجاع opaque به هویت پلتفرم؛ Membership کسب‌وکار نیست |
| `decision_reason` | `String? @db.Text` | برای نتیجه‌های منفی یا لغو در صورت نیاز |
| `started_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `decided_at` | `DateTime? @db.Timestamptz(3)` | پس از تصمیم پر می‌شود |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |

**روابط:** `IdentityVerification` به Claim با FK مرکب `(claim_id, organization_id)` متصل است. بازبین با Membership سازمانی مدل نمی‌شود.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- `@@unique([organization_id, claim_id, attempt_number])`؛
- هیچ FK به Membership برای `reviewed_by_platform_identity_ref` وجود ندارد.

**Indexها:**

- `(organization_id, claim_id, created_at)`؛
- `(organization_id, status, decided_at)`.

**چرخه:** هر تلاش از Pending به نتیجه می‌رسد و تاریخچهٔ آن بازنویسی نمی‌شود. همگام‌سازی وضعیت جاری Claim با نتیجهٔ معتبر باید در یک تراکنش دامنه‌ای انجام شود.

**Tenant isolation:** Claim فقط از همان Organization پذیرفته می‌شود. ارجاع بازبین پلتفرمی خارج از Tenant است و عمداً FK سازمانی ندارد.

## ۴.۴ Membership

**هدف:** اتصال Subject یک Identity Provider خارجی به Organization.

**مالکیت:** Core.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | FK به Organization |
| `identity_provider` | `String @db.VarChar` | مقدار نهایی تابع OD-08 |
| `external_subject` | `String @db.VarChar` | Subject پایدار نزد Provider |
| `membership_status` | `MembershipStatus` | `ACTIVE` یا `REVOKED` |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `revoked_at` | `DateTime? @db.Timestamptz(3)` | زمان لغو |

**روابط:** یک Membership چند PermissionGrant دارد و متعلق به یک Organization است.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- Unique جزئی روی `(organization_id, identity_provider, external_subject)` فقط برای Membershipهای Active؛
- Membershipهای Revoked تاریخی باقی می‌مانند.

**Indexها:**

- `(organization_id, membership_status)`؛
- `(identity_provider, external_subject)`؛
- `(organization_id, external_subject)` در صورت نیاز Query.

**چرخه:** `ACTIVE → REVOKED`. انقضا و بازیابی خودکار در MVP مدل نمی‌شود.

**Tenant isolation:** `organization_id` جزء کلید اصلی و تمام FKهای وابسته است. Core هیچ User داخلی، Password، Credential یا هویت داخلی مستقل اضافه نمی‌کند.

**محدودیت Permission:** هیچ `role` یا `role_id` در این مدل منبع Permission نیست. Role هرگز Permission source نیست.

## ۴.۵ PermissionGrant

**هدف:** اعطای صریح یک Permission به یک Membership مشخص.

**مالکیت:** Core/Governance.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | Tenant |
| `membership_id` | `String @db.Uuid` | دریافت‌کننده؛ FK مرکب |
| `permission_key` | `String @db.VarChar` | رشتهٔ ثبت‌شده و قابل‌گسترش |
| `grant_status` | `GrantStatus` | `ACTIVE` یا `REVOKED` |
| `basis_key` | `String @db.VarChar` | در MVP فقط `founding` یا `member_grant` |
| `granted_by_membership_id` | `String? @db.Uuid` | اعطاکنندهٔ اختیاری |
| `granted_by_organization_id` | `String? @db.Uuid` | جزء زوج رابطهٔ اختیاری |
| `reason` | `String? @db.Text` | دلیل ممیزی |
| `granted_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `revoked_at` | `DateTime? @db.Timestamptz(3)` | زمان لغو |

**روابط:** Grant به Membership دریافت‌کننده با `(membership_id, organization_id)` و در صورت وجود به Membership اعطاکننده با زوج nullable متصل است.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- Unique جزئی روی `(organization_id, membership_id, permission_key)` برای Grantهای Active؛
- `granted_by_organization_id` و `granted_by_membership_id` یا هر دو تهی‌اند یا هر دو پرند؛ هر دو باید با Organization رکورد برابر باشند.

**Indexها:**

- `(organization_id, membership_id, grant_status)`؛
- `(organization_id, permission_key, grant_status)`؛
- `(organization_id, granted_at)`.

**چرخه:** `ACTIVE → REVOKED`. Grant لغوشده دوباره Active نمی‌شود؛ اعطای مجدد رکورد تازه است. ممیزی کامل `revoked_by` و `revocation_reason` طبق YR2 باید پیش از Migration نهایی شود.

**Tenant isolation:** Membership دریافت‌کننده و اعطاکننده هر دو باید در همان Organization باشند. عضویت یا Role سازمان دیگر نمی‌تواند Permission داخل این سازمان ایجاد کند.

**مرز اختیار:** وجود Role، Claim، Session یا دستیار به‌تنهایی Grant ایجاد نمی‌کند. Platform فقط اجرا می‌کند و اختیار را خودش نمی‌سازد.

## ۴.۶ BusinessProfile

**هدف:** تصویر عمومی Core برای Discovery و مصرف V2، مستقل از Vertical و بدون وابستگی به جدول Module.

**مالکیت:** Core/V1.

**شکل پیشنهادی برای Prisma:** BusinessProfile واحد مکان یا شعبه است. بنابراین در این طراحی `organization_id` به‌تنهایی Unique نیست و یک Organization می‌تواند در آینده چند Profile داشته باشد. «یک Profile در MVP» قاعدهٔ دامنه است، نه قید Database. هر Profile می‌تواند Claim مرتبط داشته باشد.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | FK به Organization |
| `business_identity_claim_id` | `String? @db.Uuid` | Claim اختیاری تا قبل از Verification |
| `business_identity_claim_organization_id` | `String? @db.Uuid` | جزء زوج رابطهٔ اختیاری |
| `name` | `String @db.VarChar` | نام عمومی |
| `description` | `String? @db.Text` | توضیح عمومی |
| `latitude` | `Decimal? @db.Decimal(9, 6)` | مکان عمومی؛ برای Discovery |
| `longitude` | `Decimal? @db.Decimal(9, 6)` | مکان عمومی؛ برای Discovery |
| `address_text` | `String? @db.Text` | نشانی عمومی |
| `contact_information` | `Json? @db.JsonB` | تماس عمومی محدود |
| `links` | `Json? @db.JsonB` | پیوندهای عمومی محدود |
| `business_hours` | `Json? @db.JsonB` | ساعات کاری اعلام‌شده؛ Availability زنده نیست |
| `lifecycle_status` | `BusinessProfileLifecycle` | `DRAFT`, `ACTIVE`, `ARCHIVED` |
| `publication_status` | `PublicationStatus` | `UNPUBLISHED`, `PUBLISHED`, `WITHDRAWN` |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `updated_at` | `DateTime @db.Timestamptz(3)` | اجباری |

**روابط:** به Organization، در صورت وجود به Claim همان Organization، و به Publicationهای تاریخی متصل است.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- Unique جزئی روی `business_identity_claim_id` وقتی مقدار دارد، برای جلوگیری از اتصال هم‌زمان یک Claim به چند Profile؛
- Unique روی `organization_id` وجود ندارد؛
- زوج Claim اختیاری دقیقاً هر دو تهی یا هر دو پر باشد و Organization آن با Profile برابر باشد.

**Indexها:**

- `(organization_id, lifecycle_status)`؛
- `(organization_id, publication_status, updated_at)`؛
- `(publication_status, latitude, longitude)` برای فیلتر ابتدایی Discovery؛
- Index جغرافیایی دقیق‌تر نیازمند تصمیم Extension/Provider است و در این فاز ایجاد نمی‌شود.

**چرخه:** `DRAFT → ACTIVE → ARCHIVED`. Publication بُعد جداست. Profile آرشیوشده یا بدون Claim فعال و Verified واجد انتشار عمومی نیست.

**Tenant isolation:** Profile، Claim و Publication باید با زوج‌های مرکب به همان Organization محدود شوند.

**فیلدهای عمداً غایب:** Rating، Review، CRM، Customer Data، Popularity، Availability زنده و هر مفهوم Clinic.

## ۴.۷ Capability

**هدف:** بیان توانمندی عمومی قابل‌ارائه، مستقل از Clinic یا هر Vertical دیگر.

**مالکیت:** Core/V1؛ vocabulary تخصصی را Module از راه قرارداد نسخه‌دار فراهم می‌کند.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | FK به Organization |
| `capability_key` | `String @db.VarChar` | کلید پایدار در سازمان |
| `name` | `String @db.VarChar` | نام عمومی |
| `short_description` | `String? @db.Text` | توضیح عمومی |
| `category_key` | `String @db.VarChar` | رشتهٔ ثبت‌شده؛ Enum عمودی نیست |
| `capability_status` | `CapabilityStatus` | `PLANNED`, `ACTIVE`, `RETIRED` |
| `audience` | `CapabilityAudience` | `INTERNAL` یا `CUSTOMER_FACING` |
| `confirmation_status` | `ConfirmationStatus` | `UNCONFIRMED` یا `HUMAN_CONFIRMED` |
| `confirmed_by_membership_id` | `String? @db.Uuid` | Membership انسانی تأییدکننده |
| `confirmed_by_organization_id` | `String? @db.Uuid` | جزء زوج رابطهٔ اختیاری |
| `confirmed_at` | `DateTime? @db.Timestamptz(3)` | زمان تأیید |
| `publication_status` | `PublicationStatus` | `UNPUBLISHED`, `PUBLISHED`, `WITHDRAWN` |
| `fresh_until` | `DateTime? @db.Timestamptz(3)` | افق تازگی |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `updated_at` | `DateTime @db.Timestamptz(3)` | اجباری |

**روابط:** به Organization، Evidence، OfferVersionCapability و Publication متصل است. تأییدکننده در صورت وجود Membership همان Organization است.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- `@@unique([organization_id, capability_key])`؛
- زوج تأییدکننده یا هر دو تهی یا هر دو پرند و Organization آن برابر است.

**Indexها:**

- `(organization_id, capability_status, audience)`؛
- `(organization_id, publication_status, category_key)`؛
- `(organization_id, fresh_until)`.

**چرخه:** چهار بُعد مستقل‌اند: توانمندی، مخاطب، تأیید و انتشار. `ACTIVE + UNPUBLISHED` معتبر است. AI inference با confidence بالا Human Confirmation را جایگزین نمی‌کند.

**Tenant isolation:** تمام Evidence، OfferVersionCapability، تأییدکننده و Publication با کلید مرکب همان Organization بسته می‌شوند.

**محدودیت R8-a:** منبع `CUSTOMER_DATA` در مدل مفهومی تعریف‌شده اما Access Blocked است؛ هیچ ingestion یا bypass از آن وارد Business Context یا Published نمی‌شود.

## ۴.۸ Offer

**هدف:** هویت پایدار یک Offer که یک یا چند نسخهٔ تاریخی دارد.

**مالکیت:** Core/V1.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | FK به Organization |
| `offer_key` | `String @db.VarChar` | کلید پایدار در Organization |
| `lifecycle_status` | `OfferLifecycle` | `ACTIVE` یا `RETIRED` |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `retired_at` | `DateTime? @db.Timestamptz(3)` | زمان بازنشستگی |

**روابط:** یک Offer چند OfferVersion دارد. محتوای قابل‌انتشار روی Version است، نه روی Offer.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- `@@unique([organization_id, offer_key])`.

**Indexها:**

- `(organization_id, lifecycle_status)`؛
- `(organization_id, created_at)`.

**چرخه:** `ACTIVE → RETIRED`. بازنشستگی Offer نسخه‌های تاریخی را حذف یا بازنویسی نمی‌کند.

**Tenant isolation:** Offer فقط به Organization خودش و Versionهایی با همان Organization متصل می‌شود.

**نکته:** Offer وضعیت Publication مستقل ندارد؛ وضعیت انتشار از OfferVersion خوانده می‌شود تا دو منبع حقیقت ایجاد نشود.

## ۴.۹ OfferVersion

**هدف:** نسخهٔ تغییرناپذیر و قابل‌انتشار یک Offer.

**مالکیت:** Core/V1.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | Tenant و جزء FK Offer |
| `offer_id` | `String @db.Uuid` | FK مرکب به Offer |
| `version_number` | `Int` | افزایشی در محدودهٔ Offer |
| `name` | `String @db.VarChar` | نام عمومی نسخه |
| `short_description` | `String? @db.Text` | توضیح عمومی |
| `offer_shape` | `OfferShape` | `ITEM`, `BUNDLE`, `CAMPAIGN` |
| `terms` | `Json? @db.JsonB` | شرایط عمومی؛ قرارداد دقیق YR7 پیش از انتشار لازم است |
| `price_amount` | `Decimal? @db.Decimal(12, 2)` | قیمت اختیاری |
| `price_currency` | `String? @db.VarChar(3)` | همراه قیمت |
| `on_request` | `Boolean` | اعلام‌نشدن قیمت |
| `valid_from` | `DateTime @db.Timestamptz(3)` | شروع اعتبار |
| `valid_until` | `DateTime? @db.Timestamptz(3)` | پایان اعتبار؛ تهی یعنی بدون پایان مشخص |
| `version_status` | `OfferVersionStatus` | `ACTIVE` یا `INACTIVE`; حذف آن در YR5 هنوز باز است |
| `publication_status` | `PublicationStatus` | `UNPUBLISHED`, `PUBLISHED`, `WITHDRAWN` |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |
| `published_at` | `DateTime? @db.Timestamptz(3)` | زمان انتشار |

**روابط:** هر Version به یک Offer با `(offer_id, organization_id)` وصل می‌شود، از راه جدول پیوند به Capabilityها متصل می‌شود و Evidence/Publication دارد.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- `@@unique([organization_id, offer_id, version_number])`؛
- Unique جزئی روی `(organization_id, offer_id)` فقط وقتی `version_status = ACTIVE` و `publication_status = PUBLISHED`؛
- Check: `valid_until IS NULL OR valid_until > valid_from`؛
- Check قیمت: `on_request`، `price_amount` و `price_currency` باید قرارداد سازگار داشته باشند.

**Indexها:**

- `(organization_id, offer_id, version_status, publication_status)`؛
- `(organization_id, valid_from, valid_until)`؛
- `(organization_id, publication_status, published_at)`.

**چرخه:** Version بعد از ایجاد نباید بازنویسی شود. هنگام انتشار Version تازه، Version قبلی در همان تراکنش `INACTIVE` و Publication آن `WITHDRAWN` می‌شود؛ رکورد قبلی باقی می‌ماند. Version آینده، منقضی یا تاریخ‌نامعتبر در مصرف معتبر تلقی نمی‌شود.

**Tenant isolation:** Offer و Capabilityهای مرتبط باید هر دو از همان Organization باشند؛ هر ارجاع مستقل با کلید مرکب بسته می‌شود.

### جدول پیوند فیزیکی `OfferVersionCapability`

این جدول Entity دامنه‌ای تازه نیست؛ جدول رابطهٔ لازم برای Prisma و Database است.

| فیلد | نوع | قاعده |
|---|---|---|
| `organization_id` | UUID | جزء Tenant و کلید مرکب |
| `offer_version_id` | UUID | FK مرکب به OfferVersion |
| `capability_id` | UUID | FK مرکب به Capability |

- `PRIMARY KEY (organization_id, offer_version_id, capability_id)`؛
- FKهای مرکب به `(organization_id, offer_version_id)` و `(organization_id, capability_id)`؛
- Index معکوس `(organization_id, capability_id, offer_version_id)`؛
- ارجاع Version سازمان A به Capability سازمان B در خود Database رد می‌شود.

## ۴.۱۰ Evidence

**هدف:** ثبت شاهد دارای provenance، freshness، confidence و confirmation برای Capability یا OfferVersion.

**مالکیت:** Core؛ منبع و روش تخصصی را Module از طریق قرارداد ارائه می‌کند.

برای جلوگیری از مالکیت چندریختی مبهم، Evidence دو زوج مالک تایپ‌شده دارد و دقیقاً یکی باید پر باشد:

- `(capability_organization_id, capability_id)`؛
- `(offer_version_organization_id, offer_version_id)`.

هر دو Scalar Field هر زوج nullable هستند تا رابطهٔ اختیاری مرکب با Prisma معتبر باشد.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | Tenant |
| `capability_organization_id` | `String? @db.Uuid` | زوج مالک اول |
| `capability_id` | `String? @db.Uuid` | مالک Capability |
| `offer_version_organization_id` | `String? @db.Uuid` | زوج مالک دوم |
| `offer_version_id` | `String? @db.Uuid` | مالک OfferVersion |
| `source_kind` | `EvidenceSourceKind` | شامل `HUMAN`, `CUSTOMER_DATA`, `SYSTEM`, `AI_INFERRED`, `INTEGRATION` |
| `source_ref` | `String? @db.VarChar` | ارجاع قراردادی/ممیزی، نه مالکیت جدول Module |
| `method_key` | `String? @db.VarChar` | روش ثبت‌شده |
| `captured_at` | `DateTime? @db.Timestamptz(3)` | زمان دریافت |
| `observed_at` | `DateTime? @db.Timestamptz(3)` | زمان مشاهده |
| `fresh_until` | `DateTime? @db.Timestamptz(3)` | افق تازگی |
| `confidence` | `Decimal? @db.Decimal(5, 4)` | بازهٔ دامنه‌ای صفر تا یک |
| `confirmation_status` | `ConfirmationStatus` | `UNCONFIRMED` یا `HUMAN_CONFIRMED` |
| `confirmed_by_membership_id` | `String? @db.Uuid` | تأییدکنندهٔ انسانی |
| `confirmed_by_organization_id` | `String? @db.Uuid` | زوج رابطهٔ اختیاری |
| `evidence_status` | `EvidenceStatus` | `ACTIVE`, `EXPIRED`, `WITHDRAWN` |
| `created_at` | `DateTime @db.Timestamptz(3)` | اجباری |

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- FKهای مرکب اختیاری به Capability و OfferVersion؛
- Check دقیقاً یکی از دو مالک را الزام کند؛
- Check Organization هر مالک با `organization_id` Evidence برابر باشد؛
- Check confirmation pair یا هر دو تهی یا هر دو پر و هم‌سازمان باشد.

**Indexها:**

- `(organization_id, capability_id, evidence_status, fresh_until)`؛
- `(organization_id, offer_version_id, evidence_status, fresh_until)`؛
- `(organization_id, source_kind, confirmation_status)`؛
- `(organization_id, fresh_until)`.

**چرخه:** Evidence فعال می‌تواند منقضی یا withdrawn شود و تاریخچه باقی می‌ماند. Evidence با `AI_INFERRED` و confidence بالا خودکار Fact یا Capability معتبر نمی‌شود.

**Tenant isolation:** هر سه لایهٔ FK، زوج Organization را کنترل می‌کنند: Evidence، مالک و تأییدکننده. Claim و Verification مالک Evidence عمومی نیستند.

**R8-a:** `CUSTOMER_DATA` یک منبع مفهومی تعریف‌شده و `ACCESS_BLOCKED` است. تا تصویب Policy هیچ رکورد Customer Data نباید از مرز Domain عبور کند؛ درج منبع در واژگان با اجازهٔ ingestion اشتباه نشود.

## ۴.۱۱ Publication

**هدف:** ثبت رخداد و Gate ممیزی انتشار یا پس‌گرفتن برای BusinessProfile، Capability یا OfferVersion.

**منبع حقیقت:** وضعیت جاری روی موضوع هدف (`publication_status`) است. Publication خودش وضعیت جاری موازی نگه نمی‌دارد و Append-only است.

سه هدف تایپ‌شدهٔ اختیاری تعریف می‌شود:

- `(business_profile_organization_id, business_profile_id)`؛
- `(capability_organization_id, capability_id)`؛
- `(offer_version_organization_id, offer_version_id)`.

دقیقاً یکی از این سه زوج باید پر باشد.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @db.Uuid` | همراه Organization کلید مرکب |
| `organization_id` | `String @db.Uuid` | Tenant |
| `business_profile_organization_id` | `String? @db.Uuid` | زوج هدف اول |
| `business_profile_id` | `String? @db.Uuid` | هدف BusinessProfile |
| `capability_organization_id` | `String? @db.Uuid` | زوج هدف دوم |
| `capability_id` | `String? @db.Uuid` | هدف Capability |
| `offer_version_organization_id` | `String? @db.Uuid` | زوج هدف سوم |
| `offer_version_id` | `String? @db.Uuid` | هدف OfferVersion |
| `event_kind` | `PublicationEventKind` | `PUBLISHED` یا `WITHDRAWN` |
| `performed_by_membership_id` | `String @db.Uuid` | Membership انسانی همان Organization |
| `permission_key` | `String @db.VarChar` | Permission مصرف‌شده؛ رشتهٔ ثبت‌شده |
| `gate_snapshot` | `Json @db.JsonB` | Snapshot حداقل Gate در لحظهٔ رخداد |
| `reason` | `String? @db.Text` | دلیل ممیزی |
| `occurred_at` | `DateTime @db.Timestamptz(3)` | زمان رخداد |

**فیلد ممیزی باز:** افزودن `grant_id` و جزئیات `revoked_by` طبق YR2 پیش از Migration نهایی باید تصمیم‌گیری شود. در این سند بدون تصمیم مالک به شکل قطعی اضافه نشده است.

**روابط:** هدف دقیقاً یکی از سه مدل است و با FK مرکب به همان Organization متصل می‌شود. `performed_by_membership_id` با `(performed_by_membership_id, organization_id)` به Membership متصل است.

**کلیدها و Unique:**

- `@@id([id, organization_id])`؛
- Unique رخداد لازم نیست؛ یک موضوع چرخه‌های تاریخی متعدد دارد؛
- Check دقیقاً یکی از سه هدف پر باشد؛
- Check Organization هدف با Publication برابر باشد؛
- Update و Delete برای بازنویسی تاریخچه مجاز نیست.

**Indexها:**

- `(organization_id, business_profile_id, occurred_at)`؛
- `(organization_id, capability_id, occurred_at)`؛
- `(organization_id, offer_version_id, occurred_at)`؛
- `(organization_id, occurred_at)`؛
- `(organization_id, performed_by_membership_id, occurred_at)`.

**چرخه:** Publication رویداد چرخهٔ موضوع است، نه موجودیتی که Active/Inactive می‌شود. برای OfferVersion قبلی، رخداد `WITHDRAWN` ثبت می‌شود و Version در همان عملیات `INACTIVE` می‌گردد.

**Gate انتشار:**

- Profile باید Active، دارای فیلدهای عمومی لازم و متصل به Claim فعال و Verified باشد؛
- Capability باید Active، Customer-facing، Human-confirmed و دارای Evidence تازهٔ مجاز باشد؛
- OfferVersion باید شرایط خودش را داشته باشد، Capabilityهای منتشرشدهٔ معتبر داشته باشد و تنها Version فعال و Published Offer باشد؛
- Membership و Grant فعال باید Permission لازم را فراهم کنند؛ Role، Claim یا Session به‌تنهایی کافی نیست؛
- انتشار خودکار بدون عمل انسانی در این طرح مجاز نیست.

**Tenant isolation:** Publication و تمام اهداف و Membership اجراکننده باید در همان Organization باشند. هیچ Publication سازمان A نمی‌تواند هدفی از سازمان B را ثبت کند.

## ۵. نمودار روابط

```text
Organization
├── BusinessIdentityClaim
│   └── IdentityVerification history
├── Membership
│   └── PermissionGrant
├── BusinessProfile ── optional verified BusinessIdentityClaim
├── Capability
│   ├── Evidence
│   └── OfferVersionCapability ── OfferVersion
├── Offer
│   └── OfferVersion
│       ├── Evidence
│       └── Publication history
└── Publication history
```

قانون همهٔ خط‌های داخلی: شناسهٔ رکورد و `organization_id` باید با هم به رابطه وارد شوند.

## ۶. چیزهایی که عمداً در شِما نیستند

این طراحی هیچ‌کدام از موارد زیر را مدل نمی‌کند:

- Doctor، Specialist، Treatment، Appointment، Patient، Inventory، Menu یا هر Entity Clinic؛
- Action یا ActionRecord؛
- Intent، Session، Conversation Context یا Context persistence؛
- Consent persistence؛
- Customer Data ingestion یا محتوای شخصی مشتری؛
- Recommendation، Decision، Outcome یا Evaluation persistence؛
- Business Directory یا Business Twin برای V2؛
- جدول Content Studio یا افزودن `organization_id` به Content Studio؛
- User داخلی، Password، Credential یا Permission مشتق‌شده از Role؛
- EventLog جدید یا `domainTag`؛
- Availability زنده، Booking، Lead، Visit، Revenue یا Outcome ساختگی.

## ۷. قواعد مرزی Core، Module و V2

### Core/V1 مالک است

- Organization و هویت Claim/Verification؛
- Membership و PermissionGrant؛
- BusinessProfile عمومی؛
- Capability و Offer/OfferVersion عمومی؛
- Evidence با provenance و confirmation؛
- وضعیت جاری Publication و سابقهٔ Gate.

### Clinic Module یا Module آینده مالک است

- واژگان تخصصی Vertical؛
- Doctor، Treatment، Appointment و Capacity؛
- داده و workflow داخلی Module؛
- روش تخصصی Verification و محتوایی که در قرارداد عمومی Core نیست.

Module باید دادهٔ عمومی را از قرارداد نسخه‌دار به Core بدهد. Core برای تکمیل Profile، Capability یا OfferVersion به جدول Module دسترسی مستقیم ندارد.

### V2 مصرف‌کننده است

V2 فقط Published Read Port را مصرف می‌کند. V2 به Module storage وصل نمی‌شود و حقیقت کسب‌وکار، Offer، Publication یا Permission ایجاد نمی‌کند.

## ۸. قیدهای پذیرش برای تبدیل به CCR

پیش از ساخت `schema.prisma` و Migration، CCR باید حداقل این موارد را صریح کند:

1. برابری پایهٔ شاخهٔ پیاده‌سازی با `origin/main` و وجود `ExternalWorkspaceLink` مصوب؛
2. تایید نهایی `@@id([id, organization_id])` و تمام FKهای مرکب؛
3. تعیین تکلیف YR1 دربارهٔ دو وضعیت Claim و وضعیت معلق/تاریخی؛
4. تعیین تکلیف YR2 دربارهٔ `revoked_by`، دلیل لغو و اتصال Grant به Publication؛
5. تایید شکل شعبه‌ای BusinessProfile، حذف Unique سازمان و مکان عددی؛
6. تایید اینکه `version_status` در OfferVersion می‌ماند یا طبق YR5 حذف می‌شود؛
7. تعریف قرارداد `terms` پیش از انتشار نخستین Offer؛
8. روش اجرای Checkهای XOR، بازهٔ اعتبار، قیمت و تغییرناپذیری؛
9. تعریف Permission key لازم برای انتشار BusinessProfile در OD-05؛
10. تایید اینکه PostgreSQL Migration حداقلی برای Uniqueهای جزئی و Checkها استفاده می‌کند.

## ۹. نتیجه و گام بعدی

این سند زبان فیزیکی پیشنهادی Prisma را تثبیت می‌کند اما شِمای اجرایی نیست. مدل‌ها، زوج‌های کلید، Indexها و روابط لازم برای اولین مسیر Core را مشخص می‌کند و با D-61، D-55، D-68 و D-71 هم‌راستا است.

گام بعدی مجاز پس از بازبینی این سند: ایجاد یک CCR کوچک برای شِمای Core و سپس تغییر کنترل‌شدهٔ `schema.prisma` روی شاخه‌ای که با `origin/main` همگام شده است. تا آن زمان، هیچ Prisma، Migration یا کدی نباید نوشته شود.

**من کدکس هستم.**
