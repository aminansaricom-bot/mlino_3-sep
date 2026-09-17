# ثبت تصویب مالک — CCR ایندکس یکتای پروفایل و مجوز Q8-2

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_PROFILE_UNIQUE_CCR.md` (commit `3a9a683`) · CCR ‏`1fa0fcd0` در `codex/core-profile-unique-ccr` @ `e74191f`

## ۱. متن تصویب مالک

> «CCR ایندکس یکتای پروفایل تصویب شد (OQ-Q8-1=A، OQ-Q8-2=A، OQ-Q8-3=A)؛ Q8-2 مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **CCR** | `CONTRACT_CHANGE_REQUEST_PROFILE_PUBLISHED_UNIQUE.md` با sha256 ‏`1fa0fcd0…` **APPROVED** |
| **OQ-Q8-1** | **A:** اگر preflight سازمانی با بیش از یک Profile منتشرشده بیابد، migration **متوقف** می‌شود · هیچ اصلاح خودکار داده‌ای مجاز نیست · انتخاب Profile «برنده» تصمیم جدا با شواهد است |
| **OQ-Q8-2** | **A:** ساخت ایندکس در همان تراکنش با قفل `ACCESS EXCLUSIVE` · بدون `CONCURRENTLY` |
| **OQ-Q8-3** | **A:** نگاشت خطا و migration **در یک بسته** منتشر می‌شوند، پس از آزمون شکل واقعی خطا |
| **Q8-2** | **مجاز:** ساخت migration، نگاشت خطا و آزمون‌ها، فقط روی DB یک‌بارمصرف |

**خارج از دامنه:** اعمال روی `mlino-v1-local-db` (مرحله‌ی Q8-3) · ادغام در main · هر تغییر در V2.

⚠️ **یادآوری برای پس از ادغام Q8:** با ورود این migration به main، دوباره ریسک «G7 ناخواسته» فعال می‌شود؛ یعنی هر `docker compose up --build` آن را **بدون backup** روی DB محلی اعمال می‌کند. پس از ادغام تا پایان Q8-3 هیچ compose build انجام نشود.

---

## ۳. دستور Codex — Q8-2

```
INSTRUCTION_ID: CODEX-20260917-Q8-2-PROFILE-UNIQUE-IMPLEMENTATION-001
TARGET_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-CORE-PROFILE-UNIQUE
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_2_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved the CCR with OQ-Q8-1=A, OQ-Q8-2=A, OQ-Q8-3=A and authorized Q8-2.
MODE: IMPLEMENTATION on codex/core-profile-unique-ccr on top of e74191f. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

1 CCR: status DRAFT -> APPROVED; record OQ-Q8-1=A, OQ-Q8-2=A, OQ-Q8-3=A exactly as in section 2 of the pinned
  record. No other CCR change.
2 NEW migration implementation/prisma/migrations/20260917010000_add_business_profile_published_unique/migration.sql,
  byte-for-byte the SQL of CCR section P2: BEGIN; LOCK TABLE business_profiles IN ACCESS EXCLUSIVE MODE; the DO
  preflight raising P0001 when any organization already has more than one PUBLISHED profile; CREATE UNIQUE INDEX
  business_profile_one_published_per_organization_unique ON business_profiles (organization_id) WHERE
  publication_status = 'PUBLISHED'; COMMIT. Never edit an existing migration.
3 NO change to schema.prisma. PROVE the absence of drift on a disposable DB: after applying all migrations, run
  `prisma migrate status` and a `prisma migrate diff` from the disposable database to the schema datamodel, and
  commit both outputs. If Prisma proposes dropping or recreating this index -> STOP and report; do NOT edit
  schema.prisma to satisfy the tool.
4 implementation/core/error-adapter.ts: map a 23505 / P2002 whose constraint is
  business_profile_one_published_per_organization_unique to
  conflict('another business profile is already published for this organization'). Place it BEFORE the generic
  unique fallback; every other mapping stays byte-identical. Capture the REAL Prisma error shape in the test first
  and cite it in the report.
5 TESTS in implementation/test/core/ (a new spec; the DB guard applies; 5499 only):
  - the index exists, is valid and carries the expected predicate (pg_indexes plus pg_index.indisvalid)
  - publishing a second profile in the same organization fails with CONFLICT and the new message, and no
    Publication row is left behind
  - two concurrent publishes of different profiles in one organization: exactly one succeeds, the other maps to
    CONFLICT, never INTERNAL_ERROR
  - withdraw the first, then publishing the second succeeds
  - other unique conflicts keep their existing messages (at least the capability key and the active membership)
  - the export builder still produces one record for an organization with a single published profile
