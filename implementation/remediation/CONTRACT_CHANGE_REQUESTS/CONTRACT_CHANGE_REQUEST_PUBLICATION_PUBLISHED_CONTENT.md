# CONTRACT_CHANGE_REQUEST — snapshot محتوای منتشرشده در Publication

**وضعیت:** APPROVED — مصوب مالک در `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A2_PUBLISHED_CONTENT.md@0110a164968a00076d52dfa74249a7f8ca03704d`
**تاریخ:** ۲۰۲۶-۰۹-۱۴  
**INSTRUCTION_ID:** `CODEX-20260914-G14A1-PUBLISHED-CONTENT-CCR-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260914-OWNER-APPROVAL-G14A1`  
**WORKSTREAM_HANDOFF_ID:** `HANDOFF-20260914-CORE-G14A`  
**مبنای شاخه:** `f57849903b28a414646fed4f16367ddf71d89363`  
**مجوز این مرحله:** فقط تهیهٔ CCR؛ هیچ schema، migration، کد، تست یا دیتابیسی تغییر نمی‌کند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:7-16`).

## ۱. C1 — مسئله، انگیزه و تصمیم مصوب

`Publication` اکنون نوع رویداد، revision، عضویت اجراکننده، permission، gate snapshot، دلیل و زمان را نگه می‌دارد، اما ستونی برای نسخهٔ منجمد محتوای منتشرشده ندارد (`origin/main: implementation/prisma/schema.prisma:626-654`). در مقابل، محتوای BusinessProfile و Capability روی ردیف‌های قابل‌ویرایش جاری قرار دارد و revision جاری از revision منتشرشده جداست (`origin/main: implementation/prisma/schema.prisma:465-481,496-512`). OfferVersion تغییرناپذیر طراحی شده، اما برای یک قرارداد یکنواخت باید هنگام انتشار snapshot داشته باشد (`origin/main: implementation/prisma/schema.prisma:547-569`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:31-46`).

خواندن مستقیم ردیف جاری می‌تواند ویرایشِ پس از آخرین انتشار را به V2 نشت دهد. سند نهایی قرارداد خواندن این شکاف را ثبت کرده و S19-A1 را به‌عنوان راه مصوب تعیین کرده است: افزودن `publications.published_content JSONB`، نوشتن snapshot در همان تراکنش از ردیف قفل‌شده، و استفاده از allowlist عمومی به‌جای ذخیرهٔ کل ردیف (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:34-49`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:19-23,31-45`).

هدف این CCR فقط منجمدکردن **محتوای منتشرشده** است. انتخاب S19-A1، D6 را عوض نمی‌کند و `ALREADY_PUBLISHED` همچنان هیچ Publication تازه‌ای نمی‌سازد (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:42-49`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:42-45`).

## ۲. C2 — تغییر فیزیکی پیشنهادی

### ۲.۱. migration تازه

نام پیشنهادی migration:

```text
20260914010000_add_publication_published_content
```

Migration مصوب Core Foundation و triggerهای آن در `20260913010000_add_core_foundation` دست‌نخورده می‌مانند (`origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:1-15,759-769,931-1008`). متن دقیق SQL پیشنهادی برای migration تازه:

```sql
BEGIN;

LOCK TABLE publications IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM publications LIMIT 1) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'published_content migration requires an empty publications table';
  END IF;
END;
$$;

ALTER TABLE publications
  ADD COLUMN published_content JSONB;

ALTER TABLE publications
  ADD CONSTRAINT publication_published_content_event_kind_check
  CHECK (
    (
      event_kind = 'PUBLISHED'
      AND published_content IS NOT NULL
      AND jsonb_typeof(published_content) = 'object'
      AND published_content ? 'snapshot_version'
      AND published_content ? 'content'
    )
    OR
    (
      event_kind = 'WITHDRAWN'
      AND published_content IS NULL
    )
  );

COMMIT;
```

پیشنهاد این پیش‌نویس استفاده از CHECK مستقیم است، نه `NOT VALID` سپس `VALIDATE`: سیاست پیش‌فرض این CCR وجود هر ردیف قبلی را پیش از DDL رد می‌کند، و شواهد G7b می‌گوید ۱۲ جدول Core هنگام اعمال migration اولیه خالی بوده‌اند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md:31-38`). خالی‌بودن واقعی محیط محلی باید در G14a-3 دوباره بررسی شود و این سند هیچ queryای روی آن محیط اجرا نکرده است (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:96-101`).

