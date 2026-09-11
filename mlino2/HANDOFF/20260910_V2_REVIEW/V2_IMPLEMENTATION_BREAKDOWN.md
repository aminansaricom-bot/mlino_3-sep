# MLINO V2 — Local Discovery Implementation Breakdown

Date: 2026-09-10  
Role: MLINO V2 Technical Delivery Planner  
Status: **Planning only — implementation not started**  
Parent design: [V2_TECHNICAL_ARCHITECTURE_DESIGN.md](V2_TECHNICAL_ARCHITECTURE_DESIGN.md)  
Parent plan: [V2_IMPLEMENTATION_PLAN.md](V2_IMPLEMENTATION_PLAN.md)  
Scope: **Intent-Guided Local Discovery — local, one session, experimental data**

This document breaks the approved technical architecture into implementation work. It does not redesign the architecture, create a schema or API, authorize a production integration, or add product capability. Work remains on the existing V2 branch and must preserve V1, Backend, frozen contracts and `main`.

## 1. Delivery guardrails

The implementation must preserve this authority order:

```text
Permission
  ↓
Consent
  ↓
Intent interpretation
  ↓
Exact current interpretation confirmation
  ↓
Context constraints + V1/Directory evidence
  ↓
Eligibility
  ↓
Deterministic ordering
  ↓
Experience
  ↓
Open Business Details
```

MLINO Core owns Intent mechanisms, Permission, Consent, session lifecycle, orchestration and routing. V2 owns matching, experience and interaction. V1 owns business truth, capability, offer, evidence, availability, recommendations, actions, outcomes, evaluations and learning.

The first slice returns zero to three business results, at most one result per business, and only when one qualifying option satisfies all mandatory requirements. The Assistant is a governed interaction surface, not a business-logic owner or a second independent assistant.

## 2. Implementation phases

### Phase 0 — Entry, baseline and protection

**Purpose:** establish a safe implementation boundary before functional work.

Work:

- Record branch, baseline commit, working-tree condition and protected paths.
- Confirm the separate implementation instruction and approved scope.
- Identify the existing App composition, Directory adapter, local parser, legacy matcher, detail handler and persistent experience hook.
- Define the V2-only change list before editing.
- Confirm no live V1 connector, external model, passive location, module action, AR, storefront or persistent memory enters this slice.

Dependencies: approved architecture review, approved implementation plan and a clean scope record.

Checkpoint: baseline evidence, protected-file list and scope record exist.

Definition of Done:

- `main`, V1, Backend and frozen contracts are explicitly protected.
- Existing Stage 1/2 behavior is identified for regression coverage.
- No implementation file has been changed outside the approved V2 change list.
- The implementation team can explain why each planned file belongs to this slice.

### Phase 1 — Assistant shell and authority entry

**Purpose:** provide one governed entry point that can complete the task without a transcript.

Primary epic: **Assistant shell**.

Work:

- Add or adapt the Assistant surface as a projection of one Local Discovery session controller.
- Provide deliberate task entry, Permission display and scoped local-processing Consent.
- Provide ordinary controls so the user is not required to use chat.
- Show denied, paused, unsupported and disposed states.
- Prevent the governed input from dispatching to the legacy search handler at the same time.
- Keep Assistant guidance limited to Show, Ask, Guide and Stay Silent.
- Keep cosmetic theme behavior independent from task state.

Dependencies: Phase 0; Core ownership and session-memory rules.

Checkpoint:

- Capture and interpretation are blocked until Permission and Consent pass.
- Declined Consent leaves ordinary browsing available.
- No task wording, context or transcript is written to localStorage, sessionStorage, IndexedDB, URLs, logs or remote requests.
- The Assistant cannot create facts/capabilities or bypass authority.

Definition of Done:

- One entry surface owns the active task.
- The user can stop, dismiss, pause and finish it.
- No competing module assistant or hidden automatic resume exists.
- The shell has no business ranking or business-truth logic.

### Phase 2 — Intent flow and confirmation

**Purpose:** turn user input into a visible, correctable interpretation without silently activating it.

Primary epic: **Intent flow**.

Work:

