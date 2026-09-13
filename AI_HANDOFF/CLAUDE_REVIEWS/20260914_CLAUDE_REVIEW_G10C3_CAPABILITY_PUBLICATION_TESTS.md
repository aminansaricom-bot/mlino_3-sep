# بازبینی نگهبان معماری — G10c3: آزمون انتشار Capability

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-g10c-profile-capability:AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10C3_CAPABILITY_PUBLICATION_TESTS_REPORT.md` (LF sha256 `c395a6c1…c8e0`)
**commitها:** `58888e3` (آزمون) و `908e956` (گزارش، شواهد و Handoff)

## حکم: `APPROVED_NEXT_STEP`

**برش G10c (Profile، Capability و انتشار آن‌ها) بسته شد.**
- مسیر انتشار Capability اکنون **واقعاً** و سرتاسری آزموده شده است.
- `publication-service.ts` تغییر نکرد، پس نقصی پیدا نشد.
- گزارش صریحاً نوشته است که ادعای Y1 در گزارش G10c2 نادرست بوده.

**برای ادغام، تأیید کوتاه مالک لازم است.** همراه آن، مجوز G10d و تصمیم S14 هم درخواست می‌شود (بخش ۳).

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `a99e96d..908e956`: فقط spec ‏G10c، شواهد `g10c3`، گزارش و Handoff (بدون حذف) · **`implementation/core/` بدون تغییر** |
| **آزمون تازه** | ✅ `capability publication covers publish, idempotency, republish, withdraw and re-publish`: |
| | • publish ← `PUBLISHED` · Publication با `capabilityId` و سازمان درست، و `businessProfileId` و `offerVersionId` تهی · `gate_snapshot` برابر `{grantId, 'core-publication-v1'}` · projection برابر PUBLISHED و `published == current` |
| | • publish دوباره ← `ALREADY_PUBLISHED` با شمار ثابت · ویرایش، سپس republish ← +۱ |
| | • withdraw ← `WITHDRAWN` با `content_revision` برابر revision منتشرشده · withdraw دوباره ← CONFLICT · publish از WITHDRAWN ← +۳ نسبت به ابتدا |
| **اصلاح ادعا** | ✅ گزارش (خط ۴۱): «ادعای Y1 در گزارش G10c2 نادرست بود…» و نام آزمون پوشش‌دهنده را آورده است |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · `capabilities` و `publications` = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · read-api همان `a07858b3` |
| **پایگاه یک‌بارمصرف** | ✅ حذف شده · volume قبل و بعد یکسان · بدون volume بی‌نام تازه |
| **آزمون** | ✅ build · شش migration · ۱۴ آزمون G10c · **کل V1: ۲۵ suite و ۳۲۷ آزمون** |
| **manifest و hash گزارش** | ✅ ‏۱ از ۱ (فقط spec) · `c395a6c1…` |
| **merge-tree** | ✅ `610755b`، بدون تعارض |

## ۲. دامنه‌ی ادغام G10c (از درخت `610755b` نسبت به main)

**تازه:**
- `core/business-profile-service.ts`، `core/capability-service.ts`، `core/publication-service.ts`
- `test/core/g10c-profile-capability.spec.ts`
- سه گزارش Codex
- شواهد `g10c`، `g10c2` و `g10c3`

**تغییر در فایل‌های موجود:**
- `core/error-adapter.ts`: دو نگاشت constraint و خواندن `meta.target` از شیء عمومی
- `mlino2/HANDOFF/HANDOFF_STATE.md`: فقط افزودنی

**بدون تغییر:** schema، migration، قراردادها، `tsconfig`، محافظ‌ها و هر فایل V1 بیرون از `core/` و `test/core/`. **بدون حذف.**

**اثر runtime:** هیچ. `core/` در image ‏read-api کپی نمی‌شود.

---

## ۳. تصمیم‌های لازم از مالک (یکجا)

### الف) تأیید ادغام G10c
> «ادغام G10c در main مجاز است.»

### ب) مجوز G10d: برش Offer و OfferVersion

**دامنه:** کد افزودنی Core، روی شاخه‌ی تازه از main پس از ادغام G10c.

- **OfferService** (مجوز `offer.manage`):
  - ساخت Offer با `offer_key` یکتا در سازمان
  - ساخت **نسخه‌ی تازه** با `version_number` بعدی، زیر قفل
  - **R2:** OfferVersion از لحظه‌ی ساخت تغییرناپذیر است؛ ویرایش یعنی نسخه‌ی تازه، و DELETE همیشه رد می‌شود
  - پیوند Capability تا پیش از نخستین انتشار
- **گسترش PublicationService برای OfferVersion:**
  - `content_revision` تهی
  - **جایگزینی نسخه‌ی منتشرشده در یک تراکنش:** قفل Offer، سپس withdraw نسخه‌ی قبلی، سپس publish نسخه‌ی تازه (R1، index یکتای جزئی قابل تعویق نیست)
  - idempotency ‏S4 و E2 برای OfferVersion
  - `gate_snapshot`
- **آزمون‌ها:**
  - تغییرناپذیری
  - رقابت روی `version_number`
  - جایگزینی اتمی و رقابت دو publish
  - پیوند پس از انتشار ← رد
  - W1 و مجوز
  - allowlist فیلدها، طبق درس G10c
- **بیرون از دامنه:** Evidence (برش G10e)، HTTP، adapter واقعی

### ج) تصمیم S14: تأیید انسانی Capability پس از ویرایش

| گزینه | توضیح |
|---|---|
| **S14-A (توصیه)** | هر تغییر در **فیلدهای عمومی** یک Capability تأییدشده، تأیید را در همان تراکنش به `UNCONFIRMED` برمی‌گرداند. تأیید انسانی باید به **محتوای فعلی** مربوط باشد (ADR-0006). انتشار بدون تأیید مجاز می‌ماند، مثل امروز |
| S14-B | تأیید پس از ویرایش هم می‌ماند (رفتار فعلی) |

S14-A در صورت تصویب، به‌عنوان بخشی از G10d در `CapabilityService` پیاده می‌شود.

**پاسخ پیشنهادی مالک (یکجا):**
> «ادغام G10c مجاز است؛ G10d مجاز است؛ S14-A.»

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10c (c تا c3)** | **Profile، Capability و انتشار** | ✅ **بسته**؛ ادغام ← ⏳ تأیید مالک |
| G10d | Offer و OfferVersion و انتشارشان | ⏳ مجوز مالک |
| S14 | تأیید پس از ویرایش | ⏳ تصمیم مالک |
| G10e | Evidence | ⏳ پس از G10d |

من کلاد هستم