قفل `ACCESS EXCLUSIVE` پیش از preflight انتخاب شده است تا بین شمارش و افزودن ستون، Publication تازه‌ای درج نشود. قفل تا پایان تراکنش migration نگه داشته می‌شود و در صورت شکست همراه تراکنش آزاد می‌شود. ستون در سطح فیزیکی nullable است، زیرا رویداد `WITHDRAWN` باید مقدار SQL NULL داشته باشد؛ CHECK رابطهٔ مقدار با `event_kind` و حضور دو کلید envelope را enforce می‌کند. enum موجود فقط `PUBLISHED` و `WITHDRAWN` را تعریف می‌کند و Publication همان `eventKind` را ذخیره می‌کند (`origin/main: implementation/prisma/schema.prisma:322-325,626-641`).

### ۲.۲. تغییر پیشنهادی Prisma

در مدل `Publication`، پس از `contentRevision` و پیش از metadata مجوز، این فیلد افزوده می‌شود؛ مدل کنونی در `schema.prisma:626-654` است (`origin/main: implementation/prisma/schema.prisma:626-654`).

```prisma
publishedContent Json? @map("published_content") @db.JsonB
```

### ۲.۳. اثر بر triggerهای موجود

تغییری در `core_reject_publication_mutation` یا trigger آن لازم نیست. trigger موجود هر UPDATE یا DELETE روی کل ردیف Publication را رد می‌کند؛ در نتیجه `published_content` نیز پس از INSERT تغییرناپذیر است (`origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:759-769`).

تغییری در `core_apply_publication_projection` نیز لازم نیست. آن تابع فقط target، `event_kind` و `content_revision` را برای به‌روزرسانی projectionهای BusinessProfile، Capability و OfferVersion مصرف می‌کند؛ ستون snapshot تازه ورودی تصمیم آن نیست (`origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:931-1008`).

## ۳. C3 — شکل نسخه‌دار snapshot و allowlist

هر snapshot یک object JSON با envelope زیر است. `target`، `target_id` و `content_revision` در JSON تکرار نمی‌شوند؛ ستون‌های target و `content_revision` خود Publication منبع حقیقت‌اند. حذف این سه مقدار از JSON امکان ناسازگاری تغییرناپذیر بین envelope و ستون‌های ردیف را از بین می‌برد (`origin/main: implementation/prisma/schema.prisma:626-654`; `origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:759-769`).

```ts
type PublicationSnapshotV1 = {
  snapshot_version: 'core-publication-snapshot-v1';
  content:
    | BusinessProfileSnapshotV1
    | CapabilitySnapshotV1
    | OfferVersionSnapshotV1;
};
```

نوع `content` با ستون target غیرتهی همان Publication انتخاب می‌شود؛ قید موجود دقیقاً یک target را برای هر رویداد الزام می‌کند (`origin/main: implementation/prisma/schema.prisma:629-646`; `origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:591-593`).

### ۳.۱. BusinessProfile

```ts
type BusinessProfileSnapshotV1 = {
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  contact_information: {
    public_phone?: string;
    public_email?: string;
    public_address?: string;
  } | null;
  links: {
    website?: string;
    public_social?: string[];
  } | null;
  business_hours: JsonValue | null;
};
```

این allowlist از فیلدهای محتوایی عمومی BusinessProfile می‌آید؛ شناسهٔ claim، lifecycle، projectionها، revisionها و زمان‌های داخلی وارد `content` نمی‌شوند (`origin/main: implementation/prisma/schema.prisma:465-493`). شکل عمومی contact و links تابع S21-B/S22-A است و schema نسخه‌دار `business_hours` در G14b تعریف می‌شود (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,182-192`).

اگر یکی از latitude یا longitude تهی باشد، هر دو در snapshot تهی می‌شوند؛ `address_text` مستقل است. Decimal مختصات به JSON number با حداکثر شش رقم اعشار serialize می‌شود، مطابق دقت ستون و قرارداد عمومی (`origin/main: implementation/prisma/schema.prisma:472-477`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,190-191`).