6 VALIDATION: tsc --noEmit; the focused spec; then the FULL suite on a FRESH disposable tmpfs container on
  127.0.0.1:5499, THREE times consecutively, all green, with committed logs.
REPORT (new): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_Q8_2_PROFILE_UNIQUE_IMPLEMENTATION_REPORT.md
- the files changed; the migrate status and diff outputs; the real Prisma error shape; a table of every test name
  (each must exist in the spec) with its result; the three run totals; the tsc result; container cleanup
- the LF sha256 of the migration, error-adapter.ts, the spec and the logs; the GW2/GW2-P outputs
Evidence in mlino2/validation/q8-2/ (redacted; record the real worktree HEAD).
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- the CCR (status and decisions only)
- the new migration folder
- implementation/core/error-adapter.ts (the new mapping only)
- one new spec in implementation/test/core/
- mlino2/validation/q8-2/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- schema.prisma, any existing migration, any other service, public-export, Dockerfile, tsconfig, package files
- applying anything to mlino-v1-local-db or port 5435 (that is Q8-3); docker compose; other containers or volumes
- the V2 branch; the FINAL read contract; _PUSH_STAGING; any push; git config
```

## ۴. کار موازی G14c-1 — دوباره صادر شد (نسخه‌ی ۰۰۳)

Codex هنوز آن را شروع نکرده است و این ثبت شناسه‌ی Handoff را عوض می‌کند. **محتوای دستور همان است؛ فقط TARGET و pin تازه‌اند:**

```
INSTRUCTION_ID: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-003
TARGET_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_2_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
SUPERSEDES: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-001 and -002 (same content; only the target handoff and pin changed)
DECISION: the owner authorized this parallel task; the Guardian selected the V2 consumer design.
MODE: DOCUMENT ONLY - a NEW branch codex/v2-public-consumer-design from origin/main at the pinned commit, in a NEW
      worktree C:/Users/galexy/mlino code/v2-public-consumer. LOCAL commits only; do NOT push.
      Do NOT modify the V2 branch codex/v2-intent-flow-foundation; read it only.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

DELIVERABLE (new): mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md (status DRAFT; every claim cites file:line, using
origin/main for V1 and origin/codex/v2-intent-flow-foundation for V2). The public-business.v1 contract is FIXED.
C1 READ PATH: where V2 obtains the artifact (a shared directory, a copied file, or a fetch), what it must never do
   (no database access, no V1 module import), and the failure modes of each option; ONE recommendation.
C2 VERIFICATION before acceptance: contract_version, the key_id allowlist and trust bundle, the Ed25519 signature
   over the same canonical bytes (cite implementation/public-export/signing.ts and canonical.ts on origin/main),
   and rejection of any artifact failing any check. Verification happens BEFORE the cache is replaced.
C3 FRESHNESS: the TTL evaluated against generated_at; fail-closed behavior when the artifact is missing,
   unreadable, unsigned, expired or older than the current cache; an explicit statement that the signed `stale`
   field is NOT the freshness source (the producer always writes false); propose the TTL value.
C4 MAPPING public-business.v1 to what V2 needs: a field-by-field table to the existing V2 directory types
   (contract.ts on the V2 branch), naming exactly what V2 must stop expecting - category, floor_level, building_id
   and products are absent by S25 and S26 - and what V2 does instead.
C5 draft-1 MOCK: how it is retired or kept clearly labelled so real and mock data can never be confused.
C6 CACHE AND ATOMICITY: how V2 swaps its in-memory snapshot atomically, in-flight reads, and what users see while
   no valid artifact exists.
C7 TESTS for G14c-2 (list only): accept a valid artifact; reject a tampered one; reject an unknown key_id; reject
   an expired one; keep serving the previous valid cache when a new artifact is invalid; show nothing when no valid
   artifact was ever accepted; the mapping of every DTO field.
C8 OPEN QUESTIONS with options and ONE recommendation each. Decide none.
REPORT (new): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14C1_V2_CONSUMER_DESIGN_REPORT.md
- a table C1-C8 -> section -> done/not done; the LF sha256 of the design document; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES (exactly three): the design document (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN: any code, test, schema, migration or config change; any Docker, database or npm run; ANY change to the V2
branch or to the FINAL read contract; deciding any open question; _PUSH_STAGING; any push; git config
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| CCR ایندکس یکتای پروفایل | | ✅ **APPROVED** · OQ-Q8-1 تا ۳ DECIDED |
| **Q8-2** | **migration، نگاشت خطا و آزمون‌ها** | ▶️ **صادر شد** |
| **G14c-1** | سند طراحی مصرف‌کننده‌ی V2 | ▶️ **دوباره صادر شد (۰۰۳)** |
| ادغام Q8 · Q8-3 · G14c-2 | | ⏳ تصویب جدا |

من کلاد هستم
