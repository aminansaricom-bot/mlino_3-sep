HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FINAL-READINESS
AUTHOR: CLAUDE
PHASE: CORE_PRISMA_DESIGN_FINAL_AND_READINESS_REVIEW
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: DESIGN FINAL AND READY FOR schema.prisma - 0 design RED, 4 YELLOW (FY1-FY4, to be made explicit in the CCR). Writing schema.prisma is still gated by 3 process gates: G1 PostgreSQL validation, G2 branch sync, G3 an owner-approved CCR.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260912_CORE_PRISMA_FINAL_READINESS_REPORT.md
REPORT_SHA256: 045100dd38a380c0f2b30761fab5b972869d1492c210caaacf0589985bc319ef
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - documentation only). Design v3 is commit 84420ad3962841752d7225a96182f72ceebf43ac on codex/v2-intent-flow-foundation (parent b8b763d). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T06:40:00+03:30
NEXT_ACTION:
Gates before schema.prisma. Run G1 and G2 in parallel now, then G3.
- G1: run the PostgreSQL validation in design section 8 (C1-C15, 11 tests), adding the tests for FY1-FY3. Output PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md. Temp folder only, no real migration.
- G2: RR1 branch sync. Codex's implementation/prisma lacks ExternalWorkspaceLink and migration 20260910020000. merge-tree conflicts in root AI_HANDOFF/CLAUDE_LATEST_REPORT.md and HANDOFF_STATE.md.
- G3: a CCR on the frozen schema.prisma, owner-approved, citing the G1 results and FY1-FY4.
YELLOW for the CCR:
- FY1: onDelete and onUpdate are unspecified. Prisma's optional-relation default SetNull either silently nulls references (e.g. the profile's claim reference) or fails a CHECK by accident. The required-relation onUpdate Cascade would re-split organisation identity if an AC-2 id changed. Use Restrict everywhere.
- FY2: OfferVersionCapability insert and delete only while the version's published_at IS NULL; UPDATE is never allowed.
- FY3: when replacing a published version, the WITHDRAWN event must come before PUBLISHED, because the C5 partial unique index is not deferrable.
- FY4: confirm Prisma field naming (camelCase with @map, derived from the existing convention), explicit @relation names for the multiple relations to Membership, and the Client write pattern (test 7).
Soon needed:
- The profile publish permission (OD-05) is now on the MVP critical path, because capabilities and offers are visible only when a profile is visible.
- Record the PR1, PR2, PY1-PY6 and F1-F5 owner decisions as D rows in 05_OPEN_DECISIONS.md before the CCR.
- The issuer of new organisation ids (OD-08).

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-CORE-PRISMA-DESIGN-V2
EXECUTED_INSTRUCTION_ID: OWNER-20260912-CORE-PRISMA-DESIGN-FINAL (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5.

HANDOFF_PRECONDITION_CHECK: Both clones were checked equal to origin before editing (Codex at b8b763d, main at c98e874). The Codex push was guarded on origin still being b8b763d. The main push was guarded on origin/main still being c98e874.

SCOPE_CONSTRAINT_NOTE: On the Codex branch, only mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md was changed, on the owner's instruction. On main, only the new review and the AI_HANDOFF files were added or changed. No schema.prisma, no migration, no code, no ADR change, no register change.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
