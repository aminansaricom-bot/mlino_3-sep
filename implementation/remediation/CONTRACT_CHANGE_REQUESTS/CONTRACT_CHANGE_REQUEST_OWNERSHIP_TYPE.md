# CONTRACT_CHANGE_REQUEST — فیلد «نوع مالکیت» روی OpportunityCurrentState و EventLog

**وضعیت: DRAFT — پیشنهاد، تصویب‌نشده، اعمال‌نشده.** هیچ تغییری در `shared-contracts/types.ts` یا `prisma/schema.prisma` در پاس تولید این سند انجام نشده و تا تایید صریح مالک محصول + بازبینی مستقل نباید انجام شود.

**صادر شده طبق:** `CODEX-20260905-2247-AC2-DATA-KNOWLEDGE-LAYERS-AUTH` §۲.۲
**مبنای سیاستی:** `V1_MINIMUM_AC2_ACCESS_POLICY.md` v1.1 (§۲ قواعد ۳/۴/۶، §۲.۱ مدل دو‌لایه‌ای، §۴ تصمیم مالک محصول)

---

## ۱. قرارداد فعلی

هیچ فیلد مالکیتی در هیچ‌کدام از این‌ها وجود ندارد (بازخوانی مستقیم، نه فرض):

- `prisma/schema.prisma` → `model EventLog` (خطوط ۶۱–۸۶): `id`, `uniqueKey`, `eventType`, `eventTime`, `ingestionTime`, `sourceRef`, `producerType`, `producerId`, `kernelVersion`, `confidenceLevel`, `domainTag`, `causalLinks`, `amendsEventId`, `organizationId`, `payload`, `situationKey` — **بدون فیلد مالکیت**.
- `prisma/schema.prisma` → `model OpportunityCurrentState` (خطوط ۱۱۷–۱۳۳): `opportunityCorrelationId`, `organizationId`, `domainTag`, `state`, `materialityScore`, `materialityBasis`, `intendedAudience`, `evidenceRefs`, `expiresAt`, `latestEventId`, `lastComputedAt` — **بدون فیلد مالکیت**.
- `prisma/schema.prisma` → `model CoreEntity`: `entityType` دارد (`EntityType`)، اما این «نوع موجودیت» است، نه «نوع مالکیت داده».

## ۲. مسئله

سیاست مصوب AC-2 برای V1 (`V1_MINIMUM_AC2_ACCESS_POLICY.md` v1.1، قواعد ۳ و ۴) ایجاب می‌کند تصمیم دسترسی بر پایه‌ی **نوع مالکیتِ صریحاً ثبت‌شده** گرفته شود، و Kernel §۱۰ صراحتاً می‌گوید:

> «مالکیت باید در لحظه‌ی تولید داده صریح تعیین شود، نه بعداً استنباط شود.»

چون امروز هیچ فیلدی برای ثبت این مالکیت وجود ندارد، اعمال دقیق سیاست به **Deny سراسری** منجر می‌شود (قاعده‌ی ۳: مالکیت نامشخص → Deny). این رفتار از نظر امنیتی درست است اما V1 را غیرقابل‌استفاده می‌کند. تنها راه صحیحِ رفع، افزودن همان فیلد است — نه تضعیف قاعده، نه استنباط ضمنی مالکیت در زمان خواندن (که مستقیماً با Kernel §۱۰ در تضاد است).

## ۳. درخواست

افزودن یک فیلد نوع مالکیت به دو مدل، با یک enum جدید:

```prisma
enum OwnershipType {
  ORGANIZATIONAL          // تنها مقدار مجاز در V1
  // INDIVIDUAL           // رزرو — فعال‌سازی مشروط به R8-a
  // AGGREGATE            // رزرو — فعال‌سازی مشروط به R8-b (لایه‌ی دانش)
}

model EventLog {
  // ...
  ownershipType OwnershipType @default(ORGANIZATIONAL) @map("ownership_type")
}

model OpportunityCurrentState {
  // ...
  ownershipType OwnershipType @default(ORGANIZATIONAL) @map("ownership_type")
}
```

