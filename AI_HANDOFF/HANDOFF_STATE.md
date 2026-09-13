HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C3-REVIEW
AUTHOR: CLAUDE
PHASE: G10C_CLOSED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G10c3 (codex/core-g10c-profile-capability; 58888e3 test; 908e956 docs) is accepted.
- A real end-to-end CAPABILITY publication test: PUBLISHED with correct target ids and gate_snapshot, then ALREADY_PUBLISHED, republish, WITHDRAWN at the published revision, a re-withdraw CONFLICT, and publish again.
- publication-service.ts is unchanged (no defect). The report explicitly corrects the G10c2 Y1 claim.
- Environment clean: live DB untouched; volume lists identical; 25 suites and 327 tests; manifest 1/1.
- merge-tree 610755b is clean. The G10c merge scope is additive (3 services, spec, reports, evidence) plus error-adapter.ts and an append-only handoff; no schema, config or V1 change; no deletions.
The G10c slice is CLOSED.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C3_CAPABILITY_PUBLICATION_TESTS.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G10c branch is at 908e956. main is 18e6772 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T05:10:00+03:30
NEXT_ACTION: The owner decides, in one message:
(a) "merge of G10c into main is authorized";
(b) G10d authorized: the Offer/OfferVersion slice — OfferService (key unique, locked version_number, R2 immutable, capability links before the first publish); PublicationService for OfferVersion (null revision, single-tx replacement with an Offer lock, S4/E2, gate_snapshot); allowlists; no Evidence/HTTP;
(c) S14: the Guardian recommends S14-A, where any public-field change on a confirmed capability resets it to UNCONFIRMED in the same tx; if approved, it is implemented within G10d.
Then the Guardian merges G10c (--no-ff, guarded), records the decisions, and issues G10d targeting the merge-record handoff.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C2-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G10C3-CAPABILITY-PUBLICATION-TESTS-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the G10c branch is at 908e956.
- Scope; core/ unchanged; read the spec diff; grepped the report correction.
- Test logs, volume before/after; manifest 1/1; live DB and read-api.
- merge-tree with the full scope and the non-additive list.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
