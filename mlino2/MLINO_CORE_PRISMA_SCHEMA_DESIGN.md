# طراحی نخست شِمای Prisma برای MLINO Core Foundation

**تاریخ:** ۲۰۲۶-۰۹-۱۱
**نقش:** MLINO Core Prisma Schema Architect
**وضعیت:** طراحی پیاده‌سازی — **نسخه‌ی ۳، نهایی با تصمیم‌های مالک**؛ فقط مستندات
**دامنه:** طراحی Prisma برای بازبینی پیش از CCR و Migration

### تاریخچه‌ی نسخه

| نسخه | نویسنده | مبنا |
|---|---|---|
| ۱ | Codex — `ccca7c5` | `MLINO_CORE_SCHEMA_DESIGN_V2.md` · یادداشت پیش از Prisma · اعتبارسنجی کلید مرکب |
| ۲ | Claude — `b8b763d` | `MLINO_CORE_PRISMA_DESIGN_REVIEW.md` (main، `38040a4`) · تصمیم‌های مالک روی PR1، PR2، PY1 تا PY6 |
| **۳ — نهایی** | **Claude** | **تصمیم‌های نهایی مالک: انتشار · `grant_id` · ادعا · ممیزی · PY7 — ۱۱ سپتامبر ۲۰۲۶** |

### تصمیم‌های مالک که در این نسخه اعمال شده‌اند

| # | تصمیم مالک | کجا اعمال شد |
|---|---|---|
| **PR1-الف** | وضعیت ادعای هویت: **`PENDING` · `VERIFIED` · `SUSPENDED` · `REJECTED` · `EXPIRED`** | §۴٫۲ |
| **PR1-ب** | تغییرهای حساس چرخه‌ی عمر فیلدهای ممیزی حداقلی دارند: **انجام‌دهنده · دلیل · زمان** | §۳٫۵ و هر مدل |
| **PR1-ج** | **حذف `OfferVersion.version_status`** — انتشار تنها منبع حقیقت وضعیت منتشرشده است | §۴٫۹ · §۴٫۱۱ |
| **PR2** | **`Organization.id` همان شناسه‌ی سازمان در AC-2 است** — هویت UUID تازه ساخته نمی‌شود · نوع `TEXT` می‌ماند | §۳٫۱ · §۴٫۱ |
| **PY1** | **`id` کلید اصلی می‌ماند** · یکتا و FK مرکب محدود به سازمان هر جا جداسازی مستأجر لازم دارد | §۳٫۲ |
| **PY2/PY3** | پیش از پیاده‌سازی Prisma، **اعتبارسنجی PostgreSQL** برای قیدهایی که Prisma بیان نمی‌کند | §۸ |
| **PY4** | **`CUSTOMER_DATA` از Core حذف می‌شود** | §۴٫۱۰ · §۶ |
| **PY5/PY6** | **قواعد صریح نمایش انتشار** | §۵ |

### تصمیم‌های نهایی مالک — نسخه‌ی ۳

| # | تصمیم مالک | کجا اعمال شد |
|---|---|---|
| **F1 — انتشار** | **`Publication` منبع حقیقت تغییرات انتشار است.** `publication_status` به‌عنوان state projection می‌ماند، ولی **فقط در همان تراکنشی که Publication Event ثبت می‌شود** تغییر می‌کند | §۴٫۱۱ · C15 در §۸ |
| **F2 — `grant_id`** | **در `Publication` اضافه نمی‌شود.** MVP بدون آن ادامه می‌یابد | §۳٫۴ · §۴٫۱۱ |
| **F3 — ادعای هویت** | همان پنج وضعیت؛ **وضعیت جدا برای withdrawal لازم نیست** | §۴٫۲ |
| **F4 — ممیزی** | **MVP: فیلدهای آخرین ممیزی کافی است.** تاریخچه **فقط** برای **IdentityVerification** و **Publication** الزامی است | §۳٫۴ |
| **F5 — PY7** | Prisma `DateTime` با PostgreSQL **`timestamptz`** · نام‌گذاری DB: **`snake_case`** · نام مدل Prisma: **`PascalCase`** | §۳٫۱ |

---

## ۱. ماهیت این سند

این سند تبدیل طراحی منطقی Core به یک طرح اجرایی Prisma را توضیح می‌دهد. این فایل خودش `schema.prisma` نیست و هیچ مجوزی برای ایجاد Migration، تغییر کد یا تغییر ADR ایجاد نمی‌کند.

در این مرحله هیچ‌یک از موارد زیر تغییر نمی‌کند:

- `implementation/prisma/schema.prisma`؛
- Migrationهای Prisma؛
- کد برنامه یا Repository؛
- ADR-0001 تا ADR-0012؛
- Content Studio یا Schema آن؛
- API، Connector یا V2.

دو پیش‌شرط همچنان بیرون از این سند است و پیش از اجرای شِما باید بسته شود:

1. پایه‌ی شاخه‌ی پیاده‌سازی Prisma باید با `origin/main` و مدل `ExternalWorkspaceLink` همگام باشد (RR1)؛
2. اعتبارسنجی PostgreSQL در §۸ باید اجرا و ثبت شود.

## ۲. منابع و مبانی معماری

منابع:

- `MLINO_CORE_SCHEMA_DESIGN_V2.md`؛
- `MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md`؛
- `MLINO_PRE_PRISMA_DECISION_NOTE.md`؛
- `PRISMA_COMPOSITE_KEY_VALIDATION.md`؛
- `MLINO_CORE_PRISMA_DESIGN_REVIEW.md` و تصمیم‌های مالک روی آن؛
- ADR-0001 تا ADR-0012؛
- شِمای منجمد زنده روی `main`: `implementation/prisma/schema.prisma` و Migration `20260910020000_add_external_workspace_link`.

مبانی اصلی:

- `Organization` با `BusinessIdentityClaim` یکی نیست؛ سازمان ریشه‌ی داخلی V1 است و Claim ارتباط آن با کسب‌وکار واقعی را ادعا و راستی‌آزمایی می‌کند؛
- **هویت متعارف سازمان یکی است:** همان شناسه‌ای که AC-2 به‌عنوان مصرف‌کننده به کار می‌برد (D-08، ADR-0001، ADR-0004)؛
- Permission فقط از Membership فعال و Permission Grant فعال می‌آید؛ Role هرگز منبع Permission نیست؛
- بازبین پلتفرم، Business Membership نیست و با ارجاع هویت پلتفرمی ثبت می‌شود؛
- Core مالک حقیقت کسب‌وکار و داده‌ی عمومی لازم برای V2 است؛ V2 مستقیماً جدول Module را نمی‌خواند؛
- Capability، Offer و Publication در Core عمومی و مستقل از Vertical هستند؛
- هیچ Entity اختصاصی Clinic در Core قرار نمی‌گیرد؛
- Action، Intent، Session persistence، Consent persistence و Customer Data در این شِما نیستند؛
- `Recommendation`، `Decision`، `Outcome` و `Evaluation` نیز در این فاز جدول ندارند (ADR-0005).

## ۳. قرارداد فیزیکی مشترک Prisma

### ۳٫۱ پایگاه داده و نوع‌ها

هدف PostgreSQL است. آزمایش `PRISMA_COMPOSITE_KEY_VALIDATION.md` با Prisma `5.20.0` روی SQLite موفق بوده است؛ رفتار PostgreSQL در §۸ اعتبارسنجی می‌شود.

