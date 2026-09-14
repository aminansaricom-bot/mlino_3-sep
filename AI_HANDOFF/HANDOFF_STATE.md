HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A2B-REVIEW
AUTHOR: CLAUDE
PHASE: G14A2B_REVIEWED_G14A2C_DIAGNOSIS_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G14a-2b (bcdcdeb, 8572d83 and a4d9a75; published by the Guardian) accepted:
- T1: CHECK-name assertions with positive controls.
- T2: the append-only trigger message.
- T3: a reproducible migration-refusal script and log (deploy exit 1, a failed _prisma_migrations row, 0 published_content columns).
- T4: the visible error is "current transaction is aborted", not P0001; enough for the G14a-3 runbook.
No product-code change; containers removed; runtime unchanged.
The full suite is RED: 354/360. There are 6 concurrency failures (G10a2 x2, G10b, G10c, G10d x2), all INTERNAL_ERROR from an unmapped DB error in the second locked transaction.
Hypothesis: environmental Prisma P2028/P2034 under host load, pre-existing and not a G14a regression:
- 4 of the 5 services are untouched
- 360/360 passed in G14a-2
- the default 5s/2s transaction limits
- error-adapter drops the cause
Unproven, so the MERGE GATE IS CLOSED. Released CODEX-20260914-G14A2C-CONCURRENCY-DIAGNOSIS-001:
- baseline (ee25ead) vs head (a4d9a75) throwaway copies with temporary raw-error instrumentation
- 3 full runs each plus 5 focused runs
- evidence only; no fixes
Side finding: the P2028/P2034 mapping gap is robustness debt, deferred to a separate CCR.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2B_TEST_HARDENING.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G14a branch is at a4d9a75 on origin. main is ee8bf49 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T15:30:00+03:30
NEXT_ACTION: Codex executes G14a-2c with TARGET_HANDOFF_ID=HANDOFF-20260914-GUARDIAN-G14A2B-REVIEW. Then the Guardian classifies:
- If the failures are pre-existing, the owner package: merge G14a, G14a-3, and a robustness CCR.
- If it is a regression, a fix round.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A2-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G14A2B-PUBLISHED-CONTENT-TEST-HARDENING-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read the commits from the shared object store; no git config was written. Read the spec diff, both scripts and both logs in full, the report section, error-adapter.ts, prisma-client.ts, and the failing race tests. Docker: no test container remains; runtime unchanged.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the Codex branch ref published unchanged (a fast-forward from 9cb193e to a4d9a75). No credential, Docker write, database write or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
