HANDOFF_ID: HANDOFF-20260911-CORE-SCHEMA-DESIGN-REVIEW
AUTHOR: CLAUDE
PHASE: CORE_SCHEMA_DESIGN_REVIEW
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: 1 RED, 11 YELLOW, 11 GREEN. The design is strong and applies data-model adjustments D1-D9. R1 must be fixed before schema implementation.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_CORE_SCHEMA_DESIGN_REVIEW_REPORT.md
REPORT_SHA256: d6f75d27aa0706148986017907cf3cbe1276eabb193849cf69d356119bbeaffe
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T03:40:00+03:30
NEXT_ACTION: R1 (RED): IdentityVerification.reviewed_by_membership_id encodes the platform reviewer as a Membership. Membership is person x business organisation, so this either requires platform staff to be members of the business they review, against D-55 and ADR-0010, or lets the business verify itself, which makes D-61 meaningless. Use a platform-plane identity reference instead; it is null for the MVP mechanical method.
YELLOW (fix before schema):
- Y1: one status on the claim instead of claim_status plus verification_status plus attempt status; add "suspended" per D-61.
- Y2: revoked_by and revocation reason on grant and membership (D-57 audit; peers cannot remove each other).
- Y3: automatic publication events (expiry, cascade) need a trigger field, not a mandatory human performer; a DB check that automatic events are never PUBLISHED.
- Y4: at most one PUBLISHED version per offer; publishing a new one withdraws the previous in the same transaction.
- Y5: complete the withdrawal cascade list: capability withdrawn or retired, identity claim expired or revoked (D-61), evidence stale, validity ended.
- Y6 (important): no public business profile exists for V2 (location, address, phone, declared hours as Fact). It must be a Core entity with its own publication dimension, not module storage and not the identity claim. Fields depend on OD-05 (owner); reserve its place in CCR 1.
- Y7: Action is both in this design and declared for the separate CCR 2 (section 13); move it to CCR 2 to avoid dangling recommendation_id and decision_id references.
- Y8: Action has no typed subject reference, so the "offer version created by this action" link (D-53 rule 10, D-68) is lost.
- Y9: registry location for the registered-string vocabularies (versioned config per module for the MVP), plus the ExternalWorkspaceLink.organizationId relation.
- Y10: terms as jsonb must follow the generic D-53 terms contract, not carry trade fields.
- Y11: drop grant and membership expiry and the recovery bases from the CCR 1 registry (D-57: can wait).

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-CORE-DATA-MODEL-FINAL-REVIEW
EXECUTED_INSTRUCTION_ID: OWNER-20260911-CORE-SCHEMA-DESIGN-REVIEW (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Reviewer.

HANDOFF_PRECONDITION_CHECK: The design was reviewed at 8edacce on codex/v2-intent-flow-foundation, with the local clone equal to origin. The main staging clone was in sync with origin at 05d94ec. The push was preceded by a check that origin/main was still 05d94ec.

SCOPE_CONSTRAINT_NOTE: Review only. Only mlino_book/MLINO_CORE_SCHEMA_DESIGN_REVIEW.md and the AI_HANDOFF files were added or changed on main. Nothing in the Codex clone or the reviewed document was modified. No code, Prisma, migration or ADR change.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.

NOTE: GREEN items:
- Entity boundaries; the deliberate-absence list; multi-vertical extensibility through registered-string keys, where the only closed enums are generic and come from approved decisions.
- Claim separated from Organization, with the D-61 partial unique index and an honest limit statement.
- The membership and grant model with no internal user or credential.
- The publication model, with state on the entity and append-only audit, and no module-table dependency for V2.
- Offer and OfferVersion as Core entities, with immutable versions and capability references attached to the version.
- Typed XOR evidence ownership.
- Action origin and authorisation, with "unknown" allowed and never a fake human.
