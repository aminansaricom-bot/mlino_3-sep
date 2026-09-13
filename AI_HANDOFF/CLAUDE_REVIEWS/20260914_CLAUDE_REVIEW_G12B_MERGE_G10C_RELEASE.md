# اجرای نگهبان — ادغام G12b، ثبت تصمیم‌های مالک و صدور G10c

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Architecture Guardian

**تصویب مالک:** مالک در گفت‌وگوی مستقیم با Claude نوشت «تصویبش کن»، در پاسخ به بخش ۴ بازبینی `20260914_CLAUDE_REVIEW_G12B_V1_TEST_DB_GUARD_HARDENING.md` (commit `bf9e54b`). یعنی:

| # | تصمیم | وضعیت |
|---|---|---|
| **الف** | ادغام G12b در main | مجاز است |
| **ب** | G10c (برش Profile و Capability) | مجاز است، با دامنه‌ی همان بخش ۴ |
| **ج** | **S13-A** | DECIDED: پروفایل فقط به claim **VERIFIED** همان سازمان پیوند می‌خورد. نمایش عمومی پیوند پس از تعلیق یا انقضای claim در برش خواندن V2 (S9) تصمیم‌گیری می‌شود |

## ۱. ادغام G12b: انجام شد

| مورد | مقدار |
|---|---|
| **merge commit** | `e7ffce1712bfbed41230fc6ec5a26eeb3918fbe6` |
| **والدها** | `bf9e54b` (main) و `a3aff63` (`codex/v1-test-guard-hardening`) |
| **درخت** | `cdbac19ae5cf1fa749e0a8521bc6917a69edeb34` = خروجی `merge-tree` نگهبان (پیش‌نمایش و اجرا) |
| **دامنه** | `test-db-guard.ts` و spec آن (تغییر)، CCR (تغییر)، شواهد `g12b`، گزارش و Handoff Codex (فقط افزودنی) · **بدون حذف** · `setup-env.ts` بدون تغییر |
| **push** | محافظت‌شده با `--force-with-lease=main:bf9e54b` |
| **runtime** | read-api همان `a07858b3` · DB با StartedAt بدون تغییر و `Restarts=0` · شش migration · `dspr=4` · بدون build، restart، migration یا آزمون |

**محافظ آزمون V1 اکنون کامل است** (G12a و G12b). قاعده‌ی ماندگار باز هم برقرار است: **در `_PUSH_STAGING` آزمون اجرا نشود.**

---

## ۲. دستور G10c

