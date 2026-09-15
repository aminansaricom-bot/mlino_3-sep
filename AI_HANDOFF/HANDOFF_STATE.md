HANDOFF_ID: HANDOFF-20260915-GUARDIAN-G15-1-REVIEW
AUTHOR: CLAUDE
PHASE: G15_1_ACCEPTED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G15-1 (commits 91060e5..1dc6818; published by the Guardian as the new branch codex/core-g15-transaction-robustness) is accepted. The CCR (838947a8, DRAFT) is an adequate decision basis.
Verified:
- scope: only the CCR in implementation/; evidence, report and handoff are append-only
- no leak; the worktree is clean
- three diagnostic settings (default; maxWait 10s/timeout 15s; connection_limit=1) ALL green: 28/28 suites and 360/360 tests, no P2028/P2034
- host CPU 11-28%; longest org-lock hold 19 ms; the recorded HEAD is correct
- runtime unchanged (7 migrations)
Reading of the evidence:
- P2028 is load-dependent. It did not reproduce at low load, whereas G14a-2c saw 6/6 at 30-58% CPU.
- Pool size alone is not the cause (pool=1 was green).
- The likely mechanism is transaction start (connection acquire plus BEGIN) exceeding the default maxWait of 2s under host load.
- Gap: acquire time was not measured. G15-2 must reproduce P2028 deterministically by construction.
Guardian owner package:
- approve the CCR direction (option A: a shared tx helper)
- S-G15-1-1 = A: a new TRANSACTION_RETRYABLE code
- S-G15-1-2 = maxWait 5000 ms / timeout 10000 ms, env-overridable, the same for tests and runtime (differs from the CCR's "C, open")
- S-G15-1-3 = A: no retry in Core (differs from the CCR's B; Core tx are mutations)
- S-G15-1-4 = A: explicit connection_limit in tests only
- authorize G15-2 on disposable DBs only
G15-2 acceptance:
1. Every $transaction goes through the helper.
2. P2028/P2034 map to TRANSACTION_RETRYABLE, with a deterministic P2028 test.
3. 10 consecutive green full runs with committed logs.
4. No schema or migration.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260915_CLAUDE_REVIEW_G15_1_TRANSACTION_ROBUSTNESS_CCR.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). main is d20ad7c before this commit; the G15 branch is at 1dc6818 on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-15T11:00:00+03:30
NEXT_ACTION: The owner decides (suggested: "CCR approved with Guardian recommendations (S1=A, S2=5/10s, S3=A, S4=A); G15-2 authorized"). Then the Guardian records the decisions and releases G15-2.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260915-GUARDIAN-G14A3-COMPLETE-G15-1
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260915-G15-1-CORE-TRANSACTION-ROBUSTNESS-CCR-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read 1dc6818 from the shared object store (scope, the leak grep, the full CCR, the report). Verified the per-setting totals in the evidence. Docker and runtime checked read-only.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the new Codex branch published unchanged (an empty lease). No credential, Docker write, database write or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
