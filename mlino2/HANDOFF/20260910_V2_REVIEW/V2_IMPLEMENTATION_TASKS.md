# MLINO V2 — Local Discovery Implementation Tasks

Date: 2026-09-10  
Role: MLINO V2 Technical Delivery Lead  
Status: **Task planning only — no implementation started**  
Parent breakdown: [V2_IMPLEMENTATION_BREAKDOWN.md](V2_IMPLEMENTATION_BREAKDOWN.md)  
Technical design: [V2_TECHNICAL_ARCHITECTURE_DESIGN.md](V2_TECHNICAL_ARCHITECTURE_DESIGN.md)  
Scope: **Intent-Guided Local Discovery — local, single session, experimental data**

This document converts the approved implementation breakdown into executable development tasks. The names of files, components and services below are proposed implementation seams; they are not files created by this task. No database schema, API, production connector or new product capability is authorized.

## 1. Shared implementation constraints

The implementation must preserve this sequence:

```text
Permission
  ↓
Consent
  ↓
Intent interpretation
  ↓
Exact current interpretation confirmation
  ↓
Context constraints + read-only Directory evidence
  ↓
Eligibility
  ↓
Deterministic ordering
  ↓
Experience
  ↓
Open Business Details
```

Core owns Intent mechanisms, Permission, Consent, session lifecycle, orchestration and routing. V2 owns matching, experience and interaction. V1 owns business truth, capability, offer, evidence, availability, recommendation, action, outcome, evaluation and learning.

Every task must preserve:

- one foreground task in one local session;
- current-session memory only, without transcript retention;
- zero to three business results, one result per business;
- one qualifying option satisfying all mandatory conditions;
- read-only experimental business evidence;
- no direct V1/Event Log write;
- no external model, passive location or automatic background resume;
- no changes to `main`, V1, Backend or frozen contracts.

## 2. Epic: Assistant Shell

### Goal

Provide one Core-governed Assistant interaction surface that starts and controls Local Discovery without becoming a chatbot-only flow or a business-logic owner.

### Technical tasks

1. Identify the existing Assistant entry and compose a Local Discovery task surface within the current React application.
2. Add deliberate task entry and display the allowed operation before capture.
3. Add scoped local-processing Consent before task text or signal interpretation.
4. Route task commands through one feature-scoped session controller/reducer.
5. Provide ordinary controls for start, confirm, correct, pause, Resume, stop, dismiss and Done.
6. Render denied, paused, unsupported, stale, expired and disposed states.
7. Ensure governed input cannot simultaneously invoke the legacy search handler.
8. Keep the Assistant as a projection of controller state; do not add a competing module assistant.
9. Keep theme and existing non-task preferences outside the task state.
10. Add no task content to browser storage, URLs, logs, telemetry or external providers.

### Dependencies

- Phase 0 scope/baseline protection.
- Approved Core ownership and Assistant memory decisions.
- Intent Flow needs this shell's command and authority boundary.

### Expected files/components/services

Proposed seams:

- Local Discovery entry and Assistant presentation component.
- Feature-scoped session context and reducer.
- Authority/Permission/Consent controller.
- Environment lifecycle adapter for foreground/navigation events.
- Existing application composition root for wiring only.

No new backend service, database, API or global state library is expected.

### Acceptance criteria

- Capture and interpretation are impossible before Permission and Consent pass.
- Declining Consent preserves ordinary browsing.
- The user can finish the flow without maintaining a transcript or using chat.
- The Assistant cannot create a capability, fact, offer or permission.
- Hidden-to-visible transition remains paused.
- Stop, dismissal, withdrawal and Done dispose task state according to the approved lifecycle.
- Existing theme and Stage 1/2 behavior remain separate.

### Tests required

- Unit: authority reducer transitions and command rejection before Consent.
- Integration: denied Consent, withdrawal, pause, explicit Resume and terminal disposal.
- Boundary: no storage, URL, log, telemetry, network or external-model request contains task content.
- Regression: legacy Assistant/search and Stage 1/2 tests still pass.
- Accessibility: keyboard focus, labels, contrast and usable non-chat controls.

