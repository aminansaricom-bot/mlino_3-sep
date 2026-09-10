# MLINO V2 — Architecture Closure Review

Date: 2026-09-10
Reviewer: Codex, Principal Architect role
Reviewed baseline: `0495d4ab253020a7a71dfc851c5ec244774cffb2`
Branch: `astra/visual-system-local-experience`

## 1. Executive Summary

**Implementation gate result: B) Ready with minor changes.**

This verdict applies only to **Intent-Guided Local Discovery**: local processing, one task in one tab/session, manual context, experimental directory evidence, zero to three business results, and the user-controlled action **Open Business Details**. It is not approval to implement the entire modular Assistant platform, production integration, or future AR/Virtual Storefront.

The product owner's current instruction establishes Intent Context, Experience Matching, Core ownership of the Assistant, and session-only Assistant memory as approved decisions. Older “recommended/pending approval” labels in the reviewed documents record their authoring history; they do not reopen those approved decisions. Experience Orchestration still needs the three documentation closures in §4.1. No new entity, capability, schema, API, or replacement architecture is needed to close them.

The foundation is coherent: users own Intent; V1 owns business intelligence; V2 owns relevance and experience orchestration; modules supply bounded domain capabilities. The weaknesses are inconsistent descriptions of authority and lifecycle, rather than a need for a different ownership model.

This is a source-based architecture self-review, not independent external approval or runtime verification. No software readiness, scalability measurement, conversion outcome, or production permission is claimed. No implementation starts from this verdict.

### Review evidence and precedence

The following documents were reviewed at the baseline above. The latest explicit product-owner approvals apply together with the governing Intent contract; this review does not amend frozen V1 contracts.

| Evidence | Relevant scope |
|---|---|
| [Intent Redesign](INTENT_CONTEXT_CONTRACT_REDESIGN.md), §§2–3, 5–8 | Exact confirmation revision, active-use authority, disposal, local-only handling, Directory boundary. |
| [Intent Finalization](INTENT_CONTEXT_FINALIZATION.md), §§2, 4 | Hidden-tab pause, explicit resume, 30-minute inactivity/two-hour cap, first-slice exclusions. |
| [Matching Design](EXPERIENCE_MATCHING_DESIGN.md), §§2–5; [Matching Finalization](EXPERIENCE_MATCHING_FINALIZATION.md), §§2–7; [Matching Closure](EXPERIENCE_MATCHING_CLOSURE.md), §§1–3 | Eligibility, ordering, one qualifying option, offer scope, honest outcomes. |
| [Experience Orchestration](EXPERIENCE_ORCHESTRATION_DESIGN.md), §§2–4, 7 | Experience transitions, Assistant postures, Core/module responsibilities and open handoffs. |
| [Assistant Ownership](ASSISTANT_OWNERSHIP_DECISION.md), §§4–7 | Core-owned Assistant, module providers, role and action boundaries. |
| [Assistant Memory](ASSISTANT_MEMORY_BOUNDARY_DECISION.md), §§4–7 | Session working context, source-owned business knowledge, deferred durable memory. |
| [Knowledge Loop Alignment](KNOWLEDGE_LOOP_ALIGNMENT.md), §§3–8 | Conceptual loop, no parallel entities, limits of current learning scope. |
| [V1/V2 integration draft](../../02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md), §§1–5; [existing directory contract](../../app/src/directory/contract.ts) | One-way consumption; current data vocabulary is draft/mock, not a proven live capability feed. |
| [Frozen V1 interaction contracts](../../../ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/architecture/Interaction_Contracts_v1.1_FROZEN.md), IC-05–07, IC-10; [human authorization boundary](../../../ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/governance/ADR-00X-Human-Authorization-Gate.md) | Governance owns access decisions; execution references authorized decisions; learning cannot rewrite original decisions/actions. |

Graphify query was attempted for navigation but failed with “uv trampoline failed to canonicalize script path.” Primary documents and the existing directory contract were read directly; graph output was not regenerated or used as authority.

## 2. Approved Architecture

### 2.1 Core boundary

**Core ownership is accepted, but the word Core needs qualification.** MLINO platform Core includes both the V1 Business OS responsibilities and the shared V2 Experience responsibilities. These are responsibility descriptions within the existing architecture, not two new deployable services or new entities.

