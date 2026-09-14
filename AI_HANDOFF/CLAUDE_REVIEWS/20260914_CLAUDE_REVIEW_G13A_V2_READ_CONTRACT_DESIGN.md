# بازبینی نگهبان معماری — G13a: سند طراحی قرارداد خواندن V2 (S9)

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**سند:** `origin/codex/v2-read-contract-design:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` (۲۲۵ خط، LF sha256 `9cb2a5ff…206d`)
**گزارش:** `…/20260914_CODEX_G13A_V2_READ_CONTRACT_DESIGN_REPORT.md` (LF sha256 `aa6ea584…cb63`)
**commit:** `2010ef8`، پایه = `main` در `b53489a`

## حکم: `APPROVED_WITH_FIXES` (دور سندی G13b)

**سند در جهت درست است:**
- هر ۱۱ بخش را دارد.
- شکاف وفاداری محتوای منتشرشده را **مستقل تأیید** کرده است.
- **شکاف دوم** را هم پیدا کرده: DTO فعلی V2 ‏`products` و `offers` می‌خواهد و Core مدل Product ندارد.
- ارجاع‌هایش درست است.

**ولی پیش از رفتن به تصمیم مالک، دو مشکل اساسی دارد:**
1. **گزینه‌های وفاداری ناقص و در یک مورد نادرست‌اند.** دو گزینه‌ی بدون تغییر schema که دستور خواسته بود نیامده‌اند، و «گزینه‌ی C» ادعایی ناممکن دارد.
2. **ناهمخوانی قرارداد V2 با Core بسیار گسترده‌تر از `products` است** و نقشه‌ی فیلدبه‌فیلد لازم دارد.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط سند تازه، گزارش و Handoff (بدون حذف) · بدون کد، schema یا migration · شاخه‌ی V2 (`f4d326f`) و main (`b53489a`) بدون تغییر |
| **GW2-P** | ✅ ثبت شده است |
| **ارجاع‌های schema** | ✅ نمونه‌برداری شد: `:465-493` Profile · `:496-527` Capability · `:547-576` OfferVersion · `:626-654` Publication · `:356-380` Claim · `:593-612` Evidence، همه درست‌اند |
| **ارجاع‌های V2** | ✅ هر چهار فایل (`BusinessDirectoryService.ts`، `contract.ts`، `validate.ts` و `MatchingService.ts`) وجود دارند و محتوای خط‌های ارجاع‌شده با ادعا می‌خواند: `products` و `offers` در `contract.ts`، `loadSnapshot` با `validateExportSnapshot`، `contract_version: 'draft-1'`، و فیلتر `valid_until` در Matching |
| **سند یکپارچگی** | ✅ `origin/main:mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md` (یک‌طرفه V1 ← V2؛ سه گزینه‌ی انتقال؛ توصیه برای شروع: فایل Export) |
| **hashها** | ✅ سند `9cb2a5ff…` و گزارش `aa6ea584…` |

## ۲. یافته‌ها

### R1 (قرمز) — گزینه‌های وفاداری ناقص، و یک ادعای ناممکن

دستور دست‌کم این سه گزینه را خواسته بود: (A) snapshot محتوا در همان تراکنش، (B) **ممنوعیت ویرایش در حالت PUBLISHED**، و (C) **نمایش فقط وقتی `content_revision == published_content_revision`**. همچنین خواسته بود **اثر هر گزینه بر D6، S4 و serviceهای موجود** بیاید.

سند:
- **(B) و (C) دستور را حذف کرده است.** این دو تنها گزینه‌های **بدون تغییر schema** هستند و مالک باید آن‌ها را ببیند.
- «گزینه‌ی C» خودش (export adapter) می‌گوید DTO را «از داده‌ی منتشرشده» می‌سازد. **این ناممکن است:** همان‌طور که بخش ۳ خود سند ثابت می‌کند، محتوای منتشرشده **هیچ جا ذخیره نمی‌شود**. adapter فقط محتوای **جاری** را دارد.
- «گزینه‌ی A» (بازسازی در V2) خودِ نشت است، نه راه‌حل. «گزینه‌ی D» (event) درباره‌ی **انتقال** است، نه وفاداری.
- اثر گزینه‌ها بر D6، S4، serviceها و تجربه‌ی کاربر **نیامده است.**

**برای شفافیت، نمونه‌هایی که G13b باید تحلیل کند:**
- **A1:** ستون `published_content JSONB` روی `publications`، که service در همان تراکنش publish می‌نویسد. با append-only بودن Publication و provenance هم‌راستاست و برای هر رخداد یک snapshot می‌دهد. CCR ‏schema لازم دارد.
- **A2:** جدول projection عمومی جدا، که در همان تراکنش به‌روز می‌شود. CCR لازم دارد.
- **B:** ممنوعیت ویرایش فیلدهای عمومی در PUBLISHED. بدون schema، ولی ویرایش یعنی withdraw، سپس ویرایش، سپس republish، که **شکاف نمایش** می‌آورد و با روح D6 در تنش است.
- **C:** نمایش فقط در صورت برابری revisionها. بدون schema، ولی **هر ویرایش پروفایل را تا انتشار دوباره از V2 ناپدید می‌کند.**

### R2 (قرمز) — ناهمخوانی قرارداد V2 ‏`draft-1` با Core گسترده‌تر است

سند فقط `products` را نام برده است. `contract.ts` در V2 به این‌ها نیاز دارد:
- `business_id`
- `category` (دسته‌ی **کسب‌وکار**؛ Core آن را فقط روی **Capability** دارد، نه Profile)
- `location` با `floor_level` و `building_id` (Core فقط `latitude`، `longitude` و `address_text` دارد)
- `products` (منبعی در Core ندارد)
- `offers` با `title` و `discount_percent` (Core برای OfferVersion فیلدهای `name`، `price_amount`، `price_currency` و `terms` دارد و `discount_percent` ندارد)
- `last_synced_at`

