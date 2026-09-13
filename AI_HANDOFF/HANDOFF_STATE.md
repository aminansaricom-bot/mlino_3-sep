HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G6-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G6_MERGE
STATUS: DELIVERED_AWAITING_OWNER_DECISION_G7
REVIEW_VERDICT: APPROVED_NEXT_STEP. G6 PASS: Core Foundation is on main at merge f40a3f5, exactly the tree tested and approved in G1-G5. Next is G7, a controlled application of migration 20260913010000_add_core_foundation to mlino-v1-local-db after a full backup, only with explicit owner approval and a backup directory.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G6_MERGE.md
REPORT_SHA256: 449e795b1a565080e6b8f33de2211adaae7397d93cf2e11283457bcf19779002
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none by Claude - review only). main merge f40a3f5ff68337682ddc659be658807225f25bc1; core report b59a2d5. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T16:40:00+03:30
NEXT_ACTION:
1. Owner decision G7:
   - To approve, the owner states: "G7 approved: back up and apply migration 20260913010000_add_core_foundation to mlino-v1-local-db".
   - The owner also gives BACKUP_DIR (default proposal C:\Users\galexy\mlino-backups\, outside every repository).
   - Then give Codex CODEX-20260913-G7-APPLY-CORE-MIGRATION-LOCAL-001 (review section 4).
2. The instruction does:
   - Pre-state: the five migrations plus table row counts (names and counts only).
   - A pg_dump -Fc backup with size and SHA-256, verified with pg_restore --list.
   - migrate status from a temp worktree of main at f40a3f5 using the read-only Prisma CLI; it must show exactly one pending migration.
   - migrate deploy against localhost:5435 (credentials via env only).
   - Verification: six migrations; pre-existing row counts identical; 12 new tables empty; protected objects present; schema up to date; read-api running.
   - Rollback per CCR section 12 on any failure.
3. CRITICAL until G7 is executed: no "docker compose build" or "docker compose up --build" in implementation/ of any clone of main, including _PUSH_STAGING (now fast-forwarded to f40a3f5). v1-migrate would apply the migration without a backup.
4. After G7: optionally rebuild mlino-v1-read-api on the new client; then service and repository work on the Core models, with W1 (tenant only from auth context, as a direct scalar) as a mandatory rule.
Verified independently for G6:
- The merge parents are 496ff80 and 31c9ec1 (the reviewed head).
- The merge tree equals the automatic merge-tree result (6c4bb84), so there are no manual edits.
- implementation/ has zero diff from 31c9ec1.
- The changed set is exactly the 145 core-added files; guardian records are untouched; exactly six migrations.
- The core report commit adds only the report plus an append-only handoff entry.
- The V2 branch (f4d326f) is unchanged; mlino-v1-local-db was not restarted and has no migration applied; the temp worktree was removed.
- _PUSH_STAGING was clean with an unchanged fingerprint before the guardian fast-forwarded it (git only) to push this review.
- The one-off, path-scoped safe.directory for the temp worktree is accepted; the global git config was unchanged.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-G6
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G6 report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched and pruned.
- Checked the merge commit parents, and compared the tree with an automatic merge-tree of the same parents.
- Diffed implementation/ against 31c9ec1 and compared the changed-file set.
- Listed the migrations, the core report commit scope and the worktrees.
- Ran docker inspect on mlino-v1-local-db.
- Checked the _PUSH_STAGING status and fingerprint before the fast-forward (git pull --ff-only only; no docker, compose or npm).
- The push was guarded on origin/main still being f40a3f5.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G6_MERGE.md and the AI_HANDOFF files were added or changed on main. Nothing on either Codex branch, in Docker or in any database was modified by Claude.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
