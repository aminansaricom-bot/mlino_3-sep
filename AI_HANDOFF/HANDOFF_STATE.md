HANDOFF_ID: HANDOFF-20260911-CORE-SCHEMA-IMPLEMENTATION-READINESS
AUTHOR: CLAUDE
PHASE: CORE_SCHEMA_PRISMA_READINESS_REVIEW
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: NOT YET READY FOR PRISMA - 2 RED, 8 YELLOW, 11 GREEN. V2 closes R1, Y4, Y6, Y7 and Y11 from the v1 review. Neither RED item questions the approved architecture.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW_REPORT.md
REPORT_SHA256: e0488b3f38719084c74ebe942a83573feb559af87492485b70f4ca1d5923c4c2
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T04:10:00+03:30
NEXT_ACTION:
RR1 (RED, owner decision): the Codex branch's implementation/prisma is stale. Its schema.prisma has zero ExternalWorkspaceLink references (last touched 72954e2) and it lacks migration 20260910020000_add_external_workspace_link, which origin/main has. A first Core Prisma schema written there would fork the migration history of a frozen file. The ExternalWorkspaceLink-to-Organization relation cannot even be designed on that branch. Prisma work must start from a base whose implementation/prisma equals origin/main; the owner chooses merge, rebase or a fresh branch. This is F7 turning into a concrete blocker.
RR2 (RED, design decision): cross-tenant integrity is not enforced. OfferVersionCapability has no organization_id, and Evidence.organization_id consistency is stated but has no mechanism. The confirmed_by, granted_by and performed_by memberships could belong to another organisation. This risks cross-business leakage (D-08) and cross-organisation authority (D-57). Recommended fix: a composite unique (id, organization_id) on tenant tables plus composite foreign keys, which follows the project precedent of enforcing critical invariants in the database.
YELLOW:
- YR1: one claim status, adding "suspended" per D-61.
- YR2: revoked_by and revocation reason on grant and membership, plus grant_id on Publication.
- YR3: compute Read Port eligibility at read time (published, claim verified and active, within validity, capability active with fresh evidence), so no automatic withdrawal events without a performer are needed.
- YR4 BusinessProfile: (a) unique per organisation conflicts with D-61 branches; reference the identity claim instead. (b) Publishing a profile is not among the six D-57 permissions; this is an owner decision under OD-05. (c) Store location as typed lat/lng for proximity queries.
- YR5: drop version_status; publication_status with a partial unique on PUBLISHED is enough.
- YR6: registry location (versioned config per module for the MVP) and the ExternalWorkspaceLink relation.
- YR7: generic D-53 terms contract.
- YR8: list which constraints go into hand-written migration SQL, triggers, or domain-plus-tests. These are the partial uniques, the XOR, validity and price CHECKs, append-only and immutability. Precedent: migration 20260910020000 says Prisma lacks partial unique indexes and uses a manual WHERE index.

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-CORE-SCHEMA-DESIGN-REVIEW
EXECUTED_INSTRUCTION_ID: OWNER-20260911-CORE-SCHEMA-IMPLEMENTATION-READINESS (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Database Architecture Reviewer.

HANDOFF_PRECONDITION_CHECK: The design was reviewed at 588b9c0 on codex/v2-intent-flow-foundation, with the local clone equal to origin. The branches' implementation/prisma folders were compared directly with git show and ls-tree. The main staging clone was in sync with origin at da39e27. The push was preceded by a check that origin/main was still da39e27.

SCOPE_CONSTRAINT_NOTE: Review only. Only mlino_book/MLINO_CORE_SCHEMA_IMPLEMENTATION_READINESS_REVIEW.md and the AI_HANDOFF files were added or changed on main. Nothing in the Codex clone or the reviewed document was modified. No Prisma, no migration, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.

NOTE: GREEN:
- Entity completeness for CCR 1 and entity boundaries.
- The claim kept separate from the organisation.
- The verification model, with the reviewer as a platform identity reference.
- The permission model.
- The publication model, with no module-storage dependency and computed offer expiry.
- Offer ownership, with one published version per offer.
- Evidence ownership.
- Multi-vertical extensibility.
- MVP simplicity.
- The Action boundary deferred to CCR 2, where the Y8 subject reference is still owed.
