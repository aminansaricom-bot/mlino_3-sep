HANDOFF_ID: HANDOFF-20260911-CORE-DATA-MODEL-FINAL-REVIEW
AUTHOR: CLAUDE
PHASE: CORE_DATA_MODEL_PRE_SCHEMA_REVIEW
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: B - MINOR DATA MODEL ADJUSTMENTS REQUIRED. Entity boundaries are correct; corrections C1-C6 are applied in edabffa; there is zero vertical leakage. Nine data adjustments are needed before schema design, and D1 and D2 are red.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_CORE_DATA_MODEL_FINAL_REVIEW_REPORT.md
REPORT_SHA256: 7deeee1b200fbcc8af964dc4e9595dce2c027357b20a0c80635a316cb1962420
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T03:10:00+03:30
NEXT_ACTION: Adjustments before schema design:
- D1 (red): the identity claim needs a subject key: a registered identifier type plus a normalised value, with a partial unique index on the verified-and-active status. Without it, D-61's uniqueness cannot be enforced. Record its honest limit: a business verified under two different identifier types is not caught by the database.
- D2 (red): Membership references an opaque identity (issuer, subject). No credential or user table in Core, since that would be a second identity system (D-62, D-66); the issuer comes from OD-08.
- D3: the permission identifier is a registered string, not a database enum, so namespaced module acts (D-62) need no Core migration.
- D4: generic displayable fields (name, short description, category key, offer form, terms, price or on_request, validity) live on Core entities. The published image never reads module tables (D-71).
- D5: Evidence uses typed references, not free polymorphism. In the MVP it attaches only to Capability and Offer; identity verification evidence lives on the claim's verification history.
- D6: the publication state on the entity is the truth; publication history is append-only audit.
- D7: remove Intent and Context from the section 5.3 persistence relations.
- D8: plan two CCRs deliberately: identity and business truth first, then recommendation v1.1 and ActionRecord for Phase 3.
- D9: the MVP persists only the founding basis, plus member_grant if a second member exists.
Also: offer references attach to immutable versions; no authorisation path ever reads claim status. The first CCR's conceptual scope is ten entities.
External prerequisites remain with the owner: OD-08, the CCR on the frozen schema.prisma, D-71 physical shape, OD-05, OD-01, and F7.

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-CORE-FOUNDATION-ARCHITECTURE-VALIDATION
EXECUTED_INSTRUCTION_ID: OWNER-20260911-CORE-DATA-MODEL-FINAL-REVIEW (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Routed to "Claude Opus 5 - MLINO Data Architecture Reviewer", which is the model that executed it.

HANDOFF_PRECONDITION_CHECK: The spec was reviewed at edabffa on codex/v2-intent-flow-foundation, with the local clone equal to origin. The main staging clone was in sync with origin at fac7e24 with a clean tree. The push was preceded by a check that origin/main was still fac7e24.

SCOPE_CONSTRAINT_NOTE: Only mlino_book/MLINO_CORE_DATA_MODEL_FINAL_REVIEW.md and the AI_HANDOFF files were added or changed on main. Nothing in the Codex clone was modified. No schema, no code, no ADR change; field names in the review are conceptual.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.

NOTE: The multi-vertical test for clinic, restaurant and retail passes without Core change once D1-D5 are applied; opportunity families still need the planned M1 CCR. Not persisted yet: Consent; Intent and Context; the authenticated Session (OD-08, D-70); roles; the recovery bases; Observation and Signal; a separate Decision (acceptance is recorded on the recommendation, D-54); Outcome and Evaluation; and Fact, unless the demo consumes it.
