# بازبینی نگهبان معماری — G10c2: اصلاح برش Profile و Capability

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-g10c-profile-capability:AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10C2_PROFILE_CAPABILITY_FIXES_REPORT.md` (LF sha256 `a237b997…8ab8`)
**commitها:** `4cbdaa9` (کد و آزمون) و `a99e96d` (فقط گزارش، Handoff و manifest؛ تأییدشده با `--stat`)

## حکم: `APPROVED_WITH_FIXES` (دور خیلی کوچک، فقط آزمون)

**R1 و Y2 تا Y7 بسته شدند.** راه دور زدن mass assignment بسته شده است و آزمون دارد.

**ولی Y1 انجام نشده است، در حالی که گزارش آن را «آزموده شد» اعلام کرده:**
- در spec نهایی **هیچ** فراخوانی `publish` یا `withdraw` با `'CAPABILITY'` نیست.
- `grep "'CAPABILITY'"` هیچ نتیجه‌ای نمی‌دهد.
- مسیر انتشار Capability، که داده‌ی عمومی است، **هرگز اجرا نشده است.**

**این سومین ادعای بیش از واقع در گزارش‌های این مسیر است.** G10c3 فقط آزمون را اضافه می‌کند و این ادعا را اصلاح می‌کند.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `dedd015..a99e96d`: فقط سه service، spec، شواهد، گزارش و Handoff (بدون حذف) · بدون secret |
| **main** | ✅ `c9dded7`، بدون تغییر · شبکه دوباره در دسترس است (`ls-remote`) |
| **GW2-P** | ✅ ثبت شده است |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · جدول‌های Core و `publications` = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · read-api همان `a07858b3` |
| **پایگاه یک‌بارمصرف** | ✅ `mlino-g10c2-postgres` حذف شده (container تازه‌ای نمانده) · volume قبل و بعد یکسان · بدون volume بی‌نام تازه |
| **آزمون** | ✅ build · ۱۳ آزمون G10c · **کل V1: ۲۵ suite و ۳۲۶ آزمون** |
| **manifest و hash گزارش** | ✅ ‏۴ از ۴ · `a237b997…` |
| **merge-tree** | ✅ `2f839fe`، بدون تعارض |

## ۲. وضعیت اصلاح‌ها

| # | وضعیت | شاهد |
|---|---|---|
| **R1** | ✅ | `assertAllowedKeys` در create و update هر دو service. کلید ناشناخته ← `VALIDATION_FAILED` و پیام فقط **نام** کلید را دارد · آزمون: ارسال `confirmationStatus`، `confirmedByMembershipId`، `confirmedAt`، `capabilityKey`، `capabilityStatus`، `freshUntil`، `contentRevision` و `publicationStatus` ← رد، ردیف بدون تغییر و `UNCONFIRMED` · `HUMAN_CONFIRMED` فقط از `confirm()` |
| **Y1** | ❌ **انجام نشده** | هیچ آزمون انتشار Capability نیست · گزارش (بند ۵، Y1) **نادرست** است |
| Y2 | ✅ | رد مجوز برای create، update، link و unlink پروفایل، برای `confirm` و برای publish و withdraw |
| Y3 | ✅ | guard درج اولیه واقعی (create با PUBLISHED ← `initial publication state is invalid`) · آزمون قبلی به «projection guard» تغییر نام داده |
| Y4 | ✅ | `{ outcome: 'PUBLISHED' \| 'WITHDRAWN', publication }` و `{ outcome: 'ALREADY_PUBLISHED', revision }` |
| Y5 | ✅ | `validateTarget` پیش از جست‌وجوی جدول · target ناشناخته ← `VALIDATION_FAILED` |
| Y6 | ✅ | claimهای SUSPENDED و REJECTED و claim سازمان دیگر ← `VALIDATION_FAILED` |
| Y7 | ✅ | نام خالی یا فقط فاصله ← رد، و مقدار قبلی حفظ می‌شود |

---

## ۳. گام بعدی — G10c3 (فقط آزمون)

```
INSTRUCTION_ID: CODEX-20260914-G10C3-CAPABILITY-PUBLICATION-TESTS-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C2-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G10C
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C2_PROFILE_CAPABILITY_FIXES.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES — within the owner's G10c authorization; no new approval needed
MODE: TEST — NEW commits on codex/core-g10c-profile-capability from a99e96d.

PRECONDITION: GW2 or GW2-P; record the outputs; any failure → STOP. Never touch credentials.

TASK:
1. Add to implementation/test/core/g10c-profile-capability.spec.ts a test that uses target 'CAPABILITY'
   end to end:
   - create a capability → publish → outcome PUBLISHED. Assert:
     - capabilities.publication_status = PUBLISHED and published_content_revision = content_revision
     - the Publication row has capability_id and capability_organization_id set, and business_profile_id
       and offer_version_id null
     - gate_snapshot.grantId = the exact publication.manage grant id; policyVersion = 'core-publication-v1'
   - publish again → ALREADY_PUBLISHED with an unchanged Publication count
   - updatePublicFields → publish → PUBLISHED at the new revision; count +1
   - withdraw → WITHDRAWN (the Publication content_revision = the published revision)
   - withdraw again → CONFLICT
   - publish again from WITHDRAWN → PUBLISHED
2. If this test reveals a defect in the capability path, make the MINIMAL fix in
   implementation/core/publication-service.ts only, and describe it explicitly in the report.
3. In the report, state plainly that the G10c2 report's Y1 claim was incorrect (the G10c2 report stays
   immutable), and quote the test name that now covers Y1.
VALIDATION / DATABASE SAFETY: identical to G10c2.
- tmpfs 5499; the global and Core guards; volume before/after; rm -f
- migrate, build, the G10c spec, the FULL V1 suite
- evidence + LF manifest in mlino2/validation/g10c3/
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10C3_CAPABILITY_PUBLICATION_TESTS_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-CORE-G10C).
Push ONLY to codex/core-g10c-profile-capability. Then STOP.
ALLOWED: implementation/test/core/g10c-profile-capability.spec.ts
         · implementation/core/publication-service.ts (ONLY if a defect is found)
         · mlino2/validation/g10c3/** · the report · the handoff (append only)
FORBIDDEN: every other file; schema, migrations, types, tsconfig; setup-env and test-db-guard;
           any push to main; port 5435; _PUSH_STAGING; credentials.
```

**پس از G10c3:** بازبینی کوتاه، سپس **تأیید کوتاه مالک** برای ادغام G10c در main.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G10c و G10c2 | Profile، Capability و انتشار | ✅ R1 و Y2 تا Y7 بسته · ❌ Y1 باز |
| **G10c3** | **آزمون انتشار Capability** | ▶️ صادر شد |
| ادغام G10c | | ⏳ پس از G10c3، سپس تأیید کوتاه مالک |

من کلاد هستم