```
INSTRUCTION_ID: CODEX-20260914-G10C-CORE-PROFILE-CAPABILITY-SLICE-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12B-MERGE-G10C
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G10C
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12B_MERGE_G10C_RELEASE.md (this file; PINNED_COMMIT/SHA256 relayed)
DESIGN_REFERENCE: origin/main mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (FINAL) — sections 3, 5, 7, 8, 9
OWNER_DECISIONS: S1–S12 (S12-A), R4, S13-A; E1–E4 as defined in the G9c review, section 3
MODE: CODE — additive Core, on a NEW branch codex/core-g10c-profile-capability from origin/main
      (the head that contains merge e7ffce1).

PRECONDITION: GW2 or GW2-P for REVIEW_REFERENCE; record the outputs; any failure → STOP. Never touch credentials.

PATTERNS (reuse exactly, as in G10a/G10b):
- validateAuthContext before the transaction
- lockOrganization(memberOrganizationMissingError) first in every member transaction
- requireMembershipPermission BEFORE any state check
- the org only from AuthContext (W1)
- every error through mapCoreDatabaseError (CoreDomainError passes through)
- one statement per line

SCOPE:
1. BusinessProfileService (implementation/core/business-profile-service.ts):
   - create (business_profile.manage). Never set publication_status, published_content_revision or
     content_revision; the initial guard requires UNPUBLISHED.
   - updatePublicFields (business_profile.manage): only name, description, latitude, longitude,
     address_text, contact_information, links, business_hours. D6: the DB bumps content_revision;
     the service NEVER writes content_revision or projection fields.
   - linkIdentityClaim / unlinkIdentityClaim (business_profile.manage), per S13-A:
     - the claim must belong to the same org AND have claim_status VERIFIED, else VALIDATION_FAILED
     - set or clear BOTH business_identity_claim_id and business_identity_claim_organization_id
       (pair CHECK migration.sql:538-542)
     - C4 (business_profile_claim_unique, :505-507) → CONFLICT "identity claim already linked to a profile"
     - linking is a public-field change, so D6 bumps the revision
   - Lifecycle-status transitions are OUT of scope.
2. CapabilityService (implementation/core/capability-service.ts):
   - create (capability.manage): capability_key unique per org
     (capability_organization_key_unique → CONFLICT "capability key already exists").
     Never set projection or revision fields.
   - updatePublicFields (capability.manage): only name, short_description, category_key, audience (D6).
   - confirm (capability.confirm): UNCONFIRMED → HUMAN_CONFIRMED with confirmed_by_membership_id = actor,
     confirmed_by_organization_id = org, confirmed_at (CHECK :735-745, ADR-0006).
     Re-confirming → CONFLICT "capability already confirmed".
     Confirmation is not a public field, so no revision bump. Resetting confirmation when public fields
     change is NOT implemented (a future owner decision; note it in the report).
   - Status/audience lifecycle transitions beyond updatePublicFields are OUT of scope.
3. PublicationService (implementation/core/publication-service.ts), BusinessProfile and Capability
   targets ONLY (OfferVersion is a later slice):
   - publish(context, target, reason) and withdraw(context, target, reason), with publication.manage.
   - Inside the transaction: lockOrganization, then the permission check, then lock the target row
     with a parameterized raw query: SELECT ... FROM <table> WHERE id=$1 AND organization_id=$2 FOR UPDATE
   - R1 publish:
     - Publication.content_revision = the target's CURRENT content_revision, read under the lock
     - allowed from UNPUBLISHED or WITHDRAWN (any current revision), or from PUBLISHED only when current
       content_revision > published_content_revision
   - S4/E2 idempotency: if PUBLISHED and published_content_revision == current content_revision → return
     { outcome: "ALREADY_PUBLISHED", revision } WITHOUT inserting a Publication.
   - withdraw:
     - requires PUBLISHED; Publication.content_revision = published_content_revision
     - withdraw when not PUBLISHED → CONFLICT "target is not published"
   - Insert ONLY a Publication row; the trigger (migration.sql:931-1009) applies the projection. The
     service never updates publication_status, published_content_revision or published_at directly.
   - The Publication row sets:
     - event_kind; exactly one target pair (id + organization_id)
     - performed_by_membership_id = actor; permission_key = 'publication.manage'; reason (non-empty)
     - gate_snapshot = { grantId: <the ACTIVE grant id used>, policyVersion: 'core-publication-v1' } (S7)
   - "invalid publication transition" (P0001) → CONFLICT via the adapter.
4. error-adapter.ts: add constraint mappings for business_profile_claim_unique and
   capability_organization_key_unique (the P2002 target may list fields; match both the index name and
   the field set, as done for C1).
5. Tests (implementation/test/core/**, prefix "g10c-", in-spec guard; the global guard stays active):
   - D6: each public field bumps the revision; a non-public update does not; the service never sends
     content_revision
   - initial guard: create yields UNPUBLISHED; a direct projection write via prisma → mapped error
   - R1:
     - publish, then republish at the same revision → ALREADY_PUBLISHED with no new row
     - edit then publish → the new revision is published; Publication count 2
     - withdraw then publish again
     - withdraw when not published → CONFLICT
   - concurrency: a concurrent edit and publish → the invariant published_content_revision ≤
     content_revision holds, and the Publication.content_revision equals the published one
   - gate_snapshot holds the exact grant id and policyVersion
   - W1 cross-org; missing permission for each operation → AUTHORIZATION_DENIED
   - S13-A: linking a PENDING/SUSPENDED/REJECTED claim → VALIDATION_FAILED; VERIFIED → ok;
     C4 duplicate link → CONFLICT; unlink clears both fields
   - capability_key duplicate → CONFLICT; confirm, then re-confirm → CONFLICT; the confirmation fields
     satisfy the CHECK
   - OfferVersion targets are rejected by PublicationService (VALIDATION_FAILED)

VALIDATION / DATABASE SAFETY (as in G10b2):
- a disposable tmpfs postgres on 5499; the global guard and the Core guard active; no .env
- docker volume ls before/after; rm -f
- migrate deploy, build, the Core specs, and the FULL V1 suite
- evidence and an LF manifest (path  sha256) in mlino2/validation/g10c/
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10C_CORE_PROFILE_CAPABILITY_SLICE_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-CORE-G10C).
Push ONLY to codex/core-g10c-profile-capability (if blocked, ask the owner). Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · mlino2/validation/g10c/** · the report
         · the handoff (append only)
FORBIDDEN:
- schema, migrations, types.ts, tsconfig
- test/setup-env.ts and test/test-db-guard*
- other V1 files; new dependencies
- Offer/OfferVersion/Evidence services, HTTP, a real platform or AC-2 adapter
- ANY push to main or other branches
- port 5435 or mlino-v1-local-db; running anything in _PUSH_STAGING; credentials
```

## ۳. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G12a و G12b | محافظ سراسری آزمون V1 | ✅ **هر دو در main** (`ebf404c` و `e7ffce1`) |
| S13 | پیوند پروفایل با claim | ✅ **S13-A** |
| **G10c** | **Profile، Capability و انتشار آن‌ها** | ▶️ صادر شد |
| ادغام G10c | | ⏳ پس از بازبینی، با تأیید کوتاه مالک |
| G10d و بعد | Offer/OfferVersion (+ انتشار) · Evidence | ⏳ |

من کلاد هستم
