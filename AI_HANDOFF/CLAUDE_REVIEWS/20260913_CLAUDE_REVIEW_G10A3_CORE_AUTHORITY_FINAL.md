# بازبینی نگهبان معماری — G10a3: اصلاح نهایی برش هسته‌ی authority

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10A3_CORE_AUTHORITY_FINAL_FIXES_REPORT.md` (LF sha256 `28af762e…995d`)
**commitها:**

| commit | محتوا |
|---|---|
| `462d8b9` | کد، آزمون و شواهد |
| `4513c77` | manifest |
| `630f89a` | گزارش و Handoff |

## حکم: `APPROVED_NEXT_STEP`

**برش هسته‌ی authority (G10a) بسته شد.**
- هر هفت مورد B1 تا B7 اصلاح و با آزمون ثابت شده‌اند.
- قاعده‌ی S10-د («آخرین مدیر حذف نمی‌شود») اکنون **زیر رقابت واقعی** آزموده شده است.

**گام بعدی دو تصمیم مالک لازم دارد:** S12 و مجوز G10b (برش claim و verification).

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `c877ce1..630f89a`: فقط `core/**`، `test/core/**`، `validation/g10a3/**`، گزارش و Handoff (بدون حذف) · `tsconfig`، schema، migration و فایل‌های V1 تغییر نکرده‌اند |
| **رشته‌های `user:pass`** | ✅ secret نیستند. URLهای ساختگی داخل آزمون واحد محافظ هستند (`db-guard.spec.ts`) |
| **main و V2** | ✅ `54adf86` و `f4d326f`، بدون تغییر |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · جدول‌های authority = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · بدون volume بی‌نام تازه |
| **پایگاه یک‌بارمصرف** | ✅ tmpfs ‏(`rw,size=512m`) · شش migration · حذف container · `NO_VOLUME_CHANGE` |
| **آزمون** | ✅ Core: ۳ suite و ۲۸ آزمون · کل V1: ۲۲ suite و ۲۷۷ آزمون · build پاک |
| **شکست اولیه** | ✅ شفاف گزارش شده است: داده‌ی آزمون idempotency از self-grant استفاده می‌کرد و اصلاح شد. پس از آن اجرای کامل تکرار شد |
| **manifest** | ✅ ‏۷ از ۷ با `git show` برابرند. یادداشت: خودِ فایل manifest پایان خط CRLF دارد و hashها درست‌اند |
| **پایان خط** | ✅ یافته نیست. blobهای موجود V1 روی main هم CRLF هستند (`prisma-client.ts`، `server.ts`، `tsconfig.json`، specها)، پس فایل‌های تازه‌ی Core از قرارداد موجود مخزن پیروی می‌کنند |
| **fetch** | ✅ این بار موفق بود. بازبینی مستقیم از `origin/main` خوانده و در `review-source.txt` ثبت شد |
| **hash گزارش** | ✅ `28af762e…` = Handoff |

## ۲. وضعیت اصلاح‌ها

| # | وضعیت | شاهد |
|---|---|---|
| B1 | ✅ | `serializes concurrent revocation of two different admin grants`: دقیقاً دو مدیر (مؤسس و یک عضو)، دو grant **متفاوت**، revoke همزمان ← یکی موفق و دیگری `revoking the last grant administrator is forbidden` · شمارش نهایی ۱ · همین برای revoke همزمان دو **عضویت** مدیر · مورد idempotency جداست |
| B2 | ✅ | Membership فعال تکراری و grant فعال تکراری ← CONFLICT (خطای خام Prisma نیست) |
| B3 | ✅ | `validateAuthContext` پیش از تراکنش · `lockOrganization` یک `CoreDomainError` برمی‌گرداند (`repositories.ts:5-11`) · در مسیرهای عضو «نبود سازمان» = «نبود عضویت» · بررسی مجوز پیش از بررسی وضعیت · آزمون کد **و پیام** یکسان برای سازمان ناموجود و سازمان بی‌عضویت |
| B4 | ✅ | `resolve(__dirname, '../../.env')` · محافظ داخل `clearCoreRows` · آزمون‌های واحد محافظ (تهی، 5435، `@db:`، پورت دیگر، 5499) |
| B5 | ✅ | `manifest.txt` با ۷ فایل |
| B6 | ✅ | آزمون trigger واقعی پیام دامنه‌ی `initial publication state is invalid` را می‌سنجد · bootstrap از خروجی adapter تصمیم می‌گیرد |
| B7 | ✅ | هر ادعا با نام آزمون همراه است · ادعای نادرست G10a2 تکرار نشده است |

**یادداشت (غیرمانع):** `lockOrganization` پیش از بررسی عضویت اجرا می‌شود. پس caller بی‌مجوز می‌تواند ردیف یک سازمان موجود را برای مدت یک تراکنش کوتاه قفل کند. این پذیرفتنی است، چون بررسی عضویت باید در همان تراکنش قفل‌شده باشد. اگر روزی مسیر HTTP اضافه شد، rate limiting در مرز caller لازم است.

## ۳. بررسی معماری برش G10a (تجمیعی)

| محور | نتیجه |
|---|---|
| **W1** | ✅ سازمان فقط از context می‌آید · repositoryها کلید مرکب دارند |
| **S2** | ✅ Membership فعال در همان سازمان · رد یکنواخت · بدون نشت وجود سازمان |
| **ADR-0009 و S10** | ✅ grantor خود کلید را دارد · grant به خود ممنوع · founding فقط در bootstrap · آخرین مدیر زیر رقابت محفوظ است |
| **ADR-0010 و S5** | ✅ port تأیید پلتفرم fail-closed است · مسیرهای پلتفرم جدا هستند · audit دارند |
| **R4** | ✅ bootstrap یک‌باره، در یک تراکنش، با ثبت `bootstrap:<ref>` |
| **S6 و E1** | ✅ adapter همه‌جا وصل است · ۱۰ پیام trigger و نام constraintها نگاشت شده‌اند |
| **ایمنی داده** | ✅ محافظ بیرونی و محافظ داخل spec · پاک‌سازی محدود به پیشوند آزمون |
| **بدهی عمدی** | port تأیید پلتفرم فعلاً پیاده‌سازی واقعی ندارد؛ فقط fake در آزمون هست. تا وصل شدنش، مسیرهای پلتفرم در تولید **fail-closed** می‌مانند و این رفتار درست است. guardهای S10 در DB طبق تصمیم مالک به CCR آینده رفته‌اند |

---

## ۴. تصمیم‌های لازم از مالک

### S12 — گذارهای claim از وضعیت SUSPENDED

| گزینه | توضیح |
|---|---|
| **S12-A (توصیه‌ی نگهبان)** | `SUSPENDED → VERIFIED` (بازگرداندن) **فقط از راه یک attempt تازه‌ی verification با تصمیم VERIFIED** که پشتوانه‌ی شاهد دارد، نه با یک تغییر ساده‌ی وضعیت. `SUSPENDED → REJECTED` مستقیم توسط actor تأییدشده‌ی پلتفرم با دلیل؛ پایانی طبق S11 |
| S12-B | هر دو گذار مستقیم توسط پلتفرم، بدون attempt تازه (ساده‌تر، ولی بازگرداندن بی‌شاهد) |
| S12-C | SUSPENDED پایانی باشد؛ فقط EXPIRED یا claim تازه (سخت‌گیرانه‌ترین) |

### مجوز G10b — برش claim و verification

دامنه: فقط کد افزودنی، همان الگوی G10a.
- `IdentityClaimService` و `IdentityVerificationService`
- ماشین حالت S11 و S12
- تصمیم verification و گذار claim در **یک تراکنش**
- attempt همزمان
- تعارض شناسه (C1)

```
INSTRUCTION_ID: CODEX-20260913-G10B-CORE-CLAIM-VERIFICATION-SLICE-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10A3_CORE_AUTHORITY_FINAL.md (PINNED_COMMIT/SHA256 relayed)
DESIGN_REFERENCE: mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (FINAL, owner-approved) — sections 5, 6, 9, 10
OWNER_APPROVAL: ________ ("S12-<X> decided; G10b authorized")
MODE: CODE — additive, on codex/core-prisma-foundation from 630f89a.

PRECONDITION: GW2 or GW2-P; record the outputs; any failure → STOP. Never touch credentials.

SCOPE (reuse the G10a patterns: W1 repositories, validateAuthContext before the tx, lockOrganization,
requireMembershipPermission BEFORE state checks, PlatformIdentityVerifier fail-closed, mapCoreDatabaseError):
 1. IdentityClaimService:
    - submit: identity_claim.submit, member → a PENDING claim with submitted_by_membership_id.
      Resubmitting after REJECTED/EXPIRED creates a NEW row (S11).
    - read: an ACTIVE membership in the org (W1).
    - Platform transitions, verified PlatformActor only, closed transition map, per S12 as decided:
        VERIFIED → SUSPENDED (reason)
        SUSPENDED → REJECTED (reason; terminal)
        PENDING / VERIFIED / SUSPENDED → EXPIRED (reason; terminal)
    - A claim can never be set VERIFIED directly (PENDING→VERIFIED or SUSPENDED→VERIFIED only via a
      verification decision).
    - Every write satisfies the claim audit CHECK (migration.sql:609-630). The transition map is
      service-only; no DB trigger enforces it.
 2. IdentityVerificationService:
    - start: identity_verification.start, member; the claim must be PENDING or SUSPENDED.
      attempt_number = max+1, computed under a FOR UPDATE lock on the claim row, so concurrent starts
      get distinct numbers and no raw 23505 leaks.
    - markUnderReview: platform, PENDING → UNDER_REVIEW.
    - decide: platform-verified actor; VERIFIED or REJECTED (with reviewed_by_platform_identity_ref,
      decision_reason, decided_at).
      In the SAME transaction, transition the claim: VERIFIED → claim VERIFIED (verified_at set);
      REJECTED → claim REJECTED (terminal). Satisfy CHECK :658-672 and :609-630.
    - C1 (migration.sql:493-495): verifying an identifier already VERIFIED/SUSPENDED in any org →
      CONFLICT "identifier already claimed" (by constraint name; prove the real Prisma error shape
      with a test).
    - Decided attempts are immutable (trigger :828-844); any later write → mapped CONFLICT.
 3. Tests (implementation/test/core/**; prefix-scoped cleanup; in-spec guard):
    - table-driven: every allowed and forbidden claim transition
    - S11 terminal states; resubmit = new row
    - atomicity: decision + claim roll back together (force the claim update to fail)
    - concurrent start → distinct attempt numbers
    - C1 across two orgs → CONFLICT
    - platform paths fail-closed without or with an invalid credential
    - W1 cross-org denial; members cannot decide or transition
    - a decided attempt cannot be modified
VALIDATION / DATABASE SAFETY: identical to G10a3.
- tmpfs 5499, both guards, no .env, volume before/after, rm -f
- tsc passes; the Core specs pass; the FULL V1 suite passes
- LF manifest in mlino2/validation/g10b/
REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10B_CORE_CLAIM_VERIFICATION_SLICE_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md.
Push only to codex/core-prisma-foundation (if blocked, ask the owner). Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · mlino2/validation/g10b/** · the report · the handoff (append only)
FORBIDDEN: identical to G10a3
- schema, migrations, types.ts, tsconfig, other V1 files, new dependencies
- profile/capability/offer/evidence/publication, HTTP, a real AC-2/platform adapter
- merging to main; V2, _PUSH_STAGING and the root AI_HANDOFF files
- port 5435; credentials
```

**ادغام در main:** دروازه‌ای جداست. توصیه‌ی نگهبان این است که پس از بازبینی G10b، دو برش authority و claim یک‌جا ادغام شوند، تا یک CCR و آزمون سازگاری V1 برای هر دو کافی باشد.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10a (a تا a3)** | **هسته‌ی authority** | ✅ **بسته** |
| S12 | گذارهای SUSPENDED | ⏳ **تصمیم مالک** |
| G10b | claim و verification | ⏳ **تصویب مالک** |
| G10c و بعد | Profile/Capability · Offer · Evidence · Publication | ⏳ |
| ادغام در main | | ⏳ پیشنهاد: پس از G10b |

من کلاد هستم
