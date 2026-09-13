HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G10A2-REVIEW
AUTHOR: CLAUDE
PHASE: G10A2_REVIEWED_G10A3_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G10a2 (codex edc8846 through c877ce1) closes all four G10a security gaps in code:
- A1: fail-closed PlatformIdentityVerifier port; platformIdentityRef removed from AuthContext; separate revokeByPlatform methods.
- A2: verified bootstrap actor; reason "bootstrap:<ref>".
- A3: the last admin is an ACTIVE grant on an ACTIVE membership, checked in both revoke paths, with an organization row FOR UPDATE lock.
- A4: the adapter is wired everywhere, with 10 trigger messages.
- A5: in-spec guard and prefix-scoped cleanup.
- A6 and A7 closed.
The environment is clean: scope OK; live DB untouched; tmpfs; NO_VOLUME_CHANGE; 21 suites and 269 tests.
The initial concurrency failure was correct behaviour (three admins), not a bug.
Remaining:
- B1: the final race test double-revokes ONE grant and does not prove S10-d.
- B2: the required duplicate grant and duplicate membership tests are missing.
- B3: lockOrganization runs before auth and throws a plain Error, so INTERNAL_ERROR differs from AUTHORIZATION_DENIED (an org-existence oracle); state checks come before the permission check.
- B4: the db-guard .env check is resolved from cwd and never matches.
- B5: no LF manifest.
- B6: the trigger test is weak, and bootstrap sniffs the 'Unique constraint' string.
- B7: the report overclaims the race proof.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10A2_CORE_AUTHORITY_FIXES.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The Codex core branch is at c877ce1. main is 21220d9 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T21:00:00+03:30
NEXT_ACTION: Give Codex CODEX-20260913-G10A3-CORE-AUTHORITY-FINAL-FIXES-001 (section 4 of the review), pinned. It stays within the G10a authorization; no new approval needed. After G10a3 passes: present S12 to the owner, then G10b; the merge to main is a separate gate.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G10A-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260913-G10A2-CORE-AUTHORITY-FIXES-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; remote core is at c877ce1.
- Scope and secret scan.
- Read all core and test/core files line by line.
- Read the initial and final test logs (the concurrency failure payload).
- Checked the volume before/after-final files and the container tmpfs.
- Read-only counts on the live DB; checked anonymous volume CreatedAt; checked the report hash.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