| Responsibility | Must remain in the shared architecture | Must not migrate into the Assistant |
|---|---|---|
| V1 Business OS | Business Context, facts/knowledge, goals/KPI semantics, capability evidence, Decision Support, governed Actions, Outcomes, Evaluations and Learning Loop according to existing V1 contracts. | Copies of business truth, a second Event Log, domain calculations, unrestricted training or rewriting V1 decisions. |
| V2 shared Experience layer | User-owned Intent interpretation/confirmation, permitted context, matching policy, lifecycle coordination, source-grounded explanation, session memory, cancellation and routing. | Authority to decide the user's goal, infer sensitive traits, or bypass matching constraints. |
| Shared governance | Identity and tenant boundaries, permission/consent enforcement, access decisions through their existing owners, authorization requirements. | Self-granted access based on a role selection, conversation, screen, or Assistant confidence. |
| Module capabilities | Domain-specific content, records, workflows and evidence through governed owners and extension boundaries. | Module business logic copied into generic orchestration or a competing Assistant. |

Core ownership of the Intent mechanism is stewardship of the contract; **the user still owns the Intent**. Core ownership of consent enforcement does not mean that the Assistant grants consent or supersedes V1 Governance.

Content Studio publishing rules, CRM contact workflows, financial ledger/tax calculations, operational scheduling and industry-specific workflows must not become mandatory generic Experience Core logic. Equally, saying “Core does not own module data” must not erase V1's Business Context, Knowledge or Action governance responsibilities.

Missing clarity is the explicit assignment of these authorities in the newer Assistant wording (CG-1), not a new business intelligence component.

### 2.2 Assistant architecture and scaling

The Core-owned Assistant with module providers is appropriate. It provides one interaction policy across text, details and future visual surfaces, while modules contribute domain expertise. “One Assistant” means one governed interaction model; it does not prescribe one model call, one process, or a global shared user-memory store.

The Assistant should interpret, ask, explain, route and guide. It must consume domain results rather than independently calculate CRM, financial or operational truth. Show/Ask/Guide/Stay Silent should be determined by task value and authority, not by a need to keep a conversation running.

Permission is checked before reading/presenting protected evidence and again before an action. Module content and business text are data, not instructions capable of changing authority. The module/action owner must enforce its own authorization; the Assistant cannot treat routing as permission.

Architectural scalability is supported by bounded capability discovery, minimum context, isolated task lifetimes and module-owned work. The runtime contract for provider availability, cancellation, denied access, result freshness and version compatibility is still deferred. Throughput, reliability and production isolation have not been demonstrated.

### 2.3 V1/V2 contract boundary

The intended split is sound: V1 provides business facts and evidence; V2 consumes them through Business Directory and decides customer relevance and presentation. Existing files establish only a draft, experimental directory vocabulary.

A listing/activity flag does not prove stock, opening hours, booking availability or fulfilment. Business-level offers do not prove a discount on a matched item. An explicit discount requirement remains eligibility; unsupported applicability produces an honest unsupported outcome. Optional offers never create ranking or exposure.

One business result must be supported by one qualifying option satisfying all mandatory conditions. Multiple options cannot be combined into a fictional match or additional slots. Optional comparisons need compatible evidence; otherwise no unsupported price/quality comparison is made.

Potential leakage is in future module “request/action” language. A V2 module handoff cannot be interpreted as a V2→V1 write path. Business OS modules may have governed operational workflows under V1; exposing any of them from V2 requires separate integration and authorization decisions. No such exposure is approved for this slice.

### 2.4 Mandatory Core versus optional modules

| Example module | Optional module-owned capability | Mandatory shared rule |
|---|---|---|
| Content Studio | Drafting/editing content, assets and publishing workflow. | Provenance, access and separate authorization for external publication; a draft is not publication. |
| CRM | Contact records, customer workflow and messaging. | Tenant/recipient access, purpose-limited disclosure and authorization; a detail open never creates a CRM lead automatically. |
| Finance | Ledger, invoices, calculations and payment workflow. | Existing financial/domain owners and execution governance; selected “finance” role never grants access or payment authority. |
| Operations | Scheduling, resources and fulfilment workflows. | Authoritative availability and action outcome semantics; a proposed time is not a reservation. |
| Industry modules | Domain vocabulary, supported services and specialist workflows. | Evidence limits and sensitive-domain boundaries; a category match does not establish clinical or other specialist suitability. |
| Analytics | Domain reports and evaluation capabilities when separately approved. | Valid outcome evidence, access, purpose and retention; viewing a result is not conversion. |

These examples describe future extensions, not installed or approved modules. None is required to implement the initial local discovery experience. Shared governance is mandatory even when only one provider is available.

### 2.5 Future AR / Virtual Storefront foundation

Confirmed Intent, eligible options, explanation, Core-owned interaction and session memory provide the correct conceptual foundation. Rendering does not grant additional data access or action authority.