- Bind the deterministic local interpreter directly; do not use the configurable external-LLM factory for this flow.
- Represent the current interpretation as a visible revision.
- Separate explicit user wording from local hypotheses and confidence.
- Expose unsupported or ambiguous mandatory conditions instead of dropping them.
- Support confirm, reject, correction, stop and one useful clarification per submitted request.
- Invalidate results and pending work when the interpretation changes.
- Permit Matching only for the exact currently confirmed revision.

Dependencies: Phase 1; existing parser/validation utilities may be reused only as pure helpers.

Checkpoint:

- A parsed shape without user confirmation cannot match.
- A high-confidence hypothesis cannot act as confirmation.
- A correction creates a new revision and invalidates the old result.
- Rejected or dismissed wording does not become a preference or transcript.

Definition of Done:

- Explicit and implicit intent remain distinct.
- Confirmation is tied to a specific interpretation revision.
- Consent and Intent confirmation remain separate.
- A late result from an earlier revision is discarded.

### Phase 3 — Context handling and session lifecycle

**Purpose:** apply only deliberately supplied context as constraints and enforce current-session authority.

Primary epic: **Context handling**.

Work:

- Support manual area, radius, building, floor, category, service, deadline and confirmed preference only where the existing experimental data supports them.
- Keep context as a constraint or preference; do not use an independent context-fit ranking score.
- Do not treat the map centre, GPS, movement, tab visibility or proximity as proof of user intent or presence.
- Implement active, paused, rejected, expired and disposed session transitions.
- Pause on hidden/background state; visibility alone never resumes Matching.
- Require explicit Resume to recheck Permission, Consent, exact revision, context, evidence and deadlines.
- Enforce the existing 30-minute inactivity and two-hour absolute limits; hidden time counts.
- Dispose task content on stop, dismissal, Consent/Permission withdrawal, reload/navigation/tab close, completion or deadline.

Dependencies: Phase 2; Core lifecycle and memory boundary.

Checkpoint:

- Hidden → visible does not automatically interpret or match.
- Explicit Resume cannot reset the absolute session limit.
- Material context changes create a new revision and require confirmation.
- Task content is current-only and never a transcript.

Definition of Done:

- Session state is not confused with Intent expiration or rejection.
- Async work is invalidated by pause, correction, withdrawal and disposal.
- All lifecycle subscriptions and timers clean up safely.
- The session controller remains feature-scoped and in memory.

### Phase 4 — Mock business adapter

**Purpose:** expose experimental business evidence through a read-only boundary.

Primary epic: **Mock business adapter**.

Work:

- Reuse the existing validated Business Directory loader and `draft-1` record shape.
- Inject Directory access and evaluation time into the new matching path.
- Keep records read-only; do not mutate the singleton cache.
- Label the snapshot as experimental.
- Preserve unknowns: `is_active` is not stock/open/bookable, `last_synced_at` is not a freshness guarantee, and a business-level offer is not a product discount.
- Provide stable business/product identities and source scope to explanations.
- Keep all V1/Event Log writes and live connectors outside this slice.

Dependencies: Phase 0; Phase 3 supplies the authorized task context.

Checkpoint:

- Matching can consume deterministic mock data without reading saved/liked/hidden/viewed state.
- No direct V1 database or Event Log access occurs.
- Missing mandatory evidence produces unsupported/empty output, never an invented fact.
- The adapter has a replacement seam for a future approved V1 projection.

Definition of Done:

- The mock adapter is read-only and injected.
- Every claim has a source/evidence scope.
- No mock field is described as live availability, fulfilment, redeemability or outcome.

### Phase 5 — Matching engine

**Purpose:** evaluate confirmed Intent against allowed Context and one-option evidence.

Primary epic: **Matching engine**.

Work:

- Build a pure matching policy over the complete Directory candidate pool; do not seed it from the legacy scored/top results.
- Apply hard requirements, exclusions and applicable constraints before ordering.
- Require one qualifying option to satisfy every mandatory condition.
- Do not combine evidence from Product A and Product B.
- Treat unknown mandatory evidence as unsupported.
- Treat an explicit offer/discount/promotion request as an eligibility condition.
- Treat an incidental offer only as an enhancement to an already valid match.
- Use the existing inclusive start/end offer validation where compatible, while preserving applicability limits.
- Order eligible businesses by confirmed optional preferences, supported distance fallback and stable business identity.
- Cap output at zero to three businesses and one slot per business.
- Produce an explanation tied to the same qualifying option as the match.

