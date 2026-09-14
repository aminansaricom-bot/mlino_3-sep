HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13B-REVIEW
AUTHOR: CLAUDE
PHASE: G13B_ACCEPTED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G13b (codex/v2-read-contract-design a35c22b; doc bfad1ff0) is ready for the owner.
- R1 closed: fidelity options A1/A2/B/C, each with CCR/D6/S4/service/UX; the adapter is excluded; events moved to transport.
- R2 closed: a field-by-field draft-1 → Core mapping and a version plan.
- Y1-Y6 applied; S16-S24 each carry options and one recommendation.
- New schema citations are correct.
Minor items N1-N5 are fixed at G13c:
- N1: the header still says S16-S20.
- N2: the exposure table states confirmation as a fixed rule.
- N3: the DTO lacks capability links and metadata.
- N4: B and C need no schema.
- N5: category, floor/building and products are unnumbered.
Guardian package: S16-A, S17-B, S18-A, S19-A1 (differs from the doc's A2), S20-A, S21-B, S22-A, S23-B, S24-B, plus new S25 and S26.
- S19-A1: a published_content JSONB on the append-only publications row, tamper-proof via the existing immutability trigger.
- S25: business category and floor/building are not in v1; category comes from a module vocabulary (ADR-0011).
- S26: drop products from public-business.v1.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13B_V2_READ_CONTRACT_DESIGN_FIXES.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G13 branch is at a35c22b. main is 308d3b5 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T09:20:00+03:30
NEXT_ACTION: The owner decides S16-S26 (suggested: "Guardian recommendations approved, S19-A1"). Then:
1. Record the decisions.
2. Issue G13c (document only: DECIDED, N1-N5, final DTO, FINAL status).
3. G14 implementation (CCR, export, V2) needs separate approval.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13A-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G13B-V2-READ-CONTRACT-DESIGN-FIXES-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Fetched; the G13 branch is at a35c22b. Scope is doc, report and handoff only. Read the full revised doc and report; checked the hashes and the new schema citations.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
