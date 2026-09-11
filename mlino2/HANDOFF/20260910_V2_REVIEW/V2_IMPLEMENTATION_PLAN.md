# MLINO V2 — Local Discovery Implementation Plan

Date: 2026-09-10
Role: MLINO V2 Technical Product Architect
Architecture gate: **A — Ready for implementation**
Branch: `astra/visual-system-local-experience`
Initial experience: **Intent-Guided Local Discovery**

This is a planning document only. It creates no code, schema, API, migration, V1 feature, module or runtime behavior.

## Technical design reference

[V2_TECHNICAL_ARCHITECTURE_DESIGN.md](V2_TECHNICAL_ARCHITECTURE_DESIGN.md) maps this approved plan to the existing frontend, local application-domain responsibilities, Directory/V1 boundary, session authority, matching policy and testing seams. The technical design is prepared for review; it does not start implementation or expand this plan's scope.

## 1. Approved flow and ownership

```text
Permission
  → Consent
  → Intent interpretation
  → Exact current revision confirmation
  → Context constraints
  → V1 capability/evidence
  → Eligibility
  → Deterministic ranking
  → Experience
  → Open Business Details
```

MLINO Core owns Intent mechanisms, Permission, Consent, session lifecycle, Experience orchestration and Routing. The user owns Intent meaning and consent. V1 owns business truth, Capability, Evidence, Availability, Recommendations, Actions and Learning. V2 owns Matching, Experience and Interaction. The Assistant coordinates these boundaries; it is not a business-logic owner, cannot create facts or capabilities and cannot bypass permissions.

The first slice is local, single-session, experimental data, one foreground task and one tab/session. It returns zero to three business-level results, at most one result per business. One qualifying option must satisfy every mandatory user condition.

## 2. Implementation phases

### Phase 0 — Entry and protection

Record the exact baseline and branch, preserve `main`, V1, Backend, frozen architecture and protected contracts, trace changes to approved design documents, and confirm that live V1, external models and module actions are excluded.

Exit evidence: baseline record, protected-file list, scope record and a separate implementation instruction.

### Phase 1 — Permission, consent and task entry

1. Check that the local operation and requested data use are within approved authority.
2. Obtain explicit scoped consent for local processing for this purpose and session.
3. Only then capture and interpret task text/signals.
4. Keep ordinary browsing available when permission or consent is declined.

Consent does not confirm Intent. Existing browsing, save, like, theme and Stage 2 actions do not silently create a task. Withdrawal stops processing, invalidates late results and disposes task context.

### Phase 2 — Intent interpretation and confirmation

Produce a readable candidate interpretation and uncertainty. Separate explicit statements from local hypotheses. Material edits or clarification answers create a new visible revision. Only the exact confirmed revision may reach Matching. Confidence is separate from confirmation. Support rejection, correction, stop and one useful clarification per submitted request; dismissal produces silence for that task.

### Phase 3 — Context and business evidence

Use only deliberately supplied context such as area, radius, building, floor, category, service, deadline or confirmed preference. Context constrains the confirmed goal; it is not a hidden relevance score or proof of physical presence.

Read records through the existing Business Directory boundary and experimental/mock snapshot. Do not access V1 databases/Event Logs directly and do not write back to V1.

### Phase 4 — Eligibility and ranking

Apply the confirmed goal, exclusions and hard constraints before ordering. Unknown mandatory evidence is unsupported. One option inside a business must satisfy all mandatory conditions; evidence from multiple products cannot be combined.

An explicit offer/discount request is an eligibility condition. An incidental valid offer only enhances an already valid experience. Payment, promotion, popularity and business requests cannot bypass relevance.

Rank eligible businesses by confirmed optional preferences, then supported distance fallback, then stable business identity. Return the eligible set capped at three, including zero and one-result outcomes.

### Phase 5 — Experience orchestration and Assistant

The Core-owned Assistant may Show, Ask, Guide or Stay Silent. It may explain a valid experience, accept correction, pause, resume after explicit user action and route to local details.

