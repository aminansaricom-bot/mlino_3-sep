HANDOFF_ID: HANDOFF-20260917-GUARDIAN-G15-2-REVIEW
AUTHOR: CLAUDE
PHASE: G15_2_ACCEPTED_OWNER_MERGE_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G15-2 (538342b and def9039; published by the Guardian) is ACCEPTED.
Verified:
- scope exactly as allowed: the CCR (status and decisions only), a new core/transaction.ts, errors.ts, error-adapter.ts, ten services, a new spec, evidence, report, append-only handoff. No schema, migration, Dockerfile, tsconfig, package or HTTP change. The worktree is clean.
- grep acceptance: $transaction( appears only at transaction.ts:22.
- Each service diff is only an import plus the call swap; lock order, the mapCoreDatabaseError catch and business logic are unchanged.
- The helper: defaults maxWait 5000 / timeout 10000, env-overridable, an invalid value throws (fail-closed), and there is no retry.
- Error contract: TRANSACTION_RETRYABLE added; P2028, P2034, 40001, 40P01 map to it; other mappings unchanged; unknown stays INTERNAL_ERROR.
- Tests: T1 options; T2 a deterministic pool-exhaustion test (connection_limit=1, a held connection, maxWait 200) expecting TRANSACTION_RETRYABLE; T3 the mapping table plus preserved mappings. All four claimed test names exist.
- Acceptance: 10 consecutive runs on fresh disposable DBs, all 29/29 suites and 368/368 tests, including runs at 52% and 66% CPU, the load range that failed in G14a-2c. tsc exit 0. All containers removed; volumes unchanged; no secret committed.
- Honest reporting: an earlier acceptance attempt exited 1 because of a cleanup bug; it was recorded, fixed and rerun.
Environment note: Docker Desktop is not running at review time, so the live DB was not re-checked. G15 never touched it; the Guardian will re-verify after the merge when Docker is up.
Trial merge into main 919329d: tree 7f23b013, clean, 49 files, +6542/-28.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_G15_2_TRANSACTION_ROBUSTNESS.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only; no merge executed). main is 919329d before this commit; the G15 branch is at def9039 on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T09:30:00+03:30
NEXT_ACTION: The owner decides (suggested: "merge of G15 into main authorized"). Then the Guardian merges --no-ff (the tree must equal 7f23b013 if main has not moved), records it, and re-verifies the runtime when Docker is running. G14b and G14c remain separately approved steps.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260915-OWNER-APPROVAL-G15-2
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260915-G15-2-TRANSACTION-ROBUSTNESS-IMPLEMENTATION-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read def9039 from the shared object store: scope, the grep acceptance, the full helper, the service diffs, the spec, the report, the ten run logs and the manifest. Trial merge-tree against origin/main.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the Codex branch ref published unchanged (a fast-forward from 1dc6818 to def9039). No merge, credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
