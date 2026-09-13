# بازبینی نگهبان معماری — G10b2: اصلاح برش claim و verification

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10B2_CLAIM_VERIFICATION_FIXES_REPORT.md` (LF sha256 `b54ba61f…888d`)
**commitها:**

| commit | محتوا |
|---|---|
| `cfe376f` | کد، آزمون و شواهد |
| `f4d1135` | manifest |
| `139449c` و `65168f1` | گزارش و Handoff |

## حکم: `APPROVED_NEXT_STEP`

**برش claim و verification (G10b) بسته شد.**
- راه دور زدن S12-A بسته شده است و دقیقاً با سناریوی A1/A2 آزموده شده.
- Y1 تا Y5 اعمال شده‌اند.
- دو نکته‌ی کوچک (M1 و M2) پیش از ادغام اصلاح می‌شوند. هر دو در کار آماده‌سازی ادغام (G11a) آمده‌اند.

**گام بعدی:** آماده‌سازی ادغام G10a و G10b در main، شامل CCR و آزمون سازگاری روی ادغام آزمایشی. خود ادغام به تصویب مالک نیاز دارد.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `b3dd604..65168f1`: فقط دو service، `repositories.ts`، spec، شواهد، گزارش و Handoff · بدون حذف در Handoff و گزارش‌های پیشین · بدون secret |
| **main و V2** | ✅ `b52f149` و `f4d326f`، بدون تغییر |
| **GW2-P** | ✅ fetch با `SEC_E_NO_CREDENTIALS` شکست خورد. هر سه بررسی `EXIT 0` بودند و hash برابر pin بود (`precondition.log`) |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · claims و verifications = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · بدون volume بی‌نام تازه |
| **پایگاه یک‌بارمصرف** | ✅ حذف `mlino-g10b2-postgres` · volume قبل و بعد یکسان و `NO_VOLUME_CHANGE` |
| **آزمون** | ✅ Core: ۴ suite و ۵۰ آزمون · کل V1: ۲۳ suite و ۲۹۹ آزمون · build پاک · یک شکست اولیه در سناریوی آزمون، شفاف گزارش و اصلاح شده |
| **manifest و hash گزارش** | ✅ ‏۴ از ۴ · `b54ba61f…` = Handoff |

## ۲. وضعیت اصلاح‌ها

| # | وضعیت | شاهد |
|---|---|---|
| **R1-الف** | ✅ | `expireOpenVerificationAttempts` (`repositories.ts:16-26`) در **همان تراکنش** اجرا می‌شود: در `transition()` پیش از به‌روزرسانی claim و در `decide()` پس از آن، که attempt تصمیم‌گرفته دیگر باز نیست. فقط PENDING و UNDER_REVIEW را هدف می‌گیرد، پس با trigger تغییرناپذیری تداخلی ندارد. CHECK ‏`:669-671` را برای EXPIRED برآورده می‌کند |
| **R1-ب** | ✅ | claim در وضعیت SUSPENDED ← `attempt.startedAt > claim.statusChangedAt`، وگرنه `CONFLICT "reinstatement requires a new verification attempt"` |
| **آزمون R1** | ✅ | سناریوی دقیق: A1 و A2 · A1 با VERIFIED تصمیم می‌گیرد و A2 همان لحظه `EXPIRED` با `superseded: claim VERIFIED` می‌شود · تعلیق · تصمیم روی A2 ← CONFLICT · attempt تازه ← VERIFIED. به‌علاوه: attemptهای باز هنگام گذار به EXPIRED منقضی می‌شوند |
| Y1 | ✅ | بررسی `decision` در زمان اجرا + آزمون با cast |
| Y2 | ✅ | `start()` ← `requireSameOrganization` ← `TENANT_MISMATCH` |
| Y3 | ✅ با M1 | آزمون `read` بین سازمان‌ها ← `AUTHORIZATION_DENIED`، ولی از راه پارامتر تازه (M1) |
| Y4 | ✅ | `markUnderReview` روی attempt غیر PENDING و `decide` دوباره ← CONFLICT |
| Y5 | ✅ | فقط یک attempt تازه برای بازگرداندن |

## ۳. نکته‌های پیش از ادغام (مانع بستن برش نیستند)

| # | نکته |
|---|---|
| **M1** | برای آزمون Y3، پارامتر اختیاری `organizationId` به `IdentityClaimService.read()` اضافه شده است (`identity-claim-service.ts:41`). **امنیتی نیست:** مجوز با Membership فعال در همان سازمان سنجیده می‌شود. ولی شکل W1 را می‌شکند، چون سازمان باید **فقط** از `AuthContext` بیاید. پارامتر حذف شود و آزمون با context عضوِ B که `organizationId` آن سازمان A است نوشته شود |
| **M2** | **دو ساعت متفاوت:** `startedAt` از `now()` پیش‌فرض DB می‌آید و `statusChangedAt` از `new Date()` برنامه. اگر ساعت میزبان DB و برنامه اختلاف داشته باشد، R1-ب ممکن است بازگرداندن مشروع را رد کند. خطا در جهت امن است و R1-الف راه دور زدن را بسته نگه می‌دارد. `start()` مقدار `startedAt` را از همان ساعت برنامه تنظیم کند |

## ۴. بررسی معماری برش G10b (تجمیعی)

| محور | نتیجه |
|---|---|
| **S11** | ✅ REJECTED و EXPIRED پایانی‌اند · ارسال دوباره = ردیف تازه |
| **S12-A** | ✅ بازگرداندن فقط با attempt تازه · attemptهای کهنه با هر تغییر وضعیت منقضی می‌شوند |
| **ADR-0010** | ✅ همه‌ی گذارهای claim و تصمیم‌ها فقط با actor تأییدشده‌ی پلتفرم انجام می‌شوند؛ اعضا راهی ندارند |
| **W1** | ✅ پس از M1 |
| **یکپارچگی** | ✅ تصمیم، claim و انقضای attemptهای دیگر در یک تراکنش · C1 · تغییرناپذیری |

---

## ۵. گام بعدی — G11a: آماده‌سازی ادغام G10a و G10b در main

این کار آماده‌سازی است، **نه ادغام**:
- اصلاح M1 و M2 در همان دامنه‌ی G10b
- پیش‌نویس CCR
- آزمون سازگاری روی یک ادغام آزمایشی در worktree موقت، که هرگز push نمی‌شود

**تصویب مالک برای G11a لازم نیست. خود ادغام (G11b) با تصویب مالک انجام می‌شود.**

```
INSTRUCTION_ID: CODEX-20260913-G11A-CORE-SERVICE-MERGE-PREP-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10B2_CLAIM_VERIFICATION_FIXES.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_NEXT_STEP — M1/M2 fall within the G10b authorization; CCR and trial merge are preparation only
MODE: CODE (M1/M2) + DOCUMENT (CCR) + TRIAL MERGE in a temp worktree (never pushed).
      On codex/core-prisma-foundation from 65168f1.

