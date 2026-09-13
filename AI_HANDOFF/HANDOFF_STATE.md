HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G4-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G4_CORE_SCHEMA_MIGRATION
STATUS: G5_RELEASED
REVIEW_VERDICT: APPROVED_NEXT_STEP. G4 PASS: the first real change to the frozen schema.prisma is exactly the owner-approved CCR (fcddfc2), no more and no less. G5 (V1 compatibility) is released. Merging into main (G6) and applying the migration to any data-bearing database (G7) remain separate owner decisions.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G4_CORE_SCHEMA_MIGRATION.md
REPORT_SHA256: 9e42a1845903c7831df14620b85c43e814ce1b5844c213a54859db08abb9bd9e
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none by Claude - review only). The G4 product change is on codex/core-prisma-foundation at 3853f97 (report f47c852). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T08:40:00+03:30
NEXT_ACTION:
1. Give Codex CODEX-20260913-G5-V1-COMPATIBILITY-001 (section 4 of the review). Branch codex/core-prisma-foundation; TARGET_HANDOFF_ID HANDOFF-20260912-CORE-PRISMA-FOUNDATION.
   - Two temporary detached worktrees: baseline 6b62509 and G4 f47c852.
   - In each: npm ci, prisma generate, npm run build.
   - Deploy the migrations on a disposable tmpfs database, then npm test -- --runInBand.
   - Compare the two runs: any test that passes on baseline and fails on G4 is a FAIL, reported and not fixed.
2. SAFETY: the V1 integration tests globally clean tables. DATABASE_URL must never point at mlino-v1-local-db; never run npm run db:up or docker compose.
3. After G5, owner decisions:
   - G6: merge codex/core-prisma-foundation into main. merge-tree preview shows no conflicts (main 4 ahead, core 8 ahead).
   - G7: apply the migration to mlino-v1-local-db or any data-bearing environment, with a backup first and CCR section 12 as the rollback plan.
Verified independently for G4:
- Scope is clean with zero forbidden paths; existing migrations and migration_lock.toml are untouched.
- schema.prisma: the old file is an exact prefix of the new one, and the appended block equals the CCR model block at fcddfc2.
- The CCR changed only its status line plus one approval line.
- Migration 20260913010000_add_core_foundation is:
  - a traceability header
  - generated SQL, verbatim equal to the G3b generated SQL
  - the CCR section 6 block, byte-identical (13 triggers)
- package.json and package-lock.json change only the two 5.22.0 specifiers (2+/2- each).
- All six migrations deployed on disposable tmpfs container mlino-g4-validation; post-deploy drift is empty.
- 49 PASS, 0 FAIL: C1..C15, T1..T12, and W1 with P2003.
- The _PUSH_STAGING fingerprint equals the baseline; the container and g4-tooling were removed; LF checksums verified.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-CCR-CORE-FOUNDATION
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G4 report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched and pruned: origin/codex/core-prisma-foundation is at f47c852, equal to local.
- Verified the scope diff from 6b62509.
- Checked that the old schema.prisma is an exact prefix of the new one and compared the appended block with the CCR.
- Diffed the CCR against fcddfc2.
- Checked the migration composition (the generated part contained verbatim, the manual tail byte-identical).
- Diffed package.json and package-lock.json.
- Read the migrate-deploy, drift, test, fingerprint and teardown logs, and spot-checked checksums against git blobs.
- Previewed the merge with merge-tree.
- The push was guarded on origin/main still being 472de7e.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G4_CORE_SCHEMA_MIGRATION.md and the AI_HANDOFF files were added or changed on main. Nothing on either Codex branch, in Docker, in any database or in _PUSH_STAGING/implementation was modified by Claude.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
