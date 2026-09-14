HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-V2-READ-CONTRACT-DECISIONS
AUTHOR: CLAUDE
PHASE: V2_READ_CONTRACT_DECISIONS_APPROVED_G13C_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved the Guardian decision package directly in chat: "توصیه‌های نگهبان تصویب شد (S16 تا S26، با S19-A1)".
DECIDED: S16-A, S17-B, S18-A, S19-A1, S20-A, S21-B, S22-A, S23-B, S24-B, S25, S26.
- S19-A1: publications.published_content JSONB. It is required for PUBLISHED and null for WITHDRAWN via a CHECK. It holds allowlisted public fields only, written in the same tx from the locked row at the requested revision, and is protected by the existing immutability trigger.
- S25: no category or floor/building in v1.
- S26: no products in v1.
These are design decisions only; they are not an implementation authorization.
Released CODEX-20260914-G13C-V2-READ-CONTRACT-FINAL-001 (document only; branch codex/v2-read-contract-design from a35c22b). Scope: D1-D4, N1-N5, P1 (a G14 plan proposal).
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). The G13 branch is at a35c22b. main is 2fa3057 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T09:40:00+03:30
NEXT_ACTION: Codex executes G13c with TARGET_HANDOFF_ID=HANDOFF-20260914-OWNER-APPROVAL-V2-READ-CONTRACT-DECISIONS. Then:
1. Guardian review.
2. A short owner confirmation to merge the final doc into main.
3. G14a-G14c need separate approval.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13B-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's S16-S26 decisions

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 2fa3057, the G13b review commit, and the G13 branch is at a35c22b. Both were verified by fetch before this record.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