Dependencies: Phases 2–4; no business ranking payment, popularity or promotion input.

Checkpoint:

- Valid single-option match passes.
- False combined-product match fails.
- User-requested discount without option-level evidence is unsupported/ineligible.
- Expired enhancement disappears without expiring the user Intent.
- No paid or sponsored candidate bypasses eligibility.

Definition of Done:

- Matching is callable only with current confirmed authority.
- Eligibility precedes ordering.
- Results are deterministic and bounded.
- No V1 business fact, offer or capability is generated or changed.

### Phase 6 — Experience rendering and details

**Purpose:** make a valid match understandable and actionable through local inspection.

Primary epics: **Experience rendering** and **Business details view**.

Work:

- Render zero, one or up to three explained business experiences.
- Show the business, single qualifying option, reason, evidence scope and experimental-data limitation.
- Render honest empty, unsupported, stale, expired and unavailable states.
- Keep the result list usable without map tiles.
- Add a task-scoped result-to-details transition with Back and Done behavior.
- Recheck current authority, evidence and offer time before opening details.
- Reuse existing visual card/sheet styling only through constrained props.
- Do not call the legacy details handler that persists `viewed`.
- Omit route, share, save, contact, purchase, booking and external action controls from this slice.
- Do not expose private Intent or context to the business through the details view.

Dependencies: Phases 2–5; details must consume the selected qualifying option, not reconstruct it from a different product.

Checkpoint:

- Details open is local inspection, not a lead, visit, purchase or outcome.
- Stale selection is rejected or clearly marked before presentation.
- The result list never fills missing slots with irrelevant businesses.
- Accessibility, keyboard/focus, contrast and mobile/desktop layouts are checked.

Definition of Done:

- The user can understand why a result qualified.
- Every shown claim stays within evidence scope.
- Business details can be opened and closed without persistent task history.
- Empty and unsupported states explain the next allowed user action.

### Phase 7 — Integrated validation and delivery preparation

**Purpose:** prove conformance before any commit or delivery decision.

Work:

- Run unit tests for reducer/lifecycle, confirmation barriers, eligibility, option evidence, offer dates and deterministic ordering.
- Run integration tests for Directory, delayed work, stale revisions, hidden/resume, Consent withdrawal, storage/network boundaries and forbidden provider calls.
- Run acceptance scenarios on desktop and mobile.
- Run existing regression tests, type checks and build.
- Inspect the diff for V1, Backend, frozen, main and unrelated-refactor changes.
- Record HANDOFF, checksum, HANDOFF_STATE, Book, Roadmap, Open Decisions and Changelog only under the delivery protocol.
- Commit only after scope and validation review; report Remote only after verified Push.

Dependencies: all previous phases.

Checkpoint:

- Automated, privacy, lifecycle, evidence, accessibility, mobile and desktop evidence is recorded.
- Any failed or unverified claim remains open; no delivery status is inflated.

Definition of Done:

- The approved plan's Definition of Done is satisfied.
- Working tree and exact commit scope are reviewed.
- No claim of Remote delivery is made before successful Push and hash verification.
- This breakdown remains a plan; it does not authorize implementation by itself.

## 3. Epic breakdown and dependencies

| Epic | Depends on | Produces | Must not own |
|---|---|---|---|
| Assistant shell | Phase 0 | Governed entry and interaction surface | Business facts, ranking or permissions |
| Intent flow | Assistant shell | Visible revision and exact confirmation | Active Intent without user confirmation |
| Context handling | Intent flow | Manual constraints, pause/resume and session authority | Independent intent or hidden profiling |
| Mock business adapter | Entry protection | Read-only experimental evidence | Live truth, availability or V1 writes |
| Matching engine | Intent + context + adapter | 0–3 deterministic eligible businesses | Sponsored ranking or generated capabilities |
| Experience rendering | Matching | Explained result states | Product facts beyond evidence |
| Business details view | Rendering + selected result | Local inspection | Outcome, contact or persistent viewed history |

