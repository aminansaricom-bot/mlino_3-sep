HANDOFF_ID: HANDOFF-20260911-CORE-PRISMA-DESIGN-REVIEW
AUTHOR: CLAUDE
PHASE: CORE_PRISMA_DESIGN_REVIEW
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: NOT YET READY FOR THE FIRST PRISMA SCHEMA - 2 RED, 7 YELLOW, 10 GREEN AREAS. The design faithfully applies the pre-Prisma decisions: composite keys on all 11 entities, branch-shaped profile, typed location, Action excluded. Neither RED item questions the approved architecture.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_CORE_PRISMA_DESIGN_REVIEW_REPORT.md
REPORT_SHA256: c5dbb0aa78ea35ac97dbd551932de4dee1315cf02889b3819c20409868788855
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T05:20:00+03:30
NEXT_ACTION:
PR1 (RED): three schema-shaping decisions are left open inside the design document.
- YR1: dual claim_status plus verification_status. The enum lacks REJECTED, EXPIRED and SUSPENDED, so the D-61 suspension, a platform safety control under ADR-0009, cannot be represented.
- YR2: no revoked_by or revocation reason; no grant_id on Publication.
- YR5: version_status is kept.
The owner signs section 5.1 of MLINO_PRE_PRISMA_DECISION_NOTE.md, then Codex rewrites these without forks.
PR2 (RED): Organization.id is proposed as @db.Uuid and is never tied to the existing organization_id identifier space. That column is TEXT in 6 tables on main (external_workspace_links, core_entities, event_log, admission_observability, opportunity_current_state, revenue_recovery_raw_aggregate), is sourced from the AC-2 consumer, and has non-UUID test ids such as org_test_a. The result is two organisation identities (ADR-0001), and the ExternalWorkspaceLink FK is impossible (ADR-0004; text to uuid is not FK-compatible). Fix: Organization.id is the AC-2 consumer organization identifier, TEXT with @default(uuid()); CCR 1 does not touch existing tables.
YELLOW:
- PY1: @id id plus @@unique([id, organizationId]) instead of a composite PK.
- PY2: complete the out-of-Prisma constraint inventory and give the method per item (partial unique index, CHECK, trigger); verify that a second prisma migrate does not drop the raw partial indexes.
- PY3: a PostgreSQL spike, including shadow pairs with CHECK and a second migration.
- PY4: drop CUSTOMER_DATA from the physical enum.
- PY5: edits to a published profile or capability must republish or unpublish; add content_revision.
- PY6: state the read-time eligibility rule, so performed_by stays required.
- PY7: follow the frozen schema's naming and type conventions (camelCase with @map, TEXT ids, TIMESTAMP(3)) or record a deliberate new convention in the CCR.
OPS: Codex commit 39b6708 wrote the root AI_HANDOFF/CLAUDE_LATEST_REPORT.md and HANDOFF_STATE.md. merge-tree now reports 2 conflicts in those files. The clean-merge claim in the pre-Prisma note, true at 588b9c0, no longer holds; the note was not modified.

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-PRE-PRISMA-DECISION-NOTE
EXECUTED_INSTRUCTION_ID: OWNER-20260911-CORE-PRISMA-DESIGN-REVIEW (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Core Prisma Design Reviewer.

HANDOFF_PRECONDITION_CHECK: Both clones fetched. origin/main 1b3ad9a, origin/codex 39b6708. The design was read at ccca7c5 and the validation at 8571bad. Compared against the live implementation/prisma/schema.prisma and migration 20260910020000 on main. The push was preceded by a check that origin/main was still 1b3ad9a.

SCOPE_CONSTRAINT_NOTE: Review only. Only the new mlino_book/MLINO_CORE_PRISMA_DESIGN_REVIEW.md and the AI_HANDOFF files were added or changed on main. Nothing in the Codex clone was modified. No schema.prisma, no migration, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
