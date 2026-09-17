HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-2
AUTHOR: CLAUDE
PHASE: Q8_CCR_APPROVED_Q8_2_RELEASED_G14C1_REISSUED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved in chat: «CCR ایندکس یکتای پروفایل تصویب شد (OQ-Q8-1=A، OQ-Q8-2=A، OQ-Q8-3=A)؛ Q8-2 مجاز است.»
Decisions: the CCR 1fa0fcd0 is APPROVED; OQ-Q8-1=A (the migration stops if any organization already has more than one published profile; no automatic data repair); OQ-Q8-2=A (build the index inside the transaction with ACCESS EXCLUSIVE, no CONCURRENTLY); OQ-Q8-3=A (ship the error mapping and the migration together, after proving the real error shape).
Released CODEX-20260917-Q8-2-PROFILE-UNIQUE-IMPLEMENTATION-001 on codex/core-profile-unique-ccr from e74191f, local commits only:
- the CCR goes to APPROVED with the decisions
- a new migration 20260917010000_add_business_profile_published_unique, byte-for-byte the CCR P2 SQL
- NO schema.prisma change, with drift proven by committed migrate status and migrate diff outputs; if Prisma proposes dropping the index, STOP
- error-adapter maps only that constraint name to a clear CONFLICT, placed before the generic fallback
- a new core spec: index validity, a second publish rejected as CONFLICT with no orphan Publication, a concurrent double publish leaving exactly one winner, withdraw then publish, other unique messages unchanged, and the export builder still producing one record
- validation: tsc, the focused spec, then three consecutive full-suite runs on fresh disposable DBs with committed logs
Out of scope: applying to mlino-v1-local-db (Q8-3), the merge, and any V2 change.
WARNING after the eventual Q8 merge: the IMPLICIT-G7 risk returns, since a compose up --build would apply this migration without a backup. No compose build between that merge and Q8-3.
G14c-1 still had not started and this record changes the handoff ID again, so it is re-issued as CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-003 with identical content.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_2_IMPLEMENTATION.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is 3a9a683 before this commit; the Q8 branch is at e74191f on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T19:30:00+03:30
NEXT_ACTION: Codex executes Q8-2, and optionally G14c1-003 in parallel, both with TARGET_HANDOFF_ID=HANDOFF-20260917-OWNER-APPROVAL-Q8-2. Then Guardian review of each.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-CCR-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's Q8 decisions and releasing Q8-2

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 3a9a683; origin/codex/core-profile-unique-ccr is e74191f (published by the Guardian); codex/v2-public-consumer-design does not exist yet, locally or on origin.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