### ۳.۲. Capability

```ts
type CapabilitySnapshotV1 = {
  capability_key: string;
  name: string;
  short_description: string | null;
  audience: 'INTERNAL' | 'CUSTOMER_FACING';
};
```

`capability_key`، `name` و `short_description` منابع مستقیم DTO نهایی‌اند (`origin/main: implementation/prisma/schema.prisma:496-512`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159`). این پیش‌نویس `audience` را برای اثبات intent انتشار در لحظهٔ publish داخل snapshot پیشنهاد می‌کند، اما نمایش عمومی را همچنان به gate زندهٔ پیشنهادی C4 وابسته می‌داند؛ انتخاب نهایی در OQ-2 باز است (`origin/main: implementation/prisma/schema.prisma:499-512`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:21-24`).

`category_key` در snapshot v1 پیشنهاد نمی‌شود، زیرا S25 دسته‌بندی public-business.v1 را از vocabulary نسخه‌دار ماژول عمودی می‌خواهد، نه از Capability.categoryKey (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:27-29`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-192`). `capability_status` نیز محتوای DTO نیست و در این پیش‌نویس gate زندهٔ fail-closed پیشنهاد می‌شود؛ تصمیم نهایی در OQ-2 باز است (`origin/main: implementation/prisma/schema.prisma:503-512`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-189`).

`confirmation_status`، confirmer و `fresh_until` داخل snapshot نیستند؛ S18-A و S20-A آن‌ها را eligibility زندهٔ زمان خواندن قرار داده‌اند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:21-23`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-186`).

### ۳.۳. OfferVersion

```ts
type OfferVersionSnapshotV1 = {
  offer_id: string;
  version_number: number;
  name: string;
  short_description: string | null;
  offer_shape: 'ITEM' | 'BUNDLE' | 'CAMPAIGN';
  terms: JsonValue | null;
  price_amount: string | null;
  price_currency: string | null;
  on_request: boolean;
  valid_from: string;
  valid_until: string | null;
  capability_link_ids: string[];
};
```

این allowlist مستقیماً از OfferVersion می‌آید و شناسه‌های Capability متصل در زمان انتشار را از جدول پیوند همان tenant ثبت می‌کند (`origin/main: implementation/prisma/schema.prisma:547-590`). `price_amount` به decimal string بدون از دست‌دادن precision serialize می‌شود؛ `valid_from` و `valid_until` رشتهٔ ISO 8601 UTC هستند. این شکل با DTO نهایی سازگار است که قیمت را string و زمان‌ها را string تعریف می‌کند (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176`). `terms` باید مطابق schema نسخه‌داری باشد که در G14b تعریف می‌شود و اجازهٔ عبور JSON دلخواه نیست (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:167-191`).

`capability_link_ids` با ترتیب صعودی و بدون تکرار ذخیره می‌شود تا snapshot قطعی باشد. G14b فقط پیوندهایی را به خروجی عمومی تبدیل می‌کند که Capability متناظر در همان record از S18-A عبور کرده باشد (`origin/main: implementation/prisma/schema.prisma:579-590`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:173-186`).

### ۳.۴. داده‌های ممنوع

Snapshot هرگز کل ردیف، Membership، PermissionGrant، actor، جزئیات claim یا verification، Evidence خام، gate snapshot یا فیلدهای خارج از allowlist بالا را کپی نمی‌کند. قرارداد نهایی نیز این داده‌های داخلی را از خروجی V2 حذف کرده است (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-192`; `origin/main: implementation/prisma/schema.prisma:626-647`).

## ۴. C4 — جدایی محتوا از eligibility

قاعدهٔ پیشنهادی Guardian این است: محتوا فقط از snapshot منجمد خوانده شود؛ وضعیت‌های زنده فقط بتوانند رکورد را fail-closed پنهان کنند و هرگز محتوایی به DTO اضافه نکنند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:29-37`).

