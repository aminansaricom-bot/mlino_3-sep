# بازبینی نگهبان معماری — G10c: برش Profile، Capability و انتشار

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-g10c-profile-capability:AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10C_CORE_PROFILE_CAPABILITY_SLICE_REPORT.md` (LF sha256 `d7009057…fc10`)
**شاخه:** `codex/core-g10c-profile-capability`، پایه = `main` در `6a224dd`
**commitها:** `06f5e91` (پیاده‌سازی) و `dedd015` (manifest)

## حکم: `APPROVED_WITH_FIXES`

**هسته‌ی انتشار درست است:**
- قرارداد revision (R1) با قفل `FOR UPDATE`
- انتشار تکراری بدون درج رخداد (S4 و E2)
- `gate_snapshot` دقیق (S7)
- فقط درج Publication، بدون نوشتن مستقیم projection
- D6 و S13-A در Profile

**ولی `CapabilityService.updatePublicFields` یک راه دور زدن مجوز دارد (R1-G10c):** ورودی caller مستقیم به Prisma داده می‌شود. آزمون‌ها هم چند بخش الزامی را پوشش نمی‌دهند.

اصلاح در همان شاخه و همان مجوز انجام می‌شود (G10c2)؛ تصویب تازه لازم نیست. **ادغام تا بسته شدن G10c2 متوقف است.**

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **پایه و دامنه** | ✅ merge-base = `6a224dd` · سه service تازه، `error-adapter.ts` (دو نگاشت)، یک spec، شواهد، گزارش و Handoff (بدون حذف) · بدون تغییر در schema، migration، `tsconfig`، محافظ‌ها یا فایل‌های V1 · بدون secret |
| **main** | ✅ `6a224dd`، بدون تغییر |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · جدول‌های Core و `publications` = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · read-api همان `a07858b3` |
| **پایگاه یک‌بارمصرف** | ✅ `mlino-g10c-postgres` حذف شد · volume قبل و بعد یکسان · بدون volume بی‌نام تازه |
| **آزمون** | ✅ build · شش migration · ۹ آزمون G10c · **کل V1: ۲۵ suite و ۳۲۲ آزمون** · ۴ شکست اجرای نخست شفاف گزارش و اصلاح شده |
| **manifest و hash گزارش** | ✅ ‏۵ از ۵ · `d7009057…` |
| **merge-tree** | ✅ `bb9287e`، بدون تعارض |

## ۲. آنچه درست است

| محور | شاهد |
|---|---|
| **R1** | `publication-service.ts:30-50`: قفل سازمان، سپس مجوز، سپس `SELECT … FOR UPDATE` روی ردیف هدف (پارامتری؛ نام جدول از نقشه‌ی ثابت) · publish با revision **جاری** · از PUBLISHED فقط با revision بزرگ‌تر · withdraw با `published_content_revision` |
| **S4 و E2** | PUBLISHED و `published == current` ← `ALREADY_PUBLISHED` **بدون درج** · آزمون شمار ردیف‌ها را ثابت نشان می‌دهد |
| **S7** | `gate_snapshot = { grantId, policyVersion: 'core-publication-v1' }` · آزمون grantId دقیق را می‌سنجد |
| **فقط Publication** | service هرگز projection را نمی‌نویسد؛ trigger آن را اعمال می‌کند |
| **D6 در Profile** | `publicData()` فقط ۸ فیلد عمومی را می‌پذیرد · آزمون افزایش revision را برای هر ۸ فیلد می‌سنجد · تغییر مستقیم revision ← رد |
| **S13-A** | claim باید VERIFIED و در همان سازمان باشد (خواندن با کلید مرکب W1) · هر دو ستون جفت با هم تنظیم یا پاک می‌شوند · C4 ← CONFLICT |
| **تأیید انسانی** | `capability.confirm` · فقط از UNCONFIRMED · CHECK برآورده می‌شود · revision افزایش نمی‌یابد |
| **OfferVersion** | ← `VALIDATION_FAILED`، **پس از** بررسی مجوز |

## ۳. یافته‌ها

### R1-G10c (قرمز) — mass assignment در `CapabilityService.updatePublicFields`

- `capability-service.ts:59` دستور `update({ …, data: input })` را اجرا می‌کند. **شیء caller بدون فیلتر به Prisma می‌رسد.**
- نوع TypeScript فقط در زمان کامپایل محدود می‌کند. در زمان اجرا، caller بدون نوع (مثلاً مسیر HTTP آینده، یا یک متغیر با نوع گسترده‌تر) می‌تواند فیلدهای دیگر را هم بفرستد.
- **پیامد:** دارنده‌ی `capability.manage` می‌تواند:
  1. `confirmationStatus: 'HUMAN_CONFIRMED'` را همراه `confirmedByMembershipId` **هر عضو** سازمان و `confirmedAt` بنویسد. CHECK و FK مرکب این را **می‌پذیرند**. این کار **`capability.confirm` را دور می‌زند و هویت تأییدکننده را جعل می‌کند** (خلاف ADR-0006 و ADR-0009).
  2. `capabilityKey`، `capabilityStatus` و `freshUntil` را از مسیر «فیلد عمومی» تغییر دهد.
- `contentRevision` و `publicationStatus` را triggerها رد می‌کنند، ولی بقیه آزادند.
- `BusinessProfileService` این مشکل را ندارد، چون allowlist دارد (`publicData`).

### زرد

| # | یافته |
|---|---|
| **Y1** | **مسیر انتشار Capability هیچ آزمونی ندارد.** همه‌ی آزمون‌های انتشار روی `BUSINESS_PROFILE` هستند |
| **Y2** | رد مجوز فقط برای `capability.manage` آزموده شده است. برای `publication.manage`، `capability.confirm` و `business_profile.manage` آزمونی نیست |
| **Y3** | آزمون «initial guard» در عمل guard به‌روزرسانی projection را می‌سنجد، نه guard درج اولیه را. ساخت با UNPUBLISHED فقط ضمنی آزموده شده |
| **Y4** | `publish()` دو شکل نتیجه دارد: ردیف Publication، یا `{ outcome, revision }`. قرارداد پایدار S6 می‌خواهد نتیجه یکدست باشد |
| **Y5** | `target` در زمان اجرا بررسی نمی‌شود. مقدار ناشناخته به `Prisma.raw(undefined)` می‌رسد و خطای نامشخص می‌دهد |
| **Y6** | S13-A فقط با PENDING آزموده شده است. SUSPENDED، REJECTED و claim سازمان دیگر آزمون ندارند |
| **Y7** | `updatePublicFields` پروفایل اجازه می‌دهد `name` به رشته‌ی خالی تغییر کند |

---

## ۴. گام بعدی — G10c2 (همان شاخه، همان مجوز)

```
INSTRUCTION_ID: CODEX-20260914-G10C2-PROFILE-CAPABILITY-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G10C
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C_PROFILE_CAPABILITY.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES — within the owner's G10c authorization; no new approval needed
MODE: CODE — NEW commits on codex/core-g10c-profile-capability from dedd015.

