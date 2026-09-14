# بازبینی نگهبان معماری — G13c: نهایی‌سازی قرارداد خواندن V2

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**سند:** `origin/codex/v2-read-contract-design:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` (۳۱۵ خط، LF sha256 `4fff41d4…071a`)
**گزارش:** `…/20260914_CODEX_G13C_V2_READ_CONTRACT_FINAL_REPORT.md` (LF sha256 `00c31dc1…e393`)
**commitها:** `bb0452f` (سند) و `053197e` (گزارش و Handoff)، روی `a35c22b`

## حکم: `APPROVED_WITH_FIXES`

**تصمیم‌ها درست ثبت شده‌اند:**
- S16 تا S26 درست و کامل در سند آمده‌اند.
- هیچ تصمیمی دوباره باز نشده است.
- S19-A1 دقیقاً مطابق سند تصویب است.
- برنامه‌ی G14 فقط به‌صورت پیشنهاد آمده است.

**ولی خود قرارداد `public-business.v1` هنوز قابل پیاده‌سازی نیست.**
- قالب envelope با export ناسازگار است.
- امضا اختیاری تعریف شده است.
- یک فیلد مستقیم از ردیف زنده خوانده می‌شود و وفاداری A1 را دور می‌زند.

این سند مرجع G14b و G14c است. پس ابهام در آن مستقیم به کد منتقل می‌شود. **یک دور کوچک فقط-سند (G13d) پیش از ادغام در main لازم است.** این دور در محدوده‌ی تصویب فعلی مالک است و تصویب تازه نمی‌خواهد.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `a35c22b..053197e`: فقط همان سه فایل مجاز · Handoff فقط الحاقی (۰ خط حذف) · شاخه‌ی V2 (`f4d326f`) و main (`aaf878e`) بدون تغییر |
| **GW2-P** | ✅ برای هر دو فایل pinned ثبت شده و hashها با pin برابرند |
| **hashها** | ✅ سند `4fff41d4…` برابر گزارش · گزارش `00c31dc1…` |
| **D1 تا D3، N1، N4، N5 و P1** | ✅ اعمال شده‌اند |
| **D4 و N2** | ⚠️ ناقص؛ یافته‌های زیر |

## ۲. یافته‌ها

| # | شدت | یافته | اصلاح لازم |
|---|---|---|---|
| **F1** | 🟡 | **envelope با export ناسازگار است.** `PublicBusinessReadV1` یک `business` تکی دارد و امضا برای هر کسب‌وکار جداست. ولی export فعلی V2 (`contract.ts:62-72`، `validate.ts:117-134`) به شکل `{contract_version, generated_at, records[]}` است و S17-B یک snapshot کامل و اتمیک می‌خواهد (بخش ۱۰، بند ۱ و ۲) | دو نوع جدا تعریف شود: `PublicBusinessExportV1 {contract_version, generated_at, snapshot_id, signature, records: PublicBusinessRecordV1[]}` و `PublicBusinessRecordV1` برای هر کسب‌وکار. امضا روی کل snapshot است. `stale` برای هر record است |
| **F2** | 🟡 | `signature: {…} \| null` با S17-B نمی‌خواند؛ S17-B گفته export امضاشده است | در v1 امضا **الزامی** باشد. نبود امضا فقط برای `draft-1` (Mock) مجاز است. الگوریتم و مدیریت کلید به G14b سپرده شود |
| **F3** | 🟡 | **خواندن زنده که A1 را دور می‌زند.** `display_name` از `Organization.displayName` خوانده می‌شود. Organization هدف انتشار نیست، پس این فیلد بدون publication و بدون snapshot، از ردیف جاری خوانده می‌شود. این همان نشتی است که S19-A1 برای بستنش تصویب شد | حذف `display_name` از v1، چون `name` پروفایل از snapshot کافی است. یا نام سازمان جزو allowlist snapshot پروفایل در G14a شود. **قاعده صریح شود: هر فیلد محتوایی DTO فقط از `published_content` می‌آید** |
| **F4** | 🟡 | `OfferVersion.onRequest` (Boolean در schema) در DTO نیست. در Core، `price_amount = null` همراه `on_request = true` معنای جداگانه دارد | افزودن `on_request: boolean` |
| **F5** | 🟡 | `capabilities[].capability_links` که به Offer اشاره می‌کند قاعده ندارد. ممکن است به OfferVersionای اشاره کند که منتشر نشده یا در همان export نیست | قاعده: فقط به OfferVersionهای منتشرشده‌ای که **در همان record** آمده‌اند. یا این پیوند معکوس حذف شود، چون `offers[].capability_links` برای S24 کافی است |
| **F6** | 🟢 | `source_revision` فقط برای Capability آمده است. business نسخه‌ی منتشرشده ندارد | افزودن `source_revision` به business (همان `published_content_revision`) |
| **F7** | 🟢 | `location` در DTO هر دو مختصات را الزامی گرفته، ولی در Core هر دو اختیاری‌اند (`Decimal?`) | قاعده: اگر هر یک از دو مختصات تهی بود، `location.latitude/longitude` تهی است و `address_text` جدا می‌ماند · قاعده‌ی تبدیل Decimal به number (۶ رقم) صریح شود |
| **F8** | 🟢 | `business_hours` و `terms` از نوع `unknown` هستند، در حالی که S21-B DTO تایپ‌دار خواسته است | یا شکل تایپ‌دار، یا صریحاً «JSON با schema نسخه‌دار که در G14b تعریف می‌شود» |
| **F9** | 🟢 | **عبارت‌های کهنه در سند FINAL:**<br>- خط ۲۵ و ۱۰۷: «projection»، که مدل A2 است، در حالی که A1 انتخاب شده<br>- خط ۱۰۹: «S18 به‌صورت تصمیم باز ثبت می‌شود» (N2 ناقص)<br>- خط ۲۴۸: عنوان «تصمیم‌های باز»<br>- خط ۲۶۴: «جدول زیر» به‌جای «جدول بالا»<br>- جدول نگاشت، خط‌های ۸۰ تا ۸۵: category، floor و building، products و `discount_percent` هنوز «تصمیم جدا» نوشته شده‌اند | ارجاع به S18-A، S19-A1، S25 و S26 · `discount_percent`: در v1 نیست (منبع Core ندارد) · فهرست metadata بخش ۵ (`visibility`، `last_synced_at`) با DTO هم‌خوان شود |