| داده/قاعده | منبع | رفتار پیشنهادی در read | مبنا |
|---|---|---|---|
| نام، توضیح، مکان، contact عمومی، links و ساعات کاری Profile | `published_content` | منجمد در انتشار؛ تنها منبع content | `origin/main: implementation/prisma/schema.prisma:470-481`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-151,192` |
| کلید، نام و توضیح Capability | `published_content` | منجمد در انتشار؛ تنها منبع content | `origin/main: implementation/prisma/schema.prisma:499-512`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:152-159,192` |
| فیلدهای OfferVersion و پیوندهای لحظهٔ انتشار | `published_content` | منجمد در انتشار؛ تنها منبع content | `origin/main: implementation/prisma/schema.prisma:547-590`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-176,192` |
| `confirmation_status` Capability | ردیف زنده Capability | فقط `HUMAN_CONFIRMED` expose شود؛ در غیر این صورت پنهان | `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:21-23`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-186` |
| `fresh_until` و policy Evidence/Capability | وضعیت زنده | policy نسخه‌دار S20-A به‌صورت fail-closed؛ محتوای Evidence وارد DTO نشود | `origin/main: implementation/prisma/schema.prisma:512,593-623`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:94-111` |
| وضعیت claim متصل به Profile | claim زنده | SUSPENDED یا EXPIRED فوراً Profile را از خروجی حذف کند؛ claim data expose نشود | `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:19-20`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:119-124` |
| audience و status Capability | ردیف زنده + مقدار snapshot پیشنهادی برای audience | fail-closed به `CUSTOMER_FACING` و `ACTIVE`؛ جزئیات تصمیم در OQ-2 | `origin/main: implementation/prisma/schema.prisma:503-512,524-526`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:21-24` |
| اعتبار OfferVersion | snapshot زمان انتشار + clock زمان read | فقط در بازهٔ `[valid_from, valid_until]`؛ پایان تهی نامحدود است | `origin/main: implementation/prisma/schema.prisma:559-575`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:171-172,230,244` |
| چرخهٔ عمر Organization | ردیف زنده Organization | فقط `ACTIVE`؛ `ARCHIVED` کل رکورد کسب‌وکار را پنهان می‌کند و content اضافه نمی‌کند | `origin/main: implementation/prisma/schema.prisma:239-242,327-330` |
| چرخهٔ عمر BusinessProfile | ردیف زنده BusinessProfile | فقط `ACTIVE`؛ `DRAFT` یا `ARCHIVED` پروفایل را پنهان می‌کند و content اضافه نمی‌کند | `origin/main: implementation/prisma/schema.prisma:270-274,465-478` |
| چرخهٔ عمر Offer | ردیف زنده Offer والد | فقط `ACTIVE`؛ `RETIRED` نسخهٔ Offer را پنهان می‌کند و content اضافه نمی‌کند | `origin/main: implementation/prisma/schema.prisma:298-301,530-539` |

بدیل باز این است که eligibility نیز در snapshot منجمد شود. این بدیل رد نشده اما توصیه نمی‌شود، زیرا تغییر بعدی confirmation، freshness یا claim تا انتشار تازه در خروجی عمومی دیده نمی‌شود؛ OQ-3 تصمیم مالک را می‌خواهد (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:29-37`).

## ۵. C5 — تغییر طراحی‌شده در PublicationService

این بخش فقط طراحی است و هیچ کدی در G14a-1 تغییر نمی‌کند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:7-16`).

1. `lockTarget` باید برای BusinessProfile و Capability علاوه بر status و revision، فقط ستون‌های محتوایی allowlist‌شدهٔ C3 را در همان `SELECT ... FOR UPDATE` برگرداند؛ خواندن جداگانه پس از قفل مجاز نیست. پیاده‌سازی فعلی فقط چهار ستون کنترلی را می‌خواند (`origin/main: implementation/core/publication-service.ts:86-90`).
2. `publicationData` پارامتر `publishedContent` می‌گیرد و در PUBLISHED فقط `{ snapshot_version, content }` را می‌نویسد. در WITHDRAWN باید SQL NULL را صریحاً با `Prisma.DbNull` بنویسد؛ `Prisma.JsonNull` ممنوع است، زیرا JSON `null` مقدار SQL NULL نیست و CHECK را نقض می‌کند (`origin/main: implementation/core/publication-service.ts:92-108`; `origin/main: implementation/prisma/schema.prisma:626-654`).
3. مسیر BusinessProfile/Capability snapshot را از همان row قفل‌شده می‌سازد. `ALREADY_PUBLISHED` پیش از INSERT بازمی‌گردد، پس Publication و snapshot تازه ندارد (`origin/main: implementation/core/publication-service.ts:38-53`).
4. مسیر OfferVersion با ترتیب قفل کنونی Organization → Offer → OfferVersion، ستون‌های allowlist‌شدهٔ نسخه و سپس شناسه‌های پیوند را در همان تراکنش می‌خواند. PUBLISHED و ردیف PUBLISHED از REPLACED snapshot دارند؛ WITHDRAWN و ردیف WITHDRAWN از REPLACED مقدار NULL دارند؛ `ALREADY_PUBLISHED` چیزی درج نمی‌کند (`origin/main: implementation/core/publication-service.ts:59-80`).
5. D6 بدون تغییر است: PublicationService هیچ `content_revision` یا projection field هدف را نمی‌نویسد؛ trigger projection پس از INSERT آن‌ها را تغییر می‌دهد (`origin/main: implementation/core/publication-service.ts:28-53,92-108`; `origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:931-1008`).