## 3. Epic: Intent Flow

### Goal

Create a visible, correctable intent interpretation whose exact confirmed revision is the only intent allowed into matching.

### Technical tasks

1. Bind the deterministic local parser directly for this flow.
2. Keep the configurable external-LLM factory out of the new path.
3. Convert parser output into a readable interpretation proposal with uncertainty and unsupported conditions.
4. Distinguish explicit user intent from implicit local hypotheses.
5. Assign a new visible revision when wording, hard requirements or interpretation materially changes.
6. Provide Confirm, Reject, Correct and Clarify commands.
7. Limit clarification to the approved minimal interaction behavior.
8. Prevent parser shape validation from being treated as semantic confirmation.
9. Invalidate pending matching and prior results whenever the current revision changes.
10. Allow matching only when the current revision is confirmed by the user.

### Dependencies

- Assistant Shell authority and Consent.
- Existing parser and validation helpers, reused only as pure utilities.
- Context Handling for revision invalidation when manual constraints change.

### Expected files/components/services

Proposed seams:

- Local interpretation adapter.
- Intent revision/confirmation model in the feature controller.
- Interpretation review component.
- Pure parser normalization and validation helpers.
- No new persistent intent entity or database table.

### Acceptance criteria

- Parsed text alone never creates Active intent.
- High confidence never substitutes for confirmation.
- Confirmation references the exact visible revision.
- A correction creates a new revision and invalidates the old result.
- Rejected, dismissed and superseded wording is not retained as transcript or preference.
- Unsupported mandatory requirements are displayed as unsupported rather than silently removed.
- Consent remains distinct from confirmation.

### Tests required

- Unit: revision creation, confirmation, rejection and correction transitions.
- Unit: explicit versus implicit intent and confidence/confirmation separation.
- Integration: delayed old interpretation cannot publish after correction.
- Privacy: rejected/superseded text is absent from storage and outgoing requests.
- Negative: unconfirmed parser output cannot call matching.

## 4. Epic: Context Handling

### Goal

Apply only deliberately supplied context as a constraint or confirmed preference while enforcing pause, resume, expiry and disposal rules.

### Technical tasks

1. Support only the approved manual context inputs: area, radius, building, floor, category, service, deadline and confirmed preference where evidence supports them.
2. Keep context out of independent relevance scoring.
3. Prevent map centre, GPS, movement, proximity and tab visibility from creating intent.
4. Model active, paused, rejected, expired and disposed states separately.
5. Pause on hidden/background state and invalidate active work.
6. Require explicit Resume to recheck Permission, Consent, current confirmed revision, context, evidence and deadlines.
7. Enforce 30-minute inactivity and two-hour absolute limits, including hidden time.
8. Treat material context changes as new interpretation revisions requiring confirmation.
9. Dispose current task content on stop, dismissal, withdrawal, reload/navigation, tab close, Done or deadline.
10. Ensure lifecycle subscriptions and timers are cleaned up idempotently.

### Dependencies

- Assistant Shell's session controller.
- Intent Flow's revision identity.
- Read-only Directory adapter for supported context fields.
- Approved memory boundary and session rules.

### Expected files/components/services

Proposed seams:

- Session lifecycle reducer/state transitions.
- Manual context controls.
- Foreground/visibility/navigation adapter.
- Injected clock/deadline service.
- Operation-generation guard used by asynchronous work.

### Acceptance criteria

- Visibility alone never resumes matching.
- Resume cannot extend the two-hour absolute cap.
- A material context change invalidates results and requires fresh confirmation.
- Paused, rejected and expired states do not mean the same thing.
- Terminal events dispose task content and pending result authority.
- Context remains current-session-only and is not exposed to businesses through details.

### Tests required

- Unit: state transitions and deadline boundaries using a controlled clock.
- Integration: hidden → visible, explicit Resume, pause during matching and Consent withdrawal.
- Async: late callback after pause, correction, expiry or disposal is ignored.
- Privacy: no context in persistent storage, URL, logs or external requests.
- Acceptance: ordinary list flow works without GPS or map tiles.

