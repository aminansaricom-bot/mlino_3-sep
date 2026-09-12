HANDOFF_ID: HANDOFF-20260912-GUARDIAN-REVIEW-G1B
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G1_G1B
STATUS: DELIVERED_AWAITING_OWNER_ACTION
REVIEW_VERDICT: APPROVED_WITH_FIXES. The next step is completing G1b with fixes FX1-FX12. schema.prisma, the product migration and the CCR stay BLOCKED. G1 is still NOT CLOSED, pending the G1b report.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1_POSTGRES_VALIDATION.md
REPORT_SHA256: 82abcc9d763209cdbf254cb987092f0331846b8c573677aeb17809a3c5c43bc4
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T16:00:00+03:30
NEXT_ACTION:
1. Owner: hand Codex the exact instruction CODEX-20260912-G1B-COMPLETION-001 (review section 7), with TARGET_HANDOFF_ID HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION. Codex is running G1b right now without a recorded instruction ID: container mlino-g1b-postgres-20260912, uncommitted mlino2/validation/g1b/**, and a repo-root package.json/package-lock.json created by Prisma auto-install.
2. Codex: stop, apply FX1-FX12, deliver mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION_G1B.md, then STOP for the next guardian review.
3. Record the SECURITY FINDING in the CCR. Evidence: Prisma 5.22.0 accepted offerVersion.create with organization connect org-b plus composite offer connect (offer-a, org-a), and stored organization_id=prisma-org-a with no error (logs/04_prisma_write_path.log, 15:57). The composite DB FK blocks mixed rows, not wrong-tenant rows. Proposed rule: a write's tenant comes only from auth context, as a direct scalar (organizationId), never from input through a composite connect.
Evidence accepted from the in-progress G1b (logs 00-15, up to 15:59):
- 6 SQL assertions PASS.
- DR: prisma migrate diff from the live DB to followup.prisma produced only ADD COLUMN, with no DROP of the 3 partial indexes, 4 CHECKs or 5 triggers; inventory unchanged.
- FK-07: all 8 FKs are ON UPDATE RESTRICT ON DELETE RESTRICT.
- One concurrency run was consistent (T2 got 23505).
Still open:
- FX1: direct-scalar variant.
- FX2: C15 leak in the same transaction and after a savepoint.
- FX3: publication performer must be a membership, not platform_actor_ref (ADR-0010).
- FX4: verification organization_id.
- FX5: shadow-pair optional composite relation plus C6.
- FX6: origin/main chain and DR-03.
- FX7: --from-migrations/shadow-DB variant and the exact command.
- FX8: missing tests.
- FX9: advisory-lock barriers, 20+20 runs.
- FX10: hygiene (root package files, docker rm -v).
- FX11: G1b report with hashes.
- FX12: negative tests must assert the expected error code.

PREVIOUS_HANDOFF_ID: HANDOFF-20260912-G1-CLOSURE-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (received from the owner; standing role - every Codex execution report is reviewed before Codex's next step)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Both clones fetched. Codex origin was unchanged at 76589be; the G1b work is uncommitted in the Codex clone and was read, not modified. The G1b container was inspected read-only: host port 55436, an anonymous volume, isolated from mlino-v1-local-db, which has no published port. No credentials were found in the G1b files. The push was guarded on origin/main still being 421bb24.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1_POSTGRES_VALIDATION.md and the AI_HANDOFF files were added or changed on main. Nothing in the Codex clone or its container was modified. No schema.prisma, no migration, no ADR, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