| مفهوم | پیشنهاد Prisma/PostgreSQL | قاعده |
|---|---|---|
| **`Organization.id`** | **`String` (`TEXT`) — بدون مقدار پیش‌فرض** | **همان شناسه‌ی سازمان در AC-2** (PR2). Core آن را نمی‌سازد؛ فقط ثبت می‌کند |
| **`organization_id` در همه‌ی مدل‌ها** | **`String` (`TEXT`)** | هم‌نوع با `Organization.id` و با شش جدول موجود V1 |
| شناسه‌ی سایر مدل‌ها | `String @id @default(uuid())` — ذخیره به‌صورت `TEXT` | همان الگوی `ExternalWorkspaceLink` و `CoreEntity`؛ پیامد مستقیم PR2 و هم‌نوعی ستون‌های کلید مرکب |
| **زمان** | **`DateTime @db.Timestamptz(3)`** | **F5 — PostgreSQL `timestamptz`**، UTC. جدول‌های موجود V1 با `TIMESTAMP(3)` دست نمی‌خورند؛ این تفاوت **آگاهانه** و محدود به جدول‌های تازه‌ی Core است. دقت ۳ هم‌خوان با جدول‌های موجود |
| متن کوتاه | `String @db.VarChar(...)` | طول نهایی در CCR |
| متن بلند | `String @db.Text` | توضیح و دلیل |
| مقدار پولی | `Decimal @db.Decimal(12, 2)` | منطق پولی کامل در این فاز نیست |
| داده‌ی ساختاریافته | `Json @db.JsonB` | فقط قرارداد عمومی محدود یا Snapshot ممیزی؛ نه جایگزین رابطه |
| مقادیر ثبت‌شده | `String` | برای `*_key`، `permission_key` و `identifier_type` Enum بسته ساخته نمی‌شود |
| وضعیت پایدار | Prisma Enum | فقط جایی که دامنه بسته و مصوب است |

**نام‌گذاری (F5):**

| لایه | قاعده | مثال |
|---|---|---|
| **مدل Prisma** | **`PascalCase`** | `BusinessIdentityClaim` · `OfferVersionCapability` |
| **جدول DB** | **`snake_case`** با `@@map` — جمع، مثل `external_workspace_links` و `core_entities` | `@@map("business_identity_claims")` |
| **ستون DB** | **`snake_case`** | `organization_id` · `published_content_revision` |
| **فیلد Prisma** | `camelCase` + `@map("snake_case")` — **همان قرارداد شِمای منجمد موجود**؛ مالک برای فیلد قاعده‌ی جدا نداد، پس قرارداد موجود ادامه می‌یابد | `organizationId String @map("organization_id")` |
| **Enum** | نوع `PascalCase`، مقدار `UPPER_SNAKE` — مثل `ExternalLinkStatus` موجود | `ClaimStatus.VERIFIED` |
| **Index و Constraint دستی** | `snake_case` با پسوند معنادار — مثل `external_workspace_link_active_unique` | `business_identity_claim_active_identifier_unique` |

در این سند، در جدول فیلدها، **نام ستون DB** آمده است.

### ۳٫۲ کلید Tenant — `id` کلید اصلی، زوج مرکب هدف FK (PY1)

`Organization` ریشه‌ی Tenant است و فقط `id` دارد. هر مدل دیگر Organization-scoped است:

```text
id               String  @id @default(uuid())
organization_id  String
@@unique([id, organization_id])      // هدف همه‌ی FKهای درون‌مستأجری
```

- **`id` سراسری یکتا می‌ماند.** ارجاع از بیرون مستأجر (Read Port برای V2، ارجاع موضوعی CCR دوم، لاگ و ممیزی) فقط `id` را حمل می‌کند.
- **هر رابطه‌ی درون‌مستأجری** شناسه‌ی والد و `organization_id` را با هم حمل می‌کند و به یکتای مرکب والد ارجاع می‌دهد:

```text
fields:     [parent_id, organization_id]
references: [id, organization_id]
```

- ترتیب ستون‌ها در `fields` و `references` **همیشه** `(id, organization_id)` است.
- نتیجه: `parent_id` متعلق به سازمان دیگر رد می‌شود. این قاعده جای فیلتر سازمانی Query، مجوز Membership یا RLS را نمی‌گیرد.
- رابطه‌ی هر مدل با `Organization` یک FK ساده‌ی `organization_id → Organization.id` است.

### ۳٫۳ روابط اختیاری مرکب — الگوی زوج سایه

در Prisma هر رابطه‌ی مرکب اختیاری باید تمام Scalar Fieldهایش nullable باشد؛ `organization_id` اجباری است و نمی‌تواند در رابطه‌ی اختیاری شریک شود. پس هر رابطه‌ی اختیاری درون‌مستأجری یک ستون سازمان سایه دارد:

```text
x_id               String?
x_organization_id  String?
```

با CHECK پایگاه داده:

```sql
(x_id IS NULL AND x_organization_id IS NULL)
OR (x_id IS NOT NULL AND x_organization_id = organization_id)
```

### ۳٫۴ ممیزی حداقلی تغییرهای حساس (PR1-ب)

**قاعده‌ی مالک:** هر تغییر حساس چرخه‌ی عمر سه چیز ثبت می‌کند: **انجام‌دهنده · دلیل · زمان.**

**انجام‌دهنده دو نوع دارد و هرگز هر دو هم‌زمان نیست:**

| نوع | ستون‌ها | کِی |
|---|---|---|
| عضو همان سازمان | `*_by_membership_id` + `*_by_organization_id` (زوج سایه §۳٫۳) | کار کسب‌وکار |
| پلتفرم | `*_by_platform_identity_ref` (`VarChar`، opaque، **بدون FK**) | کنترل ایمنی، بازیابی (D-58) یا راستی‌آزمایی — **هرگز اختیار کسب‌وکاری** (ADR-0009، ADR-0010) |

**فهرست تغییرهای حساس در این شِما:**

| تغییر | انجام‌دهنده‌ی مجاز | ستون‌ها |
|---|---|---|
| ثبت ادعا (`PENDING`) | عضو | `submitted_by_*` · `submitted_at` |
| هر تغییر وضعیت ادعا | پلتفرم — یا سیستم فقط برای `EXPIRED` | `status_changed_by_platform_identity_ref` · `status_change_reason` · `status_changed_at` |
| لغو عضویت | عضو یا پلتفرم | `revoked_by_*` · `revocation_reason` · `revoked_at` |
| لغو اعطا | عضو یا پلتفرم | `revoked_by_*` · `revocation_reason` · `revoked_at` |
| آرشیو سازمان | عضو یا پلتفرم | `archived_by_*` · `archive_reason` · `archived_at` |
| انتشار و پس‌گرفتن | **فقط عضو** | `performed_by_membership_id` · `reason` · `occurred_at` در `Publication` |
| تأیید انسانی توانمندی و شاهد | فقط عضو | `confirmed_by_*` · `confirmed_at` (موجود) |

**CHECKهای ممیزی:**

- در وضعیت پایانی (`REVOKED` / `ARCHIVED`): **دقیقاً یکی** از دو نوع انجام‌دهنده پر است، `*_reason` و `*_at` پرند؛
- در وضعیت فعال: هر سه تهی‌اند.

**تغییرهای دیگر** — بازنشستگی آفر، آرشیو پروفایل، بازنشستگی توانمندی — به‌خودی‌خود حساس نیستند، **به‌شرط** قاعده‌ی §۵٫۳: اگر موضوع منتشرشده است، اول یک رخداد `WITHDRAWN` با ممیزی کامل ثبت می‌شود.

**آخرین ممیزی در برابر تاریخچه (F4):**

