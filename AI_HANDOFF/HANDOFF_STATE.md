HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A2-REVIEW
AUTHOR: CLAUDE
PHASE: G14A2_REVIEWED_G14A2B_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G14a-2 (39d9184, 5228644 and 9cb193e; published by the Guardian). The product code is CORRECT and matches the approved CCR:
- the migration exactly per C2; N1 accepted by Prisma 5.22.0
- one schema field
- allowlisted columns read in the same FOR UPDATE; no row spreads
- DbNull for WITHDRAWN and REPLACED
- ALREADY_PUBLISHED inserts nothing
- OQ-4 A-prime sanitization
Other checks:
- All 14 claimed tests exist, and the hashes match.
- The test container is removed.
- Runtime unchanged: 6 migrations, publications=0, no published_content column on the local DB.
Test fixes needed:
- T1: c7-01/02/12 use rejects.toBeTruthy; they must assert the CHECK name, with positive controls.
- T2: c7-07 must assert "publications are append-only".
- T3: c7-10 does not prove that the migration file refuses a non-empty DB. Rename it, and add a reproducible validation script and log under mlino2/validation/g14a2 (failed migrate deploy, a failed _prisma_migrations row, no column).
- T4: capture the deploy error text.
Released CODEX-20260914-G14A2B-PUBLISHED-CONTENT-TEST-HARDENING-001: tests and evidence only; local commits.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2_PUBLISHED_CONTENT_IMPLEMENTATION.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G14a branch is at 9cb193e on origin. main is 0110a16 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T14:30:00+03:30
NEXT_ACTION: Codex executes G14a-2b with TARGET_HANDOFF_ID=HANDOFF-20260914-GUARDIAN-G14A2-REVIEW. Then:
1. A short Guardian check and publication of the branch.
2. The owner package: merge G14a into main, then G14a-3 (local-DB apply with a backup), approved separately.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A2
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G14A2-PUBLISHED-CONTENT-IMPLEMENTATION-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Read the commits from the shared object store; no git config was written. The scope is 7 files, and the tree is clean.
- Read the full code diff, the spec and the report. Checked Docker: no test container remains, and the read-api and DB are unchanged.
- The local DB, checked read-only with metadata and counts: 6 migrations, publications=0, no published_content column.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the Codex branch ref published unchanged (a fast-forward from ee25ead to 9cb193e). No credential, Docker write, database write or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
