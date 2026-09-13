HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-G7
AUTHOR: CLAUDE
PHASE: G7_OWNER_APPROVED
STATUS: G7_RELEASED
REVIEW_VERDICT: The owner approved G7 in direct conversation ("تصویبش کن"): back up mlino-v1-local-db and apply only migration 20260913010000_add_core_foundation. BACKUP_DIR is the guardian default C:\Users\galexy\mlino-backups\ because the owner gave no other path.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G7_LOCAL_MIGRATION.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - governance record only). main at 0a5b3c0 carries the migration via merge f40a3f5. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T16:55:00+03:30
NEXT_ACTION:
Give Codex CODEX-20260913-G7-APPLY-CORE-MIGRATION-LOCAL-001 (section 4 of AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G6_MERGE.md) with:
  OWNER_APPROVAL: G7 approved: back up and apply migration 20260913010000_add_core_foundation to mlino-v1-local-db (recorded: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G7_LOCAL_MIGRATION.md)
  BACKUP_DIR: C:\Users\galexy\mlino-backups\
Preconditions at approval: mlino-v1-local-db is healthy (StartedAt 2026-09-12T21:34:05Z, Restarts 0); mlino-v1-read-api is up; main is 0a5b3c0 with six migrations in the tree; the backup directory does not exist yet.
Hard stops:
- The backup or pg_restore --list fails.
- migrate status shows anything other than exactly one pending migration.
- Any verification check fails, in which case roll back per CCR section 12.
Never:
- run V1 tests on this database, or docker compose build / up --build / down -v
- rebuild images
- commit the backup
- log credentials or row data

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G6-REVIEW
EXECUTED_INSTRUCTION_ID: Owner direct approval in chat, 2026-09-13

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Fetched; main is 0a5b3c0 and local is clean. docker inspect shows mlino-v1-local-db healthy and not restarted. No database query was made by Claude. The push was guarded on origin/main still being 0a5b3c0.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. Claude executed no migration, backup or Docker action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
