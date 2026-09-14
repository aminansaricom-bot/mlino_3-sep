HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A1
AUTHOR: CLAUDE
PHASE: G14A1_CCR_AUTHORIZED_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved G14a-1 directly in chat: «G14a-1 (سند CCR ستون published_content) مجاز است». The scope is a CCR document only; no migration, code, test or DB.
Guardian points the CCR must cover:
- the snapshot is read under the same FOR UPDATE as lockTarget (publication-service.ts:86-90)
- INSERT only (the C12 trigger); ALREADY_PUBLISHED inserts nothing
- the OfferVersion path, including REPLACED, with a null content_revision
- content frozen in the snapshot vs LIVE fail-closed eligibility gates (confirmation, freshness, claim), which can only hide a record
- a snapshot_version key and a jsonb_typeof CHECK
Released CODEX-20260914-G14A1-PUBLISHED-CONTENT-CCR-001: new branch codex/core-g14a-published-content from main; workstream HANDOFF-20260914-CORE-G14A.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is 17faff1 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T11:40:00+03:30
NEXT_ACTION: Codex executes G14a-1 with TARGET_HANDOFF_ID=HANDOFF-20260914-OWNER-APPROVAL-G14A1. Then:
1. Guardian review.
2. The owner approves the CCR.
3. G14a-2 implementation (DB on 5499) needs separate approval.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13-MERGE
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's G14a-1 approval

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 17faff1. Read publication-service.ts, the publications DDL and triggers in migration.sql, and the existing CCR folder on main to shape the instruction.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
