# MLINO V2 — Pre-Implementation Gate Review

Date: 2026-09-10
Reviewer: Codex, Architecture Gate Reviewer
Reviewed commit: `295d772a91bcd2197dbe3b9520f83c84b9f075b9`
Branch: `astra/visual-system-local-experience`
Primary artifact: [V2 Implementation Readiness Checklist](V2_IMPLEMENTATION_READINESS_CHECKLIST.md)
Reviewed checklist Git blob: `260eda76315cbf18517f2db7f6366a80976b4647`

## 1. Executive Summary

**Final verdict: C) Blocked.**

The approved architecture remains suitable for **Intent-Guided Local Discovery**. This is an implementation-entry verdict: the checklist states the right constraints, but the source documents still contain the authority, orchestration and memory ambiguities identified by the previous review. Listing their required corrections has not applied or closed them.

The earlier **B — Ready with minor changes** assessed architecture direction. This review assesses whether those changes have actually been closed before coding. The remaining work is bounded documentation alignment, not a new architecture, entity, schema or API. An unchecked future runtime test is not a reason for this verdict; conflicting pre-coding instructions and absent closure evidence are.

Product approval of Intent, Matching, Orchestration, Core Assistant ownership and session-only memory is accepted. Historical “proposed/pending” labels do not reopen those decisions. No implementation or runtime approval is issued by this report.

### Evidence and method

The checklist was reviewed against:

- [Architecture Closure Review](V2_ARCHITECTURE_CLOSURE_REVIEW.md), §§2–6, and [Open Decisions](../../OPEN_DECISIONS.md), current closure register.
- [Intent Redesign](INTENT_CONTEXT_CONTRACT_REDESIGN.md), §§3, 5–8, and [Intent Finalization](INTENT_CONTEXT_FINALIZATION.md), §2.
- [Experience Orchestration](EXPERIENCE_ORCHESTRATION_DESIGN.md), §§2–4 and 7.
- [Assistant Ownership](ASSISTANT_OWNERSHIP_DECISION.md), §§4–7, and [Assistant Memory](ASSISTANT_MEMORY_BOUNDARY_DECISION.md), §§4–7.
- [Matching Closure](EXPERIENCE_MATCHING_CLOSURE.md), §§1–3, the [V1/V2 integration draft](../../02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md), and the [existing Directory vocabulary](../../app/src/directory/contract.ts).
- [Frozen V1 Interaction Contracts](../../../ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/architecture/Interaction_Contracts_v1.1_FROZEN.md), IC-06/IC-07: V1 access decisions remain with Governance.

This is a repository-document review, not independent external approval or runtime verification. Graphify navigation was attempted but its CLI failed with “uv trampoline failed to canonicalize script path”; findings below come from the primary files, not graph inference.

## 2. Gate Identity and Traceability

The current request reuses CG identifiers with different meanings. This report follows the request, with the explicit crosswalk below. It does not silently renumber the historical register.

| Current review gate | Corresponding historical item |
|---|---|
| CG-1 — Core / V1 / V2 responsibility | Historical CG-1: Core and authority alignment. |
| CG-2 — Assistant permission, consent and memory | Authority part of historical CG-1; orchestration/active-use part of historical CG-2; memory part of historical CG-3. |
| CG-3 — Initial implementation scope | Checklist purpose and §§2–5; historical scope rules. It is **not** historical CG-3 memory closure. |

Historical CG-2 orchestration remains in scope under current CG-2. A scope pass cannot close the historical memory item. Future closure records must identify the source document and full gate name as well as the identifier.

## 3. Gate Assessments

### CG-1 — Core / V1 / V2 Responsibility Boundary

**Sufficiently defined?** Yes in checklist §§1–3; not yet consistently stated in the governing Assistant/Orchestration documents.

Approved ownership:

| Owner | Responsibility |
|---|---|
| User | Meaning of Intent, exact revision confirmation, correction and withdrawal. |
| V1 Business OS and existing governance owners | Business Context, knowledge/facts, capability and evidence, business action/outcome semantics, and protected access decisions. |
| Shared V2 Experience responsibilities within Core | Permitted Intent processing, relevance, lifecycle, explanation, session working context and orchestration/routing. |
| Modules | Their domain data, rules, evidence and actions under existing domain/governance authority. |

**Remaining risk:** Orchestration §4 uses “Core” for shared Experience coordination while platform Core also includes V1 intelligence. Ownership §5 and Orchestration §3.1 allow an “authenticated or explicitly selected” role without a local qualification that role selection grants no access. These passages could be interpreted as a second authority or as permission to duplicate business intelligence.

