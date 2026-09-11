HANDOFF_ID: HANDOFF-20260911-MVP-BOUNDARY-REVIEW
AUTHOR: CLAUDE
PHASE: MVP_BOUNDARY_REVIEW_BEFORE_CODE
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: B - MINOR BOUNDARY ADJUSTMENTS REQUIRED (the MVP foundation stays valid for restaurant, retail and cafe modules if tests B1-B10 hold; the named roadmap document could not be reviewed because it does not exist)
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_MVP_BOUNDARY_REVIEW_REPORT.md
REPORT_SHA256: 4f0546c6b094b97cde3de01b65f845dd377556a4f53d0ced8c1e2d1b24d3f324
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T01:10:00+03:30
NEXT_ACTION: Before any code starts: (1) commit MLINO_MVP_IMPLEMENTATION_ROADMAP.md to the repository so its "Phase 1 Core Foundation" can be tested against B1-B10. This is the third consecutive named input that is not in the repository, after MLINO_FIRST_VALUE_PATH_PLAN.md and MLINO_MVP_EXECUTION_PLAN.md; the likely cause is that these documents are produced elsewhere and never committed. (2) Adopt B1-B7 as acceptance tests for every foundation pull request. B1: permission never comes from the token role. B2: no trade roles in recommendations. B3: no clinic KPI catalogue in Core. B4: no clinic service taxonomy in Core. B5: no clinic fields on Offer. B6: no trade-specific verification method in Core. B7: no trade display labels in the Core UI. (3) Record in the plan that the appointment connector (B8) and outcome observation (B9) live inside the Clinic Module. (4) With roadmap step 7, turn V2's closed category union into data received from V1 (B10). G1 and G2 remain owner actions.

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-FIRST-90-DAY-PRODUCT-STRATEGY
EXECUTED_INSTRUCTION_ID: OWNER-20260911-MVP-BOUNDARY-REVIEW (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Routed to "Claude Opus 5 - MLINO Architecture & Product Boundary Reviewer", which is the model that executed it.

HANDOFF_PRECONDITION_CHECK: Repository state was inspected before review: in sync with origin at 8b79c94, clean working tree. MLINO_MVP_IMPLEMENTATION_ROADMAP.md was searched for in the repository, origin/main, the working folder, Desktop, Documents and Downloads, and was not found. The push was preceded by a check that origin/main was still 8b79c94.

SCOPE_CONSTRAINT_NOTE: Only mlino_book/MLINO_MVP_BOUNDARY_REVIEW.md and the AI_HANDOFF files were added or changed. No ADR modified, no architecture change, no feature added. Register, roadmap, changelog, code, schema, API and contracts untouched.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.

NOTE: Reviewed instead: the MVP plan in the repository (MLINO_FIRST_90_DAY_PRODUCT_STRATEGY.md section 7 and 04_INTEGRATION_ROADMAP.md steps 3-7) and the current code. Every foundation item passes the D-63 Core test: organisation, membership, grants and the six permissions; recommendation v1.1; Action, outcome and evaluation; capability publication; Offer; the identity-claim mechanism; Session; the AC-2 publication gateway. The risk lies in implementation shape, captured as tests B1-B9. New finding from code: B10. V2 hard-codes a closed V2BusinessCategory union (dental_clinic, beauty_clinic, cafe, restaurant, retail_shop) in directory/contract.ts, directory/validate.ts, matching/IntentParser.ts and matching/intentContract.ts. This is the V2-side twin of the D-63 leak and a second source of truth for category once contract 02 carries module vocabulary. The fix waits until roadmap step 7, because V2 is maintenance-only until G4. Keyword-to-category mapping stays V2 relevance logic.
