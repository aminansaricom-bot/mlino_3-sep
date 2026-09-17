HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-MERGE-Q8-3
AUTHOR: CLAUDE
PHASE: Q8_MERGED_Q8_3_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner authorized in chat: «ادغام Q8 در main و Q8-3 مجاز است».
The Guardian MERGED Q8 into main:
- Merge commit 736bf2d73221368d20e7afe125ab1970d8dfa510, tree 47b97890, parents 68fb692 and e0348a1.
- The tree equals the trial; 12 files, +695/-2; 0 forbidden files; schema.prisma, Dockerfile and package untouched.
- The new migration folder is in main and its file hash 3874e179 equals the reviewed one.
- The local database still has 7 migrations; the index is NOT applied yet. That is Q8-3.
WARNING: between this merge and the end of Q8-3, no docker compose up --build and no v1-migrate, or the migration lands without a backup.
Released CODEX-20260917-Q8-3-LOCAL-INDEX-MIGRATION-001 (method = G14a-3 run 3): a source check, a pre-state with the CCR P4 duplicate query returning zero rows and the index absent, backup B1-B6 to C:\Users\galexy\mlino-backups\ as mlino_v1_pre_q8_<TS>.dump, migrate status showing exactly one pending, a single deploy, verification a)-f) including 8 migrations and index validity, and a resolve --rolled-back failure path.
IMPORTANT: the in-memory DATABASE_URL exception was granted for G14a-3 ONLY and has expired. The Q8-3 instruction performs C0 only if the owner sends a sentence extending it to Q8-3; otherwise Codex stops before touching anything. The Guardian asked the owner for that one line.
G14c-1 is re-issued as CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-005 targeting this handoff; only the id, target and pin change.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_MERGE_Q8_3_RELEASE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: 736bf2d73221368d20e7afe125ab1970d8dfa510 (merge). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T20:40:00+03:30
NEXT_ACTION: Codex executes Q8-3 with TARGET_HANDOFF_ID=HANDOFF-20260917-GUARDIAN-Q8-MERGE-Q8-3, once the owner extends the connection exception. Then Guardian review and a read-only runtime verification. G14c1-005 may run in parallel.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-2-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), executing the owner-authorized Q8 merge and releasing Q8-3

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main was 68fb692 and clean; origin/codex/core-profile-unique-ccr was e0348a1 (published by the Guardian). The trial merge-tree gave 47b97890 and the merge tree equals it. The local DB was checked read-only and still has 7 migrations.

SCOPE_CONSTRAINT_NOTE: The --no-ff merge plus the AI_HANDOFF record files. No credential, Docker write, database write, compose or build action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