PRECONDITION: GW2 or GW2-P; record the outputs; any failure → STOP. Never touch credentials.

FIXES (all mandatory):
R1 CapabilityService.updatePublicFields: build `data` from an explicit allowlist ONLY
   (name, shortDescription, categoryKey, audience), exactly like BusinessProfileService.publicData.
   Unknown keys are either ignored or rejected with VALIDATION_FAILED; choose REJECT and document it.
   The same allowlist discipline applies to every create/update path in core/ (review all three services).
   Tests (runtime casts):
   - passing confirmationStatus/confirmedByMembershipId/confirmedAt, capabilityKey, capabilityStatus,
     freshUntil, contentRevision or publicationStatus → VALIDATION_FAILED, and the row is unchanged
   - a capability can reach HUMAN_CONFIRMED ONLY via confirm() with capability.confirm
Y1 Capability publication tests: publish → ALREADY_PUBLISHED on the same revision → edit → republish →
   withdraw → withdraw again → CONFLICT; gate_snapshot is correct.
Y2 Missing-permission tests (AUTHORIZATION_DENIED) for publication.manage (publish and withdraw),
   capability.confirm, and business_profile.manage (create, update, link, unlink).
Y3 A real initial-guard test: a direct prisma.businessProfile.create with publicationStatus PUBLISHED
   → mapped "initial publication state is invalid". Rename the existing update test to "projection guard".
Y4 A uniform publish result:
     { outcome: 'PUBLISHED', publication } | { outcome: 'ALREADY_PUBLISHED', revision }
   withdraw returns { outcome: 'WITHDRAWN', publication }. Update the tests.
Y5 Runtime validation: target ∈ {BUSINESS_PROFILE, CAPABILITY, OFFER_VERSION}, else VALIDATION_FAILED,
   BEFORE any table lookup. OFFER_VERSION is still rejected as out of slice.
Y6 S13-A tests: SUSPENDED and REJECTED claims → VALIDATION_FAILED; a claim of another org →
   VALIDATION_FAILED.
Y7 Profile updatePublicFields: if name is provided it must be non-empty (VALIDATION_FAILED).

VALIDATION / DATABASE SAFETY: identical to G10c.
- tmpfs 5499; the global and Core guards; volume before/after; rm -f
- migrate, build, the Core specs, the FULL V1 suite
- evidence + LF manifest in mlino2/validation/g10c2/
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10C2_PROFILE_CAPABILITY_FIXES_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-CORE-G10C).
Push ONLY to codex/core-g10c-profile-capability. Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · mlino2/validation/g10c2/** · the report · the handoff (append only)
FORBIDDEN: identical to G10c
- schema, migrations, types, tsconfig; setup-env and test-db-guard; other V1 files; new dependencies
- Offer/Evidence/HTTP
- any push to main
- port 5435; _PUSH_STAGING; credentials
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G10c | Profile، Capability و انتشار | ⚠️ APPROVED_WITH_FIXES |
| **G10c2** | **R1 و Y1 تا Y7** | ▶️ صادر شد |
| ادغام G10c | | ⛔ تا بسته شدن G10c2؛ سپس تأیید کوتاه مالک |

من کلاد هستم
