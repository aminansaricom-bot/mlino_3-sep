HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G10B2-REVIEW
AUTHOR: CLAUDE
PHASE: G10B_CLOSED_G11A_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G10b2 (codex cfe376f, f4d1135, 139449c, 65168f1) closes R1:
- open attempts are expired in the same tx on every claim status change
- SUSPENDED requires attempt.startedAt > statusChangedAt
- the exact A1/A2 scenario is tested
Y1-Y5 are applied. Environment clean: GW2-P passed; live DB untouched; tmpfs; NO_VOLUME_CHANGE; 23 suites and 299 tests; manifest 4/4.
The G10b claim/verification slice is CLOSED.
Pre-merge items:
- M1: remove the read() organizationId parameter (W1 shape).
- M2: single clock for startedAt versus statusChangedAt.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10B2_CLAIM_VERIFICATION_FIXES.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The Codex core branch is at 65168f1. main is b52f149 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T23:40:00+03:30
NEXT_ACTION: Give Codex CODEX-20260913-G11A-CORE-SERVICE-MERGE-PREP-001 (section 5 of the review), pinned. No owner approval is needed for the preparation:
- M1 and M2
- the CCR draft CONTRACT_CHANGE_REQUEST_CORE_SERVICE_LAYER.md
- a trial merge of origin/main + core in a temp worktree with the full V1 suite on a disposable DB, never pushed
After the G11a review: the owner approves the CCR and the merge (G11b); the Guardian executes the merge into main.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G10B-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260913-G10B2-CLAIM-VERIFICATION-FIXES-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; remote core is at 65168f1.
- Scope and secret scan.
- Read the full code/test diff since b3dd604.
- Read the precondition GW2-P log, and the initial/final/full test logs.
- Checked volume before-cleanup versus after (identical), the cleanup log, and the manifest (4/4).
- Read-only counts on the live DB; checked anonymous volume CreatedAt; checked the report hash.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
