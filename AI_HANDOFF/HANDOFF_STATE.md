HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G7B-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G7B_LOCAL_MIGRATION
STATUS: CORE_FOUNDATION_GATES_COMPLETE_AWAITING_OWNER_CHOICE
REVIEW_VERDICT: APPROVED_NEXT_STEP. G7 PASS and closed. Migration 20260913010000_add_core_foundation is applied to mlino-v1-local-db after a verified backup, with no change to existing data and no restarts. The Core Foundation gate sequence G1-G7 is complete. The implicit-G7 compose risk is resolved.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md
REPORT_SHA256: bfde7cce7c792ad6ea28aee1c9f02d4304a287583f04322fa68c637c3ffa6375
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none by Claude - review only). Core branch head 0e35d36 (evidence b62546e). main eb9b72b carries the migration via merge f40a3f5. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T18:20:00+03:30
BACKUP: C:\Users\galexy\mlino-backups\mlino_v1_pre_core_20260913T121927Z.dump (22242 bytes, SHA-256 f3d2208ad55ad4e19ee2d4c458d85d41694cc8ac0eb082784283381b049b3c09). It contains data: keep it outside every repository with restricted access; retain it at least until the Core services land.
NEXT_ACTION (owner choice):
A) Optional G8: a controlled rebuild of the local V1 stack images from main, restarting mlino-v1-read-api with the new Prisma Client.
   - The owner states: "G8 approved: rebuild the V1 read API image from main and restart it".
   - Then give Codex CODEX-20260913-G8-V1-RUNTIME-REBUILD-001 (review section 4).
   - The instruction does: a fresh B1-B6 backup; a pre-g8 image tag for rollback; docker compose -p implementation up -d --build v1-read-api from a temp worktree; v1-migrate must be a no-op; the same six migrations and identical row counts; the API returns 401 unauthenticated.
B) Next phase: Core services and repositories on the new models. This needs a design specification first (Claude can draft one on owner request), with W1 (tenant only from auth context, as a direct scalar) as a mandatory rule.
Verified independently (read-only):
- The backup file exists with a PGDMP header, its host SHA-256 equals the in-container value, and no temp dump was left in the container.
- _prisma_migrations holds six rows, all finished, none rolled back.
- Pre-existing table counts are unchanged (domain_signal_producer_registry 4, others 0), and the 12 Core tables are empty.
- 30/30 Core FKs are RESTRICT; 13 triggers; the C1-C5 and external_workspace_link_active_unique indexes are present; 29 CHECKs.
- The db and read-api containers were not restarted, and the API returns 401.
- Repo scope is clean with no dump in the repo; the fingerprint is unchanged.
- The g7b incidents were read-only with no effect, and deploy ran exactly once.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G7-HARD-STOP-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G7b report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched and pruned: core is 0e35d36 and main is eb9b72b.
- Checked the scope diff from 7aa9b33 and ran a secret and dump scan.
- Computed the host SHA-256 and checked the header of the backup.
- Ran read-only psql metadata and count queries through docker exec on mlino-v1-local-db (no row data).
- Ran docker inspect on both containers, and read the g7b incidents and status summaries.
- The push was guarded on origin/main still being eb9b72b.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md and the AI_HANDOFF files were added or changed on main. Claude wrote nothing to Docker or any database, and did not modify either Codex branch.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
