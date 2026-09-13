HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10E-REVIEW
AUTHOR: CLAUDE
PHASE: G10E_CLOSED_CORE_SERVICE_LAYER_COMPLETE_PENDING_MERGE
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G10e (codex/core-g10e-evidence; 1b2a2b6 and ddbea98; base main 16910a6) is accepted.
- EvidenceService:
  - allowlist; exactly one owner, checked before the DB (C7); owner looked up in the same org with both pair columns set
  - sourceKind and confidence validated at runtime
  - confirm only ACTIVE+UNCONFIRMED via evidence.confirm; no auto-confirm path, including AI_INFERRED (ADR-0006)
  - expire/withdraw only from ACTIVE, terminal
  - S15-A: no content-update method (the whole class was read)
- Y1: unlinking a missing link → VALIDATION_FAILED, with link behavior unchanged.
- Y2: gate_snapshot grantId asserted for OfferVersion PUBLISHED, WITHDRAWN and both REPLACED rows.
- All 9 claimed tests exist.
- Environment clean: live DB untouched; volume lists identical; 27 suites and 346 tests; manifest 4/4; merge-tree 4e4d33d clean.
- Minor: the S15-A test is weak (it only checks for a method named 'update'); the code is correct.
With the G10e merge, the Core service layer (G10a-G10e) is complete but has no consumer (no HTTP, no V2 path).
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10E_EVIDENCE_SLICE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G10e branch is at ddbea98. main is 16910a6 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T07:40:00+03:30
NEXT_ACTION: The owner decides:
(a) "merge of G10e into main is authorized";
(b) the next phase, chosen from:
  1. (recommended) a V2 read-contract design doc (S9), covering the display of claims after suspension/expiry and evidence/capability freshness; document only
  2. an HTTP boundary design for Core
  3. a real AC-2/platform adapter design
Then the Guardian merges G10e (--no-ff, guarded), records the decision, and issues the next instruction targeting the merge-record handoff.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10D-MERGE-G10E
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G10E-CORE-EVIDENCE-SLICE-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the G10e branch is at ddbea98 with merge-base 16910a6.
- Scope and secret scan; read evidence-service in full, the offer-service diff, both specs and the report; matched the test names against the logs.
- Volume before/after; manifest 4/4; live DB and read-api; merge-tree.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
