# ثبت تصویب مالک — تصمیم‌های طراحی لایه‌ی service هسته (S1 تا S11 و R4)

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**تصویب‌کننده:** مالک محصول، در گفت‌وگوی مستقیم با Claude. عبارت مالک: «تصویبش کن»، در پاسخ به بسته‌ی تصمیم بخش ۴ بازبینی `20260913_CLAUDE_REVIEW_G9B_RUN2_DESIGN_FIXES.md` (commit `c6667bb`، LF sha256 `2cb32c0a…1a0c`)

**دامنه‌ی تصویب:** همه‌ی توصیه‌های نگهبان بدون تغییر. این‌ها **تصمیم‌های طراحی** هستند و **مجوز پیاده‌سازی نیستند**. G10 پس از بازبینی G9c و تصویب نهایی طراحی آغاز می‌شود.

## تصمیم‌ها (DECIDED)

| # | موضوع | تصمیم مالک |
|---|---|---|
| **S1** | شکل API | service داخلی درون‌فرایندی در V1. HTTP فقط با نیاز اثبات‌شده و تصمیم جداگانه |
| **S2** | AuthContext | یک issuer قراردادی برای MVP. سازمان انتخاب‌شده باید با یک Membership با وضعیت `ACTIVE` برای همان `identity_provider` و `external_subject` در همان سازمان تأیید شود. در غیر این صورت رد یکنواخت |
| **S3** | W2 | W1 طبق D2 قطعی و اجباری است. W2 پذیرفته نمی‌شود و فقط با تصمیم جداگانه‌ی آینده قابل طرح است |
| **S4** | idempotency | ستون تازه و CCR لازم نیست. قرارداد revision خودش idempotent است: publish تکراری با همان revision به نتیجه‌ی «قبلاً در revision N منتشر شده» نگاشت می‌شود (نتیجه‌ی موفق) |
| **S5** | هویت پلتفرم | adapter مستقل برای platform identity reference، با audit صریح |
| **S6** | خطا | خطای domain پایدار و adapter جدا برای transport. SQLSTATE جدا برای هر trigger فقط در CCR آینده |
| **S7** | `gate_snapshot` | شامل شناسه‌ی grant به‌کاررفته و نسخه‌ی policy. `permission_key`، actor و زمان همین حالا ستون‌اند و تکرار نمی‌شوند |
| **S8** | محل کد | داخل `implementation/` (V1) در یک پوشه‌ی مستقل Core، جدا از `value-engines`. ماژول‌ها فقط از مرز عمومی service استفاده می‌کنند |
| **S9** | خواندن V2 | قرارداد نسخه‌دار و فقط‌خواندنی، فقط روی داده‌ی منتشرشده |
| **R4** | bootstrap | AC-2، مالک شناسه‌ی سازمان (PR2)، با قرارداد رسمی. Organization، Membership مؤسس و grantهای founding در **یک تراکنش** و **فقط یک‌بار** برای هر سازمان ساخته می‌شوند |
| **S10** | قاعده‌ی اعطای مجوز | (الف) `member_grant` فقط توسط Membershipی که کلید مدیریت grant **و** خودِ کلید اعطاشده را دارد. (ب) grant به خود ممنوع است. (ج) `founding` فقط در تراکنش bootstrap. (د) revoke آخرین دارنده‌ی کلید مدیریت grant ممنوع است. (هـ) افزودن Membership فقط با کلید مدیریت عضویت. اجرا فعلاً در service با آزمون منفی. guard در DB فقط با CCR آینده در صورت نیاز |
| **S11** | claim | وضعیت‌های REJECTED و EXPIRED **پایانی** هستند. ارسال دوباره یعنی **ردیف claim تازه**. سابقه‌ی رد دست‌نخورده می‌ماند |

## دستور بعدی: G9c (فقط سند)

