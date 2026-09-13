# اجرای نگهبان — ادغام G10d، ثبت S15-A و صدور G10e

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Architecture Guardian

**تصویب مالک:** مالک در گفت‌وگوی مستقیم با Claude نوشت «تصویبش ک[ن]»، در پاسخ به بخش ۴ بازبینی `20260914_CLAUDE_REVIEW_G10D_OFFER_SLICE.md` (commit `0588c8f`). یعنی:

| # | تصمیم | وضعیت |
|---|---|---|
| **الف** | ادغام G10d در main | مجاز است |
| **ب** | G10e (Evidence، آخرین برش Core) | مجاز است |
| **ج** | **S15-A** | DECIDED: Evidence **فقط افزودنی** است. پس از ثبت، محتوا تغییر نمی‌کند و فقط تأیید انسانی و وضعیت پایانی (EXPIRED یا WITHDRAWN) مجازند. اصلاح یعنی Evidence تازه و withdraw نسخه‌ی قبلی |

## ۱. ادغام G10d: انجام شد

| مورد | مقدار |
|---|---|
| **merge commit** | `cebdb5f1e69f110ef4f405e1493ad30dbc8118b0` |
| **والدها** | `0588c8f` (main) و `f962e12` (`codex/core-g10d-offer`) |
| **درخت** | `832bb3853d68b7e407eb0f7a1eeb1b20279895a9` = خروجی `merge-tree` نگهبان (پیش‌نمایش و اجرا) |
| **دامنه** | تازه: `offer-service.ts`، `g10d-offer.spec.ts`، گزارش و شواهد `g10d` · تغییر: `publication-service.ts`، `capability-service.ts`، `error-adapter.ts`، spec ‏G10c و Handoff Codex (فقط افزودنی) · **بدون حذف** |
| **push** | محافظت‌شده با `--force-with-lease=main:0588c8f` |
| **runtime** | read-api همان `a07858b3` · DB با StartedAt بدون تغییر و `Restarts=0` · شش migration · `dspr=4` · بدون build، restart، migration یا آزمون |

---

## ۲. دستور G10e

