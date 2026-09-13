# بازبینی نگهبان معماری — G10b: برش claim و verification

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10B_CORE_CLAIM_VERIFICATION_SLICE_REPORT.md` (LF sha256 `da426302…e5c2`)
**commitها:**

| commit | محتوا |
|---|---|
| `d828d1e` | کد و آزمون |
| `6f02e3f` | شواهد |
| `ee4111f` | manifest |
| `b3dd604` | گزارش |

## حکم: `APPROVED_WITH_FIXES` (دور کوچک)

برش ساختار درستی دارد و الگوهای G10a را دنبال می‌کند:
- W1
- قفل سازمان، سپس قفل claim
- بررسی مجوز پیش از وضعیت
- port پلتفرم fail-closed
- adapter خطا

تصمیم verification و گذار claim **در یک تراکنش** انجام می‌شوند و rollback آن‌ها واقعاً آزموده شده است.

**ولی یک راه دور زدن S12-A هست.** attemptی که **پیش از تعلیق** باز مانده، می‌تواند claim تعلیق‌شده را برگرداند، در حالی که تصمیم مالک این بازگرداندن را فقط از راه یک **بررسی تازه** مجاز می‌داند. این مورد به‌همراه چند مورد جزئی در G10b2 اصلاح می‌شود، در همان دامنه و بدون نیاز به تصویب تازه.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `630f89a..b3dd604`: دو service تازه، یک spec، تغییر کوچک در `repositories.ts` (قفل claim) و `error-adapter.ts` (C1)، شواهد، گزارش و Handoff (بدون حذف) · بدون secret |
| **main و V2** | ✅ `c7e9a88` و `f4d326f`، بدون تغییر |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · claims و verifications = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · بدون volume بی‌نام تازه |
| **پایگاه یک‌بارمصرف** | ✅ fetch موفق (`FETCH_EXIT=0`) · شش migration · حذف `mlino-g10b-postgres` · volume قبل و بعد یکسان (۱۹ خط) و `NO_VOLUME_CHANGE`. فایل خالی `volume-diff.txt` یعنی «بدون تفاوت» |
| **آزمون** | ✅ Core: ۴ suite و ۴۷ آزمون · کل V1: ۲۳ suite و ۲۹۶ آزمون · build پاک |
| **manifest و hash گزارش** | ✅ ‏۵ از ۵ · `da426302…` = Handoff |
| **شکست‌های اجرای نخست** | ✅ شفاف گزارش شده‌اند. `core-tests.log` نشان می‌دهد نسخه‌ی نخست گذار مستقیم `SUSPENDED → VERIFIED` را **پذیرفته بود** (نقض واقعی S12-A). آزمون جدول گذارها آن را گرفت و کد نهایی آن را بست: `PlatformClaimTransition` دیگر VERIFIED ندارد (`identity-claim-service.ts:14`، `:77-82`) |

## ۲. بررسی کد

| محور | نتیجه |
|---|---|
| **ماشین حالت (S11)** | ✅ نقشه‌ی بسته: `VERIFIED→SUSPENDED` · `SUSPENDED→REJECTED` · `PENDING/VERIFIED/SUSPENDED→EXPIRED` · گذار مستقیم به VERIFIED ممکن نیست · REJECTED و EXPIRED پایانی‌اند · ارسال دوباره = ردیف تازه (آزموده شده) |
| **audit claim** | ✅ هر نوشتن CHECK ‏`:609-630` را برآورده می‌کند: `verified_at` در VERIFIED تنظیم می‌شود و در SUSPENDED حفظ می‌شود |
| **تراکنش واحد** | ✅ به‌روزرسانی attempt و claim در یک `$transaction` · آزمون C1 نشان می‌دهد با شکست claim، attempt هم PENDING می‌ماند |
| **شماره‌ی attempt** | ✅ `max+1` زیر قفل سازمان و قفل ردیف claim · آزمون همزمان ← `[1, 2]` |
| **C1** | ✅ ← `CONFLICT "identifier already claimed"`، با شکل واقعی خطای Prisma آزموده شده. نگاشت بر اساس فیلدهای `identifier_type` و `identifier_value` در `meta.target` است |
| **تغییرناپذیری attempt** | ✅ trigger ‏`:828-844` ← `CONFLICT "identity verification is immutable"` |
| **پلتفرم** | ✅ `transition`، `markUnderReview` و `decide` بدون credential یا با credential نادرست ← `AUTHORIZATION_DENIED` |
| **ترتیب قفل** | ✅ سازمان، سپس claim، در همه‌ی مسیرها |

## ۳. یافته‌ها

### R1 (قرمز) — دور زدن S12-A با attempt کهنه

- `decide()` (`identity-verification-service.ts:82-83`) فقط این دو را می‌سنجد:
  - وضعیت claim در {PENDING، SUSPENDED} باشد
  - وضعیت attempt در {PENDING، UNDER_REVIEW} باشد
- **نمی‌سنجد که attempt پس از تعلیق شروع شده باشد.**
- **سناریو:**
  1. claim در وضعیت PENDING است و دو attempt، A1 و A2، شروع می‌شوند.
  2. A1 با VERIFIED تصمیم می‌گیرد و claim به VERIFIED می‌رود. A2 **باز می‌ماند**.
  3. پلتفرم claim را تعلیق می‌کند.
  4. پلتفرم A2 را VERIFIED تصمیم می‌گیرد و claim **با شواهد پیش از تعلیق** به VERIFIED برمی‌گردد.
- این خلاف S12-A است: «بازگرداندن فقط از راه یک attempt **تازه**».
- attemptهای باز پس از REJECTED، EXPIRED و SUSPENDED هم برای همیشه باز می‌مانند.

### زرد

| # | یافته |
|---|---|
| **Y1** | `decide()` مقدار `decision` را در زمان اجرا بررسی نمی‌کند و فقط به نوع TypeScript تکیه دارد. caller بدون نوع (مثلاً یک مسیر HTTP آینده) می‌تواند مثلاً `EXPIRED` بفرستد |
| **Y2** | `start()` برای سازمان ناهمخوان `VALIDATION_FAILED` می‌دهد (`:29`)، ولی `submit()` خطای `TENANT_MISMATCH` برمی‌گرداند. رفتار W1 باید یکسان باشد |
| **Y3** | آزمون W1 برای `read()` بین سازمان‌ها نیست: عضو سازمان B با `organizationId` سازمان A |
| **Y4** | آزمونی برای `markUnderReview` روی attempt غیر PENDING و `decide` روی attempt تصمیم‌گرفته نیست |
| **Y5** | آزمون S12-A (`spec:111`) دو attempt می‌سازد، چون یک `start` بیرونی دارد و یک `start` درون `verifyClaim`. همین الگو R1 را پنهان می‌کند. آزمون باید دقیقاً یک attempt تازه داشته باشد |

---

## ۴. گام بعدی — G10b2

```
INSTRUCTION_ID: CODEX-20260913-G10B2-CLAIM-VERIFICATION-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10B_CLAIM_VERIFICATION_SLICE.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES — within the owner's G10b authorization; no new owner approval needed
MODE: CODE — on codex/core-prisma-foundation from b3dd604, NEW commits only.

