# MLINO V2 — Local Discovery Implementation Readiness Checklist

Author: Codex, Product Architect role
Date: 2026-09-10
Architecture baseline: `ccee2c8a4bfffe03430bebb7f6e04f905d2af49b`
Target branch: `astra/visual-system-local-experience`
Gate status: **Documentation alignment applied; closure acceptance and separate implementation instruction pending**
Alignment: [V2 Gate Alignment Update](V2_GATE_ALIGNMENT_UPDATE.md), 2026-09-10, addresses [Pre-Implementation Review](V2_PRE_IMPLEMENTATION_GATE_REVIEW.md) R1–R4.

## Purpose and Approved Slice

This checklist converts the **B) Ready with minor changes** result in [V2 Architecture Closure Review](V2_ARCHITECTURE_CLOSURE_REVIEW.md) into a reviewable implementation-entry gate. It does not grant implementation authority and does not introduce code, schema, API, entity, service or live integration.

The only implementation candidate covered here is **Intent-Guided Local Discovery**:

```text
Permission
  → Consent
  → Intent interpretation / minimal clarification
  → User confirmation of the exact current interpretation revision
  → Matching: eligibility before ranking
  → Experience
  → User-controlled Open Business Details
```

Permission means checking that the requested local operation and data use are allowed within the approved scope and existing access authority. Consent is the user's explicit, informed agreement to this local purpose and session lifetime before task text/signals are captured or interpreted. This names two checks within the existing processing boundary; it creates no permission entity, API, live V1 dependency or requirement for two separate dialogs. A selected role is presentation context only. Consent cannot authorize an excluded capability, and neither permission nor consent replaces the user's confirmation of the exact interpretation revision. Denial leaves ordinary browsing available without Intent capture.

Matching uses permitted manual context and the existing mock Business Directory. It returns 0–3 businesses, one qualifying option per business.

| Responsibility | Owner and boundary |
|---|---|
| Intent, Permission, Consent, Session lifecycle, Experience orchestration, Routing | MLINO Core owns the shared mechanisms and enforcement policy. The user owns Intent meaning and grants consent; Core/Assistant do not self-grant rights or replace existing V1 Governance. |
| Business truth, Capability, Evidence, Availability, Recommendations, Actions, Learning | V1 and its existing business/domain/governance owners remain authoritative. Availability must be evidenced; a listing flag is not stock/opening status. Business Recommendations/Actions/Learning are not V2 relevance, local navigation or task completion. |
| Matching, Experience, Interaction | V2 owns user relevance, experience selection/presentation and interaction within Core's shared constraints; it consumes business evidence read-only. |
| Domain modules | Providers retain their domain data, rules, capabilities and authorized actions under V1/domain governance. Core coordination does not copy their intelligence. No module integration is enabled in the initial slice. |

These describe responsibilities in the existing platform, not new services or a transfer of V1 authority. The Assistant is not a business logic owner; it cannot create capabilities or facts, bypass permissions, or use role selection, screen context or provider text as access authority.

## How to Use This Checklist

Each required item must have a named document, test, trace, screenshot or review record as evidence. An unchecked item is not assumed complete. “Existing code appears related” is not conformance evidence.

The checklist has four statuses:

- **Required before coding:** architecture/product closure or authority that must exist before implementation begins.
- **Required for the bounded implementation:** behavior that the implementation must provide.
- **Required for delivery:** evidence needed before the implementation can be called validated.
- **Future:** deliberately outside this slice and unable to enter through fallback or convenience.

## 1. Pre-Implementation Gate

Implementation may start only after all items below are checked:

The canonical gate names below replace the checklist's earlier numbering. Historical CG-1 maps to current CG-1 (responsibility) and CG-2 (authority). Historical CG-2 orchestration and historical CG-3 memory both map to current CG-2. Current CG-3 covers scope; it cannot close the historical memory item. Original reviews retain their historical identifiers.

- [x] **CG-1 — Core / V1 / V2 responsibility boundary: documentation aligned.** Core owns shared Intent/Permission/Consent/Session/Orchestration/Routing mechanisms; user meaning and V1 truth/governance ownership remain intact. See Ownership §§4–5 and Orchestration §4.
- [x] **CG-2 — Assistant permission, consent and memory boundary: documentation aligned.** Permission check and explicit scoped consent precede interpretation; exact revision confirmation precedes Matching. Correction, late-result invalidation, pause/resume, disposal and explicit done are aligned. See Orchestration §§1–2 and Memory §4.4.
- [x] **CG-3 — Initial implementation scope: documented and preserved.** Local single-task/session, manual context, experimental Directory, 0–3 businesses and Open Business Details. No live/module/AR/persistent-memory expansion. See §§2–5.

These three checks record completion of documentation corrections only. They are not independent closure acceptance or runtime evidence. [Alignment §6](V2_GATE_ALIGNMENT_UPDATE.md#6-closure-evidence) maps R1–R4 and their acceptance scenarios.

- [ ] Product/architecture review accepts evidence closing CG-1–CG-3 without changing approved ownership or scope.
- [ ] The product owner issues a separate, explicit implementation instruction for this bounded slice.
- [ ] The implementation baseline commit and target branch are recorded before any file changes.
- [ ] `main`, V1, Backend, frozen architecture and protected integration contracts are declared out of the change set.

If any required entry item is unchecked, implementation remains **NOT AUTHORIZED**. The previous C review is preserved as historical evidence; this update does not issue a replacement architecture verdict.

## 2. Required Components

These are conceptual/runtime responsibilities, not permission to create a service for each row. Existing V2 code should be reused where it conforms.

| Component | Required behavior | Entry evidence |
|---|---|---|
| Explicit Intent entry | A deliberate entry checks allowed local processing and obtains scoped consent before task capture. Existing map/detail/save/like/AR behavior does not silently create Intent. | Approved entry description and acceptance scenario. |
| Local interpretation | Produces visible user-readable meaning and uncertainty; parser output is a hypothesis. No external model fallback. | Confirmed bounded interpretation path. |
| Interpretation revision | Material changes create a new revision. Confirmation is tied to the exact displayed revision. | CG-2 closure and revision scenarios. |
| Processing permission and consent | Check allowed scope/authority, then obtain explicit consent before text/signals are captured or interpreted. Exact-revision confirmation is separate and required before Matching. Withdrawal stops use and invalidates late results. | CG-2 processing order and denial/withdrawal scenarios. |
| Session/task authority | One foreground task in one tab/session; hidden state pauses; explicit resume rechecks authority; expiry disposes the task. | CG-2 lifecycle alignment. |
| Session-only Assistant memory | Keeps only current required wording, confirmed constraints, permitted context and Experience state. Superseded/rejected text is discarded. | CG-2 memory alignment and storage/network inspection plan. |
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

- [ ] Allowed-operation check and explicit scoped consent precede any task-text/signal capture or interpretation; denial leaves ordinary browsing available.

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

Current aligned status (original creation baseline retained above):

- Architecture direction: **B — Ready with minor changes**.
- Documentation status after alignment: **CG-1–CG-3 corrections applied**, mapped to review R1–R4; see the alignment record.
- Implementation authority: **NOT AUTHORIZED pending closure acceptance and a separate owner instruction**.
- Mock Local Discovery dependencies: identified and bounded.
- Live V1, modules, AR/Virtual Storefront and persistent memory: future, not part of this gate.
- Code/schema/API changes in this step: none.

When the Pre-Implementation Gate is fully checked, this document may be referenced by the separate implementation instruction. It does not turn itself into that instruction.

من کدکس هستم