## 5. Epic: Mock Business Adapter

### Goal

Provide a read-only, deterministic boundary to the existing experimental Business Directory data without presenting it as live V1 truth.

### Technical tasks

1. Reuse validated Directory loading and the existing `draft-1` record shape.
2. Inject Directory access and evaluation time into the Local Discovery matching path.
3. Keep the Directory cache and nested records read-only.
4. Preserve stable business and product identities.
5. Carry evidence scope/source information into matching explanations.
6. Use existing offer interval validation where compatible.
7. Treat unknown stock, opening, bookability, fulfilment, freshness and product-offer applicability as unknown.
8. Label experimental data near the resulting experience.
9. Ensure the adapter never reads saved, liked, hidden or viewed preferences.
10. Keep live V1 projection, Event Log access and writes outside this adapter.

### Dependencies

- Phase 0 protection.
- Context Handling supplies the authorized current context.
- Matching Engine consumes this adapter; the adapter must not rank candidates.

### Expected files/components/services

Proposed seams:

- Read-only Directory adapter around the existing Directory service.
- Experimental snapshot loader.
- Evidence projection/normalization helper.
- Injected evaluation clock.
- No new V1 service, database, API or schema.

### Acceptance criteria

- Matching receives deterministic experimental records through an injected boundary.
- No direct V1 database/Event Log access occurs.
- `is_active` is not described as stock or availability.
- `last_synced_at` is not described as live freshness.
- A business-level offer is not described as a product discount without applicability evidence.
- Missing mandatory evidence produces unsupported/empty output.
- Replacing the data source would require an explicit future contract review.

### Tests required

- Unit: read-only normalization and evidence-scope handling.
- Integration: adapter loads mock snapshot and returns stable identities.
- Negative: mutation attempts do not change source records.
- Negative: saved/liked/hidden/viewed state has no effect on adapter output.
- Boundary: no V1/Event Log write or external request.

## 6. Epic: Matching Engine

### Goal

Evaluate confirmed Intent against allowed Context and same-option V1/Directory evidence using eligibility before deterministic ordering.

### Technical tasks

1. Build a pure matching policy over the complete Directory candidate pool.
2. Do not seed candidates from the legacy scored/top-result matcher.
3. Evaluate each option against all mandatory requirements and exclusions.
4. Require one qualifying option to satisfy every required condition.
5. Reject false matches that combine evidence from different products/options.
6. Treat unknown mandatory evidence as unsupported.
7. Treat explicit offer/discount/promotion requests as eligibility conditions.
8. Treat incidental offers only as enhancements to already valid experiences.
9. Use valid start/end interval checks without implying applicability or redeemability.
10. Order eligible businesses by confirmed optional preferences, supported distance fallback and stable business identity.
11. Cap output at zero to three businesses and one slot per business.
12. Produce explanations tied to the same qualifying option that passed eligibility.
13. Ensure payment, popularity, promotion or business request cannot override constraints.

### Dependencies

- Intent Flow exact confirmation.
- Context Handling authorized current state.
- Mock Business Adapter evidence.
- Approved V1/V2 boundary.

### Expected files/components/services

Proposed seams:

- Pure eligibility policy.
- Representative-option selection policy.
- Deterministic business ordering policy.
- Match result/explanation model kept in feature scope.
- Directory and time injected as dependencies.
- Legacy MatchingService remains outside the new authority path unless a pure helper is proven compatible.

### Acceptance criteria

- Matching rejects unconfirmed, paused, expired, rejected or disposed intent.
- One option satisfies all mandatory conditions for every result.
- Product A + Product B is never treated as one match.
- Explicit discount request without option-level evidence is ineligible/unsupported.
- Incidental offer expiry removes only the enhancement, not the Intent.
- Results are deterministic, bounded at 0–3 and one per business.
- No V1 fact, capability, offer or availability is created or modified.

### Tests required