**یک جدول نقشه‌ی فیلدبه‌فیلد لازم است.** برای هر فیلد: منبع در Core، یا «ندارد» و تصمیم مربوط. تصمیم نسخه‌ی قرارداد هم در همان جدول: `draft-1`، سپس نسخه‌ی v1 هم‌راستا با Core، و حذف `products` و `discount_percent` یا Mock ماندن آن‌ها. دسته و طبقه‌ی کسب‌وکار از کجا بیاید؟ آیا تغییر schema لازم است؟

### زرد

| # | یافته |
|---|---|
| **Y1** | **شرط تأیید انسانی برای نمایش Capability** در جدول بخش ۲ آمده («تأیید انسانی»)، ولی **سیاست تازه‌ای است.** S14-A انتشار بدون تأیید را مجاز نگه داشته است. باید یک تصمیم S جدا با گزینه‌ها باشد، نه یک شرط ضمنی |
| **Y2** | Evidence ‏`AI_INFERRED` تأییدنشده: آیا بر نمایش یا «تازگی» اثر دارد؟ (ADR-0006) · دستور این را خواسته بود و سند پاسخی نداده |
| **Y3** | **پیوندهای Capability در Offer** در DTO نیامده‌اند. قاعده‌اش را هم باید نوشت: فقط Capabilityهای پیوندخورده‌ای که خودشان منتشرشده و `CUSTOMER_FACING` هستند؟ |
| **Y4** | S17 (انتقال) می‌گوید «A یا B»، ولی دستور **یک** توصیه خواسته بود. سند یکپارچگی موجود برای شروع export را توصیه کرده است؛ این باید سنجیده شود |
| **Y5** | در امنیت نیامده است: **احراز هویت مصرف‌کننده‌ی V2** (API یا export امضاشده)، **rate limit**، و **سیاست PII** برای `contact_information` |
| **Y6** | در ثبات نیامده است: ترتیب قطعی بر اساس `publications.occurred_at` و هدف تأخیر انتشار withdraw به V2 |

---

## ۳. گام بعدی — G13b (فقط سند، همان شاخه)

```
INSTRUCTION_ID: CODEX-20260914-G13B-V2-READ-CONTRACT-DESIGN-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13A-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-V2-READ-CONTRACT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13A_V2_READ_CONTRACT_DESIGN.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES — within the owner's option-1 authorization; no new approval needed
MODE: DOCUMENT ONLY — a NEW commit on codex/v2-read-contract-design from 2010ef8.

PRECONDITION: GW2 or GW2-P; record the outputs; any failure → STOP. Never touch credentials.

REVISE mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:
R1 Rewrite section 3 (fidelity):
   - options at least A1 (a published_content JSONB on publications, written by the service in the same tx),
     A2 (a separate public projection table, same tx), B (block public-field edits while PUBLISHED),
     C (expose only when content_revision == published_content_revision)
   - drop/relabel the request-time "adapter" as NOT a fidelity option (no published content is stored),
     and move "event feed" to transport
   - for EACH option: schema CCR yes/no; impact on D6, S4, the existing services (PublicationService,
     BusinessProfileService, CapabilityService) and the triggers; UX effect (display gaps, disappearance);
     append-only and provenance
   - ONE recommendation
R2 A new section: field-by-field mapping from V2 draft-1 (origin/codex/v2-intent-flow-foundation:
   mlino2/app/src/directory/contract.ts) to Core
   - columns: V2 field → Core source (file:line) | "no Core source" → proposed decision
   - covers business_id, category, location (floor_level, building_id), products, offers (title,
     discount_percent), last_synced_at
   - a contract version plan (draft-1 → public-business.v1) and a compatibility/deprecation strategy for
     products and discount_percent
   - whether a schema change is implied (business category, floor/building): options, never decided
Y1 Capability exposure gated on human confirmation: a separate S item with options and ONE recommendation
   (note S14-A allows publishing unconfirmed).
Y2 AI_INFERRED/unconfirmed evidence: its effect on exposure or freshness, per ADR-0006, as an S item or
   within S19.
Y3 The offer DTO includes capability links; the rule for which linked capabilities are exposed.
Y4 S17: ONE recommendation, weighed against the integration draft's current recommendation (export first).
Y5 Security: V2 consumer authentication (API token or signed export), rate limits, a PII policy for
   contact_information.
Y6 Consistency: deterministic ordering by publications.occurred_at; a target latency for withdraw
   propagation.
- Renumber the open decisions S16..Sn, each with options + consequences + ONE recommendation.
- Keep every citation form (origin/main file:line; origin/codex/v2-intent-flow-foundation:<path>:line).

REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13B_V2_READ_CONTRACT_DESIGN_FIXES_REPORT.md
- a table: fix ID → section changed → applied / not applied (reason)
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Push ONLY to codex/v2-read-contract-design. Then STOP.
ALLOWED: the design doc · the report (new) · the handoff (append only)
FORBIDDEN:
- any code, test, config, schema or migration
- any change to the V2 branch
- any push to main
- deciding any S item
- Docker, databases, port 5435, _PUSH_STAGING, credentials
```

**پس از G13b:** بازبینی، سپس بسته‌ی تصمیم‌های S16 به بعد با توصیه‌ی نگهبان برای مالک.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G13a | سند طراحی قرارداد خواندن V2 | ⚠️ APPROVED_WITH_FIXES |
| **G13b** | **R1، R2 و Y1 تا Y6** | ▶️ صادر شد |
| تصمیم‌های S16 به بعد | | ⏳ پس از بازبینی G13b |

من کلاد هستم
