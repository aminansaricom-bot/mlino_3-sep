HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1
AUTHOR: CLAUDE
PHASE: Q8_CCR_AND_G14C1_RELEASED_PARALLEL
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner authorized in chat: «CCR ایندکس یکتای پروفایل (Q8) مجاز است، و موازی با این کاری که داری انجام می‌دی اگر کدکس می‌تونه کاری انجام بده پرامپتشو بده تا شروع کنه».
The Guardian released TWO document-only instructions that share this TARGET_HANDOFF_ID:
1. CODEX-20260917-Q8-PROFILE-UNIQUE-INDEX-CCR-001 on a new branch codex/core-profile-unique-ccr: a schema CCR for a partial unique index on business_profiles(organization_id) WHERE publication_status = 'PUBLISHED', sections P1-P7, no code and no DB.
2. CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-001 on a new branch codex/v2-public-consumer-design: the V2 consumer design, sections C1-C8, covering the read path, verification before cache replacement, TTL fail-closed freshness (with the signed stale flag explicitly NOT the freshness source), the field mapping including the absent category, floor_level, building_id and products, the draft-1 mock, atomic cache swap and the G14c-2 test list.
Why they are safe in parallel: separate branches and worktrees, separate deliverable files, no Docker, no database, no product code. The only shared file is mlino2/HANDOFF/HANDOFF_STATE.md, which both only append to; the Guardian resolves any append conflict at the second merge by keeping both entries.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_CCR_AND_G14C1_PARALLEL.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is ca3e6c1 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T18:10:00+03:30
NEXT_ACTION: Codex executes either or both instructions with TARGET_HANDOFF_ID=HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1. If only one can run at a time, Q8 first. Then Guardian review of each, then the owner decides each next step.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-G14B-MERGE
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's Q8 approval and the parallel-work authorization

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is ca3e6c1 (the G14b merge record). The runtime was verified after that merge and is unchanged.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
