HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12A-MERGE
AUTHOR: CLAUDE
PHASE: G12A_MERGED_G12B_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner confirmed "merge of G12a into main is authorized"; the confirmation was sent in chat, relaying a Codex-written message. The Guardian merged codex/v1-test-guard 289be12 into main e992937 with --no-ff:
- Merge commit ebf404c. Tree f4317f5 equals the Guardian merge-tree (preview and execution).
- No deletions; guarded push.
- Runtime unchanged: read-api a07858b3; DB StartedAt unchanged, 0 restarts; 6 migrations; dspr=4.
Jest in any main checkout now refuses specs unless DATABASE_URL targets localhost:5499; the _PUSH_STAGING .env (5435) is rejected.
G12b hardening released.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12A_MERGE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: ebf404c969482b1b552f6bdfc018e3c3a8734be2 (merge commit on main). The core branch is at 2d2bc17. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T02:30:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G12B-V1-TEST-DB-GUARD-HARDENING-001 (in the merge record), targeting THIS handoff ID and pinned to the merge record.
- It covers H1 (any unsafe DATABASE_URL line → reject), H2 (export prefix) and H3 (prisma/.env).
- It is test-only, on the new branch codex/v1-test-guard-hardening from main.
- After review: a short owner confirmation to merge.
- Then G10c, with separate owner approval.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING; the guard is a safety net, not a permission.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12A-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role): owner-confirmed G12a merge execution

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched main and the guard branch. main is e992937 and clean; the guard branch is 289be12.
- merge-tree gives f4317f5; the local merge tree matches; no deletions.
- Runtime baseline recorded; the push is guarded on e992937.

SCOPE_CONSTRAINT_NOTE: main received the approved merge plus this record and the AI_HANDOFF files. No build, restart, migration, test or data action. No credential action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