```
INSTRUCTION_ID: CODEX-20260914-G10E-CORE-EVIDENCE-SLICE-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10D-MERGE-G10E
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G10E
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10D_MERGE_G10E_RELEASE.md (this file; PINNED_COMMIT/SHA256 relayed)
DESIGN_REFERENCE: origin/main mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (FINAL) — sections 3, 5, 9, 10
OWNER_DECISIONS: S1–S15 (S12-A, S13-A, S14-A, S15-A), R4; E1–E4 per the G9c review, section 3
MODE: CODE — additive Core, on a NEW branch codex/core-g10e-evidence from origin/main (the head containing merge cebdb5f).

PRECONDITION: GW2 or GW2-P for REVIEW_REFERENCE; record the outputs; any failure → STOP. Never touch credentials.

PATTERNS (mandatory, as in G10a–G10d):
- validateAuthContext before the transaction; lockOrganization(memberOrganizationMissingError) first
- requireMembershipPermission BEFORE any state check; the org only from AuthContext (W1)
- EXPLICIT FIELD ALLOWLIST on every create path: unknown keys → VALIDATION_FAILED
- every error through mapCoreDatabaseError; one statement per line

SCOPE:
1. EvidenceService (implementation/core/evidence-service.ts):
   - record(context, input), permission evidence.manage.
     - allowlist: owner (exactly ONE of capabilityId | offerVersionId), sourceKind, sourceRef, methodKey,
       capturedAt, observedAt, freshUntil, confidence
     - Exactly one owner is required (C7, migration.sql:587-589); zero or two → VALIDATION_FAILED BEFORE
       the DB call.
     - The owner must exist in the SAME org: set BOTH columns of the owner pair
       (capability_id + capability_organization_id, or offer_version_id + offer_version_organization_id),
       CHECK :550-560. A foreign or missing owner → VALIDATION_FAILED.
     - sourceKind ∈ {HUMAN, SYSTEM, AI_INFERRED, INTEGRATION} (runtime-validated).
     - confidence in [0, 1] (CHECK :702-704 → VALIDATION_FAILED).
     - confirmation_status, confirmed_*, evidence_status and created_at are NOT settable (defaults:
       UNCONFIRMED, ACTIVE).
     - Evidence may attach to a published OfferVersion or Capability (no restriction in the schema; do not
       add one).
   - confirm(context, evidenceId), permission evidence.confirm:
     - only ACTIVE + UNCONFIRMED → HUMAN_CONFIRMED with confirmed_by_membership_id = actor,
       confirmed_by_organization_id = org, confirmed_at (CHECK :747-757)
     - already confirmed → CONFLICT; not ACTIVE → CONFLICT
     - there is NO automatic confirmation path; AI_INFERRED is confirmed only through this human call (ADR-0006)
   - expire(context, evidenceId) / withdraw(context, evidenceId), permission evidence.manage:
     - only from ACTIVE → EXPIRED or WITHDRAWN (terminal); any other → CONFLICT
   - S15-A: there is NO update method for evidence content. The DB has no trigger for this, so the service
     is the enforcement point. A correction = record a new evidence + withdraw the old one.
2. OfferService Y1: unlinkCapability on a non-existent link → VALIDATION_FAILED
   "capability link not found" (check before delete; never surface P2025/INTERNAL_ERROR).
3. Y2: in the G10d spec, assert gate_snapshot.grantId = the exact publication.manage grant id for
   OfferVersion PUBLISHED, WITHDRAWN and BOTH rows of REPLACED.
4. Tests (implementation/test/core/g10e-evidence.spec.ts; unique prefix; in-spec guard):
   - record against a capability → ok; against an OfferVersion → ok (including a published one)
   - zero owners / two owners → VALIDATION_FAILED; another org's owner → VALIDATION_FAILED
   - confidence -0.1 / 1.1 → VALIDATION_FAILED; 0 and 1 → ok
   - invalid sourceKind → VALIDATION_FAILED
   - unknown/forbidden keys (confirmationStatus, confirmedByMembershipId, evidenceStatus, organizationId
     override) → VALIDATION_FAILED, and no row is created
   - confirm → HUMAN_CONFIRMED with the actor; re-confirm → CONFLICT; confirming AI_INFERRED works ONLY
     via confirm()
   - expire/withdraw from ACTIVE; any second transition → CONFLICT; confirm on EXPIRED/WITHDRAWN → CONFLICT
   - S15-A: EvidenceService exposes no content-update method (assert the prototype has none besides
     record/confirm/expire/withdraw)
   - W1 cross-org; missing evidence.manage / evidence.confirm → AUTHORIZATION_DENIED
   - Y1 and Y2 tests as above
   - the full existing Core suite still passes

VALIDATION / DATABASE SAFETY:
- a disposable tmpfs postgres on 5499; the global and Core guards; no .env; volume before/after; rm -f
- migrate deploy, build, the Core specs, the FULL V1 suite
- evidence + LF manifest (path  sha256) in mlino2/validation/g10e/
- every test the report claims must exist and be named in the report (the Guardian greps them)
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10E_CORE_EVIDENCE_SLICE_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-CORE-G10E).
Push ONLY to codex/core-g10e-evidence (if blocked, ask the owner). Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · mlino2/validation/g10e/** · the report · the handoff (append only)
FORBIDDEN:
- schema, migrations, types.ts, tsconfig; test/setup-env.ts and test/test-db-guard*; other V1 files;
  new dependencies
- HTTP, real platform/AC-2 adapters, the V2 read contract (S9), Offer lifecycle
- ANY push to main or other branches
- port 5435 or mlino-v1-local-db; running anything in _PUSH_STAGING; credentials
```

## ۳. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10d** | **Offer و OfferVersion و انتشار** | ✅ **در main ادغام شد** (`cebdb5f`) |
| S15 | ویرایش‌پذیری Evidence | ✅ **S15-A** |
| **G10e** | **Evidence، به‌علاوه‌ی Y1 و Y2** | ▶️ صادر شد |
| ادغام G10e | | ⏳ پس از بازبینی، با تأیید کوتاه مالک |
| پس از G10e | لایه‌ی service هسته کامل می‌شود. گام‌های بعدی (قرارداد خواندن V2 ‏S9، HTTP و adapter واقعی AC-2 و پلتفرم) هر کدام تصمیم جدای مالک لازم دارند | ⏳ |

من کلاد هستم