## ۶. C6 — قانون خواندن برای G14b

برای هر `(organization_id, target)`، read layer آخرین رویداد `PUBLISHED` را با ترتیب نزولی `occurred_at` سپس `id` انتخاب می‌کند، فقط اگر رویداد `WITHDRAWN` متأخرتری با همان ترتیب برای آن target وجود نداشته باشد. indexهای فعلی target و `occurredAt` را دارند و `id` tie-breaker قطعی است (`origin/main: implementation/prisma/schema.prisma:626-653`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:49,221-234`).

تنها منبع content در G14b، `Publication.published_content` همان رویداد فعال است. ردیف‌های زنده فقط gateهای eligibility جدول C4 را پاسخ می‌دهند و اجازه ندارند content DTO را تکمیل یا جایگزین کنند (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:182-192`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:29-37`).

## ۷. C7 — آزمون‌های الزامی G14a-2

G14a-2 باید دست‌کم موارد زیر را روی PostgreSQL یک‌بارمصرف اجرا کند؛ این مرحله هیچ‌یک را اجرا نکرده است (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:92-101`).

1. CHECK، PUBLISHED با object غیرتهی را می‌پذیرد و PUBLISHED با NULL یا JSON غیر-object را رد می‌کند.
2. CHECK، WITHDRAWN با NULL را می‌پذیرد و WITHDRAWN با object را رد می‌کند.
3. snapshot هر سه target دقیقاً برابر allowlist ردیف قفل‌شده در لحظهٔ publish است.
4. ویرایش Profile یا Capability پس از publish، snapshot قبلی را تغییر نمی‌دهد.
5. REPLACED دقیقاً یک WITHDRAWN با NULL و سپس یک PUBLISHED با snapshot نسخهٔ تازه ایجاد می‌کند؛ ترتیب رخدادها قطعی است.
6. `ALREADY_PUBLISHED` هیچ Publication تازه‌ای درج نمی‌کند.
7. trigger تغییرناپذیری، UPDATE مستقیم `published_content` و DELETE رویداد را رد می‌کند (`origin/main: implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:759-769`).
8. allowlist ثابت می‌کند Membership، Grant، actor، claim internals، Evidence خام، projectionها و کل row در snapshot نیستند.
9. migration روی DB خالی موفق است و CHECK پس از آن valid است.
10. migration روی DB دارای حتی یک Publication با پیام preflight تعریف‌شده شکست می‌خورد و هیچ ستون یا constraint نیمه‌اعمال‌شده باقی نمی‌گذارد؛ سیاست این CCR «refuse، بدون backfill حدسی» است.
11. serialization مختصات، قیمت، timestamps، JSON schema markers و ترتیب capability link IDs قطعی است (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:160-191`).
12. JSON literal ‏`null` برای هر دو event kind یعنی PUBLISHED و WITHDRAWN رد می‌شود؛ فقط object دارای `snapshot_version` و `content` برای PUBLISHED و SQL NULL برای WITHDRAWN معتبر است.
13. snapshot هیچ `target`، `target_id` یا `content_revision` تکراری ندارد و decoder نوع content را از ستون target همان Publication انتخاب می‌کند (`origin/main: implementation/prisma/schema.prisma:629-646`).

## ۸. C8 — داده، rollout و rollback

شواهد G7b نشان می‌دهد پس از اعمال migration Core، هر ۱۲ جدول Core محیط محلی خالی بوده است؛ این شاهد تاریخی جای preflight زمان اعمال G14a-3 را نمی‌گیرد (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md:31-38`). G14a-3 باید پیش از backup و migration، فقط تعداد ردیف‌های Core را دوباره بررسی کند؛ G14a-1 هیچ اتصال یا query دیتابیسی انجام نداده است (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:96-101`).

اگر هر Publication موجود باشد، migration به‌صورت fail-closed متوقف می‌شود. هیچ snapshot از live row، revision یا projection بازسازی نمی‌شود، زیرا تاریخ دقیق محتوای رخداد قبلی قابل اثبات نیست (`origin/main: implementation/prisma/schema.prisma:465-481,496-512,626-654`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:34-49`). هر سیاست backfill بعدی به CCR و شواهد مستقل نیاز دارد.

