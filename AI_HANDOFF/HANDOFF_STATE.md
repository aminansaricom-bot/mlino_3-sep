HANDOFF_ID: HANDOFF-20260911-CORE-PRISMA-DESIGN-V2
AUTHOR: CLAUDE
PHASE: CORE_PRISMA_DESIGN_OWNER_DECISIONS_APPLIED
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: All owner decisions on PR1, PR2 and PY1-PY6 are applied to MLINO_CORE_PRISMA_SCHEMA_DESIGN.md (v2). No schema-shaping fork remains in the models. The only open physical item is PY7 (timestamp type and Prisma field naming).
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_CORE_PRISMA_DESIGN_V2_OWNER_DECISIONS_REPORT.md
REPORT_SHA256: ec2eaf8eb98671650dd26fcb2a7605e83fb94cf778962afab24ba25341cdd060
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - documentation only). The design change is commit b8b763ddca53c0859b62079b3419b15d323fa72e on codex/v2-intent-flow-foundation (parent 39b6708). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T06:00:00+03:30
NEXT_ACTION:
1. Run the PostgreSQL constraint validation in section 8 of the design: 15 constraints, 9 test cases including a second prisma migrate, output PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md. It runs in a temp folder outside the repo, with no real migration and no real schema.prisma.
2. RR1 branch sync. merge-tree currently conflicts in root AI_HANDOFF/CLAUDE_LATEST_REPORT.md and HANDOFF_STATE.md, because Codex commit 39b6708 wrote them.
3. PY7: the timestamp type (existing TIMESTAMP(3) or Timestamptz(3)) and Prisma field naming (camelCase with @map recommended).
4. Name the issuer of new organisation identifiers. Core no longer mints them (PR2); related to OD-08.
Owner questions (non-blocking):
- Claim withdrawal by the organisation, or revocation of a verified claim, has no state among the five approved values; adding an enum value later is additive.
- The claim status_changed_* columns keep only the latest change, so SUSPENDED to VERIFIED overwrites the earlier suspension audit. Full history would need a small append-only table (a separate owner decision).
Interpretation to confirm: "Publication is the single source of truth" was applied as follows. Publication state changes only via Publication events. publication_status on the subject is a same-transaction projection, needed for the one-published-version partial unique. The enforcement method (trigger, or domain plus tests) is settled in the PostgreSQL validation. grant_id was not added, per the owner's minimal audit set.

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-CORE-PRISMA-DESIGN-REVIEW
EXECUTED_INSTRUCTION_ID: OWNER-20260911-CORE-PRISMA-DESIGN-DECISIONS (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5.

HANDOFF_PRECONDITION_CHECK: Before editing, the Codex clone was confirmed equal to origin at 39b6708, with only the 3 known untracked files. The push to the Codex branch was preceded by a check that its origin was still 39b6708. The push to main was preceded by a check that origin/main was still 38040a4.

SCOPE_CONSTRAINT_NOTE: On the owner's explicit instruction, only mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md was changed on the Codex branch; the 3 untracked Codex files were not touched. On main, only AI_HANDOFF files changed. No schema.prisma, no migration, no code, no ADR change.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
