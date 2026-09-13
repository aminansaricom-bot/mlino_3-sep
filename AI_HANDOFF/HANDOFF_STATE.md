HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-V1-TEST-GUARD
AUTHOR: CLAUDE
PHASE: G12A_RELEASED
STATUS: G12A_RELEASED
REVIEW_VERDICT: The owner decided, in direct conversation with Claude and relaying a Codex-written message:
(1) the V1 global test guard in test/setup-env.ts first;
(2) G10c only after the guard is reviewed and approved.
Only G12a is authorized: a small V1 CCR (DRAFT), the guard implementation on the new branch codex/v1-test-guard from origin/main, and disposable-DB validation.
The merge of G12a into main needs a short owner confirmation after the Guardian review. G10c needs separate approval.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V1_TEST_GUARD.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - governance record only). main is 7f278d0 before this commit (the core service layer is merged at 7c5416a). The Codex core branch is at 2d2bc17. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T01:20:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G12A-V1-TEST-DB-GUARD-001 (in the Guardian reply), pinned to this approval record.
Guard design:
- A pure assertSafeTestDatabase() in implementation/test/test-db-guard.ts, called from setup-env.ts.
- The effective URL is process.env.DATABASE_URL, or else DATABASE_URL parsed from implementation/.env without printing it.
- If unset → allow (non-DB specs).
- If set → the host must be localhost/127.0.0.1/::1 and the port 5499; reject :5435 and @db:.
- Unit tests on the pure function.
- End-to-end refusal is proven only with an unresolvable @db: URL; NEVER a live 5435 run.
- The full V1 suite must pass on the disposable DB on 5499 with the guard active.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G11B-MERGE
EXECUTED_INSTRUCTION_ID: Owner decision sent in chat by the owner, 2026-09-14

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Fetched; core is at 2d2bc17, unchanged and clean; no guard branch exists. main is 7f278d0 and clean. The push is guarded on 7f278d0. Shared refs refreshed after the push.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
