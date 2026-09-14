HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13A-REVIEW
AUTHOR: CLAUDE
PHASE: G13A_REVIEWED_G13B_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G13a (codex/v2-read-contract-design 2010ef8; doc 9cb2a5ff) is the right direction.
- All 11 sections present.
- The fidelity gap is independently confirmed, and a second gap found (the V2 DTO needs products/offers; Core has no Product).
- Citations verified: schema lines sampled; all four V2 files exist with the cited content; the integration draft is cited correctly.
R1 (red), fidelity options are incomplete and one is wrong:
- The instruction's schema-free options are missing: (B) block edits while PUBLISHED, and (C) revision-equality gating.
- The doc's "adapter" option claims to build from published data, which is impossible (nothing is stored).
- Consumer-rebuild is the leak itself, and the event feed is transport, not fidelity.
- There is no impact analysis on D6, S4 or the services.
R2 (red): the V2 draft-1 mismatch is broader than products. The business-level category, location floor_level/building_id, and offers title/discount_percent have no Core source. A field-by-field mapping and a version plan are needed.
Yellow:
- Y1: capability exposure gated on human confirmation is a new policy and needs its own S item.
- Y2: AI_INFERRED evidence (ADR-0006).
- Y3: offer capability links are missing from the DTO.
- Y4: S17 needs ONE recommendation.
- Y5: V2 consumer auth, rate limits, PII.
- Y6: ordering by occurred_at, withdraw latency.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13A_V2_READ_CONTRACT_DESIGN.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G13a branch is at 2010ef8. main is b53489a before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T08:50:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G13B-V2-READ-CONTRACT-DESIGN-FIXES-001 (section 3 of the review), targeting THIS handoff ID and pinned. It is document only, on the same branch, and within the owner's option-1 authorization. Then the Guardian reviews it and presents S16..Sn with recommendations to the owner.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10E-MERGE-S9
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G13A-V2-READ-CONTRACT-DESIGN-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the G13a branch is at 2010ef8 with merge-base b53489a.
- Scope; read the full design doc and the report; checked the hashes.
- Verified the schema citations (sampled) and all four V2 files and cited ranges via git show.
- Verified the integration contract draft on origin/main.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
