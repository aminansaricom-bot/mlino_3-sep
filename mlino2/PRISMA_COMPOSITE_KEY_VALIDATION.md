# اعتبارسنجی آزمایشی کلیدهای مرکب Prisma

تاریخ: ۲۰۲۶-۰۹-۱۱
نقش: MLINO Core Schema Designer
وضعیت: **آزمایش ایزوله موفق؛ شِمای MLINO تغییر نکرده است**

## هدف

پیش از طراحی شِمای واقعی Core، یک آزمایش کوچک و مستقل برای این قابلیت‌ها اجرا شد:

- کلید اصلی و Unique مرکب؛
- Foreign Key مرکب؛
- رابطهٔ مرکب اختیاری؛
- الگوی جداسازی Tenant بر اساس `organizationId` در کلید رابطه.

آزمایش در پوشهٔ موقت `_prisma-composite-experiment` خارج از مخزن V2 انجام شد. هیچ فایل MLINO، `schema.prisma` اصلی، Migration یا کد برنامه تغییر نکرد.

## نسخهٔ آزمایش‌شده

- Prisma CLI: `5.20.0`
- `@prisma/client`: `5.20.0`
- Node.js: `v24.18.0`
- سیستم‌عامل: Windows x64
- Provider آزمایش: SQLite
- پایگاه‌داده: فایل موقت `dev.db` در پوشهٔ آزمایش

`prisma validate` و `prisma generate` با نسخهٔ بالا موفق شدند. `prisma db push` فقط روی پایگاه‌دادهٔ موقت اجرا شد و هیچ Migration تولید نشد.

## قطعهٔ Schema آزمایش

این قطعه فقط برای آزمایش است و Schema اجرایی MLINO نیست:

```prisma
model Organization {
  id           String       @id
  name         String
  capabilities Capability[] @relation("OrganizationCapabilities")
  offers       Offer[]      @relation("OrganizationOffers")
}

model Capability {
  organizationId String
  capabilityId   String
  slug           String
  organization   Organization @relation("OrganizationCapabilities", fields: [organizationId], references: [id])
  offers         Offer[]

  @@id([organizationId, capabilityId])
  @@unique([organizationId, slug])
}

model Offer {
  organizationId String
  offerId        String
  capabilityId   String
  name           String
  organization   Organization @relation("OrganizationOffers", fields: [organizationId], references: [id])
  capability     Capability   @relation(fields: [organizationId, capabilityId], references: [organizationId, capabilityId])
  versions       OfferVersion[]

  @@id([organizationId, offerId])
}

model OfferVersion {
  organizationId String
  offerId        String
  version        Int
  offer          Offer @relation(fields: [organizationId, offerId], references: [organizationId, offerId])

  @@id([organizationId, offerId, version])
}

model Evidence {
  id                       String      @id
  capabilityOrganizationId String?
  capabilityId             String?
  offerOrganizationId      String?
  offerId                  String?
  capability               Capability? @relation("CapabilityEvidence", fields: [capabilityOrganizationId, capabilityId], references: [organizationId, capabilityId])
  offer                    Offer?      @relation("OfferEvidence", fields: [offerOrganizationId, offerId], references: [organizationId, offerId])
}
```

نکتهٔ رابطهٔ اختیاری: در این مدل، هر دو scalar field هر رابطهٔ اختیاری nullable هستند. این شرط برای اختیاری‌بودن رابطهٔ مرکب لازم است.

## نتیجهٔ اجرا

پس از `db push` روی SQLite موقت، آزمون عملی این نتایج را داد:

```json
{
  "compositePrimaryLookup": true,
  "compositeUniqueLookup": true,
  "compositeUniqueEnforced": true,
  "compositeForeignKey": true,
  "optionalCompositeRelation": true,
  "crossTenantCompositeFkRejected": true
}
```

شواهد آزمون:

۱. `Capability` با `@@id([organizationId, capabilityId])` با کلید مرکب خوانده شد.

۲. `@@unique([organizationId, slug])` هم از طریق Client خوانده شد و هم ثبت مقدار تکراری آن رد شد.

۳. `Offer` با `(organizationId, capabilityId)` به کلید مرکب `Capability` متصل شد.

