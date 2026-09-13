HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10D-REVIEW
AUTHOR: CLAUDE
PHASE: G10D_CLOSED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G10d (codex/core-g10d-offer; b07f543 and f962e12; base main cf1da02; pushed after the Guardian's pre-push check) is accepted.
- OfferService: allowlists; offer_key unique; version_number under an Offer FOR UPDATE lock; no update/delete for OfferVersion (R2); capability links only while UNPUBLISHED, blocked after publish and after withdraw.
- OfferVersion publication:
  - org lock, then the permission check, then Offer/version locks
  - null content_revision
  - outcomes PUBLISHED / ALREADY_PUBLISHED (no insert) / WITHDRAWN
  - REPLACED: withdraw the old version, then publish the new one, in one tx
  - the concurrent v2/v3 publish leaves exactly one PUBLISHED
- S14-A resets only on an actual change and is tested both ways.
- The G10c spec change reflects the approved scope; nothing is weakened.
- All 10 claimed tests exist by name.
- Environment clean: live DB untouched; volume lists identical; 26 suites and 337 tests; manifest 6/6; merge-tree 3e2d438 clean.
Minor items carried to G10e:
- Y1: unlinking a nonexistent link → P2025 → INTERNAL_ERROR.
- Y2: OfferVersion tests do not assert the gate_snapshot grantId.
The G10d slice is CLOSED.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10D_OFFER_SLICE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G10d branch is at f962e12. main is cf1da02 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T06:30:00+03:30
NEXT_ACTION: The owner decides, in one message:
(a) "merge of G10d into main is authorized";
(b) G10e authorized: the Evidence slice (the last Core slice).
  - EvidenceService: record with exactly one owner (C7) in the same org; source_kind enum; confidence in [0,1]; allowlist.
  - Human confirm via evidence.confirm (ADR-0006; AI_INFERRED is never auto-confirmed).
  - ACTIVE → EXPIRED or WITHDRAWN, both terminal.
  - Plus Y1 and Y2.
(c) S15: the Guardian recommends S15-A, where evidence is append-only (content immutable after creation; only confirmation and terminal status change; a correction is new evidence plus withdrawing the old).
Then the Guardian merges G10d (--no-ff, guarded), records the decisions, and issues G10e targeting the merge-record handoff.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C-MERGE-G10D
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G10D-CORE-OFFER-SLICE-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Pre-push inspection of the local commits.
- After the push: fetched; remote f962e12 matches.
- Read offer-service, the publication/capability/adapter diffs, both specs, and the report; matched the claimed test names against the logs.
- Volume before/after; manifest 6/6; live DB and read-api; merge-tree.
- Read the Evidence enum values from origin/main for the G10e proposal.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
