# ثبت تصویب مالک — CCR مقاوم‌سازی تراکنش، S-G15-1-1 تا ۴، و مجوز G15-2

**تاریخ:** ۱۵ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260915_CLAUDE_REVIEW_G15_1_TRANSACTION_ROBUSTNESS_CCR.md` (commit `1b11dd9`)

## ۱. متن تصویب مالک

مالک مستقیماً در گفت‌وگو نوشت:

> «CCR مقاوم‌سازی تراکنش با توصیه‌های نگهبان تصویب شد (S1=A، S2=۵/۱۰ ثانیه، S3=A، S4=A)؛ G15-2 مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **CCR** | `CONTRACT_CHANGE_REQUEST_CORE_TRANSACTION_ROBUSTNESS.md` در `1dc6818` (sha256 ‏`838947a8…`) **APPROVED** است · جهت: گزینه‌ی A، یعنی یک helper مشترک تراکنش برای همه‌ی `$transaction`های Core |
| **S-G15-1-1** | **A:** کد خطای تازه‌ی `TRANSACTION_RETRYABLE` در `CoreErrorCode` · `P2028` و `P2034` به آن نگاشت می‌شوند، نه به `CONFLICT` |
| **S-G15-1-2** | **`maxWait=5000ms` و `timeout=10000ms`** به‌عنوان پیش‌فرض، قابل تغییر از راه متغیر محیط، و یکسان برای آزمون و runtime |
| **S-G15-1-3** | **A:** هیچ retry خودکاری در Core نیست · caller روی `TRANSACTION_RETRYABLE` تصمیم می‌گیرد |
| **S-G15-1-4** | **A:** `connection_limit` صریح فقط در محیط آزمون · runtime بدون تغییر |
| **G15-2** | **مجاز:** پیاده‌سازی و آزمون، فقط روی DB یک‌بارمصرف روی 5499 · بدون schema و migration · بدون تماس با DB محلی |

---

## ۳. دستور Codex — G15-2

```
INSTRUCTION_ID: CODEX-20260915-G15-2-TRANSACTION-ROBUSTNESS-IMPLEMENTATION-001
TARGET_HANDOFF_ID: HANDOFF-20260915-OWNER-APPROVAL-G15-2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260915-CORE-G15
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260915_OWNER_APPROVAL_G15_2_TRANSACTION_ROBUSTNESS.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved the CCR (838947a8) with S1=A, S2=5000/10000 ms, S3=A, S4=A, and G15-2.
MODE: IMPLEMENTATION on codex/core-g15-transaction-robustness on top of 1dc6818. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

1 CCR: status DRAFT -> APPROVED; record the decisions of section 2 exactly (S1=A, S2=5000/10000 env-overridable, S3=A,
  S4=A). No other CCR change.
2 NEW implementation/core/transaction.ts: one shared helper, e.g.
    runCoreTransaction<T>(db: PrismaClient, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>
  - it calls db.$transaction(fn, { maxWait, timeout })
  - maxWait comes from CORE_TX_MAX_WAIT_MS (default 5000) and timeout from CORE_TX_TIMEOUT_MS (default 10000)
  - an env value that is not a positive integer -> throw at call time (fail-closed; no silent fallback)
  - no retry of any kind (S3=A)
3 Route EVERY interactive $transaction in implementation/core/** through the helper: bootstrap, business-profile,
  capability, evidence, identity-claim, identity-verification, membership, offer, permission-grant and publication
  services. Keep the existing lock order, the .catch(mapCoreDatabaseError) behavior and the service logic
  unchanged. ACCEPTANCE: `grep -rn "\$transaction(" implementation/core` matches ONLY transaction.ts.
4 errors.ts: add 'TRANSACTION_RETRYABLE' to CoreErrorCode. error-adapter.ts: map P2028 and P2034 (and a raw
  PostgreSQL 40001/40P01 if surfaced as a code) to
  new CoreDomainError('TRANSACTION_RETRYABLE', 'transaction could not complete; retry'). Every other mapping is
  unchanged; unknown errors are still INTERNAL_ERROR.
5 Tests: a NEW implementation/test/core/g15-transaction-robustness.spec.ts (the DB guard applies; 5499 only):
  T1 the helper passes { maxWait: 5000, timeout: 10000 } by default; the env override works; an invalid env value
     throws (verify the options received, without timing).
  T2 DETERMINISTIC P2028 BY CONSTRUCTION, independent of host load:
     - a second PrismaClient on the same guarded 5499 URL with connection_limit=1
     - open a transaction that holds its only connection until released
     - with CORE_TX_MAX_WAIT_MS set small (for example 200) for that call, invoke a Core service through that client
     - assert CoreDomainError code TRANSACTION_RETRYABLE (NOT INTERNAL_ERROR); then release and disconnect
     - it must pass on every run
  T3 the error-adapter unit: a PrismaClientKnownRequestError with P2034 -> TRANSACTION_RETRYABLE; P2028 ->
     TRANSACTION_RETRYABLE; an unknown code -> INTERNAL_ERROR; the existing mappings unchanged.
  Existing specs may change ONLY where they assert the old INTERNAL_ERROR for these codes (list every such change).
6 ACCEPTANCE RUNS (S4=A: an explicit connection_limit in the TEST URL only; state the value used, for example 10):
  - TEN consecutive runs of the full V1 + Core suite, EACH on a FRESH disposable tmpfs container on 127.0.0.1:5499
    (migrate deploy, then jest --runInBand), recording CPU load and the container count before each run
  - ALL TEN must be green. Any failure is reported as such (no hiding, no in-test retry)
  - OPTIONAL and informational: one extra run under artificial host CPU load, with the result reported, not gating
  - scripts and COMMITTED logs in mlino2/validation/g15-2/ (redacted: no URL, password or DATABASE_URL value;
    record the real worktree HEAD); remove every container; record the before/after container and volume lists
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260915_CODEX_G15_2_TRANSACTION_ROBUSTNESS_IMPLEMENTATION_REPORT.md
- the files changed; the grep acceptance output; a T1-T3 table with test names (every name must exist in the spec)
- a table of the 10 runs (run, CPU, suites/tests, pass/fail); the optional stress run
- the LF sha256 of transaction.ts, errors.ts, error-adapter.ts, every changed service, the spec and the logs
- the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- the CCR (status and decisions only)
- implementation/core/transaction.ts (new), errors.ts, error-adapter.ts, the ten services above (the transaction
  call only)
- implementation/test/core/g15-transaction-robustness.spec.ts (new), existing specs ONLY per item 5
- mlino2/validation/g15-2/** (new), the report, the handoff append
FORBIDDEN:
- schema.prisma, migrations, foundation/prisma-client.ts runtime settings, Dockerfile, tsconfig, package files, HTTP
- any retry logic; any change to the service business logic or lock order
- mlino-v1-local-db, port 5435, credentials, docker compose, other containers or volumes
- _PUSH_STAGING; any push; git config/safe.directory
```

**پس از G15-2:**
1. بازبینی نگهبان: کد، grep، آزمون قطعی، و ۱۰ لاگ.
2. تصمیم مالک درباره‌ی ادغام در main.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| CCR مقاوم‌سازی تراکنش | | ✅ **APPROVED** · S-G15-1-1 تا ۴ DECIDED |
| **G15-2** | **پیاده‌سازی، با پذیرش ۱۰ اجرای سبز** | ▶️ **صادر شد** |
| ادغام G15 | | ⏳ تصویب جدا |
| G14b و G14c | export ‏V1 و consumer ‏V2 | ⏳ تصویب جدا |

من کلاد هستم
