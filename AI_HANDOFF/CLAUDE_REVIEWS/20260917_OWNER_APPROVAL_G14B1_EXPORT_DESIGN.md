# ثبت تصویب مالک — G14b-1: سند طراحی تولیدکننده‌ی export امضاشده در V1

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_G15_MERGE.md` (commit `9318295`)

## ۱. متن تصویب مالک

> «G14b-1 (سند طراحی export امضاشده) مجاز است.»

**دامنه: فقط سند.** هیچ کد، schema، migration، کلید واقعی یا تماس با DB زنده مجاز نیست. G14b-2 (پیاده‌سازی) و G14c (مصرف‌کننده‌ی V2) هر کدام تصویب جدا می‌خواهند.

## ۲. مبنای تغییرنکردنی

قرارداد داده‌ای از قبل نهایی و در main است و **در این مرحله تغییر نمی‌کند**: `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md`، به‌ویژه بخش ۷ (DTO ‏`public-business.v1`)، بخش ۸ (S17-B)، بخش ۱۰ (ترتیب و تازگی) و بخش ۱۳ (برنامه‌ی G14b).

تصمیم‌های مرتبطی که قبلاً گرفته شده‌اند: S16-A، S17-B، S18-A، S19-A1، S20-A، S21-B، S22-A، S23-B، S24-B، S25، S26 و OQ-4 ‏A′.

---

## ۳. دستور Codex — G14b-1

```
INSTRUCTION_ID: CODEX-20260917-G14B1-PUBLIC-EXPORT-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-G14B1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V1-PUBLIC-EXPORT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md (PINNED_COMMIT/SHA256 relayed)
DECISION: owner-approved G14b-1 = a DESIGN DOCUMENT for the signed V1 public export producer.
MODE: DOCUMENT ONLY - a NEW branch codex/v1-public-export from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/v1-public-export. LOCAL commits only; do NOT push (the Guardian publishes).

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

DELIVERABLE (new): mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md, status DRAFT. Every claim cites origin/main file:line.
The public-business.v1 contract is FIXED: do not redesign it, add fields to it, or reopen any S decision.

E1 SOURCE OF TRUTH AND SELECTION
   - content comes ONLY from publications.published_content (S19-A1); no live-row content read
   - the selection rule: per target, the latest PUBLISHED with no later WITHDRAWN, ordered by occurred_at then id
   - the live fail-closed gates that can only HIDE a record: claim status (S16-A), capability
     confirmation HUMAN_CONFIRMED (S18-A), freshness (S20-A), and Organization / BusinessProfile / Offer
     lifecycleStatus = ACTIVE
   - a query sketch in SQL or Prisma pseudocode (no application code), with the indexes it relies on
E2 ENVELOPE AND RECORD: restate the FINAL DTO from the read-contract section 7 exactly, and map each field to its
   snapshot key or metadata source. State explicitly that category, floor_level, building_id and products are absent.
E3 SIGNING AND KEYS (owner decisions; give options and ONE recommendation each)
   - algorithm options: Ed25519 detached signature, HMAC-SHA256 with a shared secret, or another justified choice;
     compare trust model, V2 verification effort and rotation
   - key storage options (an environment variable, an OS/secret store, a file outside the repo), key_id semantics,
     rotation and revocation, and what V2 needs to verify
   - HARD RULES to state in the document: no private key or secret in the repository, in logs, in evidence or in
     any export artifact; the design must not require Codex to ever read a real key
E4 CANONICALIZATION: the exact, reproducible byte rules the signature covers - key ordering, decimal and number
   formatting, timestamp format, unicode and newline handling, and how snapshot_id and generated_at participate.
   Two runs over identical data must produce identical bytes.
E5 EXECUTION SHAPE (options plus ONE recommendation)
   - a manual CLI script, a scheduled task, or a long-running service; where the artifact is written; atomic write
     (temp file plus rename); retention of previous exports; failure and partial-write behavior
   - how S23-B (withdraw visible within 5 minutes) is met: a periodic cycle, an immediate invalidation signal, or
     both; state the cycle length implied
   - explicitly: the producer NEVER writes to the database
E6 business_hours AND terms SCHEMAS (OQ-4 A-prime): propose the versioned schema for each, and the behavior when
   stored JSON does not conform (reject the record, drop the field, or fail the export), with ONE recommendation.
E7 SECURITY AND PRIVACY: the S22-A contact allowlist; no membership, grant, actor, claim internals or raw evidence;
   tenant isolation; artifact file permissions; what may and may not appear in logs.
E8 TEST PLAN for G14b-2 (list only; disposable DB on 5499): published, withdrawn and replaced targets; an
   unconfirmed capability hidden; stale evidence; archived organization or profile and a retired offer hidden;
   byte-identical output for identical input; signature verification passing and failing on tampering; the
   withdraw-to-export latency behavior.
E9 OPEN QUESTIONS for the owner, each with options, consequences and ONE recommendation. Decide none.

REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14B1_PUBLIC_EXPORT_DESIGN_REPORT.md
- a table: E1-E9 -> section -> done / not done (reason)
- the LF sha256 (git show bytes) of the design document; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES (exactly three):
- mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md (new)
- AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14B1_PUBLIC_EXPORT_DESIGN_REPORT.md (new)
- mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any code, test, schema, migration, Prisma or config change; any Docker, database or npm execution
- any real key or secret; any change to the V2 branch or to the FINAL read-contract document
- reopening any decided S item; deciding any E9 question
- mlino-v1-local-db, port 5435, _PUSH_STAGING, any push, git config
```

**پس از G14b-1:** بازبینی نگهبان، سپس بسته‌ی تصمیم مالک درباره‌ی امضا، کلید، شکل اجرا و چرخه، و سپس مجوز G14b-2.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a و G15 | snapshot و مقاوم‌سازی تراکنش | ✅ کامل و در main |
| **G14b-1** | **سند طراحی export امضاشده** | ▶️ **تصویب شد و صادر شد** |
| G14b-2 و G14c | پیاده‌سازی export و مصرف‌کننده‌ی V2 | ⏳ تصویب جدا |

من کلاد هستم