The critical dependency chain is:

```text
Protection
  → Assistant shell
  → Intent confirmation
  → Context/session authority
  → Mock evidence adapter
  → Eligibility/matching
  → Experience rendering
  → Business details
  → Integrated validation
```

A small amount of visual scaffolding may be prepared earlier, but no result-producing path may bypass the authority and evidence chain.

## 4. Suggested implementation order

1. Phase 0: baseline and protected scope.
2. Phase 1: Assistant shell with Permission and Consent barriers.
3. Phase 2: Intent proposal, revision and confirmation.
4. Phase 3: Context constraints and lifecycle/pause rules.
5. Phase 4: read-only mock Directory adapter.
6. Phase 5: pure eligibility and deterministic matching.
7. Phase 6: result rendering, empty states and task-only details.
8. Phase 7: integrated validation and delivery evidence.

At each step, keep the previous phase runnable. Do not wire an unconfirmed parser directly to the legacy matcher for convenience. Do not use mock data to imply that a future V1 connector already exists.

## 5. Cross-phase testing checkpoints

| Checkpoint | Verify |
|---|---|
| CP-0 | Branch/main protection, no unrelated files, approved scope and no implementation of excluded features |
| CP-1 | Permission and Consent precede capture/interpretation; ordinary browsing survives denial |
| CP-2 | Exact revision confirmation, correction/rejection, confidence separation and stale-result invalidation |
| CP-3 | Manual context only; pause/Resume rules; deadlines and disposal; no automatic background matching |
| CP-4 | Read-only Directory, stable evidence scope, no persistent task storage and no V1 writes |
| CP-5 | Same-option eligibility, explicit-offer requirement, offer applicability, deterministic 0–3 results |
| CP-6 | Explanation fidelity, empty/unsupported/stale states, details side-effect isolation and accessibility |
| CP-7 | Full regression/build, privacy/network inspection, desktop/mobile acceptance and delivery records |

Every checkpoint must produce observable evidence. A test that merely asserts a mocked return value does not prove the corresponding authority, storage or network boundary.

## 6. Global Definition of Done

The breakdown is complete only when all of the following hold:

- Permission and scoped Consent precede task capture and interpretation.
- Matching accepts only the exact current user-confirmed interpretation.
- Context is deliberate constraint/preference input, not an independent intent or ranking signal.
- Session pause, rejection, expiration and disposal are distinct and tested.
- Business evidence is read-only, experimental and source-scoped.
- Eligibility precedes deterministic ordering; hard requirements cannot be overridden.
- Each result has one qualifying option; results are zero to three and one per business.
- Offers enhance valid experiences; explicit offer requirements are eligibility conditions.
- Experience rendering explains limits and provides honest empty/unsupported/stale states.
- Business Details is local inspection with no external outcome or persistent task history.
- No transcript, durable Intent memory, external LLM, passive sensing, V1 write, module action or production connector is introduced.
- Existing V1/Backend/frozen contracts and `main` remain unchanged.
- Runtime tests, accessibility checks, desktop/mobile acceptance and delivery evidence are recorded.
- AR, Virtual Storefront, Marketplace and production integrations remain outside scope.

## 7. Explicit exclusions

This breakdown does not include:

- AR, camera/spatial capture or product visualization;
- Virtual Storefront or rich catalog browsing;
- full Marketplace or module-provider marketplace;
- production V1/Backend connectors, public APIs or deployment;
- new database schema, migration or business/entity model;
- CRM leads, messaging, booking, transactions, payments or publishing;
- persistent preference/profile memory or transcript retention;
- cross-session inference, passive GPS/movement, notifications or automatic resume;
- external LLM processing, telemetry, conversion attribution or outcome learning;
- paid placement, sponsored exposure, popularity ranking or business-triggered notifications.

Any excluded dependency must produce an honest unsupported/unavailable state. It cannot enter through fallback or broaden the approved Local Discovery scope.

This document is a delivery planning artifact. It does not start implementation, create code, change product decisions or claim a commit/Push.

من کدکس هستم
