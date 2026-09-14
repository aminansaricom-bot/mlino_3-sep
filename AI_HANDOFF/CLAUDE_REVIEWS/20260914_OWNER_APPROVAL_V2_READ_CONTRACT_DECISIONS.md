# ثبت تصویب مالک — تصمیم‌های قرارداد خواندن V2 (S16 تا S26) و صدور G13c

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** بسته‌ی تصمیم در `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13B_V2_READ_CONTRACT_DESIGN_FIXES.md` (commit `2fa3057`، LF sha256 `6435986c…4ac9f`)

## ۱. متن تصویب مالک

مالک مستقیماً در گفت‌وگو نوشت:

> «توصیه‌های نگهبان تصویب شد (S16 تا S26، با S19-A1)»

**این یک تصمیم طراحی است و مجوز پیاده‌سازی نیست.** G14 (تغییر schema، export و V2) تصویب جداگانه می‌خواهد.

## ۲. تصمیم‌های ثبت‌شده

| # | موضوع | تصمیم |
|---|---|---|
| **S16** | claim تعلیق‌شده یا منقضی‌شده | **A:** fail-closed؛ کسب‌وکاری که هویتش حل نشده بلافاصله از خروجی عمومی حذف می‌شود |
| **S17** | انتقال اولیه | **B:** export نسخه‌دار و امضاشده · API بعداً همان DTO را می‌دهد |
| **S18** | Capability تأییدنشده | **A:** در نمایش عمومی فقط `HUMAN_CONFIRMED` · انتشار تأییدنشده (S14-A) مجاز می‌ماند ولی دیده نمی‌شود |
| **S19** | وفاداری محتوای منتشرشده | **A1:** ستون `published_content JSONB` روی `publications` (جزئیات در بخش ۳) |
| **S20** | تازگی Evidence و Capability | **A:** فیلتر هنگام خواندن با policy صریح و نسخه‌دار |
| **S21** | شکل location، contact و links | **B:** DTO تایپ‌دار و نسخه‌دار · افزودن فیلد به Profile فقط با CCR جدا |
| **S22** | PII در `contact_information` | **A:** allowlist عمومی به‌همراه policy حریم خصوصی |
| **S23** | انتشار withdraw | **B:** هدف حداکثر ۵ دقیقه، همراه stale marker · با S17-B، یا چرخه‌ی export حداکثر ۵ دقیقه است یا withdraw یک invalidation فوری می‌فرستد |
| **S24** | پیوند Capability در Offer | **B:** خلاصه‌ی عمومی، فقط برای Capabilityهایی که S18 را پاس کرده‌اند |
| **S25** | دسته‌ی کسب‌وکار، طبقه و ساختمان | **در `public-business.v1` نمی‌آید** · دسته‌بندی از نگاشت نسخه‌دار نخستین ماژول عمودی می‌آید (ADR-0011)، نه از `category_key` قابلیت · طبقه و ساختمان فقط با CCR جدا · V2 تا آن زمان این فیلدها را از Mock یا تهی نگه می‌دارد |
| **S26** | `products` | **در `public-business.v1` حذف می‌شود** · Offer جای آن را می‌گیرد · `draft-1` فقط Mock می‌ماند |

## ۳. تعریف S19-A1 (مبنای CCR آینده)

1. **ستون:** `publications.published_content JSONB`
   - برای `event_kind = PUBLISHED` الزامی است و برای `WITHDRAWN` تهی است.
   - این قاعده با یک CHECK اعمال می‌شود.
2. **نوشتن:** `PublicationService` محتوا را در همان تراکنش publish می‌نویسد.
   - محتوا از ردیف هدف قفل‌شده (FOR UPDATE) و در همان revision درخواستی (R1) گرفته می‌شود.
   - **فقط فیلدهای عمومی allowlist‌شده** نوشته می‌شوند، نه کل ردیف.
3. **مصونیت از دست‌کاری:** همان trigger موجود `publication_immutable_before_change` (`migration.sql:759-769`) کافی است و محافظ تازه‌ای لازم نیست.
4. **خواندن:** برای هر هدف، آخرین رخداد PUBLISHED که پس از آن WITHDRAWN نیامده است. ترتیب قطعی با `occurred_at` و سپس `id`.
5. **OfferVersion:** برای یکدستی قرارداد، snapshot آن هم ثبت می‌شود، هرچند OfferVersion خودش تغییرناپذیر است.
6. **پیامدها:**
   - D6 تغییر نمی‌کند؛ service همچنان `content_revision` را نمی‌نویسد.
   - S4/E2 تغییر نمی‌کند؛ `ALREADY_PUBLISHED` هیچ ردیفی درج نمی‌کند.
   - projection نوع A2 در صورت نیاز بعداً از همین رخدادها قابل ساخت است.