| موجودیت | شکل ممیزی | چرا |
|---|---|---|
| **IdentityVerification** | **تاریخچه‌ی کامل** — هر تلاش یک ردیف؛ پس از تصمیم فقط‌خواندنی (C14) | الزام مالک |
| **Publication** | **تاریخچه‌ی کامل** — هر رخداد یک ردیف؛ فقط‌افزودنی (C12) | الزام مالک |
| Claim · Membership · PermissionGrant · Organization | **فقط آخرین ممیزی** روی خود ردیف | کافی برای MVP (F4) |

**پیامد پذیرفته‌شده:** گذار برگشت‌پذیر `SUSPENDED ⇄ VERIFIED` ممیزی تعلیق قبلی را بازنویسی می‌کند. **این در MVP پذیرفته است.** تصمیم‌های راستی‌آزمایی — تنها گذارهای ادعا که به داوری هویت مربوط‌اند — همچنان در تاریخچه‌ی IdentityVerification کامل می‌مانند.

**`grant_id` (F2):** **در `Publication` نیست و در MVP اضافه نمی‌شود.** `permission_key` مصرف‌شده و `performed_by_membership_id` ثبت می‌شوند.

### ۳٫۵ قیدهایی که Prisma بیان نمی‌کند

فهرست کامل با روش اجرا در §۸٫۱ آمده است. هیچ‌کدام با بررسی صرفاً Application-level جایگزین نمی‌شود.

## ۴. مدل‌ها

## ۴٫۱ Organization

**هدف:** ریشه‌ی هویت داخلی و Tenant در MLINO V1. ایجاد Organization به‌معنی اثبات هویت کسب‌وکار واقعی نیست.

**مالکیت:** Core/V1.

