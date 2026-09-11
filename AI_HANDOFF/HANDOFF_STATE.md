HANDOFF_ID: HANDOFF-20260911-PRE-PRISMA-DECISION-NOTE
AUTHOR: CLAUDE
PHASE: CORE_SCHEMA_PRE_PRISMA_DECISIONS
STATUS: DELIVERED_AWAITING_OWNER_DECISION
REVIEW_VERDICT: Decision note prepared, recommendations only; the owner signs. Five items: branch sync, tenant isolation, Action boundary, BusinessProfile ownership and yellow triage.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_PRE_PRISMA_DECISION_NOTE_REPORT.md
REPORT_SHA256: 2ad0b010e1653d1e78d9cef4dd4eaf4e6394cdbf1f1c6619650af9b34f6a2702
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - decision note only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T04:40:00+03:30
NEXT_ACTION:
Owner signs the five items in mlino_book/MLINO_PRE_PRISMA_DECISION_NOTE.md:
1. RR1 branch sync: create the implementation branch from origin/main and merge (not rebase) codex/v2-intent-flow-foundation into it. Verified: merge base 95d7c26, main 51 ahead, codex 38 ahead, zero overlapping files, git merge-tree clean, zero codex changes under implementation/. Before the first Prisma model, implementation/prisma must equal origin/main byte for byte. The three uncommitted files in the local Codex clone must be committed or explicitly discarded first.
2. RR2 tenant isolation: composite unique (id, organization_id) plus composite FKs on 11 tenant-bound entities. Add organization_id to IdentityVerification, PermissionGrant, OfferVersion and OfferVersionCapability. The platform reviewer reference is excluded on purpose. MATCH SIMPLE works with the XOR nullable targets. Prisma's handling of optional composite relations must be verified by a spike first; the fallback is raw SQL FKs, following the precedent of migration 20260910020000.
3. Action stays out of Phase 1. CCR 2 carries recommendation v1.1, Action, the Y8 typed subject reference, KPI and Goal.
4. BusinessProfile as the location or branch unit:
   - No unique on organization_id.
   - A nullable claim reference, partial unique when set.
   - Typed lat/lng.
   - One profile per organisation in the MVP, as a domain rule only.
   - The profile publish permission is an owner decision under OD-05; it does not shape the schema.
5. Fix before Prisma: YR1, YR2, YR4a, YR4c, YR5, the YR6 link FK and YR8. Can wait: YR3 (decide now, performer stays required), YR4b, the YR6 registry and YR7.
Standing prerequisites unchanged: a CCR on the frozen schema.prisma, OD-08 for identity_provider, and the D-71 physical shape.

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-CORE-SCHEMA-IMPLEMENTATION-READINESS
EXECUTED_INSTRUCTION_ID: OWNER-20260911-PRE-PRISMA-DECISION-NOTE (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Database Architecture Reviewer.

HANDOFF_PRECONDITION_CHECK: Both clones fetched. origin/main 075f1e7, origin/codex 588b9c0. The Codex clone was read only. The push was preceded by a check that origin/main was still 075f1e7.

SCOPE_CONSTRAINT_NOTE: "Do not modify files." Only the new mlino_book/MLINO_PRE_PRISMA_DECISION_NOTE.md and the AI_HANDOFF files were added or changed on main. No existing book, ADR, register, roadmap or changelog file was edited. Nothing in the Codex clone was modified. No Prisma, no migration, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
