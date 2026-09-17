HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-G14C2
AUTHOR: CLAUDE
PHASE: G14C1_DECIDED_G14C2_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved in chat: «توصیه‌های نگهبان برای C8-1 تا C8-5 تصویب شد؛ G14c-2 مجاز است.»
Decisions: C8-1 a read-only path on the deployment host, with a PLUGGABLE transport in code; C8-2 fetch at most every 60s, TTL 300s from generated_at, clock skew 30s; C8-3 public keys ship with the V2 build, never a private key, with a revocation path confirmed before real use; C8-4 category, floor_level, building_id, products and discount_percent filters are dropped for real records with nothing invented; C8-5 removal after a claim suspension happens only through the normal cycle, with the one-cycle delay accepted.
Released CODEX-20260918-G14C2-V2-CONSUMER-IMPLEMENTATION-001 on a NEW branch codex/v2-public-consumer from origin/codex/v2-intent-flow-foundation at f4d326f, local commits only:
- a new mlino2/app/src/publicExport module: canonical (mirroring V1 byte rules), verify (Ed25519 via WebCrypto), trustBundle (public-key allowlist plus revocation, never modifiable by an artifact), transport (a pluggable port with fetch and file implementations), consumer (verify then TTL then atomic single-reference swap), mapping (C4, with absent fields never invented and validity re-checked at read time)
- mock isolation behind an explicit demo mode, with no fallback or conversion
- Guardian conditions: N1 the device clock makes TTL a correctness guard, not security; N2 a written threat model; N3 byte parity PROVEN with fixtures generated once from the V1 implementation and committed
- vitest tests covering the design C7 list plus the parity fixtures; build and test three consecutive times with committed logs; no network, Docker or database
Out of scope, separately approved later: merging into the V2 branch, and the operational key, publishing path and schedule.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_G14C2_IMPLEMENTATION.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is b56329e before this commit; the design branch is at 0bd14bb on origin; the V2 base is f4d326f. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-18T10:40:00+03:30
NEXT_ACTION: Codex executes G14c-2 with TARGET_HANDOFF_ID=HANDOFF-20260918-OWNER-APPROVAL-G14C2. Then Guardian review, then the owner decides the V2-branch merge.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-G14C1-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's C8 decisions and releasing G14c-2

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is b56329e; origin/codex/v2-public-consumer-design is 0bd14bb; origin/codex/v2-intent-flow-foundation is f4d326f. The V2 app already uses vitest with 13 existing test files, so the required tests need no new dependency.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