Runbook ‏G14a-3 باید بداند شکست preflight، یک ردیف failed برای migration در `_prisma_migrations` ثبت می‌کند و deployهای بعدی را مسدود می‌سازد. پس از رفع علت، اپراتور باید همان migration را طبق رویهٔ مستند با `prisma migrate resolve --rolled-back <migration-name>` resolve کند یا rollback عملیاتی مصوب را اجرا کند؛ سپس deploy از ابتدا تکرار می‌شود. `LOCK TABLE publications IN ACCESS EXCLUSIVE MODE` پیش از preflight انتخاب شده تا پنجرهٔ race میان بررسی و DDL بسته شود (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A1_PUBLISHED_CONTENT_CCR.md:55`).

Prisma down migration ندارد. Rollback فیزیکی پیشنهادی باید به‌صورت یک **migration رو‌به‌جلوی تازه**، پس از rollback کردن writer/read consumer وابسته، با SQL زیر ثبت و deploy شود (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A1_PUBLISHED_CONTENT_CCR.md:56`):

```sql
ALTER TABLE publications
  DROP CONSTRAINT publication_published_content_event_kind_check;

ALTER TABLE publications
  DROP COLUMN published_content;
```

Migration رو‌به‌جلوی rollback یک ردیف موفق تازه در `_prisma_migrations` می‌سازد؛ ردیف migration افزودن ستون حذف یا بازنویسی نمی‌شود و تاریخچهٔ اعمال/بازگشت قابل ردیابی می‌ماند. این rollback تمام snapshotهای ذخیره‌شده را از بین می‌برد و فقط قبل از وجود دادهٔ لازم، یا پس از export/تصمیم صریح نگه‌داری داده مجاز است. تاریخچهٔ پایهٔ Publication بدون این ستون باقی می‌ماند، زیرا سایر ستون‌ها و روابط آن جدا هستند (`origin/main: implementation/prisma/schema.prisma:626-654`).

اثر runtime بر read-api فعلی انتظار نمی‌رود: Dockerfile پوشهٔ `core` را در build image کپی نمی‌کند، هرچند tsconfig آن را در build محلی include می‌کند؛ HTTP فعلی نیز در این CCR تغییر نمی‌کند (`origin/main: implementation/Dockerfile:22-38,49-64`; `origin/main: implementation/tsconfig.json:17-18`). هر زمان Core وارد runtime image شود، Dockerfile باید در CCR همان مرحله صریحاً `COPY core ./core` را اضافه کند (`origin/main: implementation/Dockerfile:30-38`).

## ۹. C9 — تصمیم‌های مالک

مالک OQ-1 تا OQ-5 را در `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A2_PUBLISHED_CONTENT.md:15-28` تصویب کرده است.

### OQ-1 — روش برخورد migration با Publicationهای موجود

**تصمیم مالک: A.** اگر ردیفی در Publication باشد، migration پیش از DDL رد می‌شود و backfill فقط با CCR جدا مجاز است.