| Future experience | Missing prerequisites before enabling it |
|---|---|
| Virtual business browsing | Versioned source projection, business/product identity, truthful content and availability, revocation/freshness, permitted browsing/actions and handoff/return rules. |
| Product visualization | Option-linked assets, source/usage rights, geometry/scale or explicit simulation limits, variant/applicability evidence, accessible non-visual alternative. Current image URLs alone do not prove any of these. |
| AR storefront | Above prerequisites plus separate camera/location permission, spatial anchors and precision, stale-anchor handling, occlusion/safe use, failure/offline behavior, frame/spatial retention policy. |
| Contact, booking or purchase | Approved action-specific authorization, disclosure, cancellation/failure and completion contracts. An AR tap cannot authorize these by itself. |

Existing Stage 2 AR demonstrations do not establish these future contracts. Spatial capture, live storefront integration and durable visit history remain outside the new slice.

## 3. Risks

| ID | Finding grounded in current text | Consequence and scope |
|---|---|---|
| CG-1 | Orchestration §§4.1–4.3 and Ownership §§4–5 use “Core” for shared V2 policy while the platform Core includes V1 intelligence. Orchestration §3.1 permits an “authenticated or explicitly selected” role; Ownership describes Assistant/Core action authorization. | Risk of duplicating V1 Governance, granting rights from a selected role, or moving domain truth into Assistant. Clarify authority before coding; do not replace Core ownership. |
| CG-2 | Orchestration §2.1 starts Discovering after confirmation, yet Asking can move to Matching “after an answer” without explicitly requiring a new confirmation. Presenting has no correction/re-match transition. Abandoned includes leaving, while hidden-tab state must be Paused. Completed is in the table but omitted from the initial-state list. | An implementer could skip pre-confirmation capture, match an edited interpretation, treat pause as abandonment, or infer completion. Intent Redesign already supplies the governing answer; the orchestration table must carry it consistently. |
| CG-3 | Memory §§4 and 7 allow answers/corrections in working context and leave “exact cleanup and audit-retention rules” open. Intent Redesign §6.2 already requires current-only wording, discarded superseded/rejected content and no general audit exception; Finalization §2.4 fixes session caps. | “Session-only” could be implemented as a full temporary transcript or an audit copy. Explicit precedence is needed; approved session-only memory is not reopened. |
| F-1 | Ownership §7 and Orchestration §7 leave provider, handoff, role and return contracts unspecified. | Full modular Assistant activation would be premature. Deferred for initial discovery, a blocker when module integration is requested. |
| F-2 | Directory draft and current product/offer fields lack live availability and product-offer association. | Rich visual presentation could overstate evidence. Unknown remains unsupported; no contract extension is implied. |
| F-3 | Assistant and modules could copy domain reasoning or use conversational engagement, business payment or provider order to choose results. | Preserve evidence-based eligibility, no paid ordering, and a common asking budget across surfaces. |
| F-4 | Module invocation, viewing or navigation could be treated as verified outcomes and persisted as learning. | Distinguish user-reported task closure, attempted action and externally verified outcome; no telemetry/writeback in this slice. |

The draft also uses “Asking” for a pre-result interaction and “Experience” for a business opportunity. CG-2 should distinguish the orchestration phase from the selected candidate's lifetime without introducing new domain entities.

## 4. Missing Decisions

### 4.1 Exactly three pre-coding closure items for the initial slice

These are bounded documentation alignments with approved decisions. They are not requests to invent a transport, database, model or new module.

| ID | Required closure | Evidence needed to close | Owner |
|---|---|---|---|
| CG-1 — Core and authority | Distinguish platform Core/V1 responsibilities from V2 shared Experience responsibilities. State that the user owns Intent meaning; Assistant enforces/consumes permissions, never grants them. Selected role/screen is presentation context, not proof of access. Initial slice has no privileged module operations or V1 writes. | Aligned Core/Assistant wording plus scenario: selecting Finance or receiving a module instruction grants neither finance access nor execution. Identify future module-side rechecks and preserve existing V1 authority. | V2 architect; V1 owner reviews any later protected-contract change. |
| CG-2 — Orchestration transitions | Map pre-confirmation capture/clarification to existing Intent states; require current revision confirmation and active-use authority before matching. Describe corrections, stale results, pause/resume, no-match recovery and explicit completion consistently. | A conceptual transition/authority table with the scenarios in §6, preserving one clarification per submitted request and silence after dismissal. Completed in the initial slice means explicit user-reported task closure only; hiding is not abandonment. | V2 product/architecture owner. |
| CG-3 — Memory inheritance | Make Redesign §6.2 and Finalization §2.4 the explicit initial-memory authority. Keep only required current task context; discard superseded/rejected raw wording. Apply existing expiry and no-log/no-storage restrictions. Separate future audit/cache policy from current permission. | Aligned memory text and disposal scenarios: hidden time counts, reload does not restore, withdrawal discards, no transcript in logs/storage/outbound paths. No new retention duration or audit exception. | V2 architect with privacy review for any later expansion. |

