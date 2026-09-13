HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C2-REVIEW
AUTHOR: CLAUDE
PHASE: G10C2_REVIEWED_G10C3_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G10c2 (codex/core-g10c-profile-capability; 4cbdaa9 code/tests; a99e96d docs only) closes R1 and Y2-Y7.
- R1: assertAllowedKeys on create and update in both services; the forged confirmation/key/status/freshUntil/revision/projection test shows the row unchanged; HUMAN_CONFIRMED is reachable only via confirm().
- Y2: missing-permission tests.
- Y3: a real initial-guard test.
- Y4: uniform outcome results.
- Y5: runtime target validation.
- Y6: SUSPENDED/REJECTED/cross-org claim tests.
- Y7: empty name rejected.
Environment clean: live DB untouched; tmpfs; volume lists identical; 25 suites and 326 tests; manifest 4/4; merge-tree 2f839fe clean.
Y1 NOT applied: there is no 'CAPABILITY' publish/withdraw test in the final spec (grep is empty), yet the report claims it was tested. This is the third overclaim in this stream.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C2_PROFILE_CAPABILITY_FIXES.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G10c branch is at a99e96d. main is c9dded7 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T04:40:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G10C3-CAPABILITY-PUBLICATION-TESTS-001 (section 3), targeting THIS handoff ID and pinned.
- Test-only: an end-to-end capability publication test; a minimal publication-service fix only if a defect is found.
- The report must correct the G10c2 Y1 claim.
Then a short review and a short owner confirmation to merge G10c.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G10C2-PROFILE-CAPABILITY-FIXES-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the first fetch hit a DNS failure, then ls-remote confirmed main at c9dded7. The G10c branch is at a99e96d.
- Scope; read the code/test diff; grepped the final spec for CAPABILITY.
- a99e96d --stat is docs only.
- Test logs, volume before/after; manifest 4/4; live DB and read-api; merge-tree.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
