HANDOFF_ID: HANDOFF-20260915-OWNER-APPROVAL-G15-2
AUTHOR: CLAUDE
PHASE: G15_CCR_APPROVED_G15_2_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved in chat: «CCR مقاوم‌سازی تراکنش با توصیه‌های نگهبان تصویب شد (S1=A، S2=۵/۱۰ ثانیه، S3=A، S4=A)؛ G15-2 مجاز است.»
The CCR 838947a8 is APPROVED.
- S1=A: TRANSACTION_RETRYABLE, mapped from P2028/P2034.
- S2: maxWait 5000 ms / timeout 10000 ms, env-overridable (CORE_TX_MAX_WAIT_MS / CORE_TX_TIMEOUT_MS), the same for tests and runtime.
- S3=A: no retry in Core.
- S4=A: an explicit connection_limit in the test URL only.
Released CODEX-20260915-G15-2-TRANSACTION-ROBUSTNESS-IMPLEMENTATION-001:
- on codex/core-g15-transaction-robustness from 1dc6818; local commits only
- a new core/transaction.ts helper; every Core $transaction routed through it (grep acceptance)
- the errors.ts code and the error-adapter mapping
- a new spec: T1 options, T2 a deterministic P2028 by construction (pool=1 plus a held tx plus a small maxWait), T3 the adapter unit
- 10 consecutive green full runs, each on a fresh disposable 5499 DB, with committed logs in mlino2/validation/g15-2
- no schema, migration, prisma-client runtime settings, HTTP or retry
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260915_OWNER_APPROVAL_G15_2_TRANSACTION_ROBUSTNESS.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is 1b11dd9 before this commit; the G15 branch is at 1dc6818 on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-15T11:30:00+03:30
NEXT_ACTION: Codex executes G15-2 with TARGET_HANDOFF_ID=HANDOFF-20260915-OWNER-APPROVAL-G15-2. Then:
1. Guardian review: code, grep, the deterministic test, the 10 logs.
2. The owner decides the merge.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260915-GUARDIAN-G15-1-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's G15 decisions and releasing G15-2

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 1b11dd9, and origin/codex/core-g15-transaction-robustness is 1dc6818 (published by the Guardian).

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