- **A:** اگر حتی یک ردیف وجود داشت، migration پیش از DDL متوقف شود؛ backfill فقط با CCR جدا.
- **B:** migration ستون را اضافه کند، backfill کنترل‌شده بسازد، سپس CHECK را validate کند.
- **توصیهٔ واحد:** **A**؛ محتوای دقیق یک انتشار تاریخی از live row قابل اثبات نیست و بازسازی آن می‌تواند ادعای نادرست بسازد (`origin/main: implementation/prisma/schema.prisma:465-481,496-512,626-654`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:34-49`).

### OQ-2 — audience و capability_status

**تصمیم مالک: A.** `audience` در snapshot و gate زندهٔ `CUSTOMER_FACING` است؛ `capability_status` فقط gate زندهٔ `ACTIVE` است.

- **A:** `audience` در snapshot ذخیره شود و read همزمان snapshot و live row را `CUSTOMER_FACING` بخواهد؛ `capability_status` فقط gate زندهٔ `ACTIVE` باشد.
- **B:** هر دو فقط gate زنده باشند و داخل snapshot نیایند.
- **C:** هر دو در snapshot منجمد شوند و live gate نداشته باشند.
- **توصیهٔ واحد:** **A**؛ snapshot intent انتشار را ثابت می‌کند و gate زنده امکان پنهان‌سازی فوری Capability داخلی یا غیرفعال را حفظ می‌کند (`origin/main: implementation/prisma/schema.prisma:503-512,524-526`; `origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:21-24,182-186`).

### OQ-3 — مرز live eligibility

**تصمیم مالک: A.** همهٔ gateهای فهرست‌شده در گزینه A هنگام خواندن fail-closed هستند و فقط رکورد را پنهان می‌کنند.

- **A:** confirmation، freshness، claim status، audience، capability status، `Organization.lifecycleStatus=ACTIVE`، `BusinessProfile.lifecycleStatus=ACTIVE` و `Offer.lifecycleStatus=ACTIVE` هنگام read به‌صورت fail-closed ارزیابی شوند و فقط قابلیت حذف رکورد داشته باشند.
- **B:** eligibility در snapshot منجمد شود و تا رخداد انتشار بعدی تغییر نکند.
- **توصیهٔ واحد:** **A**؛ این گزینه تصمیم‌های S16-A، S18-A و S20-A را بدون خواندن محتوای live اجرا می‌کند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:19-24`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:29-37`).

### OQ-4 — سخت‌گیری JSONهای عمومی در زمان snapshot

**تصمیم مالک: A′.** `contact_information` و `links` هنگام snapshot sanitize می‌شوند؛ `business_hours` و `terms` در این مرحله همان‌طور که هستند ذخیره می‌شوند و producer در G14b آن‌ها را اعتبارسنجی یا حذف می‌کند.

- **A:** `contact_information` و `links` همین حالا با allowlist S21-B/S22-A sanitize شوند؛ `business_hours` و `terms` فقط با schema marker/version مورد توافق G14b پذیرفته شوند.
- **B:** JSONهای خام Core در snapshot ذخیره شوند و فقط producer خروجی G14b آن‌ها را filter کند.
- **توصیهٔ واحد:** **A**؛ ذخیرهٔ حداقلی در مرز انتشار احتمال نشت PII و عبور JSON بدون قرارداد را کاهش می‌دهد (`origin/main: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:139-147,182-192`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md:24-26`).

### OQ-5 — نام و نسخهٔ snapshot

**تصمیم مالک: A.** envelope واحد `{ snapshot_version: 'core-publication-snapshot-v1', content }` است.

- **A:** همین envelope با `snapshot_version='core-publication-snapshot-v1'` و union مبتنی بر target تصویب شود.
- **B:** هر target نسخهٔ مستقل داشته باشد، مانند `core-business-profile-snapshot-v1`.
- **توصیهٔ واحد:** **A**؛ یک writer و یک ستون دارد، درحالی‌که union همچنان allowlist هر target را جدا نگه می‌دارد (`origin/main: implementation/core/publication-service.ts:7-13,28-108`; `origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:38-42`).

## ۱۰. محدوده و تکمیل

این CCR فقط طراحی migration، snapshot و تغییر آیندهٔ PublicationService را پوشش می‌دهد. G14a-2 برای schema/migration/service/tests و G14a-3 برای backup و اعمال روی DB محلی، هر کدام تصویب جداگانه می‌خواهند (`origin/main: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md:7-16,118-125`).

این مرحله هیچ schema، migration، کد، تست، config، V2، دیتابیس یا runtime را تغییر نداده است.
