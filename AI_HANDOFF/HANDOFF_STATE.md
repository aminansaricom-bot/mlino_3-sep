HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A1-REVIEW
AUTHOR: CLAUDE
PHASE: G14A1_REVIEWED_G14A1B_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G14a-1 is local and unpushed; Codex's push was refused with "dubious ownership": 31f3c22 and 9b64813, CCR 44539a3e. The CCR design is sound:
- a new migration with a fail-closed preflight
- a CHECK compatible with OfferVersion and REPLACED
- a versioned, typed per-target allowlist
- the snapshot read under the same FOR UPDATE
- content kept separate from live eligibility
- OQ-1..OQ-5, all with recommendation A, which the Guardian agrees with
Fixes needed:
- Y1: target/target_id/content_revision duplicated in the JSON with no equality constraint. Remove them, or add CHECKs.
- Y2: missing live gates: Organization, BusinessProfile and Offer lifecycleStatus must be ACTIVE.
- Y3: Prisma.DbNull vs JsonNull for WITHDRAWN.
- Y4: the failed-migration runbook (migrate resolve) and an optional LOCK.
- Y5: rollback as a forward migration.
- Z1: the enum citation.
Released CODEX-20260914-G14A1B-PUBLISHED-CONTENT-CCR-FIXES-001: one LOCAL commit on 9b64813 with no push attempt; the Guardian publishes the branch.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A1_PUBLISHED_CONTENT_CCR.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). main is f578499 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T12:30:00+03:30
NEXT_ACTION: Codex executes G14a-1b with TARGET_HANDOFF_ID=HANDOFF-20260914-GUARDIAN-G14A1-REVIEW. Then:
1. A short Guardian check, and the Guardian publishes codex/core-g14a-published-content.
2. The owner package: CCR approval, OQ-1..OQ-5, and G14a-2 authorization.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A1
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G14A1-PUBLISHED-CONTENT-CCR-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read the commits from the shared object store, read-only; no git config was written. The scope is 3 files, +410/-0, and the tree is clean. Read the full CCR and report. Spot-checked the citations: G7b, the Dockerfile, tsconfig, publication-service, and the schema enums and lifecycle fields.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
