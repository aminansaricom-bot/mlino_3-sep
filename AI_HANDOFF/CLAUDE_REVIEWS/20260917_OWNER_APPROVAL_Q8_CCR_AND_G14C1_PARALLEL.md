# ثبت تصویب مالک — CCR ایندکس یکتای پروفایل (Q8) و کار موازی G14c-1

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_G14B_MERGE.md` (merge `714639c`، ثبت `ca3e6c1`)

## ۱. متن تصویب مالک

> «CCR ایندکس یکتای پروفایل (Q8) مجاز است، و موازی با این کاری که داری انجام می‌دی اگر کدکس می‌تونه کاری انجام بده پرامپتشو بده تا شروع کنه»

**برداشت نگهبان:** مالک دو چیز را تصویب کرده است:
1. **CCR ایندکس یکتای جزئی (Q8)** — فقط سند.
2. **یک کار موازی برای Codex** — نگهبان **G14c-1**، یعنی سند طراحی مصرف‌کننده‌ی V2 را انتخاب می‌کند، چون هر دو **فقط سند** هستند، به فایل‌های یکدیگر دست نمی‌زنند، به دیتابیس وصل نمی‌شوند و هیچ‌کدام کد تولیدی تغییر نمی‌دهند.

**چرا این دو با هم امن‌اند:** شاخه‌ها جدا، پوشه‌ی خروجی جدا، بدون Docker و بدون DB. تنها نقطه‌ی تماس، فایل `mlino2/HANDOFF/HANDOFF_STATE.md` است که هر دو فقط به آن **اضافه** می‌کنند؛ تعارض احتمالی هنگام ادغام دوم را نگهبان با نگه‌داشتن هر دو ورودی حل می‌کند.

**هر دو دستور TARGET_HANDOFF_ID یکسان دارند**، چون هر دو از همین ثبت آزاد می‌شوند.

---

## ۲. دستور اول — CCR ایندکس یکتای پروفایل (Q8)

```
INSTRUCTION_ID: CODEX-20260917-Q8-PROFILE-UNIQUE-INDEX-CCR-001
TARGET_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-CORE-PROFILE-UNIQUE
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_CCR_AND_G14C1_PARALLEL.md (PINNED_COMMIT/SHA256 relayed)
DECISION: owner-approved Q8 CCR = a schema CCR DOCUMENT only.
MODE: DOCUMENT ONLY - a NEW branch codex/core-profile-unique-ccr from origin/main at the pinned commit, in a NEW
      worktree C:/Users/galexy/mlino code/core-profile-unique. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

DELIVERABLE (new): implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PROFILE_PUBLISHED_UNIQUE.md
(status DRAFT; follow CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md; every claim cites origin/main file:line)
P1 PROBLEM: business_profiles has a unique index only on (id, organization_id), so an organization may hold several
   PUBLISHED profiles, while public-business.v1 carries exactly one business per record. Today the export producer
   hides the whole organization fail-closed (implementation/public-export/builder.ts) - state the user-visible cost.
P2 EXACT DDL for a NEW migration (proposed name; never edit an existing migration):
   - a preflight that refuses if any organization already has more than one PUBLISHED profile, with the exact query
   - CREATE UNIQUE INDEX ... ON business_profiles (organization_id) WHERE publication_status = 'PUBLISHED'
   - state whether Prisma can express this (partial unique indexes are raw SQL) and what, if anything, changes in
     schema.prisma; if nothing changes, say so explicitly and explain how drift is avoided
   - BEGIN/COMMIT and LOCK choice, consistent with the published_content migration
P3 BEHAVIOR IMPACT on the publish path: publishing a second profile in an organization now raises 23505.
   - name the constraint and propose the error mapping in core/error-adapter.ts (a CONFLICT with a clear message);
     do NOT implement it here
   - confirm that withdraw frees the slot, and that REPLACED does not apply to profiles
   - state the effect on the existing Core tests
P4 DATA: how to verify the local database has no violation before applying; cite the G7b and G14a-3 pattern. Run NO
   query yourself.
P5 ROLLBACK: a forward migration dropping the index; the effect on _prisma_migrations.
P6 TESTS required later: the constraint rejects a second published profile; withdraw then publish another succeeds;
   the error maps to CONFLICT; the export producer stops skipping such organizations.
