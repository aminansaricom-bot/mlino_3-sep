# MLINO V2 — Local Discovery Implementation Readiness Checklist

Author: Codex, Product Architect role
Date: 2026-09-10
Architecture baseline: `ccee2c8a4bfffe03430bebb7f6e04f905d2af49b`
Target branch: `astra/visual-system-local-experience`
Gate status: **Not authorized to start implementation until Pre-Implementation Gate is complete**

## Purpose and Approved Slice

This checklist converts the **B) Ready with minor changes** result in [V2 Architecture Closure Review](V2_ARCHITECTURE_CLOSURE_REVIEW.md) into a reviewable implementation-entry gate. It does not grant implementation authority and does not introduce code, schema, API, entity, service or live integration.

The only implementation candidate covered here is **Intent-Guided Local Discovery**:

```text
Explicit user entry
  → local interpretation and exact revision confirmation
  → permitted manual context
  → mock Business Directory capability/evidence
  → eligibility before ranking
  → 0–3 business Experiences
  → Open Business Details
```

The user owns Intent meaning. V1/the authoritative business source owns business facts and evidence. V2 owns customer relevance, Experience selection, explanation and interaction. The Assistant is Core-owned and uses session-only working context.

## How to Use This Checklist

Each required item must have a named document, test, trace, screenshot or review record as evidence. An unchecked item is not assumed complete. “Existing code appears related” is not conformance evidence.

The checklist has four statuses:

- **Required before coding:** architecture/product closure or authority that must exist before implementation begins.
- **Required for the bounded implementation:** behavior that the implementation must provide.
- **Required for delivery:** evidence needed before the implementation can be called validated.
- **Future:** deliberately outside this slice and unable to enter through fallback or convenience.

## 1. Pre-Implementation Gate

Implementation may start only after all items below are checked:

- [ ] **CG-1 — Core and authority alignment is closed.** Documentation distinguishes V1 Business OS responsibilities from shared V2 Experience responsibilities. The user owns Intent meaning. Assistant/Core enforce or consume permission; they do not grant it. A selected role, screen or module response is not access authority.
- [ ] **CG-2 — Orchestration transitions are closed.** Pre-confirmation capture, clarification, exact revision confirmation, correction, stale-result invalidation, pause/resume, no-match recovery and user-reported completion agree with the governing Intent contract.
- [ ] **CG-3 — Memory inheritance is closed.** [Intent Redesign §6.2](INTENT_CONTEXT_CONTRACT_REDESIGN.md#62-data-handling-and-retention-decisions) and [Intent Finalization §2.4](INTENT_CONTEXT_FINALIZATION.md#24-when-confirmation-is-required-again) explicitly govern current-only memory, disposal, the 30-minute inactivity limit, two-hour absolute cap, reload/tab-close behavior and the no-transcript/no-audit-exception rule.
- [ ] Product/architecture review accepts evidence closing CG-1–CG-3 without changing approved ownership or scope.
- [ ] The product owner issues a separate, explicit implementation instruction for this bounded slice.
- [ ] The implementation baseline commit and target branch are recorded before any file changes.
- [ ] `main`, V1, Backend, frozen architecture and protected integration contracts are declared out of the change set.

If any item is unchecked, status remains **DESIGN READY WITH MINOR CHANGES / IMPLEMENTATION BLOCKED**.

## 2. Required Components

These are conceptual/runtime responsibilities, not permission to create a service for each row. Existing V2 code should be reused where it conforms.

| Component | Required behavior | Entry evidence |
|---|---|---|
| Explicit Intent entry | A deliberate user action starts the new task. Existing map/detail/save/like/AR behavior does not silently create Intent. | Approved entry description and acceptance scenario. |
| Local interpretation | Produces visible user-readable meaning and uncertainty; parser output is a hypothesis. No external model fallback. | Confirmed bounded interpretation path. |
| Interpretation revision | Material changes create a new revision. Confirmation is tied to the exact displayed revision. | CG-2 closure and revision scenarios. |
| Processing permission | Local task processing is accepted separately from Intent confirmation. Withdrawal stops use and invalidates late results. | Permission flow and withdrawal scenario. |
| Session/task authority | One foreground task in one tab/session; hidden state pauses; explicit resume rechecks authority; expiry disposes the task. | CG-2/CG-3 closure. |
| Session-only Assistant memory | Keeps only current required wording, confirmed constraints, permitted context and Experience state. Superseded/rejected text is discarded. | CG-3 closure and storage/network inspection plan. |
| Manual context | User-selected area/radius and supported category/floor/time conditions are interpreted as constraints or explicit preferences, never proof of physical presence. | Context precedence scenarios. |
| Business Directory boundary | All business records enter V2 through the existing Directory boundary using mock data for this slice. No direct V1 database/Event Log access. | Dependency review and import trace. |
| Eligibility evaluator | Applies exact goal, exclusions and hard constraints before ordering. Unknown mandatory evidence fails eligibility. | Supported/unsupported/no-match cases. |
| Single-option evidence | One product/service/option within a business satisfies all required conditions. Evidence from different options is never combined. | Positive and false-combined-match cases. |
| Deterministic ordering | Applies user-confirmed optional preference order, then approved distance fallback, then stable business identity. No hidden context score. | Repeatable result-order cases. |
| Offer handling | Explicit offer/discount requirement is eligibility; incidental valid offer only enhances an already valid Experience and never changes ranking. | Offer applicability/expiry cases. |
| Experience Orchestration | Chooses Show, Ask, Guide or Stay Silent using current authority and evidence. One clarification per submitted request; dismissal produces silence for that task. | CG-2 closure and posture cases. |
| Result presentation | Returns zero to three business-level Experiences, at most one slot per business, with reason, evidence scope, unknowns, test-data label and validity. | Result-set scenarios and visual acceptance. |
| Honest empty/unsupported state | Distinguishes no supported match, unsupported requirement and recoverably unusable context/data. It never pads results or weakens constraints. | Empty-state cases. |
| Primary action | Open Business Details is deliberate local inspection. It does not disclose private Intent or prove contact, visit, purchase or completion. | Action and explicit-done cases. |
| Cancellation and late-result guard | Correction, rejection, stop, expiry or permission withdrawal invalidates dependent work before display and action. | Concurrency/stale-result cases. |
| Explanation boundary | Every material claim is traceable to confirmed Intent and allowed mock evidence. No sensitive inference or unsupported quality/availability claim. | Claim/evidence review. |

## 3. Required V1 Dependencies

### 3.1 Required for the mock implementation

No live V1 service, new V1 feature, schema or API is required for the approved mock slice. The required dependency is the **existing read-only conceptual ownership boundary**:

- [ ] Business identity and facts remain V1/business-source-owned.
- [ ] V2 uses the existing Business Directory contract shape and mock snapshot only.
- [ ] Business Directory Service remains the only V1-aware boundary used by matching/experience consumers.
- [ ] V2 creates no V1 write, Event Log write, business mutation or reverse outcome path.
- [ ] Mock records are visibly labelled experimental and cannot be described as live V1 truth.

The current [V1/V2 integration draft](../../02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md) remains a working hypothesis, not a frozen or production contract. Implementation must not “complete” V1 by changing that draft or V1 files inside this slice.

### 3.2 Required before real/live data

These dependencies are **future blockers for live integration**, not prerequisites for mock Local Discovery:

- [ ] V1 owner agrees the actual source and versioned read-only projection.
- [ ] Stable business/organization and option identities are defined across versions.
- [ ] Capability/product/service evidence includes provenance, validity, unknown and withdrawal semantics.
- [ ] Availability semantics distinguish listing/activity, stock, opening, fulfilment, booking and interaction availability.
- [ ] Offer applicability identifies the business/product/service scope and conditions; a business-level offer cannot imply a product discount.
- [ ] Freshness, revocation, eventual consistency and stale-result behavior are agreed.
- [ ] Tenant and access filtering occur under the existing V1 Governance authority.
- [ ] Compatibility, failure, offline and recovery behavior are reviewed.
- [ ] Any V2→V1 or external action direction receives separate architecture and authorization approval.

## 4. Mock Versus Real Boundary

| Concern | Mock slice may claim | It must not claim | Requirement before real use |
|---|---|---|---|
| Business record | A named experimental record exists in the loaded snapshot. | Verified/live business identity or current operational truth. | Authoritative identity projection and tenant/access rules. |
| Product/service | The record lists the named item/service. | Stock, fulfilment, suitability, quality or guarantee. | Capability and availability evidence with provenance. |
| Price | Experimental listed amount/currency for the same option. | Live, cheapest, affordable or comparable without a common basis. | Current price source, unit/currency and comparison rules. |
| Offer | Time-valid business-level offer with explicit experimental scope. | Product-specific discount, redeemability, stock or hidden conditions. | Option applicability, conditions, revocation and freshness. |
| `is_active` | The mock listing flag is set. | “In stock,” “open now,” bookable or fulfilment-ready. | Separate authoritative availability vocabulary. |
| `last_synced_at` | Snapshot carries a timestamp. | Production freshness or guaranteed truth. | Agreed freshness SLA, provenance and stale behavior. |
| Location | Listed coordinates/building/floor satisfy user-selected search constraints when present. | User presence, route time, accessibility or visit. | Permissioned device/spatial contract and field validation. |
| Matching | Deterministic experimental result meets supported rules. | Learned personal relevance, commercial success or business acquisition. | Approved evaluation methodology and real evidence. |
| Open details | User inspected a local surface. | Contact, lead, visit, purchase, satisfaction or completed outcome. | Action-specific contract and verifiable outcome semantics. |

Every Experience must display the experimental-data limitation near the result or explanation. It cannot rely only on a repository document that end users do not see.

## 5. Explicitly Out of Scope

The implementation instruction for this checklist must exclude:

- live V1 integration, V1/Backend/frozen-contract changes and new V2→V1 writes;
- schema, migration, public API or a new business/entity model;
- production/public deployment, scale, reliability or legal-compliance claims;
- durable/saved Intent, user profile, preference memory, transcript, cross-session/tab/device continuity or concurrent tasks;
- passive GPS/movement, background context, automatic resume, proactive notification or reminders;
- external LLM/model processing, training, telemetry, conversion attribution or aggregate learning;
- sponsored placement, paid ranking, popularity/engagement ranking or business-triggered exposure;
- CRM lead creation, business messaging, booking, transaction, payment, publishing or operational execution;
- module provider integration and privileged role-based module actions;
- comparison mode beyond approved result explanation;
- new AR behavior, camera/spatial capture, product visualization or Virtual Storefront;
- claims of live stock, open status, fulfilment, redeemability, visit, purchase or satisfaction.

An out-of-scope dependency must produce an honest unavailable/unsupported result. It must not trigger a fallback that broadens the request or calls an existing external path.

## 6. Validation Criteria

### 6.1 Architecture and scope conformance

- [ ] CG-1–CG-3 are closed and accepted before implementation begins.
- [ ] A trace maps every implementation responsibility to an approved document section.
- [ ] Changed files are limited to the authorized V2 implementation, tests and governance artifacts.
- [ ] No V1, Backend, frozen architecture, protected contract or `main` change exists.
- [ ] Existing Stage 1/Stage 2 behavior is preserved unless the implementation instruction explicitly changes it.
- [ ] No new entity/service is introduced solely to mirror a conceptual lifecycle term.

### 6.2 Intent, permission and lifecycle behavior

- [ ] Unconfirmed explicit or implicit interpretations never reach matching.
- [ ] High confidence never replaces exact revision confirmation.
- [ ] Answering a material clarification creates a visible new revision requiring confirmation.
- [ ] Correction suspends old authority; late old results cannot display or act.
- [ ] Hidden/background state pauses; visibility alone cannot resume.
- [ ] Explicit resume of unchanged meaning rechecks permission, deadline, context and evidence.
- [ ] Dismissed clarification is not repeated in that task.
- [ ] Permission withdrawal, reload/tab close, 30-minute inactivity or two-hour cap stops use and disposes task content.

### 6.3 Matching and evidence behavior

- [ ] Eligibility runs before ordering; hard constraints and unknown mandatory evidence cannot be overridden.
- [ ] Context has exactly one approved role and is not double-counted.
- [ ] One qualifying option satisfies all mandatory conditions for each business result.
- [ ] Multiple products cannot form a false combined match.
- [ ] Result count is exactly the eligible set capped at three; zero and one are valid.
- [ ] Ordering is deterministic for identical permitted inputs/evidence.
- [ ] Payment, popularity, promotion, engagement and business requests do not change retrieval, eligibility, slot count, order or timing.
- [ ] Incidental offer expiry removes only the enhancement; required-offer expiry makes that candidate ineligible without ending Intent.
- [ ] Missing availability/product-offer applicability produces unknown or unsupported, never a fabricated positive claim.

### 6.4 Assistant, memory and privacy behavior

- [ ] Assistant can Show, Ask, Guide and Stay Silent without inventing a conversational response.
- [ ] A selected role/screen and module/business content cannot elevate access or trigger an action.
- [ ] Only the minimum current task context exists in Assistant memory.
- [ ] Superseded/rejected raw wording is discarded; no full transcript is retained.
- [ ] Intent content does not enter browser persistent storage, URL, service-worker cache, crash/console log, telemetry, external model prompt or business/map request.
- [ ] Open details does not disclose private Intent/context to the business.
- [ ] Sensitive traits are neither inferred nor stored.

### 6.5 Product and visual behavior

- [ ] Mobile and desktop flows cover explicit entry, interpretation, confirmation, matching, result, details, correction, empty/unsupported, pause/resume and expiry.
- [ ] Every result explains why it qualifies and identifies experimental evidence/unknowns.
- [ ] Keyboard, focus, screen-reader labels, contrast, loading and error states are reviewed.
- [ ] The Assistant does not require chat to complete Local Discovery.
- [ ] No-map/offline/mock-load failure returns an honest recoverable state where applicable.
- [ ] Existing theme and Stage 2 nearby/share behavior remain usable.

### 6.6 Engineering and delivery evidence after future implementation

- [ ] TypeScript/build checks pass.
- [ ] Existing tests pass and new tests cover authority, stale-result, eligibility, single-option, ordering, offer, memory and privacy boundaries.
- [ ] Live desktop/mobile validation is recorded against the exact commit.
- [ ] The implementation diff and generated output contain no unintended V1/frozen/main or unrelated refactor.
- [ ] HANDOFF report records behavior, limits, exact commands/results, changed files and known gaps.
- [ ] Required checksum, HANDOFF_STATE, MLINO Book and CHANGELOG are updated under the existing Astra protocol.
- [ ] Commit and branch identities are recorded.
- [ ] Remote availability is claimed only after successful push and independent remote-hash verification.
- [ ] A post-implementation architecture/runtime gate confirms the implemented behavior matches this checklist.

## 7. Readiness Decision Record

Current status at creation:

- Architecture direction: **B — Ready with minor changes**.
- Implementation authority: **BLOCKED pending CG-1–CG-3 closure, acceptance and a separate owner instruction**.
- Mock Local Discovery dependencies: identified and bounded.
- Live V1, modules, AR/Virtual Storefront and persistent memory: future, not part of this gate.
- Code/schema/API changes in this step: none.

When the Pre-Implementation Gate is fully checked, this document may be referenced by the separate implementation instruction. It does not turn itself into that instruction.

من کدکس هستم