It may not own business logic, create facts/capabilities, bypass permission/consent/eligibility, infer sensitive attributes, treat visibility/confidence/clicks as confirmation, or activate modules, AR, external models or persistent memory through fallback.

Hidden/background state pauses the task. Visibility alone never resumes Matching. Explicit Resume rechecks consent, exact revision, deadline, context and evidence.

### Phase 6 — Presentation and details

Each result shows the business, the single qualifying option, reason, evidence scope, experimental-data label, unknowns and supported action. Open Business Details is local inspection only; it does not prove contact, lead, visit, purchase or satisfaction.

Empty, unsupported, stale, expired and unavailable states must be explicit. The UI must not pad results, weaken hard constraints or invent live claims.

### Phase 7 — Validation and delivery

Run automated checks, privacy/storage/network inspection and mobile/desktop validation. Review the exact diff for V1/frozen/main protection and unrelated refactoring. Complete HANDOFF, checksum, HANDOFF_STATE, Book, Roadmap, Open Decisions and Changelog requirements. Commit locally; claim Remote delivery only after successful Push and independent hash verification.

## 3. Frontend responsibilities

Frontend presents permission and consent, collects task input and supported manual context, displays the current revision and confirmation control, blocks Matching until authority exists, renders 0–3 explained experiences, and provides correction, stop, pause, Resume and explicit done.

It renders honest empty, unsupported, stale, expired and unavailable states; opens local business details without exposing private Intent/context; supports keyboard, focus, labels, contrast, loading and recoverable errors; and preserves existing theme and Stage 2 nearby/share behavior.

Frontend does not embed business truth, invent availability, rank by payment, infer sensitive data or turn UI events into outcomes.

## 4. Backend and boundary responsibilities

The approved mock slice requires no new production backend, public API or V1 feature.

The existing boundary must load a clearly labelled experimental/mock Directory snapshot, provide deterministic read-only inputs, preserve source ownership of facts/evidence, mark unknown availability/applicability/freshness as unsupported, isolate task context from persistent storage and external requests, invalidate late results, and perform no V1/Event Log write, reverse outcome path or module execution.

A future live integration requires a separately approved versioned read-only V1→V2 projection with stable identities, provenance, validity, availability semantics, offer applicability, freshness/revocation, tenant filtering and compatibility rules.

## 5. Mock versus Real boundary

| Area | Mock may claim | Mock must not claim | Before real use |
|---|---|---|---|
| Business identity | Named record in experimental snapshot | Verified current operational identity | Authoritative identity projection and tenant rules |
| Product/service | Listed option and experimental description | Stock, quality, suitability or fulfilment | Capability and availability evidence |
| Price | Listed amount/currency for the option | Live cheapest or affordability | Current source and comparison rules |
| Offer | Time-valid offer at stated scope | Product discount, redeemability or stock | Option applicability and freshness |
| `is_active` | Listing flag is set | In stock, open, bookable or ready | Separate availability vocabulary |
| `last_synced_at` | Snapshot timestamp | Production freshness guarantee | Freshness and stale-result policy |
| Location | Listed location matches selected constraints | User presence, route time or visit | Permissioned spatial/device contract |
| Matching | Deterministic experimental result | Learned relevance or acquisition outcome | Approved evaluation and real evidence |
| Details | Local inspection | Lead, contact, visit, purchase or satisfaction | Action-specific outcome contract |

The experimental-data limitation must be visible near each result or explanation.

## 6. Required contracts

These are conceptual contracts, not permission to create schema or API:

1. Authority: user owns Intent meaning; Core enforces Permission/Consent/session rules; V1 Governance owns protected access.
2. Processing: Permission → Consent → Interpretation → exact revision confirmation → Eligibility/Ranking → Experience.
3. Intent revision: material changes create a visible revision; only the confirmed current revision may match.
4. Context: manual context is a constraint or confirmed preference, never proof of presence or independent ranking.
5. Directory: V2 consumes the existing read-only Directory shape and mock snapshot.
6. Evidence: claims use the same qualifying option and evidence scope; unknown mandatory facts fail eligibility.
7. Offers: explicit offer requirements are eligibility; incidental offers enhance valid matches only.
8. Results: zero to three businesses, one qualifying option per business, deterministic ordering and explanation.
9. Orchestration: Show, Ask, Guide and Stay Silent respect authority, fatigue limits, pause/resume and no-match recovery.
10. Memory: session-only current context; correction replaces old wording; terminal events dispose content; no transcript or persistent task storage.
11. Action: Open Business Details is local inspection and does not imply an external outcome.
12. Failure: denied, unsupported, stale, empty and expired states are explicit and recoverable only through an allowed user action.