P7 OPEN QUESTIONS with options and ONE recommendation each. Decide none.
REPORT (new): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_Q8_PROFILE_UNIQUE_INDEX_CCR_REPORT.md
- a table P1-P7 -> section -> done/not done; the LF sha256 of the CCR; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES (exactly three): the CCR (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN: any code, schema.prisma, migration, test or config change; any Docker, database, npm or Prisma run; the
V2 branch; the FINAL read contract; deciding any open question; _PUSH_STAGING; any push; git config
```

## ۳. دستور دوم (موازی) — G14c-1: سند طراحی مصرف‌کننده‌ی V2

```
INSTRUCTION_ID: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_CCR_AND_G14C1_PARALLEL.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner authorized a parallel task; the Guardian selected G14c-1 = a DESIGN DOCUMENT for the V2 consumer.
MODE: DOCUMENT ONLY - a NEW branch codex/v2-public-consumer-design from origin/main at the pinned commit, in a NEW
      worktree C:/Users/galexy/mlino code/v2-public-consumer. LOCAL commits only; do NOT push.
      Do NOT modify the V2 branch codex/v2-intent-flow-foundation; read it only.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

DELIVERABLE (new): mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md (status DRAFT; every claim cites file:line, using
origin/main for V1 and origin/codex/v2-intent-flow-foundation for V2). The public-business.v1 contract is FIXED.
C1 READ PATH: where V2 obtains the artifact (a shared directory, a copied file, or a fetch), what it must never do
   (no database access, no V1 module import), and the failure modes of each option; ONE recommendation.
C2 VERIFICATION before acceptance: contract_version, the key_id allowlist and trust bundle, Ed25519 signature over
   the same canonical bytes (cite implementation/public-export/signing.ts and canonical.ts on origin/main), and
   rejection of any artifact that fails any check. State that verification happens BEFORE the cache is replaced.
C3 FRESHNESS (Q4): the TTL evaluated against generated_at, the fail-closed behavior when the artifact is missing,
   unreadable, unsigned, expired or older than the current cache, and an explicit statement that the signed `stale`
   field inside the artifact is NOT the freshness source (it is always false at build time); propose the TTL value.
C4 MAPPING public-business.v1 to what V2 needs: a field-by-field table to the existing V2 directory types
   (contract.ts on the V2 branch), naming exactly what V2 must stop expecting - category, floor_level, building_id
   and products are absent by S25 and S26 - and what V2 does instead (empty, mock-labelled, or a UI change).
C5 draft-1 MOCK: how the mock is retired or kept clearly labelled so real and mock data can never be confused.
C6 CACHE AND ATOMICITY: how V2 swaps its in-memory snapshot atomically, what happens to in-flight reads, and what
   users see while no valid artifact exists.
C7 TESTS for G14c-2 (list only): accept a valid artifact; reject a tampered one; reject an unknown key_id; reject
   an expired artifact; keep serving the previous valid cache when a new artifact is invalid; show nothing when no
   valid artifact has ever been accepted; the mapping of every DTO field.
C8 OPEN QUESTIONS with options and ONE recommendation each. Decide none.
REPORT (new): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14C1_V2_CONSUMER_DESIGN_REPORT.md
- a table C1-C8 -> section -> done/not done; the LF sha256 of the design document; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES (exactly three): the design document (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN: any code, test, schema, migration or config change; any Docker, database or npm run; ANY change to the V2
branch or to the FINAL read contract; deciding any open question; _PUSH_STAGING; any push; git config
```

## ۴. ترتیب کار

هر دو مستقل‌اند و می‌توانند هم‌زمان اجرا شوند. اگر Codex فقط یکی را هم‌زمان می‌تواند اجرا کند، **اول Q8** و سپس G14c-1.

پس از هر تحویل: بازبینی نگهبان، سپس تصمیم مالک برای ادامه‌ی هر مسیر.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15 و G14b | snapshot، تراکنش و تولیدکننده‌ی export | ✅ در main |
| **CCR ایندکس یکتای پروفایل (Q8)** | سند | ▶️ **صادر شد** |
| **G14c-1** | سند طراحی مصرف‌کننده‌ی V2 | ▶️ **صادر شد (موازی)** |
| پیاده‌سازی Q8 · G14c-2 · کلید و زمان‌بندی | | ⏳ تصویب جدا |

من کلاد هستم