PRECONDITION: GW2 or GW2-P; record the outputs; any failure → STOP. Never touch credentials.

STEPS:
1. M1: remove the organizationId parameter from IdentityClaimService.read() (the org comes only from
   the AuthContext). Rewrite the Y3 test with a context built from org B's member but with
   organizationId = org A → AUTHORIZATION_DENIED.
2. M2: IdentityVerificationService.start() sets startedAt explicitly from the same application clock
   used for statusChangedAt/decidedAt. Add a one-line code comment stating the single-clock rule.
3. Validate the core branch head exactly as in G10b2:
   - disposable tmpfs 5499, both guards, no .env, volume before/after, rm -f
   - build; the Core specs; the full V1 suite
4. Trial merge (compatibility, NOT the real merge):
   - Create a temp worktree from origin/main (record its SHA).
   - git merge --no-ff --no-commit origin/codex/core-prisma-foundation; record the conflicts
     (expected: none).
   - In that temp worktree, on a NEW disposable tmpfs DB with the same guards: migrate deploy
     (expected: no pending migration beyond the six), build, the Core specs, the FULL V1 suite.
   - Record `git diff --stat origin/main` of the merged tree, and the full list of paths under
     implementation/ that the merge adds or changes.
   - Then `git merge --abort` (or discard), `git worktree remove --force`, `git worktree prune`.
     NOTHING from the trial merge is committed or pushed.
5. CCR draft (new file, core branch):
   implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_SERVICE_LAYER.md
   Status: DRAFT — owner approval required. Content:
   - scope: the exact additive file list under implementation/core/** and implementation/test/core/**,
     plus the single tsconfig include line; no schema, migration, shared-contract or HTTP change
   - runtime impact: http/server does not import core/ (show a grep); the tsc build includes core/;
     no read-api rebuild is required
   - decisions implemented: S1–S12, R4, E1–E4 (by reference to the final design)
   - test safety: the Core specs carry an in-spec guard (localhost:5499 only). Pre-existing hazard:
     V1 specs run unscoped deleteMany() and _PUSH_STAGING/implementation/.env exists; never run
     npm test there
   - rollback: revert the merge commit (no data or schema to undo)
   - evidence: G10a–G10b2 and G11a validation folders and reports, with commit SHAs
   - an LF sha256 (git show bytes) of every file in scope, at the proposed merge head
EVIDENCE: mlino2/validation/g11a/ (precondition, validation logs, trial-merge log, merged diffstat,
          LF manifest).
REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G11A_CORE_SERVICE_MERGE_PREP_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md.
Push only to codex/core-prisma-foundation (if blocked, ask the owner). Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · the CCR file (new) · mlino2/validation/g11a/**
         · the report · the handoff (append only) · a temp worktree outside the repo (removed afterwards)
FORBIDDEN:
- ANY commit or push to main
- pushing the trial merge
- schema, migrations, types.ts, tsconfig (no further change), other V1 files, new dependencies
- G10c scope; V2, _PUSH_STAGING and the root AI_HANDOFF files
- port 5435 or mlino-v1-local-db; any credential action
```

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G10a | هسته‌ی authority | ✅ بسته |
| **G10b (b و b2)** | **claim و verification** | ✅ **بسته** |
| **G11a** | **آماده‌سازی ادغام: M1، M2، CCR، ادغام آزمایشی** | ▶️ صادر شد |
| G11b | ادغام G10a و G10b در main | ⏳ پس از بازبینی G11a و **تصویب مالک** (CCR و ادغام) |
| G10c و بعد | Profile/Capability · Offer · Evidence · Publication | ⏳ |

من کلاد هستم