7. **رکوردهای قدیمی:** جدول‌های Core الان خالی‌اند، پس backfill لازم نیست. CCR باید این را دوباره تأیید کند.

---

## ۴. دستور Codex — G13c (فقط سند، همان شاخه)

```
INSTRUCTION_ID: CODEX-20260914-G13C-V2-READ-CONTRACT-FINAL-001
TARGET_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-V2-READ-CONTRACT-DECISIONS
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-V2-READ-CONTRACT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md (PINNED_COMMIT/SHA256 relayed)
               + AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13B_V2_READ_CONTRACT_DESIGN_FIXES.md
                 (commit 2fa30575b765179b8bf57ad1c139494b074bc36a, LF sha256
                  6435986cad9886b2b7fb91c66a4a8c9ba4762b8d03baa6c5540882984494ac9f)
DECISION: owner approved S16-S26 (Guardian recommendations, S19-A1). DESIGN ONLY - not an implementation authorization.
MODE: DOCUMENT ONLY - a NEW commit on codex/v2-read-contract-design from a35c22b.

PRECONDITION: GW2 or GW2-P on BOTH pinned files; record the outputs; any failure -> STOP. Never touch credentials.

REVISE mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:
D1 Header: status FINAL; decisions S16-S26 DECIDED; cite the owner approval record.
D2 Section 12: S16-S26 each marked DECIDED with the chosen option exactly as in section 2 of the approval
   record; keep the rejected options, labelled "not chosen". Add S25 and S26.
D3 Section 3: S19 = A1 as defined in section 3 of the approval record (column, CHECK, same-tx write from the
   locked row at the requested revision, public-field allowlist, existing immutability trigger
   migration.sql:759-769, read rule, OfferVersion snapshot, D6/S4 unchanged, no backfill). A2 is recorded as
   "not chosen; derivable later from the events".
D4 Section 7: the FINAL mlino.v2.public-business.v1 DTO:
   - envelope: contract_version, generated_at, signature/metadata per S17-B
   - business: organization id, display name, the S21-B typed location/contact/links with the S22-A allowlist,
     published_at and publication id
   - capabilities: HUMAN_CONFIRMED only (S18-A), with the S20-A freshness rule
   - offers: OfferVersion fields (name etc., no discount_percent unless a Core source exists) plus
     capability links filtered by S18 (S24-B)
   - stale marker and ordering (S23-B, occurred_at then id)
   - NO category, floor_level, building_id (S25) and NO products (S26)
   - every field cites its Core source (origin/main file:line) or is marked as metadata
N1 Fix the stale "S16-S20" header wording.
N2 Section 2: the capability exposure condition refers to decision S18-A instead of stating a fixed rule.
N3 Covered by D4 (capability links and freshness/publication metadata in the DTO).
N4 Options B and C: state that both are service-only (no schema); a CCR only if a DB-level guard is wanted.
N5 Covered by D2 (S25 and S26 numbered).
P1 A new final section: "G14 implementation plan (proposal only; each step needs separate owner approval)":
   G14a schema CCR for published_content (migration, CHECK, service change, tests)
   G14b the signed V1 export producer (S17-B, S22-A, S23-B cycle or invalidation)
   G14c the V2 consumer moved to public-business.v1 (on the V2 branch; draft-1 remains the mock)
   Each step: scope, files, forbidden items, tests, rollback.
- Keep every citation form (origin/main file:line; origin/codex/v2-intent-flow-foundation:<path>:line).
- Do NOT reopen any decided S item. If an inconsistency makes a decision impossible to state, record it in the
  report as a question and STOP rather than choosing.

REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13C_V2_READ_CONTRACT_FINAL_REPORT.md
- a table: item ID (D1-D4, N1-N5, P1) -> section changed -> applied / not applied (reason)
- the LF sha256 (git show bytes) of the final design doc
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Push ONLY to codex/v2-read-contract-design. Then STOP.
ALLOWED: the design doc · the report (new) · the handoff (append only)
FORBIDDEN:
- any code, test, config, schema, migration or Prisma file
- any change to the V2 branch
- any push to main
- changing or reopening any decided S item
- starting any G14 step
- Docker, databases, port 5435, _PUSH_STAGING, credentials
```

**پس از G13c:**
1. بازبینی نگهبان.
2. اگر تأیید شد، ادغام سند نهایی در main، با تأیید کوتاه مالک.
3. سپس G14a، که تصویب جدا می‌خواهد.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G13a و G13b | سند طراحی قرارداد خواندن V2 | ✅ |
| **S16 تا S26** | | ✅ **DECIDED**: تصویب مالک |
| **G13c** | **ثبت تصمیم‌ها و نهایی شدن سند** | ▶️ صادر شد |
| G14a تا G14c | پیاده‌سازی: CCR، export و V2 | ⏳ تصویب جدا |

من کلاد هستم