- Unit: all eligibility predicates and exclusions.
- Unit: same-option evidence and false-combination rejection.
- Unit: offer valid-from/valid-until boundaries and malformed intervals.
- Unit: deterministic ordering and 0/1/3 result caps.
- Integration: stale evidence between selection and presentation.
- Negative: paid/popularity/promotion cannot rescue an ineligible candidate.
- Security/privacy boundary: matching cannot read persistent user preference collections.

## 7. Epic: Experience Rendering

### Goal

Present valid matches as clear, bounded, explainable local experiences and provide honest recovery states.

### Technical tasks

1. Render zero, one or up to three business results.
2. Show the business, single qualifying option, reason, evidence scope and experimental limitation.
3. Render empty, unsupported, stale, expired, paused and unavailable states.
4. Keep the result list usable without map tiles.
5. Use existing visual card/sheet styling through constrained props.
6. Do not show route, share, save, contact, purchase, booking or external-action controls in this slice.
7. Make Assistant guidance a projection of the same result state.
8. Recheck authority and evidence before presenting asynchronous results.
9. Protect against stale results after correction, pause, withdrawal or source change.
10. Meet keyboard, focus, label, contrast and responsive behavior requirements.

### Dependencies

- Matching Engine result and explanation contract.
- Context/session authority.
- Existing visual shell and theme.
- Business Details receives selected result from this rendering path.

### Expected files/components/services

Proposed seams:

- Local Discovery result presenter.
- Empty/unsupported/stale state components.
- Constrained BusinessCard/experience-card wrapper.
- Result explanation renderer.
- Feature-scoped view state, not URL/deep-link state.
- No persistent experience-memory writes.

### Acceptance criteria

- Every displayed result has one qualifying option and an explanation.
- The list never pads empty slots with irrelevant or sponsored businesses.
- Experimental scope and unknown fields are visible.
- Async stale results are not displayed.
- No result rendering writes `viewed`, saved, liked or hidden state.
- The experience is usable without chat and without map tiles.
- Accessibility and mobile/desktop requirements pass.

### Tests required

- Component/unit: result, empty, unsupported, stale and expired rendering.
- Integration: matching output maps to the same qualifying option in the explanation.
- Regression: existing card/theme behavior outside the task remains intact.
- Accessibility: keyboard navigation, focus restoration, labels and contrast.
- Acceptance: 0, 1 and 3 result scenarios on desktop and mobile.

## 8. Epic: Business Details

### Goal

Let the user inspect the selected business and qualifying option without implying an external action or persisting task history.

### Technical tasks

1. Add a task-scoped result-to-details transition.
2. Pass the selected business and qualifying option identity from the match result.
3. Recheck current authority, evidence and time validity before opening.
4. Render only supported business and option facts within their evidence scope.
5. Add Back to current valid results and Done to dispose the task.
6. Keep details in memory; do not serialize private Intent/context to URLs or history.
7. Do not call the legacy detail handler that persists `experience.viewed`.
8. Omit route, share, save, contact, purchase, booking and lead actions.
9. Mark stale/ineligible selection and return the user to an allowed correction/resume path.
10. Preserve the distinction between local inspection and V1 Action/Outcome.

### Dependencies

- Experience Rendering selected-result state.
- Matching explanation and evidence scope.
- Session lifecycle and disposal rules.
- Existing presentation components may be reused only with task-safe callbacks.

### Expected files/components/services

Proposed seams:

- Task-scoped details view.
- Details navigation state in the Local Discovery reducer.
- Read-only business/option view model.
- Freshness/eligibility recheck helper.
- No external action service, lead service or outcome writer.

### Acceptance criteria

- Details show the same qualifying option used for eligibility.
- Stale or invalid selection cannot be presented as a current valid match.
- Back preserves only a still-valid current task.
- Done disposes current task content.
- Opening details does not imply contact, visit, purchase, satisfaction or learning.
- No task content or viewed event is persisted.

### Tests required

- Unit: selected-option identity and authority/freshness recheck.
- Integration: result → details → Back and result → details → Done.
- Negative: legacy `viewed` persistence handler is not called.
- Negative: stale offer/evidence blocks or qualifies the state honestly.
- Privacy: no task data in storage, URL, logs or outgoing requests.
- Acceptance: keyboard/mobile/desktop details behavior.