**هویت (PR2):** `Organization.id` **همان شناسه‌ی سازمان در AC-2** است — همان مقداری که امروز در `organization_id` شش جدول V1 است (`external_workspace_links`، `core_entities`، `event_log`، `admission_observability`، `opportunity_current_state`، `revenue_recovery_raw_aggregate`). **Core هویت UUID تازه برای سازمان نمی‌سازد.** ردیف `Organization` برای شناسه‌ای ساخته می‌شود که مرجع هویت AC-2 صادر کرده است.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id` — **`TEXT`، بدون `@default`** | شناسه‌ی سازمان AC-2 |
| `display_name` | `String @db.VarChar` | نام نمایشی؛ Unique نیست |
| `lifecycle_status` | `OrganizationLifecycle` | `ACTIVE` یا `ARCHIVED` |
| `created_at` | `DateTime` | اجباری |
| `updated_at` | `DateTime` | اجباری |
| `archived_at` | `DateTime?` | ممیزی آرشیو |
| `archived_by_membership_id` | `String?` | ممیزی — عضو |
| `archived_by_organization_id` | `String?` | زوج سایه؛ برابر `id` |
| `archived_by_platform_identity_ref` | `String? @db.VarChar` | ممیزی — پلتفرم |
| `archive_reason` | `String? @db.Text` | ممیزی |

**روابط:** یک سازمان چند Claim، Verification، Membership، PermissionGrant، BusinessProfile، Capability، Offer و Publication دارد. رابطه‌ی اختیاری آرشیوکننده: `(archived_by_membership_id, archived_by_organization_id) → Membership(id, organization_id)` — FK حلقوی تهی‌پذیر، مجاز در PostgreSQL و Prisma.

**کلیدها و قیدها:**

- `PRIMARY KEY (id)`؛
- CHECK: `archived_by_organization_id` تهی یا برابر `id`؛
- CHECK ممیزی §۳٫۴ برای `ARCHIVED`؛
- هیچ شماره‌ی مجوز، تلفن، نشانی حقوقی یا شناسه‌ی کسب‌وکار واقعی در این مدل نیست.

**Indexها:** `(lifecycle_status, created_at)`.

**چرخه:** `ACTIVE → ARCHIVED`. آرشیو تاریخچه را حذف نمی‌کند و طبق §۵٫۱ همه‌ی موضوعات سازمان را در زمان خواندن نامرئی می‌کند.

**جدول‌های موجود V1:** CCR اول به آن‌ها دست نمی‌زند و FK از آن‌ها به `Organization` نمی‌سازد. **ولی نوع و هویت از روز اول سازگار است.** FK از `ExternalWorkspaceLink` و سایر جدول‌ها تصمیم جداگانه‌ای پس از تعیین تکلیف داده‌ی موجود است.

## ۴٫۲ BusinessIdentityClaim

**هدف:** ثبت ادعای یک Organization درباره‌ی هویت یک کسب‌وکار واقعی. Claim مالک Organization نیست و با آن جایگزین نمی‌شود.

**مالکیت:** Core/Governance.

**وضعیت (PR1-الف) — یک ستون، یک منبع حقیقت:**

| وضعیت | معنا | پایانی؟ |
|---|---|---|
| `PENDING` | ثبت‌شده، در انتظار راستی‌آزمایی | خیر |
| `VERIFIED` | راستی‌آزمایی‌شده و معتبر | خیر |
| `SUSPENDED` | تعلیق ایمنی پلتفرم (D-61) — شناسه همچنان در اختیار همین ادعاست | خیر |
| `REJECTED` | راستی‌آزمایی رد شد | **بله** |
| `EXPIRED` | اعتبار راستی‌آزمایی تمام شد | **بله** |

**گذارها:**

```text
(ایجاد) → PENDING                       عضو سازمان · submitted_by_*
PENDING → VERIFIED | REJECTED           پلتفرم · از راه نتیجه‌ی IdentityVerification
VERIFIED → SUSPENDED                    پلتفرم · دلیل الزامی
SUSPENDED → VERIFIED                    پلتفرم · دلیل الزامی
VERIFIED | SUSPENDED → EXPIRED          سیستم (پایان valid_until) یا پلتفرم
```

وضعیت پایانی دوباره فعال نمی‌شود؛ ادعای تازه رکورد تازه است. ستون `verification_status` نسخه‌ی ۱ **حذف شد**.

**F3 — وضعیت جدا برای withdrawal نیست.** مجموعه‌ی پنج‌تایی بسته و نهایی است؛ همه‌ی گذارها همان‌اند که در بالا آمد.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | FK به Organization |
| `identifier_type` | `String @db.VarChar` | واژگان ثبت‌شده و قابل‌گسترش |
| `identifier_value` | `String @db.VarChar` | مقدار نرمال‌شده |
| `claim_status` | `ClaimStatus` | `PENDING`, `VERIFIED`, `SUSPENDED`, `REJECTED`, `EXPIRED` |
| `submitted_by_membership_id` | `String` | ممیزی ثبت — عضو ثبت‌کننده |
| `submitted_at` | `DateTime` | ممیزی ثبت |
| `verified_at` | `DateTime?` | آخرین زمان Verified شدن |
| `valid_until` | `DateTime?` | پایان اعتبار راستی‌آزمایی؛ تهی = بدون پایان |
| `status_changed_by_platform_identity_ref` | `String? @db.VarChar` | ممیزی آخرین تغییر وضعیت |
| `status_change_reason` | `String? @db.Text` | ممیزی آخرین تغییر وضعیت |
| `status_changed_at` | `DateTime?` | ممیزی آخرین تغییر وضعیت |
| `created_at` | `DateTime` | اجباری |
| `updated_at` | `DateTime` | اجباری |

**روابط:** متعلق به یک Organization؛ ثبت‌کننده با `(submitted_by_membership_id, organization_id) → Membership(id, organization_id)` — **اجباری**، پس زوج سایه لازم نیست؛ چند IdentityVerification؛ حداکثر یک BusinessProfile.

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- **Unique جزئی سراسری** روی `(identifier_type, identifier_value)` `WHERE claim_status IN ('VERIFIED', 'SUSPENDED')`. **تعلیق شناسه را آزاد نمی‌کند** — وگرنه تعلیق ایمنی راه تصاحب هویت را برای سازمان دیگر باز می‌کرد؛
- CHECK: در `PENDING` سه ستون `status_changed_*` تهی‌اند؛ در سایر وضعیت‌ها `status_changed_at` و `status_change_reason` پرند و `status_changed_by_platform_identity_ref` پر است **مگر** وضعیت `EXPIRED` با انقضای سیستمی؛
- CHECK: `VERIFIED` و `SUSPENDED` ⇒ `verified_at` پر.

**Indexها:** `(organization_id, claim_status)` · `(identifier_type, identifier_value)`.

**Tenant isolation:** FK مرکب ثبت‌کننده؛ ارجاع پلتفرمی عمداً بیرون از Tenant.

## ۴٫۳ IdentityVerification

**هدف:** تاریخچه‌ی مستقل و قابل ممیزی تلاش‌های راستی‌آزمایی یک Claim.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | Tenant و جزء FK Claim |
| `claim_id` | `String` | با Organization به Claim |
| `attempt_number` | `Int` | یکتا در محدوده‌ی Claim |
| `method_key` | `String @db.VarChar` | روش ثبت‌شده؛ روش تخصصی از Module |
| `status` | `VerificationAttemptStatus` | `PENDING`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `EXPIRED` |
| `evidence_locator` | `Json?` | اشاره‌ی محدود به مدرک Verification؛ Evidence عمومی نیست |
| `reviewed_by_platform_identity_ref` | `String? @db.VarChar` | بازبین پلتفرم؛ Membership نیست |
| `decision_reason` | `String? @db.Text` | دلیل تصمیم |
| `started_at` | `DateTime` | اجباری |
| `decided_at` | `DateTime?` | پس از تصمیم |
| `created_at` | `DateTime` | اجباری |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- `@@unique([claim_id, attempt_number])`؛
- FK `(claim_id, organization_id) → BusinessIdentityClaim(id, organization_id)`؛
- CHECK: `VERIFIED` یا `REJECTED` ⇒ بازبین، `decision_reason` و `decided_at` پر — **همان ممیزی حداقلی** برای تصمیم راستی‌آزمایی؛
- تاریخچه بازنویسی نمی‌شود: پس از تصمیم فقط‌خواندنی (§۸٫۱).

**چرخه:** نتیجه‌ی `VERIFIED`/`REJECTED` در **همان تراکنش** وضعیت Claim و ستون‌های `status_changed_*` آن را به‌روز می‌کند.

## ۴٫۴ Membership

**هدف:** اتصال Subject یک Identity Provider خارجی به Organization.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | FK به Organization |
| `identity_provider` | `String @db.VarChar` | مقدار نهایی تابع OD-08 |
| `external_subject` | `String @db.VarChar` | Subject پایدار نزد Provider |
| `membership_status` | `MembershipStatus` | `ACTIVE` یا `REVOKED` |
| `created_at` | `DateTime` | اجباری |
| `revoked_at` | `DateTime?` | ممیزی |
| `revoked_by_membership_id` | `String?` | ممیزی — عضو |
| `revoked_by_organization_id` | `String?` | زوج سایه |
| `revoked_by_platform_identity_ref` | `String? @db.VarChar` | ممیزی — پلتفرم (D-58) |
| `revocation_reason` | `String? @db.Text` | ممیزی |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- Unique جزئی `(organization_id, identity_provider, external_subject)` `WHERE membership_status = 'ACTIVE'`؛
- FK خودارجاع اختیاری `(revoked_by_membership_id, revoked_by_organization_id) → Membership(id, organization_id)`؛
- CHECK زوج سایه §۳٫۳ و CHECK ممیزی §۳٫۴.

**Indexها:** `(organization_id, membership_status)` · `(identity_provider, external_subject)`.

**چرخه:** `ACTIVE → REVOKED`؛ بازیابی خودکار در MVP مدل نمی‌شود.

**مرز:** بدون User داخلی، Password یا Credential. هیچ `role` یا `role_id` منبع Permission نیست.

## ۴٫۵ PermissionGrant

**هدف:** اعطای صریح یک Permission به یک Membership مشخص.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | Tenant |
| `membership_id` | `String` | دریافت‌کننده؛ FK مرکب |
| `permission_key` | `String @db.VarChar` | رشته‌ی ثبت‌شده |
| `grant_status` | `GrantStatus` | `ACTIVE` یا `REVOKED` |
| `basis_key` | `String @db.VarChar` | در MVP فقط `founding` یا `member_grant` |
| `granted_by_membership_id` | `String?` | اعطاکننده |
| `granted_by_organization_id` | `String?` | زوج سایه |
| `reason` | `String? @db.Text` | دلیل اعطا |
| `granted_at` | `DateTime` | اجباری |
| `revoked_at` | `DateTime?` | ممیزی |
| `revoked_by_membership_id` | `String?` | ممیزی — عضو |
| `revoked_by_organization_id` | `String?` | زوج سایه |
| `revoked_by_platform_identity_ref` | `String? @db.VarChar` | ممیزی — پلتفرم (D-58) |
| `revocation_reason` | `String? @db.Text` | ممیزی |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- Unique جزئی `(organization_id, membership_id, permission_key)` `WHERE grant_status = 'ACTIVE'`؛
- FK `(membership_id, organization_id) → Membership(id, organization_id)`؛
- FKهای اختیاری اعطاکننده و لغوکننده با زوج سایه؛
- CHECK: `basis_key IN ('founding', 'member_grant')` در MVP؛ **`founding` ⇔ اعطاکننده تهی** (D-57)؛
- CHECK ممیزی §۳٫۴ برای `REVOKED`.

**Indexها:** `(organization_id, membership_id, grant_status)` · `(organization_id, permission_key, grant_status)`.

**چرخه:** `ACTIVE → REVOKED`؛ اعطای مجدد رکورد تازه است.

**مرز اختیار:** Role، Claim، Session یا دستیار به‌تنهایی Grant ایجاد نمی‌کند. پلتفرم فقط لغو ایمنی و بازیابی را اجرا می‌کند و اختیار کسب‌وکاری نمی‌سازد (ADR-0009، ADR-0010).

## ۴٫۶ BusinessProfile

**هدف:** تصویر عمومی Core برای Discovery و مصرف V2؛ **واحد مکان یا شعبه.**

- `organization_id` Unique نیست؛ «یک Profile در MVP» قاعده‌ی دامنه است، نه قید Database؛
- هر Profile می‌تواند به یک Claim اشاره کند؛ تا راستی‌آزمایی تهی است.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | FK به Organization |
| `business_identity_claim_id` | `String?` | Claim اختیاری |
| `business_identity_claim_organization_id` | `String?` | زوج سایه |
| `name` | `String @db.VarChar` | نام عمومی |
| `description` | `String? @db.Text` | توضیح عمومی |
| `latitude` | `Decimal? @db.Decimal(9, 6)` | مکان عمومی |
| `longitude` | `Decimal? @db.Decimal(9, 6)` | مکان عمومی |
| `address_text` | `String? @db.Text` | نشانی عمومی |
| `contact_information` | `Json? @db.JsonB` | تماس عمومی محدود |
| `links` | `Json? @db.JsonB` | پیوندهای عمومی محدود |
| `business_hours` | `Json? @db.JsonB` | ساعات کاری اعلام‌شده (D-56)؛ Availability زنده نیست |
| `lifecycle_status` | `BusinessProfileLifecycle` | `DRAFT`, `ACTIVE`, `ARCHIVED` |
| `publication_status` | `PublicationStatus` | `UNPUBLISHED`, `PUBLISHED`, `WITHDRAWN` — §۴٫۱۱ |
| **`content_revision`** | **`Int`** | **با هر ویرایش فیلد عمومی یکی زیاد می‌شود (§۵٫۲)** |
| **`published_content_revision`** | **`Int?`** | **بازبینی‌ای که آخرین رخداد `PUBLISHED` منتشر کرد** |
| `created_at` | `DateTime` | اجباری |
| `updated_at` | `DateTime` | اجباری |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- Unique جزئی روی `business_identity_claim_id` `WHERE business_identity_claim_id IS NOT NULL`؛
- FK اختیاری `(business_identity_claim_id, business_identity_claim_organization_id) → BusinessIdentityClaim(id, organization_id)` با CHECK زوج سایه؛
- CHECK: `PUBLISHED` ⇒ `published_content_revision` پر؛
- Unique روی `organization_id` وجود ندارد.

**Indexها:** `(organization_id, lifecycle_status)` · `(organization_id, publication_status, updated_at)` · `(publication_status, latitude, longitude)`. Index جغرافیایی دقیق‌تر (PostGIS) به تصمیم بعدی موکول است.

**چرخه:** `DRAFT → ACTIVE → ARCHIVED`. انتشار بُعد جداست؛ قواعد نمایش در §۵.

**فیلدهای عمداً غایب:** Rating، Review، CRM، Customer Data، Popularity، Availability زنده و هر مفهوم Clinic.

## ۴٫۷ Capability

**هدف:** توانمندی عمومی قابل‌ارائه، مستقل از Vertical.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | FK به Organization |
| `capability_key` | `String @db.VarChar` | کلید پایدار در سازمان |
| `name` | `String @db.VarChar` | نام عمومی |
| `short_description` | `String? @db.Text` | توضیح عمومی |
| `category_key` | `String @db.VarChar` | رشته‌ی ثبت‌شده؛ Enum عمودی نیست |
| `capability_status` | `CapabilityStatus` | `PLANNED`, `ACTIVE`, `RETIRED` |
| `audience` | `CapabilityAudience` | `INTERNAL` یا `CUSTOMER_FACING` |
| `confirmation_status` | `ConfirmationStatus` | `UNCONFIRMED` یا `HUMAN_CONFIRMED` |
| `confirmed_by_membership_id` | `String?` | تأییدکننده‌ی انسانی |
| `confirmed_by_organization_id` | `String?` | زوج سایه |
| `confirmed_at` | `DateTime?` | زمان تأیید |
| `publication_status` | `PublicationStatus` | §۴٫۱۱ |
| **`content_revision`** | **`Int`** | §۵٫۲ |
| **`published_content_revision`** | **`Int?`** | §۵٫۲ |
| `fresh_until` | `DateTime?` | افق تازگی |
| `created_at` | `DateTime` | اجباری |
| `updated_at` | `DateTime` | اجباری |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- `@@unique([organization_id, capability_key])`؛
- FK اختیاری تأییدکننده با زوج سایه؛
- CHECK: `HUMAN_CONFIRMED` ⇔ تأییدکننده و `confirmed_at` پر؛
- CHECK: `PUBLISHED` ⇒ `published_content_revision` پر.

**Indexها:** `(organization_id, capability_status, audience)` · `(organization_id, publication_status, category_key)` · `(organization_id, fresh_until)`.

**چرخه:** چهار بُعد مستقل‌اند: توانمندی، مخاطب، تأیید و انتشار. `ACTIVE + UNPUBLISHED` معتبر است. AI inference با confidence بالا Human Confirmation را جایگزین نمی‌کند (ADR-0006).

## ۴٫۸ Offer

**هدف:** هویت پایدار یک Offer با یک یا چند نسخه‌ی تاریخی.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | FK به Organization |
| `offer_key` | `String @db.VarChar` | کلید پایدار در Organization |
| `lifecycle_status` | `OfferLifecycle` | `ACTIVE` یا `RETIRED` |
| `created_at` | `DateTime` | اجباری |
| `retired_at` | `DateTime?` | زمان بازنشستگی |

**کلیدها:** `@@unique([id, organization_id])` · `@@unique([organization_id, offer_key])`.

**چرخه:** `ACTIVE → RETIRED`؛ بازنشستگی نسخه‌ها را حذف یا بازنویسی نمی‌کند. بازنشستگی آفری که نسخه‌ی منتشرشده دارد تابع §۵٫۳ است.

**نکته:** Offer وضعیت انتشار ندارد؛ وضعیت انتشار فقط روی OfferVersion است.

## ۴٫۹ OfferVersion

**هدف:** نسخه‌ی تغییرناپذیر و قابل‌انتشار یک Offer.

**PR1-ج:** `version_status` **حذف شد.** «نسخه‌ی فعال» مفهوم جداگانه‌ای نیست؛ **تنها وضعیت، وضعیت انتشار است** و فقط از راه رخداد `Publication` تغییر می‌کند (§۴٫۱۱).

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | Tenant و جزء FK Offer |
| `offer_id` | `String` | FK مرکب به Offer |
| `version_number` | `Int` | افزایشی در محدوده‌ی Offer |
| `name` | `String @db.VarChar` | نام عمومی نسخه |
| `short_description` | `String? @db.Text` | توضیح عمومی |
| `offer_shape` | `OfferShape` | `ITEM`, `BUNDLE`, `CAMPAIGN` |
| `terms` | `Json? @db.JsonB` | شرایط عمومی؛ قرارداد YR7 پیش از انتشار نخستین آفر |
| `price_amount` | `Decimal? @db.Decimal(12, 2)` | قیمت اختیاری |
| `price_currency` | `String? @db.VarChar(3)` | همراه قیمت |
| `on_request` | `Boolean` | اعلام‌نشدن قیمت |
| `valid_from` | `DateTime` | شروع اعتبار |
| `valid_until` | `DateTime?` | پایان اعتبار |
| `publication_status` | `PublicationStatus` | `UNPUBLISHED`, `PUBLISHED`, `WITHDRAWN` |
| `created_at` | `DateTime` | اجباری |
| `published_at` | `DateTime?` | زمان آخرین انتشار |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- `@@unique([offer_id, version_number])`؛
- FK `(offer_id, organization_id) → Offer(id, organization_id)`؛
- **Unique جزئی روی `(offer_id)` `WHERE publication_status = 'PUBLISHED'`** — حداکثر یک نسخه‌ی منتشرشده برای هر آفر؛
- CHECK: `valid_until IS NULL OR valid_until > valid_from`؛
- CHECK قیمت: `on_request = true` ⇒ `price_amount` و `price_currency` تهی؛ `on_request = false` ⇒ هر دو پر؛
- **تغییرناپذیری:** پس از ایجاد فقط `publication_status` و `published_at` تغییرپذیرند؛ همه‌ی ستون‌های دیگر با Trigger قفل‌اند (§۸٫۱).

**Indexها:** `(organization_id, offer_id, publication_status)` · `(organization_id, valid_from, valid_until)` · `(organization_id, publication_status, published_at)`.

**چرخه:** برای انتشار نسخه‌ی تازه، در **یک تراکنش**: رخداد `WITHDRAWN` برای نسخه‌ی منتشرشده‌ی قبلی → وضعیت آن `WITHDRAWN` → رخداد `PUBLISHED` برای نسخه‌ی تازه → وضعیت آن `PUBLISHED`. رکورد قبلی باقی می‌ماند.

### جدول پیوند `OfferVersionCapability`

جدول رابطه است، نه Entity دامنه‌ای تازه.

| فیلد | نوع | قاعده |
|---|---|---|
| `organization_id` | `TEXT` | Tenant |
| `offer_version_id` | `TEXT` | FK مرکب به OfferVersion |
| `capability_id` | `TEXT` | FK مرکب به Capability |

- `PRIMARY KEY (offer_version_id, capability_id)`؛
- FKها: `(offer_version_id, organization_id) → OfferVersion(id, organization_id)` و `(capability_id, organization_id) → Capability(id, organization_id)`؛
- Index معکوس `(capability_id, offer_version_id)`؛
- مثل خود نسخه تغییرناپذیر؛ ارجاع نسخه‌ی سازمان A به توانمندی سازمان B در Database رد می‌شود.

## ۴٫۱۰ Evidence

**هدف:** شاهد دارای provenance، freshness، confidence و confirmation برای Capability یا OfferVersion.

**PY4:** **`CUSTOMER_DATA` از Core حذف شد** — نه در enum فیزیکی، نه به‌عنوان منبع مفهومی Core. هر منبع داده‌ی مشتری در آینده تصمیم سیاست و CCR جداگانه لازم دارد. نگهبان زمان اجرای CUSTOMER_DATA در کد موجود تغییر نمی‌کند و دور زده نمی‌شود.

دو زوج مالک تایپ‌شده؛ دقیقاً یکی پر است:

- `(capability_id, capability_organization_id)`؛
- `(offer_version_id, offer_version_organization_id)`.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | Tenant |
| `capability_id` | `String?` | مالک Capability |
| `capability_organization_id` | `String?` | زوج سایه |
| `offer_version_id` | `String?` | مالک OfferVersion |
| `offer_version_organization_id` | `String?` | زوج سایه |
| `source_kind` | `EvidenceSourceKind` | **`HUMAN`, `SYSTEM`, `AI_INFERRED`, `INTEGRATION`** |
| `source_ref` | `String? @db.VarChar` | ارجاع قراردادی/ممیزی، نه جدول Module |
| `method_key` | `String? @db.VarChar` | روش ثبت‌شده |
| `captured_at` | `DateTime?` | زمان دریافت |
| `observed_at` | `DateTime?` | زمان مشاهده |
| `fresh_until` | `DateTime?` | افق تازگی |
| `confidence` | `Decimal? @db.Decimal(5, 4)` | بازه‌ی ۰ تا ۱ |
| `confirmation_status` | `ConfirmationStatus` | `UNCONFIRMED` یا `HUMAN_CONFIRMED` |
| `confirmed_by_membership_id` | `String?` | تأییدکننده‌ی انسانی |
| `confirmed_by_organization_id` | `String?` | زوج سایه |
| `confirmed_at` | `DateTime?` | زمان تأیید |
| `evidence_status` | `EvidenceStatus` | `ACTIVE`, `EXPIRED`, `WITHDRAWN` |
| `created_at` | `DateTime` | اجباری |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- FKهای مرکب اختیاری به Capability و OfferVersion با زوج سایه؛
- CHECK XOR: دقیقاً یکی از دو مالک؛
- CHECK زوج‌های سایه (مالک و تأییدکننده)؛
- CHECK: `confidence IS NULL OR confidence BETWEEN 0 AND 1`؛
- CHECK: `HUMAN_CONFIRMED` ⇔ تأییدکننده و `confirmed_at` پر.

**Indexها:** `(organization_id, capability_id, evidence_status, fresh_until)` · `(organization_id, offer_version_id, evidence_status, fresh_until)` · `(organization_id, source_kind, confirmation_status)`.

**چرخه:** Evidence فعال می‌تواند منقضی یا withdrawn شود؛ تاریخچه باقی می‌ماند. `AI_INFERRED` با confidence بالا خودکار Fact یا Capability معتبر نمی‌شود.

## ۴٫۱۱ Publication

**هدف:** رخداد ممیزی انتشار یا پس‌گرفتن برای BusinessProfile، Capability یا OfferVersion.

**F1 — `Publication` منبع حقیقت تغییرات انتشار است:**

- **هر تغییر انتشار یک Publication Event است.** هیچ مسیر دیگری انتشار را تغییر نمی‌دهد.
- `publication_status` روی موضوع یک **state projection** است، نه منبع موازی. **فقط در همان تراکنشی که Publication Event ثبت می‌شود** تغییر می‌کند. برای Unique جزئی «یک نسخه‌ی منتشرشده» لازم است.
- **الزام قطعی است؛ فقط سازوکار اجبارش** (Trigger یا دامنه + تست) در اعتبارسنجی PostgreSQL انتخاب می‌شود (C15، §۸٫۱).
- **مقدار projection از رخداد می‌آید:** `PUBLISHED` ← رخداد `PUBLISHED` · `WITHDRAWN` ← رخداد `WITHDRAWN`. `UNPUBLISHED` فقط مقدار اولیه‌ی پیش از هر رخداد است.
- `Publication` فقط‌افزودنی است.
- **`grant_id` ندارد (F2).**

سه هدف تایپ‌شده‌ی اختیاری؛ دقیقاً یکی پر است:

- `(business_profile_id, business_profile_organization_id)`؛
- `(capability_id, capability_organization_id)`؛
- `(offer_version_id, offer_version_organization_id)`.

| فیلد | نوع Prisma پیشنهادی | الزام و توضیح |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `organization_id` | `String` | Tenant |
| `business_profile_id` | `String?` | هدف BusinessProfile |
| `business_profile_organization_id` | `String?` | زوج سایه |
| `capability_id` | `String?` | هدف Capability |
| `capability_organization_id` | `String?` | زوج سایه |
| `offer_version_id` | `String?` | هدف OfferVersion |
| `offer_version_organization_id` | `String?` | زوج سایه |
| `event_kind` | `PublicationEventKind` | `PUBLISHED` یا `WITHDRAWN` |
| **`content_revision`** | **`Int?`** | **بازبینی منتشرشده؛ برای Profile و Capability الزامی، برای OfferVersion تهی** |
| `performed_by_membership_id` | `String` | **ممیزی — عضو انسانی همان Organization؛ اجباری** |
| `permission_key` | `String @db.VarChar` | Permission مصرف‌شده |
| `gate_snapshot` | `Json @db.JsonB` | Snapshot حداقل Gate در لحظه‌ی رخداد |
| `reason` | `String @db.Text` | **ممیزی — اجباری** (PR1-ب) |
| `occurred_at` | `DateTime` | ممیزی |

**کلیدها و قیدها:**

- `@@unique([id, organization_id])`؛
- FKهای مرکب اختیاری به سه هدف با زوج سایه؛
- FK `(performed_by_membership_id, organization_id) → Membership(id, organization_id)`؛
- CHECK XOR سه‌گانه؛
- CHECK: `event_kind = 'PUBLISHED'` و هدف Profile یا Capability ⇒ `content_revision` پر؛ هدف OfferVersion ⇒ `content_revision` تهی؛
- **فقط‌افزودنی:** Update و Delete با Trigger یا سلب دسترسی رد می‌شود (§۸٫۱).

**Indexها:** `(organization_id, business_profile_id, occurred_at)` · `(organization_id, capability_id, occurred_at)` · `(organization_id, offer_version_id, occurred_at)` · `(organization_id, performed_by_membership_id, occurred_at)`.

**Gate انتشار (در لحظه‌ی رخداد `PUBLISHED`):**

- **Profile:** `ACTIVE`، فیلدهای عمومی MVP پر، متصل به Claim با وضعیت `VERIFIED` و در بازه‌ی `valid_until`؛
- **Capability:** `ACTIVE`، `CUSTOMER_FACING`، `HUMAN_CONFIRMED` و دارای Evidence فعال و تازه؛
- **OfferVersion:** شرایط خودش، همه‌ی Capabilityهای پیوندخورده قابل‌نمایش (§۵٫۱)؛
- Membership فعال + Grant فعال با Permission لازم؛ Role، Claim یا Session به‌تنهایی کافی نیست؛
- **هیچ انتشار خودکار و هیچ رخداد بدون انجام‌دهنده‌ی انسانی.**

## ۵. قواعد نمایش انتشار (PY5/PY6)

### ۵٫۱ واجد نمایش بودن — در زمان خواندن

Published Read Port **فقط** موضوعی را برمی‌گرداند که **همه‌ی** شرط‌های زیر را **در لحظه‌ی خواندن** داشته باشد. `publication_status = PUBLISHED` **شرط لازم است، نه کافی.**

| موضوع | شرط‌ها |
|---|---|
| **همه** | `publication_status = 'PUBLISHED'` · Organization با وضعیت `ACTIVE` |
| **BusinessProfile** | `lifecycle_status = 'ACTIVE'` · Claim مرتبط با `claim_status = 'VERIFIED'` (نه `SUSPENDED`) · `valid_until` تهی یا در آینده · **`content_revision = published_content_revision`** |
| **Capability** | `capability_status = 'ACTIVE'` · `CUSTOMER_FACING` · `HUMAN_CONFIRMED` · `fresh_until` تهی یا در آینده · حداقل یک Evidence با `ACTIVE` و `fresh_until` تهی یا در آینده · **`content_revision = published_content_revision`** · سازمان حداقل یک Profile قابل‌نمایش دارد |
| **OfferVersion** | اکنون در بازه‌ی `[valid_from, valid_until)` · Offer با `ACTIVE` · **همه‌ی** Capabilityهای پیوندخورده قابل‌نمایش · سازمان حداقل یک Profile قابل‌نمایش دارد |

**پیامدها:**

- **تعلیق ادعا (D-61)، انقضای ادعا، انقضای شاهد، پایان اعتبار آفر و آرشیو سازمان** بلافاصله در زمان خواندن اثر می‌کنند — **بدون** نوشتن رخداد `Publication`.
- پس `performed_by_membership_id` **اجباری می‌ماند**: پلتفرم هرگز به نام کسب‌وکار انتشار را پس نمی‌گیرد؛ کنترل ایمنی‌اش را از راه وضعیت ادعا یا سازمان اجرا می‌کند (ADR-0009، ADR-0010).
- دروازه‌ی هویت (D-52، D-61) برای Capability و OfferVersion از راه «Profile قابل‌نمایش سازمان» اعمال می‌شود؛ انتشار توانمندی یا آفر بدون چهره‌ی راستی‌آزمایی‌شده دیده نمی‌شود.

### ۵٫۲ ویرایش محتوای منتشرشده

- OfferVersion تغییرناپذیر است؛ تغییر = نسخه‌ی تازه.
- **BusinessProfile و Capability** درجا ویرایش‌پذیرند، پس:
  - هر ویرایش فیلد عمومی `content_revision` را یکی زیاد می‌کند؛
  - رخداد `PUBLISHED` مقدار `content_revision` را ثبت می‌کند و `published_content_revision` موضوع را برابر آن می‌کند؛
  - ویرایش موضوع منتشرشده، در همان تراکنش، **یا** رخداد `PUBLISHED` تازه با Grant معتبر ثبت می‌کند **یا** رخداد `WITHDRAWN`.
- **حالت ایمن در شکست:** اگر ویرایشی بدون انتشار دوباره ثبت شود، `content_revision ≠ published_content_revision` و طبق §۵٫۱ **موضوع نامرئی می‌شود** — محتوای تأییدنشده هرگز عمومی نمی‌شود.

**فیلدهای عمومی** که `content_revision` را زیاد می‌کنند:

- **Profile:** `name` · `description` · مکان · `address_text` · `contact_information` · `links` · `business_hours` · Claim مرتبط
- **Capability:** `name` · `short_description` · `category_key` · `audience`

### ۵٫۳ بازنشستگی و آرشیو موضوع منتشرشده

آرشیو Profile، بازنشستگی Capability یا بازنشستگی Offer با نسخه‌ی منتشرشده، **اول** رخداد `WITHDRAWN` با ممیزی کامل (انجام‌دهنده، دلیل، زمان) ثبت می‌کند، در همان تراکنش. پس هیچ خروج از دید عمومی بدون ممیزی نیست.

## ۶. نمودار روابط

```text
Organization (id = شناسه‌ی سازمان AC-2)
├── BusinessIdentityClaim ── submitted_by → Membership
│   └── IdentityVerification history
├── Membership ── revoked_by → Membership (اختیاری)
│   └── PermissionGrant ── granted_by / revoked_by → Membership (اختیاری)
├── BusinessProfile ── optional BusinessIdentityClaim
├── Capability ── confirmed_by → Membership (اختیاری)
│   ├── Evidence
│   └── OfferVersionCapability ── OfferVersion
├── Offer
│   └── OfferVersion
│       └── Evidence
└── Publication (append-only) ── performed_by → Membership
    └── target: BusinessProfile | Capability | OfferVersion