**دامنه‌ی عمدی و محدود:**

- **فقط `ORGANIZATIONAL` در V1 فعال است.** مقادیر `INDIVIDUAL` و `AGGREGATE` عمداً در این CCR **تعریف نمی‌شوند** (نه حتی به‌عنوان مقدار enum غیرفعال) تا از تعمیم زودهنگام در سطح Type جلوگیری شود — همان اشتباهی که در CCR «Evidence Namespace v1.2» طبق CR-02 شناسایی و رد شد. آن‌ها فقط در کامنت به‌عنوان مسیر آینده ثبت می‌شوند.
- افزودن `INDIVIDUAL`/`AGGREGATE` در آینده یک CCR جداگانه خواهد بود، مشروط به `R8-a`/`R8-b`.

## ۴. چرا CCR و نه ACR؟

Kernel §۱۰ (مدل مالکیت: سازمانی/فردی/جمعی) و §۱۱ (مدل رضایت) این مفاهیم را **از قبل به‌رسمیت شناخته‌اند**. این درخواست هیچ مفهوم معماری جدیدی اختراع نمی‌کند و هیچ قاعده‌ی Kernel را تغییر نمی‌دهد — فقط یک مکانیزم از‌پیش‌مجاز Kernel را در سطح قرارداد پیاده‌سازی عملیاتی می‌کند.

**اما:** این تشخیص نهایی نیست. اگر بازبین مستقل یا مالک محصول تشخیص دهد که «تعیین صریح مالکیت در لحظه‌ی تولید» نیازمند تصمیم سطح ADR است (مثلاً چون بر همه‌ی Producerهای آینده الزام جدید تحمیل می‌کند)، ارتقای این درخواست به ACR باید انجام شود — این سند آن را از پیش رد نمی‌کند.

## ۵. اثر سازگاری

- **`shared-contracts/types.ts`:** احتمالاً نیازمند افزودن `OwnershipType` و فیلد متناظر روی DTOهای مرتبط. **این فایل منجمد است** — تغییرش بخشی از همین CCR است و بدون تصویب انجام نمی‌شود.
- **`EventCandidateDTO`:** تصمیم باز در همین CCR — آیا Producerها باید مالکیت را صریح ارسال کنند (هم‌راستاتر با Kernel §۱۰: «در لحظه‌ی تولید»)، یا مرز Admission آن را با `ORGANIZATIONAL` پر کند (ساده‌تر، اما «تعیین در لحظه‌ی تولید» را به مرز منتقل می‌کند)؟ **پیشنهاد این پیش‌نویس:** فاز اول = پرکردن در مرز Admission (چون تنها مقدار ممکن `ORGANIZATIONAL` است و Producerها هیچ اطلاعات اضافه‌ای برای تصمیم ندارند)؛ فاز دوم (وقتی `INDIVIDUAL` فعال شود) = ارسال صریح توسط Producer. این تصمیم نیازمند تایید است.
- **مصرف‌کنندگان فعلی:** `OpportunityReadService`، `buildAccessCandidates`، `rebuildOrganizationProjection`، `compute-projection.ts` — هیچ‌کدام امروز این فیلد را نمی‌خوانند. افزودن فیلد با `@default` هیچ‌کدام را نمی‌شکند (Additive-only). تنها مصرف‌کننده‌ی جدید، Adapter واقعی AC-2 خواهد بود که هنوز ساخته نشده.
- **`buildAccessCandidates`/`OpportunityAccessCandidate`:** برای اینکه Adapter بتواند قاعده‌ی ۴ را اجرا کند، باید `ownership_type` به شکل Candidate اضافه شود. این تغییر در `ac2-decision-port.ts` است (فایل غیرمنجمد) و در فاز پیاده‌سازی Adapter انجام می‌شود، نه در این CCR.

## ۶. اثر Migration و Backfill