**Missing:** Aligned owner/consumer/enforcer wording in those source sections, with selected role/screen/module content explicitly limited to presentation context. The initial slice must contain no protected module operation or V1 write.

**Blocks implementation? Yes — until R2 is applied and closure is recorded.** The checklist already contains the intended answer; no replacement Core model is required.

### CG-2 — Assistant Permission, Consent and Memory Boundary

**Sufficiently defined?** The controlling Intent rules and checklist are strong. Cross-document execution order and lifecycle closure remain incomplete.

Approved rules include separate local-processing permission and meaning confirmation, exact interpretation revisions, current-only task memory, explicit resume, and disposal at the existing session limits.

**Remaining risks and missing evidence:**

1. **Processing order:** The checklist's opening flow begins with interpretation/confirmation and omits the preceding processing-permission decision. Its component table separates permission but does not state its timing. Intent Redesign §6.1 explicitly requires permission **before interpreting task text/signals**. This is an omission to align, not evidence that the checklist affirmatively authorizes pre-consent processing.
2. **Transition authority:** Orchestration §2.1 allows Asking → Matching “after an answer” and admits Matching when clarification has completed. It does not require confirmation of the changed meaning at that transition. Presenting lacks an explicit correction route; the initial-state list omits Completed despite defining it in the table. The prose protects pause, but the “leaves the task” abandonment wording remains ambiguous.
3. **Disposal inheritance:** Memory §§4/4.3 permits answers/corrections/conversation working context; §7 still lists exact cleanup and audit retention as unresolved. Without explicit precedence, this could become a temporary full transcript or an audit exception. Redesign §6.2 already answers current-scope retention.

**Blocks implementation? Yes — R3 and R4 are required.** Confirmation alone cannot authorize processing; permission alone cannot activate an unconfirmed interpretation. Source wording must express both rules at the actual transition.

### CG-3 — Initial Implementation Scope

**Sufficiently defined? Yes, for the bounded first experience.**

The scope is local processing, one task in one tab/session, manual context, experimental Directory evidence, eligibility before deterministic ordering, one independently qualifying option per business, zero to three businesses, and Open Business Details. Incidental offers only enhance valid experiences; explicit discount requirements are eligibility conditions.

**Remaining risks:** Existing GPS, external-model, AR, save/like and sharing paths could be reused in ways that export task content, revive stored Intent or change ranking. Required offer applicability, stock or opening evidence cannot be invented to avoid an empty result.

**Missing:** Runtime proof of isolation and conformance, which belongs after implementation. The definition does not require live V1 or an installed module system.

**Blocks implementation? No additional scope blocker.** Keep the stated exclusions and add the permission-order clarification under R3. CG-1/CG-2 must still close. This scope pass is not permission to code.

## 4. Dependency and Extension Review

### 4.1 V1 dependencies

Checklist §3 correctly separates required ownership compatibility from future live integration. The approved mock slice needs the existing Directory boundary and experimental data; it does not require a new V1 service, authenticated production connector or V1 modification.

Before live integration, source ownership, versioned projection, stable identities, provenance, applicability, availability, freshness/revocation, tenant/access filtering and failure behavior must be agreed. The existing draft is not evidence that these operational contracts are complete. V2 may evaluate source evidence but cannot create business truth or add an outcome/writeback route.

**Disposition:** Adequate for mock Local Discovery; live V1 remains separately gated.

### 4.2 Mock versus real

The checklist correctly limits claims:

- `is_active` is a listing flag, not stock or opening availability.
- `last_synced_at` is a snapshot timestamp, not production freshness proof.
- A business-level offer does not prove a discount on the qualifying product.
- Manual location expresses a search constraint, not physical user presence.
- Open details proves local inspection, not acquisition, visit, purchase or successful fulfilment.

One option must satisfy every mandatory condition; product A's category and product B's price cannot form a match. A product-discount request with only a business-level offer must remain unsupported/ineligible. A valid business-level offer may be described only at that scope as an incidental enhancement.

**Disposition:** Adequate. Do not extend the data contract to make a demonstration pass. Experimental labels must be visible in the future product.

### 4.3 Future AR / Virtual Storefront

The ownership, Intent, eligibility and explanation rules provide a useful foundation. They do not establish readiness to activate these modes.

Missing future prerequisites include option-linked visual assets and rights, scale/geometry or explicit simulation limits, authoritative availability and applicability, camera/spatial permission, anchor precision/freshness, capture retention, cancellation/return behavior, accessible alternatives, and action-specific authorization/outcomes.

Existing AR demonstrations do not close these items. Intent confirmation is not camera permission, and a storefront tap is not purchase or disclosure authorization.