```

قانون همه‌ی خط‌های داخلی: شناسه‌ی رکورد و `organization_id` با هم وارد رابطه می‌شوند.

## ۷. چیزهایی که عمداً در شِما نیستند

- Doctor، Specialist، Treatment، Appointment، Patient، Inventory، Menu یا هر Entity Clinic؛
- Action یا ActionRecord؛
- Intent، Session، Conversation Context یا Context persistence؛
- Consent persistence؛
- **Customer Data در هر شکل — شامل منبع `CUSTOMER_DATA` در Evidence (PY4)**؛
- Recommendation، Decision، Outcome یا Evaluation persistence؛
- Business Directory یا Business Twin برای V2؛
- جدول Content Studio یا افزودن `organization_id` به Content Studio؛
- User داخلی، Password، Credential یا Permission مشتق‌شده از Role؛
- **هویت UUID تازه برای سازمان (PR2)**؛
- `version_status` یا هر وضعیت «فعال» موازی با انتشار (PR1-ج)؛
- EventLog جدید یا `domainTag`؛
- تغییر یا FK روی جدول‌های موجود V1؛
- Availability زنده، Booking، Lead، Visit، Revenue یا Outcome ساختگی.

## ۸. اعتبارسنجی PostgreSQL — پیش‌شرط پیاده‌سازی (PY2/PY3)

**تصمیم مالک:** پیش از پیاده‌سازی Prisma، قیدهایی که Prisma بیان نمی‌کند روی PostgreSQL اعتبارسنجی شوند. این آزمون در یک پوشه‌ی موقت بیرون از مخزن اجرا می‌شود — مثل آزمایش SQLite — و نتیجه‌اش سند جداگانه است. **هیچ Migration یا `schema.prisma` واقعی نمی‌سازد.**

### ۸٫۱ فهرست کامل قیدها و روش اجرا

| # | قید | مدل | روش |
|---|---|---|---|
| C1 | یکتای جزئی Claim `IN ('VERIFIED','SUSPENDED')` | Claim | `CREATE UNIQUE INDEX … WHERE` |
| C2 | یکتای جزئی عضویت فعال | Membership | `CREATE UNIQUE INDEX … WHERE` |
| C3 | یکتای جزئی اعطای فعال | PermissionGrant | `CREATE UNIQUE INDEX … WHERE` |
| C4 | یکتای جزئی Claim در Profile | BusinessProfile | `CREATE UNIQUE INDEX … WHERE … IS NOT NULL` |
| C5 | یکتای جزئی نسخه‌ی منتشرشده | OfferVersion | `CREATE UNIQUE INDEX … WHERE` |
| C6 | زوج‌های سایه: هر دو تهی یا برابر `organization_id` | همه‌ی روابط اختیاری | `CHECK` |
| C7 | XOR مالک Evidence · XOR هدف Publication | Evidence · Publication | `CHECK` |
| C8 | ممیزی حداقلی — دقیقاً یک انجام‌دهنده، دلیل و زمان در وضعیت پایانی | Claim · Membership · Grant · Organization · Verification | `CHECK` |
| C9 | `basis_key` مجاز · `founding` ⇔ بدون اعطاکننده | PermissionGrant | `CHECK` |
| C10 | بازه‌ی اعتبار · قیمت · `confidence` · `content_revision` در رخداد · `PUBLISHED` ⇒ `published_content_revision` | OfferVersion · Evidence · Publication · Profile · Capability | `CHECK` |
| C11 | تأیید انسانی ⇔ تأییدکننده و زمان | Capability · Evidence | `CHECK` |
| C12 | فقط‌افزودنی | Publication | Trigger رد `UPDATE`/`DELETE` — یا سلب دسترسی نقش اپلیکیشن |
| C13 | تغییرناپذیری — فقط `publication_status` و `published_at` آزاد | OfferVersion · OfferVersionCapability | Trigger |
| C14 | تاریخچه‌ی تصمیم‌شده فقط‌خواندنی | IdentityVerification | Trigger |
| C15 | **F1:** `publication_status` فقط در همان تراکنش درج رخداد `Publication`، و برابر نوع آن رخداد | Profile · Capability · OfferVersion | **الزام قطعی؛ سازوکار در آزمون انتخاب می‌شود.**<br>**ترجیح:** projection را **خود رخداد** می‌نویسد:<br>• Trigger `AFTER INSERT` روی `publications` که `publication_status` هدف — و در صورت `PUBLISHED`، `published_content_revision` یا `published_at` — را به‌روز کند؛ پس هم‌تراکنشی ساختاری است<br>• Trigger دوم روی جدول‌های هدف، هر `UPDATE OF publication_status` مستقیم را رد کند، مگر پرچم تراکنش‌محلی (`set_config(..., true)`) که Trigger اول گذاشته است<br>**جایگزین:** تنها مسیر نوشتن در یک سرویس دامنه + تست یکپارچه |

### ۸٫۲ موارد آزمون

1. FK مرکب به `@@unique([id, organization_id])` — نه به `@@id` — و رد ارجاع بین‌مستأجری.
2. زوج سایه + CHECK C6: رد زوج نیمه‌پر و رد سازمان متفاوت.
3. C1 تا C5: رد ردیف دوم در شرط، پذیرش ردیف‌های تاریخی.
4. C7 تا C11: رد هر حالت نامعتبر.
5. C12 تا C14: رد Update/Delete ممنوع؛ پذیرش تغییر ستون‌های آزاد.
6. **ساخت یک Migration دوم با `prisma migrate dev`** پس از افزودن یک فیلد بی‌ربط: **ایندکس‌های جزئی، CHECKها و Triggerهای دستی دست‌نخورده بمانند** — اگر Prisma برای آن‌ها `DROP` تولید کند، روش جلوگیری (بازبینی اجباری SQL هر Migration) پیش از CCR ثبت شود.
7. نوشتن از Prisma Client وقتی `organization_id` در چند رابطه شریک است: `connect` تودرتو یا مقداردهی مستقیم ستون‌ها.
8. FK حلقوی `Organization ⇄ Membership` (آرشیوکننده) و خودارجاع Membership.
9. `Organization.id` از نوع `TEXT` با شناسه‌ی غیر UUID (مثل `org_test_a`).
10. **C15 / F1:** تغییر مستقیم `publication_status` بدون رخداد رد شود؛ درج رخداد projection را در همان تراکنش بنویسد؛ Rollback تراکنش هر دو را برگرداند.
11. **F5:** `@db.Timestamptz(3)` و نام‌های `@@map`/`@map` در DDL تولیدشده درست ظاهر شوند.

**خروجی:** `PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md` با نتیجه‌ی هر مورد و روش نهایی C15.

## ۹. قیدهای پذیرش برای تبدیل به CCR

**بسته‌شده با تصمیم مالک (۱۱ سپتامبر ۲۰۲۶):**

- ✅ YR1 — وضعیت واحد ادعا با پنج مقدار؛ **بدون وضعیت withdrawal (F3)**؛
- ✅ YR2 — ممیزی حداقلی تغییرهای حساس؛ **آخرین ممیزی کافی، تاریخچه فقط برای IdentityVerification و Publication (F4)**؛
- ✅ YR5 — حذف `version_status`؛ **Publication منبع حقیقت، projection فقط هم‌تراکنش (F1)**؛
- ✅ **`grant_id` در MVP نیست (F2)**؛
- ✅ هویت سازمان = شناسه‌ی AC-2، `TEXT`؛
- ✅ `id` کلید اصلی + یکتا و FK مرکب؛
- ✅ حذف `CUSTOMER_DATA` از Core؛
- ✅ قواعد صریح نمایش انتشار؛
- ✅ **PY7 — `timestamptz` · DB `snake_case` · مدل `PascalCase` (F5)**؛
- ✅ شکل شعبه‌ای BusinessProfile و مکان عددی (یادداشت پیش از Prisma).

**هنوز لازم پیش از CCR — هیچ‌کدام تصمیم طراحی نیست:**

1. **اجرای اعتبارسنجی PostgreSQL** (§۸) و ثبت نتیجه — شامل انتخاب سازوکار C15؛
2. **همگام‌سازی شاخه‌ی پیاده‌سازی با `origin/main`** (RR1) — ادغام در دو فایل `AI_HANDOFF` ریشه تعارض دارد؛
3. **مرجع صدور شناسه‌ی سازمان تازه:** Core شناسه نمی‌سازد؛ باید مشخص شود سازمان تازه شناسه‌اش را از کجای AC-2 می‌گیرد (مرتبط با OD-08). **شکل شِما را تغییر نمی‌دهد** — ستون `TEXT` بدون پیش‌فرض برای هر مرجعی کار می‌کند.

**می‌تواند صبر کند:**

- YR4-ب — Permission انتشار Profile ذیل OD-05 — پیش از قابلیت انتشار Profile؛
- YR7 — قرارداد `terms` — پیش از انتشار نخستین Offer؛
- YR6-Registry — پیش از کد دامنه‌ی اعتبارسنجی.

## ۱۰. نتیجه و گام بعدی

**این نسخه‌ی نهایی طراحی است.** همه‌ی تصمیم‌های مالک اعمال شده‌اند و **هیچ دوراهی شکل‌دهنده یا فیزیکی** در مدل‌ها باقی نمانده است.

گام‌های مجاز بعدی به ترتیب:

1. اعتبارسنجی PostgreSQL (§۸)؛
2. همگام‌سازی شاخه (RR1)؛
3. CCR کوچک برای شِمای Core؛
4. تغییر کنترل‌شده‌ی `schema.prisma` روی شاخه‌ی همگام‌شده.

تا آن زمان هیچ Prisma، Migration یا کدی نوشته نمی‌شود.

**نسخه‌ی ۱:** من کدکس هستم.
**نسخه‌ی ۲ و ۳:** من کلاد هستم