**نکات مثبت:**
- A1 دقیق ثبت شده است: CHECK، قفل، allowlist و trigger `:759-769`.
- قاعده‌ی خواندن و ترتیب قطعی درست است.
- N4 درست اصلاح شده است.
- G14 سه گام دارد و هر گام scope، ممنوعیت، آزمون و rollback دارد.
- ارجاع‌های schema همه درست‌اند. هر فیلد DTO جز `display_name` در ستون‌های Profile، Capability و OfferVersion یک منبع واقعی دارد.

---

## ۳. دستور Codex — G13d (فقط سند، همان شاخه)

```
INSTRUCTION_ID: CODEX-20260914-G13D-V2-READ-CONTRACT-DTO-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13C-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-V2-READ-CONTRACT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13C_V2_READ_CONTRACT_FINAL.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES - within the owner's S16-S26 design approval; no new approval needed.
MODE: DOCUMENT ONLY - a NEW commit on codex/v2-read-contract-design from 053197e.

PRECONDITION: GW2 or GW2-P on the pinned review; record the outputs; any failure -> STOP. Never touch credentials.

REVISE mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md (section 7 DTO + stale wording only):
F1 Split the DTO into two types:
   PublicBusinessExportV1 { contract_version: 'mlino.v2.public-business.v1'; generated_at; snapshot_id;
     signature; records: PublicBusinessRecordV1[] }
   PublicBusinessRecordV1 { business; capabilities; offers; stale }
   - the signature covers the whole snapshot; the snapshot is atomic (section 10 items 1-2)
   - cite origin/codex/v2-intent-flow-foundation:mlino2/app/src/directory/contract.ts:62-72 and
     validate.ts:117-134 for the current export shape
F2 signature is REQUIRED in v1 (not nullable); an unsigned artifact is allowed only for draft-1 mock.
   Algorithm and key management are deferred to G14b.
F3 Remove display_name (Organization.displayName is a live, unpublished row). Add the rule: "every content
   field of the DTO comes only from publications.published_content (S19-A1); no live-row reads". In G14a
   note that an organization display name can only be added via the Profile snapshot allowlist.
F4 Add on_request: boolean to offers (OfferVersion.onRequest, schema.prisma:547-576).
F5 Remove capabilities[].capability_links (offers[].capability_links covers S24-B), OR keep it with the rule
   "only published OfferVersions present in the same record". Choose removal unless it contradicts a decision.
F6 Add business.source_revision (the published_content_revision of the publication).
F7 location rule: if latitude or longitude is null then the coordinates are null; address_text stays
   independent; Decimal -> number with 6 fractional digits.
F8 business_hours and terms: "JSON conforming to a versioned schema defined in G14b" (no bare unknown without a
   note).
F9 Stale wording:
   - lines 25 and 107: "projection" -> the S19-A1 published snapshot
   - line 109: S18 is DECIDED (S18-A), not open
   - line 248 heading: "owner decisions (DECIDED)"
   - line 264: "the table above"
   - mapping table lines 80-85: category/floor/building -> S25; products -> S26; discount_percent -> not in v1
     (no Core source)
   - section 5 metadata list consistent with the final DTO (visibility, last_synced_at, fresh_until)
- Do NOT change any S decision, section 3 (A1), section 13 (G14 plan) except the F3 note, or any citation that
  is still correct.

REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13D_V2_READ_CONTRACT_DTO_FIXES_REPORT.md
- a table: F1-F9 -> section/line changed -> applied / not applied (reason)
- the final DTO block copied verbatim
- the LF sha256 (git show bytes) of the design doc and the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Push ONLY to codex/v2-read-contract-design. Then STOP.
ALLOWED FILES (exactly three):
- mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md (edit)
- AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13D_V2_READ_CONTRACT_DTO_FIXES_REPORT.md (new)
- mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any code, test, config, schema, migration or Prisma file
- any change to the V2 branch
- any push to main
- changing or reopening any decided S item
- starting any G14 step
- Docker, databases, port 5435, _PUSH_STAGING, credentials, git config
```

**پس از G13d:**
1. بازبینی نگهبان.
2. تأیید کوتاه مالک برای ادغام سند نهایی در main.
3. سپس G14a (CCR ستون `published_content`)، که تصویب جدا می‌خواهد.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| S16 تا S26 | | ✅ DECIDED |
| G13c | ثبت تصمیم‌ها و سند FINAL | ⚠️ APPROVED_WITH_FIXES |
| **G13d** | **اصلاح DTO و عبارت‌های کهنه** | ▶️ صادر شد |
| ادغام سند در main | | ⏳ پس از G13d، با تأیید کوتاه مالک |
| G14a تا G14c | | ⏳ تصویب جدا |

من کلاد هستم