```
INSTRUCTION_ID: CODEX-20260913-G9C-CORE-SERVICE-LAYER-OWNER-DECISIONS-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE (fix list F1–F9):
  path:          AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9B_RUN2_DESIGN_FIXES.md
  PINNED_COMMIT: c6667bb34bf3ed0424bffbafd11ad0e5d26087f4
  PINNED_SHA256: 2cb32c0a05f5afb655b1b87cd81943727c3629ece9d973891645a3fde6ab1a0c
OWNER_DECISION_REFERENCE (this file):
  path:          AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_CORE_SERVICE_DECISIONS.md
  PINNED_COMMIT / PINNED_SHA256: as relayed by the owner with this instruction
DECISION: APPROVED_NEXT_STEP
MODE: DOCUMENT ONLY — no code, no Prisma, no Docker, no database.

PRECONDITION: try git fetch origin.
- If it succeeds: standard GW2.
- If it fails: GW2-P (three checks) for BOTH references.
- Record the outputs. Any failure → STOP.
- Never touch credentials, token files, git config or credential helpers.

TASK:
Revise mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md in a NEW commit.
1. Section 11: mark S1–S11 and R4 as DECIDED, with the owner decision text from OWNER_DECISION_REFERENCE,
   verbatim in meaning. Also reflect each decision in the body sections it affects:
   - S2 → section 2
   - S4 → section 7 (idempotency outcome)
   - S7 → section 5 (Publication)
   - S8 → section 2 (location)
   - S10 → section 5
   - S11 → section 6
2. Apply F1–F9 from section 5 of REVIEW_REFERENCE exactly:
   F1 Evidence has exactly one owner (C7, migration.sql:587-589).
   F2 Offer audit = created_at, retired_at (no updated_at; schema.prisma:530-545).
   F3 attempts belong to IdentityVerification (identity_verification_claim_attempt_unique, schema.prisma:401).
   F4 fix the citations:
      - Publication membership requirement → schema.prisma:637 (not migration :626-695)
      - grant basis → migration :675-683 (not :658-683)
      - the attempt index name
   F5 permission table adds: create Membership, issue Grant, submit Claim, start Verification,
      human-confirm Capability, human-confirm Evidence. Remove Membership as a claim-status actor
      (the CHECK at :616-625 requires a platform ref).
   F6 state explicitly: the DB does not enforce founding-once/bootstrap-only, grantor-holds-key,
      no-self-grant or the last-admin rule. The service enforces them (S10).
   F7 S3 wording = "W2 in addition to the mandatory W1 (D2)"; decided: not adopted.
   F8 claim table:
      - add VERIFIED→EXPIRED (valid_until)
      - add the C1 identifier conflict on VERIFIED/SUSPENDED (migration :493-495; 23505 → a specific
        domain error, e.g. IdentifierAlreadyClaimed)
      - REJECTED/EXPIRED are terminal (S11)
   F9 the test list adds S10/S11 negatives: self-grant, granting a key not held, founding outside
      bootstrap, revoking the last grant admin, reusing a REJECTED claim.
3. Every schema fact is cited with origin/main file:line. Every SHA-256 comes from git show bytes and is
   pasted from command output.

REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9C_CORE_SERVICE_LAYER_OWNER_DECISIONS_REPORT.md
- precondition outputs
- table: item (S1–S11, R4, F1–F9) → section changed → applied / not applied (with reason)
Append only to mlino2/HANDOFF/HANDOFF_STATE.md, then STOP.

ALLOWED FILES (Core branch only):
  mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md
  AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9C_CORE_SERVICE_LAYER_OWNER_DECISIONS_REPORT.md (new)
  mlino2/HANDOFF/HANDOFF_STATE.md (append only)

FORBIDDEN:
- any code, test, script or config; implementation/**; schema.prisma; migrations; types.ts
- Prisma, Docker or any database connection
- changes to main, V2, _PUSH_STAGING, the root AI_HANDOFF files, ADRs or mlino_book/**
- editing any earlier Codex report
- changing or reinterpreting any owner decision
- starting implementation (G10 needs the G9c review and final owner approval)
- any action on credentials, tokens, git config or credential helpers
```

من کلاد هستم