## 7. V1 dependency points

V1 remains authoritative for Business truth, Business Context, capabilities, products/services, evidence, availability, Recommendations, Actions, Outcomes, Evaluations, Learning, governance, tenant and protected access decisions.

V2 consumes these concepts read-only through the Directory boundary and owns relevance, experience selection and interaction. V2 does not duplicate V1 calculations, rewrite V1 truth or infer Outcomes/Learning from views, shares, proximity or details opens.

Before live integration, the V1 owner must approve source projection, version, identifiers, provenance, unknown/withdrawal behavior, availability vocabulary, offer applicability, freshness and tenant filtering. These are future gates, not requirements of the mock slice.

## 8. Testing strategy

### Architecture and scope

Verify authorized V2-only changes, no V1/Backend/frozen/main changes, visible mock labels, the read-only boundary and no new entity/service solely for a conceptual lifecycle term.

### Intent, permission and lifecycle

Test denial before capture, separation of consent and confirmation, rejection of unconfirmed revisions, new revisions after clarification/correction, invalidation of old results, dismissal silence, pause on hidden state, explicit Resume checks, withdrawal, reload/tab close, 30-minute inactivity, two-hour cap, no transcript, no persistent storage and no external task-content request.

### Matching and evidence

Test eligibility before ranking, hard constraints, unknown mandatory facts, single-option evidence, false combined-product matches, explicit offer applicability, incidental-offer expiry, deterministic ordering capped at three, no paid/popularity/promotion override and honest empty/unsupported/stale outcomes.

### Product and delivery

Validate mobile and desktop flows, keyboard/focus/screen-reader/contrast, loading and recoverable failures, Assistant-independent completion, type/build/existing tests, targeted boundary tests, exact-commit HANDOFF and checksum verification.

## 9. Definition of Done

- Permission and scoped Consent precede capture and interpretation.
- Exact current revision confirmation precedes Matching.
- Context is constraints/preferences only.
- Existing Directory boundary and experimental data are used.
- Eligibility precedes deterministic ranking.
- Every result has one qualifying option and visible evidence limits.
- Results are 0–3, one per business, with honest empty/unsupported states.
- Offer, correction, cancellation, pause/resume, stale-result and expiry behavior conform.
- Session memory is current-context-only, disposed on terminal events and never retained as transcript.
- Open Business Details remains local inspection.
- No V1 write, module action, external model, AR, Virtual Storefront or persistent memory is introduced.
- Automated, privacy, accessibility, mobile and desktop evidence is recorded.
- HANDOFF, checksum, Book, Roadmap, Open Decisions and Changelog follow protocol.
- Exact branch/commit are recorded; Remote is reported only after verified Push.

## 10. Explicit exclusions

This plan excludes:

- AR implementation, camera/spatial capture and product visualization;
- Virtual Storefront implementation;
- full module marketplace and module-provider integration;
- production V1/Backend integrations and public deployment;
- new schema, migration, public API or business/entity model;
- live stock, opening, booking, fulfilment or redeemability claims;
- CRM leads, messaging, booking, transactions, payments or publishing;
- durable Intent, profile or preference memory;
- transcript retention, cross-session inference and persistent task storage;
- passive GPS/movement, background matching, notifications and automatic resume;
- external LLM processing, training, telemetry, conversion attribution and aggregate learning;
- sponsored placement, paid ranking, popularity ranking and business-triggered exposure.

An excluded dependency must produce an honest unavailable/unsupported state; it cannot enter through fallback or broaden the request.

This plan defines the work for the separately authorized implementation step. It does not start implementation.

من کدکس هستم
