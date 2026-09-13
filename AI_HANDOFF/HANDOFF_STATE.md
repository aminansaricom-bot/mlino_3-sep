HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G7-HARD-STOP-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G7_BACKUP_HARD_STOP
STATUS: G7B_RELEASED
REVIEW_VERDICT: APPROVED_WITH_FIXES. G7 stopped correctly at its hard stop in the backup step. The state is safe: the database was untouched with five migrations, the sixth was not applied, and no backup file exists. G7b retries G7 from the start with a robust backup method. The owner's G7 approval scope is unchanged and remains valid.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7_BACKUP_HARD_STOP.md
REPORT_SHA256: 75738aea5b6b2e70fb516aa1cd5763e40eac35016709c40831b49ddb0ae61357
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none by Claude - review only). Core branch head 7aa9b33 (G7 stop evidence bd0e62e). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T17:30:00+03:30
NEXT_ACTION:
Give Codex CODEX-20260913-G7B-APPLY-CORE-MIGRATION-LOCAL-RETRY-001 (section 4 of the review above). No new owner approval is needed.
The instruction does:
1. A fresh pre-state, which must equal g7/logs/pre-table-counts.log.
2. The robust backup:
   - B1: mkdir -p the backup directory.
   - B2: a Gregorian UTC timestamp from date -u.
   - B3: pg_dump -Fc -f inside the container; never through the host shell.
   - B4: in-container sha256 plus pg_restore --list.
   - B5: docker cp to the host, then match the host SHA-256.
   - B6: remove the temp file inside the container.
   Any B1-B5 failure is a hard stop.
3. Then base G7 steps 3-8 unchanged: exactly one pending migration, then migrate deploy, then verification a-f, with rollback per CCR section 12 on failure.
Evidence goes in mlino2/validation/g7b/; g7 is immutable.
Still forbidden until G7b closes: docker compose build or up --build on any clone of main.
Pre-state known from g7 evidence: 10 public tables. Only _prisma_migrations (5 rows) and domain_signal_producer_registry (4 rows) have data, so the practical data risk is low; the backup is still mandatory.
Verified independently:
- mlino-v1-local-db is healthy (StartedAt unchanged, Restarts 0).
- The C:\Users\galexy\mlino-backups directory does not exist, and there are no stray dumps.
- The g7 commit scope is clean (6 evidence files, the report, an append-only handoff).
- The evidence holds names and counts only, with no credentials.
- main, V2 and _PUSH_STAGING are unchanged.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-G7
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G7 hard-stop report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched and pruned: core is 7aa9b33 and main is 53180d5.
- Checked the scope diff from b59a2d5.
- Ran a secret scan of the g7 evidence and read pre-table-counts.log and FAILURE_RECORD.md.
- Ran docker inspect, and used ls for the backup directory and stray files.
- The push was guarded on origin/main still being 53180d5.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7_BACKUP_HARD_STOP.md and the AI_HANDOFF files were added or changed on main. Claude ran no Docker, database or backup action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