Business evidence invalidation should disable only dependent candidates/actions; it must not mark the user's task completed or abandoned. Task expiry/withdrawal invalidates all dependent results. CG-2 must cover this distinction without merging the lifecycles.

### 4.2 Future blockers, not requirements for the initial slice

- Module integration: trusted role/tenant provenance, provider capability/evidence semantics, access checks, minimum disclosure, cancellation/return, failure and completion authority.
- Live V1: agreed versioned read-only projection, freshness/revocation, unknowns, tenant filtering and compatibility; any new write direction needs separate approval.
- Persistent preferences/history: explicit saving and consent plus purpose, edit/delete/expiry, retention and conflict rules. Save/consent alone do not authorize the unapproved capability.
- AR/storefront: the data, spatial, asset, permission and action requirements in §2.5.
- Production/learning: measured performance/reliability, evaluation methodology, access/privacy governance and separately authorized telemetry/retention.

No new entity is required to resolve CG-1–CG-3. Future schema/API needs cannot be inferred from this review.

## 5. Implementation Gate Result

**B) Ready with minor changes.**

The approved design direction is retained. Implementation may be considered only after CG-1, CG-2 and CG-3 are closed in documentation and accepted, and the product owner issues a separate implementation instruction for the bounded slice.

This B verdict does not authorize the full modular platform or mark future dependencies closed. Core ownership and session-only memory are accepted from the current product-owner instruction even though the baseline documents still contain historical proposal labels.

The reason for B rather than a fundamental redesign is that the controlling answers already exist in Intent Redesign, Finalization and frozen V1 authority contracts. The task is to eliminate ambiguous newer wording. These changes are small in design scope but safety-critical in implementation behavior.

## 6. Required Next Steps

1. Align the Orchestration, Ownership and Memory documents for CG-1–CG-3 while retaining their approved ownership/scope and review history.
2. Review the closure against the scenarios below; record each item's disposition. Do not treat repeated “no implementation” wording as evidence that a transition is safe.
3. After acceptance, obtain the separate instruction for local discovery implementation. Reuse existing code and directory boundaries; no module, AR, live V1 or persistent-memory expansion is implied.
4. After any later implementation, run appropriate conformance, runtime and delivery checks. Prior Stage 2 tests do not validate the new architecture.

| Closure scenario | Required behavior for later conformance |
|---|---|
| User submits a goal before any confirmation. | Permissioned interpretation/clarification only; no matching until exact revision is confirmed and matching is requested. |
| User answers a question with a new price/area constraint. | New interpretation revision; old results lose authority; answer alone cannot confirm hidden new meaning. |
| User corrects Presenting while a late result arrives. | Suspend old revision; discard stale result; re-confirm changed meaning before matching. |
| Tab hides, then becomes visible. | Remain Paused; no autonomous matching/presentation; explicit resume rechecks unchanged authority. Hidden time counts toward caps. |
| User dismisses clarification or receives no match. | No repeated prompt after dismissal; honest no-match does not invent a new Intent. Any correction is user initiated. |
| Incidental offer expires; required offer expires. | Remove incidental enhancement without ending a valid underlying discovery; required-offer candidate is ineligible. Neither implies completed Intent. |
| Details open, then user says done. | Opening is only local inspection; explicit done closes the task as user-reported, without inferred visit/purchase or durable outcome. |
| User selects a staff role or module content asks for privileged access. | No elevation, private data retrieval or execution; role selection and provider text confer no authority. |
| Permission is withdrawn, session reaches 30-minute inactivity/two-hour cap, or page reloads. | Stop use and discard task content; no transcript restore or audit exception. Existing unrelated app settings remain outside Assistant memory. |
| Multiple products together meet constraints but none individually does. | No eligible business result. Never pad the zero-to-three list or use payment/offers to repair it. |

### Review delivery

This step creates this report and updates MLINO Book, Roadmap and Open Decisions only. The reviewed architecture sources, implementation, V1/Backend and integration/frozen contracts are unchanged. Source and relative-link consistency are the validation scope; no runtime test is claimed.

The local branch began four commits ahead of its tracking ref. Earlier publication approval remains unresolved; this review does not publish those commits or claim remote availability.

من کدکس هستم