```sql
-- Migration (Prisma migrate)
CREATE TYPE "OwnershipType" AS ENUM ('ORGANIZATIONAL');
ALTER TABLE "event_log"
  ADD COLUMN "ownership_type" "OwnershipType" NOT NULL DEFAULT 'ORGANIZATIONAL';
ALTER TABLE "opportunity_current_state"
  ADD COLUMN "ownership_type" "OwnershipType" NOT NULL DEFAULT 'ORGANIZATIONAL';
```

**Backfill:** با `DEFAULT 'ORGANIZATIONAL'` به‌طور خودکار انجام می‌شود. مبنای سیاستیِ این پیش‌فرض، تصمیم صریح مالک محصول است (`V1_MINIMUM_AC2_ACCESS_POLICY.md` §۴.۱): «اطلاعاتی که در فضای بیزنس کلینیک شکل می‌گیرد، متعلق به همان بیزنس است.» تمام داده‌ی موجود V1 دقیقاً از این جنس است.

**نکته‌ی صداقتی:** این Backfill یک *فرض سیاستی* را روی داده‌ی تاریخی اعمال می‌کند. چون سیاست مصوب صریحاً همین را می‌گوید، فرضِ خودسرانه نیست — اما باید در گزارش Migration ثبت شود که این مقدار برای ردیف‌های قدیمی *مشتق از سیاست* است، نه *ثبت‌شده در لحظه‌ی تولید* (که Kernel §۱۰ ایده‌آلش می‌داند). ردیف‌های جدید پس از Migration، مقدار را در لحظه‌ی تولید/پذیرش می‌گیرند.

**Rollback:**

```sql
ALTER TABLE "opportunity_current_state" DROP COLUMN "ownership_type";
ALTER TABLE "event_log" DROP COLUMN "ownership_type";
DROP TYPE "OwnershipType";
```

بی‌خطر است چون هیچ مصرف‌کننده‌ی موجودی به این فیلد وابسته نیست (Additive-only). پس از ساخت Adapter واقعی، Rollback دیگر بی‌خطر نخواهد بود — آن‌وقت Adapter هم باید هم‌زمان به Mock برگردانده شود.

## ۷. اثر تست

- تست‌های موجود (۱۳۰) نباید تغییر رفتار بدهند (Additive-only با `@default`).
- تست‌های جدید موردنیاز در فاز اعمال: مقدار پیش‌فرض روی Insert جدید؛ Backfill روی داده‌ی موجود؛ عبور مقدار از Admission تا Projection؛ و (در فاز Adapter) اجرای قاعده‌ی ۴ روی مقدار `ORGANIZATIONAL`.
- بررسی Drift دو فایل منجمد در فاز اعمال، **به‌عمد تغییر خواهد کرد** — این تنها موردی است که تغییر چک‌سام `prisma/schema.prisma` و احتمالاً `shared-contracts/types.ts` مجاز و منتظَر است، و باید در گزارش آن پاس با ارجاع به همین CCR توجیه شود.

## ۸. اثر امنیتی

**تقویت‌کننده.** بدون این فیلد، سیاست AC-2 یا باید Deny سراسری بدهد (غیرقابل‌استفاده) یا مالکیت را در زمان خواندن استنباط کند (مستقیماً برخلاف Kernel §۱۰ و شکننده). این CCR مسیر سوم و درست را باز می‌کند: ثبت صریح، تصمیم قطعی.

## ۹. آنچه این CCR عمداً درخواست **نمی‌کند**

- هیچ زیرساخت Consent (رویدادها، UI، Projection) — آن `R8-a` است.
- هیچ Schema برای لایه‌ی دانش/Insight — آن `R8-b` است.
- هیچ مقدار enum غیر از `ORGANIZATIONAL`.
- هیچ تغییری در `ALLOWED_DOMAIN_TAGS` — **هشدار:** اگر روزی لایه‌ی دانش بخواهد از Event Log استفاده کند، افزودن `domain_tag` جدید (مثلاً `insight.*`) یک CCR کاملاً جداگانه لازم دارد و **هرگز نباید زیر `opportunity.*` جا داده شود** (قرابت با PA-09 — جزئیات در `R8-b`).
- هیچ تغییری در `evaluateAC2FailClosed` یا `OpportunityReadService`.
