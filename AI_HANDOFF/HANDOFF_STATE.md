HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G10A-REVIEW
AUTHOR: CLAUDE
PHASE: G10A_REVIEWED_G10A2_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G10a (codex aa225d1/6c85212/52689a4) has a clean environment:
- scope is 29 allowed files, with one tsconfig include line
- the guard is correct; the live V1 DB is untouched (6 migrations, counts and StartedAt unchanged)
- no orphan volume; manifest 12/12; 255 tests green
Four real security gaps in the authority logic:
- A1: platformIdentityRef is a plain AuthContext string that bypasses all membership and grant checks in both revoke paths (ADR-0010/S5).
- A2: bootstrap validates the platform ref and then discards it; no authority, no audit.
- A3: the last-admin rule is bypassed by revoking the admin's MEMBERSHIP (the spec does this at lines 59-60), and the count-then-revoke has a race under READ COMMITTED.
- A4: mapCoreDatabaseError is never called, so raw P2002 errors leak (e.g. a duplicate grant); P0001 is not mapped by message; the report's claim that it is is false.
- A5: the Core spec runs a global deleteMany() on the authority tables with no in-spec guard, which is unsafe after merge (the _PUSH_STAGING .env).
Yellow A6-A9: missing rollback and founding-outside-bootstrap tests; re-revoke overwrites the audit; one-line style; report overclaims.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10A_CORE_AUTHORITY_SLICE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The Codex core branch is at 52689a4. main is f39b28d before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T20:10:00+03:30
NEXT_ACTION: Give Codex CODEX-20260913-G10A2-CORE-AUTHORITY-FIXES-001 (section 5 of the review), pinned. It stays within the owner's G10a authorization, so no new approval is needed. G10b and merging to main are blocked until the G10a2 review passes.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-DESIGN-FINAL-G10A
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260913-G10A-CORE-AUTHORITY-SLICE-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; remote core is at 52689a4.
- Pre-push scope and secret scan of the local commits.
- docker ps/inspect, volume CreatedAt, and read-only counts on the live DB.
- Read all 8 core files and the spec line by line.
- Grepped the adapter usage.
- Verified the manifest against the aa225d1 blobs and the report hash.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
