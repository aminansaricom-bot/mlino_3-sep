HANDOFF_ID: HANDOFF-20260915-GUARDIAN-G14A3-RUN2-REVIEW
AUTHOR: CLAUDE
PHASE: G14A3_RUN2_PREFLIGHT_BUG_RUN3_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G14a-3 run 002 (394bada; published by the Guardian) stopped fail-closed at preflight because of a SCRIPT PARSING BUG, not the DB state.
- The reported 48/48/49/50 are the ASCII codes of '0', '0', '1' and '2'.
- Cause: [int](Psql ...)[0] indexes the first character of a single-row string result (run2 script lines 130-136, 171, 193-197).
- Guardian's independent read-only values: 6 finished migrations, publications=0, published_content columns=0, triggers=13, public CHECKs=29.
- The DB is unchanged: same image and StartedAt, 0 restarts, no g14a backup.
- C0 logged booleans only. No leak: the grep hits are only the redaction regex and http://localhost:3000.
Released CODEX-20260915-G14A3-LOCAL-MIGRATION-003, under the same owner approval and C0 exception:
- F1: PsqlScalarInt/String helpers with a single-row check.
- F2: a self-test against the Guardian values before the backup.
- F3: post expectations of CHECK 30 and triggers 13.
- Steps 2-7 as in -002. Evidence goes to a NEW folder, mlino2/validation/g14a3/run3/.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260915_CLAUDE_REVIEW_G14A3_RUN2_PREFLIGHT_BUG.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). main is b1acef3 before this commit; the G14a branch is at 394bada on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-15T09:00:00+03:30
NEXT_ACTION: Codex executes G14a-3-003 with TARGET_HANDOFF_ID=HANDOFF-20260915-GUARDIAN-G14A3-RUN2-REVIEW. Then:
1. Guardian review with a read-only DB check.
2. The Guardian publishes the branch.
3. The Guardian releases G15-1.
NO compose build or v1-migrate until G14a-3 is done.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A3-DBURL
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G14A3-LOCAL-MIGRATION-002

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Read 394bada from the shared object store: scope, the leak grep, the run2 script and logs.
- Independent read-only DB counts via docker exec psql (metadata and counts only). The Guardian never opened any .env file.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the Codex branch ref published unchanged (a fast-forward from 0af93e5 to 394bada). No credential, Docker write, database write or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