**Disposition:** Future activation is gated; these gaps do not block the local first slice.

### 4.4 Module architecture

Core-owned Assistant plus domain-owned providers is coherent. Content Studio, CRM, Finance, Operations, Analytics and industry modules remain optional. Shared relevance, asking, privacy, cancellation and explanation rules must not be copied into competing assistants.

Provider discovery/versioning, trusted role/tenant provenance, minimum disclosure, provider-side permission checks, denied/unavailable results and cancellation/return contracts are needed before real module handoffs. The Assistant must neither compute a parallel financial/CRM truth nor treat a provider recommendation as a presentation command.

**Disposition:** Modular direction accepted; provider integration is excluded from this implementation. Building a generic module framework is not an entry prerequisite.

## 5. Exact Required Changes Before Coding

All changes below are documentation-level corrections to existing decisions. They are not instructions to implement during this review.

| ID | Exact correction and target | Evidence that closes it |
|---|---|---|
| R1 — Gate identity | Add the §2 crosswalk or explicitly qualified historical/current identifiers to checklist §1 and the current Open Decisions entry. Preserve historical identifiers. | Each previous obligation has a named disposition; current CG-3 scope cannot accidentally close historical CG-3 memory. |
| R2 — Authority alignment | Qualify Core responsibilities in Ownership §§4–5 and Orchestration §§3–4. State user ownership of Intent meaning, existing V1 governance authority, Assistant consumption/enforcement of permission, and no rights from selected role/screen/provider text. Mark module execution as future. | Consistent ownership table plus the role-selection scenario below. No frozen V1 edit. |
| R3 — Processing and orchestration order | Add explicit processing permission before interpretation to the checklist opening flow/component/acceptance wording. Align Orchestration §2 with existing Intent states using a conceptual transition/authority table: capture/clarification, exact revision confirmation, correction, invalidated late results, pause/resume, empty recovery, candidate invalidation and explicit done. | The transition scenarios below have unambiguous expected outcomes; an answer or visibility event never activates matching. No new lifecycle entity required. |
| R4 — Memory precedence | In Memory §§4–7 explicitly apply Redesign §6.2 and Finalization §2.4 to this slice. Retain only necessary current wording/state; discard superseded/rejected content. Mark broader cleanup/audit/handoff proposals as future and unavailable here. | Existing time limits and disposal cases are stated; no temporary full transcript, persistent audit copy or external task-content path is allowed. |

Record closure references in the existing checklist/register and align the current Book/Roadmap status when these edits are completed; preserve review history. Merely checking boxes or adding another approval label is insufficient.

### Minimum documentation acceptance scenarios

| Scenario | Required expected result |
|---|---|
| User selects Finance; provider text requests privileged execution. | Presentation context grants no access or action; no privileged provider or V1 operation exists in this slice. |
| User declines local processing at entry. | No task interpretation/capture; ordinary browsing remains available. |
| User grants processing but does not confirm the interpretation. | Clarification may proceed within the asking limit; no active matching/personalized results. |
| User materially corrects a confirmed goal or answers a material clarification. | New visible revision; old matching/results lose authority; fresh confirmation before matching. |
| User dismisses the clarification. | Silence for that task; no repeated question or automatic broadened match. |
| Tab becomes hidden and visible while still within limits. | Session remains paused; pending results cannot display; only explicit Resume plus current permission/revision/context/evidence checks can continue. |
| Permission is withdrawn or task ends; a late result arrives. | No display/action; dispose task context. Restart requires applicable permission and a new confirmed task. |
| 30 minutes without direct task interaction, two hours since session start, or reload/tab close occurs. | Dispose task; hidden time counts and does not reset clocks. No restored Intent. |
| One optional offer expires. | Remove dependent enhancement; do not expire the user's goal. A required-offer failure makes that candidate ineligible. |
| No qualifying option exists, or user opens details then returns. | Honest empty state or local inspection; neither proves completion. Explicit user-reported done is distinct from business outcome. |

These are required design outcomes for closure. Their executable tests and desktop/mobile/privacy evidence belong to the later implementation/delivery gate, not before the code exists.

## 6. Final Disposition

**C) Blocked.**

Current CG-1 and CG-2 are not closed across the source documents; current CG-3 is adequately bounded. R1–R4 are the exact documentation corrections required. No new product architecture or future live/module/AR contract is necessary to close this local gate.

After the corrections, record acceptance against the scenarios and governing references. Architecture closure and the owner's separate instruction to begin implementation remain distinct. This review request authorizes only this report.

No code, schema, API, implementation, frozen contract or existing design document was changed by this review. No runtime tests were run or claimed.

من کدکس هستم