## 9. Dependency graph and suggested execution order

The required order is:

```text
D0 protection/baseline
  ↓
D1 Assistant Shell
  ↓
D2 Intent Flow
  ↓
D3 Context Handling
  ↓
D4 Mock Business Adapter
  ↓
D5 Matching Engine
  ↓
D6 Experience Rendering
  ↓
D7 Business Details
  ↓
D8 integrated validation and delivery evidence
```

The epic-to-task dependency map is:

| Epic | Primary dependency | Cannot start its result path before |
|---|---|---|
| Assistant Shell | Protected baseline | Permission and Consent boundary exists |
| Intent Flow | Assistant Shell | Current revision can be confirmed |
| Context Handling | Intent Flow | Revision/session invalidation exists |
| Mock Business Adapter | Protected baseline | Read-only Directory seam exists |
| Matching Engine | Intent + Context + Adapter | Exact confirmation and evidence are available |
| Experience Rendering | Matching Engine | Result/explanation output exists |
| Business Details | Experience Rendering + Matching | Selected option and freshness checks exist |
| Integrated validation | All epics | Full bounded user journey exists |

Some pure, non-user-facing helpers can be prepared in parallel after D0, such as deterministic date evaluation or evidence predicates. No user-visible result path may bypass the sequence.

## 10. Cross-epic delivery checkpoints

- **CP-0 — Scope:** branch/main protection, approved V2-only file list, exclusions verified.
- **CP-1 — Authority:** Permission and Consent precede capture; ordinary browsing survives denial.
- **CP-2 — Intent:** exact revision confirmation, correction/rejection and stale-result invalidation.
- **CP-3 — Context:** manual constraints only; pause/resume, deadlines and disposal.
- **CP-4 — Evidence:** read-only experimental Directory; no persistent task data or V1 writes.
- **CP-5 — Matching:** same-option eligibility, offer policy, deterministic 0–3 ordering.
- **CP-6 — Presentation:** explanation fidelity, honest empty/unsupported/stale states and accessibility.
- **CP-7 — Details:** local inspection only, no `viewed` persistence or external outcome.
- **CP-8 — Delivery:** regression/build, privacy/network inspection, desktop/mobile acceptance, HANDOFF and checksum.

Each checkpoint requires observable evidence. A mocked function return alone cannot prove permission, storage, network or lifecycle boundaries.

## 11. Overall Definition of Done

The task set is complete when:

- All seven epics meet their acceptance criteria and tests.
- Permission → Consent → Intent → confirmation → Context/evidence → Eligibility → Ordering → Experience → Details is enforced.
- Core, V1 and V2 responsibilities remain separate.
- The exact confirmed revision is the only input to active matching.
- Session-only memory, pause/resume, expiration and disposal behave as approved.
- Evidence is read-only, experimental and scope-limited.
- One qualifying option supports every mandatory condition for each result.
- Results are deterministic, explained, zero to three and one per business.
- Business details are local inspection with no external Action/Outcome.
- No V1/Backend/frozen/main files are changed.
- Runtime, privacy, accessibility, mobile and desktop evidence is recorded.
- No new schema, API, production connector or excluded capability is introduced.

## 12. Explicit exclusions

These tasks do not include:

- AR, camera/spatial capture or product visualization;
- Virtual Storefront or rich catalog browsing;
- Marketplace or module-provider marketplace;
- Production integrations, including production V1/Backend connectors or public deployment;
- database schema, migration, public API or new business/entity model;
- CRM leads, messaging, booking, transactions, payments or publishing;
- persistent preference/profile memory, cross-session inference or transcript retention;
- passive GPS/movement, notifications or automatic resume;
- external LLM processing, telemetry, conversion attribution or outcome learning;
- sponsored placement, paid ranking, popularity ranking or business-triggered exposure.

If an excluded dependency is encountered, the implementation must show an honest unsupported/unavailable state. It must not be introduced as a fallback.

This is an executable task-planning document only. It does not write code, change existing product decisions or claim implementation/commit/Push.

من کدکس هستم