۴. `OfferVersion` با `(organizationId, offerId)` به کلید مرکب `Offer` متصل شد.

۵. `Evidence` هم با مالک Capability و هم بدون مالک ایجاد شد؛ رابطهٔ مرکب اختیاری معتبر بود.

۶. ساخت Offer برای `organizationId = org-b` با Capability متعلق به `org-a` به‌وسیلهٔ FK مرکب رد شد. این الگو جلوی ارجاع مستقیم بین Tenantها را در سطح رابطه می‌گیرد.

## محدودیت‌ها

- این آزمایش روی SQLite انجام شد؛ رفتار دقیق Indexهای جزئی و برخی جزئیات DDL باید در PostgreSQL هدف MLINO نیز جداگانه تأیید شود.
- Prisma `5.20.0` کلید مرکب و FK مرکب را مدل می‌کند، اما شرط «دقیقاً یکی از چند مالک nullable» را به‌تنهایی به‌صورت Check Constraint عمومی بیان نمی‌کند. برای Evidence باید DB Check/SQL بررسی‌شده یا اعتبارسنجی Domain اضافه شود؛ اعتبارسنجی برنامه به‌تنهایی جای قید پایگاه‌داده را نمی‌گیرد.
- Unique جزئی مانند «فقط یک Claim فعال و Verified» یا «فقط یک OfferVersion فعال و Published» در این آزمایش با Prisma Schema بیان نشد. این قیدها در PostgreSQL به SQL حداقلی و بررسی‌شده نیاز دارند؛ در صورت نیاز باید در CCR و Migration مصوب ثبت شوند.
- FK مرکب Tenant isolation جلوی ارجاع ناسازگار را می‌گیرد، اما جایگزین فیلتر سازمانی در Query، مجوز Membership یا Row-Level Security نیست.
- رابطهٔ اختیاری مرکب به‌تنهایی قید XOR را اجرا نمی‌کند؛ برای Evidence باید هم‌زمان Check یا مدل جداسازی‌شدهٔ مالکیت تعریف شود.
- `db push` آزمایش فقط Schema موقت را ساخت؛ هیچ نتیجه‌ای به Schema واقعی MLINO منتقل نشده است.

## توصیه برای پیاده‌سازی MLINO

۱. برای رکوردهای Tenant-owned، `organization_id` را در کلید یا Unique محلی نگه دارید؛ کلید پایدار داخلی هر موجودیت باید در همان محدودهٔ سازمانی معنا داشته باشد.

۲. در رابطهٔ بین دو موجودیت Tenant-owned، `organization_id` را همراه شناسهٔ موجودیت در FK مرکب حمل کنید تا ارجاع بین سازمانی در سطح دیتابیس رد شود.

۳. برای `OfferVersion`، کلید `(offer_id, version_number)` را Unique کنید و قید جزئی جداگانه‌ای برای تنها یک `(offer_id)` با وضعیت `ACTIVE + PUBLISHED` در PostgreSQL بررسی و اجرا کنید. Version قبلی باید `INACTIVE` و تاریخی باقی بماند.

۴. برای D-61، Unique جزئی روی `(identifier_type, identifier_value)` را فقط برای Claimهای `ACTIVE + VERIFIED` در Migration مصوب اعمال کنید. این قید دو نوع شناسهٔ متفاوت را به‌تنهایی معادل نمی‌کند.

۵. برای Evidence، مالکیت را با ارجاع‌های تایپ‌شده و شرط XOR مدل کنید؛ از `owner_type + owner_id` چندریختی آزاد استفاده نکنید.

۶. Membership همچنان فقط به `(identity_provider, external_subject)` متکی باشد و User/Password داخلی به Core اضافه نشود.

۷. `Session`، `Intent`، `Context`، Consent و Recommendation/Decision/Outcome/Evaluation در شِمای Phase 1 این طرح قرار نگیرند. Action نیز طبق تصمیم قبلی در CCR آینده بماند.

## وضعیت تحویل

فایل خروجی این آزمایش همین سند است. شِمای MLINO، Prisma، Migration و کد برنامه دست‌نخورده باقی مانده‌اند. پوشهٔ آزمایش پس از ثبت نتایج قابل حذف است و جزو تحویل MLINO نیست.

من کدکس هستم