PRECONDITION: GW2 or GW2-P; record the outputs; any failure → STOP. Never touch credentials.

FIXES (all mandatory):
R1 Close the S12-A stale-attempt loophole:
   (a) Whenever a claim changes status (in decide(): VERIFIED/REJECTED; in transition(): SUSPENDED/
       REJECTED/EXPIRED), in the SAME transaction set every OTHER open attempt (PENDING/UNDER_REVIEW)
       of that claim to EXPIRED, with decision_reason "superseded: claim <STATUS>" and decided_at = now.
       This satisfies CHECK migration.sql:669-671.
   (b) Defense in depth: decide() on a SUSPENDED claim requires attempt.startedAt > claim.statusChangedAt;
       otherwise CONFLICT "reinstatement requires a new verification attempt".
   Tests:
   - the exact scenario: A1 and A2 started; A1 VERIFIED; suspend; decide A2 → CONFLICT, and A2 is EXPIRED
   - reinstatement via ONE new attempt started after the suspension → VERIFIED
   - open attempts are EXPIRED after REJECTED/EXPIRED/SUSPENDED transitions
Y1 decide() validates decision ∈ {VERIFIED, REJECTED} at runtime → VALIDATION_FAILED (test via a cast).
Y2 start() uses requireSameOrganization → TENANT_MISMATCH, consistent with submit(); update the test.
Y3 Test: a member of org B reading org A's claim (with organizationId = A) → AUTHORIZATION_DENIED.
Y4 Tests: markUnderReview on a non-PENDING attempt → CONFLICT; decide on an already-decided attempt → CONFLICT.
Y5 The S12-A test uses exactly one new attempt for reinstatement (no double start).
VALIDATION / DATABASE SAFETY: identical to G10b.
- tmpfs 5499, both guards, no .env, volume before/after, rm -f
- tsc passes; the Core specs pass; the FULL V1 suite passes
- LF manifest in mlino2/validation/g10b2/
REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10B2_CLAIM_VERIFICATION_FIXES_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md.
Push only to codex/core-prisma-foundation (if blocked, ask the owner). Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · mlino2/validation/g10b2/** · the report · the handoff (append only)
FORBIDDEN: identical to G10b
- schema, migrations, types.ts, tsconfig, other V1 files, new dependencies
- G10c scope, HTTP, a real platform adapter
- merging to main; V2, _PUSH_STAGING and the root AI_HANDOFF files
- port 5435; credentials
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G10a | هسته‌ی authority | ✅ بسته |
| G10b | claim و verification | ⚠️ APPROVED_WITH_FIXES |
| **G10b2** | **R1 و Y1 تا Y5** | ▶️ صادر شد |
| ادغام G10a و G10b در main | | ⏳ پس از بازبینی G10b2. دروازه‌ی جدا با تصویب مالک |

من کلاد هستم
