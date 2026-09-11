# MLINO V2 — Experience Orchestration Design

Author: Codex, Product Architect role
Status: **Approved design direction; documentation aligned for closure review; no implementation authorized**
Alignment: [V2 Gate Alignment Update](V2_GATE_ALIGNMENT_UPDATE.md), 2026-09-10. Approved architecture is retained; required documentation corrections are applied for closure review. No implementation is authorized.
Scope: bounded V2 local, single-session, experimental experience layer.

This document defines how MLINO chooses and guides an experience after confirmed Intent, permitted Context, eligible Business Capability, and evidence are available. It does not define UI, schema, API, code, persistence, or a new V1 capability.

## 1. Purpose

Experience Orchestration is the policy and coordination layer between matching and user action. It decides which supported experience mode is appropriate, whether a minimal question is needed, when the system should remain silent, and which user-authorized next action can be offered.

The orchestrator must preserve the existing order:

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

Matching also requires permitted manual context and source-owned mock capability/evidence. Context constrains fulfilment of the confirmed goal; it is not an independent relevance score.

Orchestration changes how a valid opportunity helps the user. It does not manufacture Intent, repair missing evidence, override eligibility, or turn a business request into a user need. The first mode remains **Intent-Guided Local Discovery** with zero to three business results and **Open Business Details** as the supported matching-owned action.

## 2. Experience Lifecycle

The Experience lifecycle is separate from the Intent, offer, and session lifecycles. An Experience is a transient, explainable opportunity tied to one confirmed Intent interpretation and one evidence evaluation.

### 2.1 Phases and authority

The following is a conceptual transition table, not a schema or a new entity. Pre-confirmation Discovering/Asking describes orchestration around the existing Hypothesized Intent stage; no business Experience exists until eligibility and selection. Paused is the existing session/Intent authority condition, not an offer state.

| Phase/condition | Required authority and meaning | Transition and invalidation rule |
|---|---|---|
| Entry before capture | Check allowed local operation, then obtain explicit scoped consent. | Decline returns to ordinary browsing without capture/interpretation. Acceptance permits local interpretation only. |
| Discovering / Hypothesized | Permitted local interpretation of current wording; no active business matching. | Show the exact candidate meaning for confirmation, or Ask once if a material ambiguity blocks it. |
| Asking | At most one clarification per submitted request under the existing asking budget. | An answer updates the visible interpretation revision; it is not automatic confirmation or Matching. Dismissal/rejection ends that clarification and produces silence for that task. |
| Confirmed → Active → Matching | User has confirmed the exact current revision; consent, session, context and evidence checks allow active use. | Evaluate eligibility before ranking. Only current authorized results may reach Presenting. No external-model fallback. |
| Presenting | Show 0–3 independently eligible business results or an honest empty/unsupported state. | Explicit details action → Acting; material correction → Hypothesized new revision and suspend old result authority; explicit done → Completed. No automatic relaxation or repeated question after an empty result. |
| Acting | Only deliberate Open Business Details, with current task/result authority checked again. | Return → Presenting if still valid; otherwise unavailable/paused/expired as applicable. A detail open does not complete the task. |
| Paused session | Explicit pause or hidden/background event suspends matching and pending-result display authority. Existing minimum context remains only within the original clocks. | Visibility alone does nothing. Explicit Resume rechecks consent, exact revision, deadline, context and evidence. Unchanged authorized meaning may continue; material change needs new revision confirmation; expiry cannot resume. |
| Completed | Explicit user-reported done; maps to existing Intent Ended/task disposal. | Terminal for this task; no inference of business success, visit, purchase or learning. |
| Abandoned / rejected / stopped | Explicit task rejection, dismissal or stop, never mere hidden state. | End/dispose task and invalidate pending work. A fresh task needs applicable consent and new confirmation. |
| Expired task/session | Existing deadline, 30-minute inactivity or two-hour cap, or session-ending reload/navigation/tab close. | Dispose task and disable all dependent results; no restoration or automatic restart. |
| Invalid/unavailable candidate | Supporting business evidence becomes false/unknown. | Invalidate only dependent claims/actions. The user Intent may remain Active. Offer explicit refresh/edit; do not infer completion, abandonment or change the goal. |

Comparing and verified external completion remain future modes and do not belong to the initial slice. Completed by explicit user-reported task closure is included. An answer alone never grants active matching authority.

### 2.2 Authority, correction and memory rules

- Material changes to meaning, constraints, destination, radius, floor, task window or action scope create a visible new revision requiring confirmation. Pending work from an old revision loses display/action authority immediately.
- User permission/consent withdrawal stops processing, invalidates late results and intent-specific actions, and disposes task content. Confirmation cannot substitute for renewed consent.
- Hidden time counts toward 30 minutes without direct task interaction and the two-hour absolute session cap. Resume does not reset or extend the cap.
- Empty/unsupported is a valid Presenting outcome. Only an explicit supported edit/refresh may request another evaluation under current authority; hard constraints are never weakened.
- An incidental offer expiry removes its enhancement; expiry of a required offer makes its candidate ineligible. Neither event expires the user's goal.
- Every result identifies purpose, same qualifying option, evidence scope, unknowns and the supported action. One option must satisfy all requirements.
- Session-only memory follows [Intent Redesign §6.2](INTENT_CONTEXT_CONTRACT_REDESIGN.md#62-data-handling-and-retention-decisions), [Finalization §2.4](INTENT_CONTEXT_FINALIZATION.md#24-when-confirmation-is-required-again) and [Assistant Memory §4.4](ASSISTANT_MEMORY_BOUNDARY_DECISION.md#44-current-session-cleanup-and-disposal). There is no transcript/audit-retention exception.

## 3. Assistant Layer Concept

The MLINO Assistant is a persistent interface layer across MLINO experiences and modules. The focused [Assistant Ownership Decision](ASSISTANT_OWNERSHIP_DECISION.md) records the approved **Option A: a Core-owned Assistant with module-scoped capability providers**. “Persistent” describes its coordination role across an authorized session; it does not grant indefinite memory, background sensing, or authority to infer the user.

### 3.1 Responsibilities

The Assistant may:

- hold the current task and Experience state within the approved session boundary;
- use permitted screen/role context for presentation; selected role/screen does not authenticate the user, grant access or override existing V1 Governance;
- translate a user request into a candidate interpretation and request confirmation when required;
- ask the smallest useful clarification when ambiguity materially affects eligibility or action;
- remain silent when signals are weak, the value is unclear, the question would be sensitive, or no safe action follows;
- present a relevant Experience with an honest explanation, evidence limits, and next action;
- open local business details without leaking private Intent/context; module handoff is future and separately gated;
- accept explicit correction, pause, stop, rejection, or completion feedback;
- preserve consent, privacy, accessibility, and user control across handoffs.

### 3.2 Boundaries

The Assistant does not:

- own Intent meaning or business logic, create facts or capabilities, own module domain state, or self-grant authorization;
- silently promote a hypothesis to Active Intent;
- rank or expose a business because of payment, popularity, pressure, or a business request;
- infer health, emotion, wealth, identity, or other sensitive attributes;
- treat a screen visit, click, share, route launch, or proximity as a completed outcome;
- continue matching merely because a hidden tab becomes visible, or after expiry, rejection or withdrawn permission;
- write business facts back into V1 or create a parallel knowledge store;
- perform financial, external, operational or business-facing actions in this slice, even if requested; future activation requires separate architecture and action authorization;
- become a general chatbot whose conversation is detached from a confirmed user purpose.

### 3.3 Assistant decision posture

The Assistant chooses among four postures:

1. **Show:** a valid, explained Experience is ready.
2. **Ask:** one material uncertainty can be resolved with a minimal question.
3. **Guide:** the user deliberately chooses local inspection or a supported edit/resume; comparison and module flows are future only.
4. **Stay silent:** no safe, relevant, or valuable next step is available.

“Stay silent” is a product outcome, not a failure. It protects the user from notification fatigue and prevents weak context from becoming an experience.

## 4. Core Versus Module Boundaries

### 4.1 MLINO Core / V1 / V2

| Responsibility | Owner and boundary |
|---|---|
| Intent, Permission, Consent, Session lifecycle, Experience orchestration, Routing | MLINO Core owns the shared mechanisms and enforcement policy. The user owns Intent meaning and grants consent; Core/Assistant do not self-grant rights or replace existing V1 Governance. |
| Business truth, Capability, Evidence, Availability, Recommendations, Actions, Learning | V1 and its existing business/domain/governance owners remain authoritative. Availability must be evidenced; a listing flag is not stock/opening status. Business Recommendations/Actions/Learning are not V2 relevance, local navigation or task completion. |
| Matching, Experience, Interaction | V2 owns user relevance, experience selection/presentation and interaction within Core's shared constraints; it consumes business evidence read-only. |
| Domain modules | Providers retain their domain data, rules, capabilities and authorized actions under V1/domain governance. Core coordination does not copy their intelligence. No module integration is enabled in the initial slice. |

These describe responsibilities in the existing platform, not new services or a transfer of V1 authority. The Assistant is not a business logic owner; it cannot create capabilities or facts, bypass permissions, or use role selection, screen context or provider text as access authority.

### 4.2 Modules

Modules own domain capabilities and workflows. Examples include Content Studio, CRM, Finance, Operations, Analytics, and industry-specific modules. A module:

- owns its domain data, rules, capabilities, and authorized actions;
- exposes a bounded capability/evidence surface that Core or the Assistant may consume;
- declares what it can do, what evidence it can support, and what authority its actions require;
- preserves its own domain lifecycle and does not assume that an Experience is completed merely because a handoff occurred.

Modules cannot directly choose user exposure, bypass Core privacy/consent, override a confirmed Intent, or pay for ranking. A module's internal recommendation is a domain input, not a command to the V2 Experience layer.

### 4.3 Assistant ownership

The Assistant owns cross-module coordination, conversation posture, explanation, and user-controlled routing. It does not own module state or duplicate module intelligence. Core supplies shared policy and consumes/enforces existing authority; modules supply domain capability and evidence; V2 composes relevance and the next understandable step. Routing never grants permission; future providers must independently enforce access and action authorization.

## 5. Future AR and Virtual Storefront Dependencies

AR and Virtual Storefront are future Experience modes, not immediate implementation targets. They should be activated only after these dependencies exist and are separately approved:

1. **Authoritative business projection:** versioned read-only V1→V2 data for identity, capability, products/services, offers, availability, provenance, freshness, withdrawal, unknowns, and tenant boundaries.
2. **Option-level applicability:** a single product/service must be traceably matched to the user's confirmed requirement; business-level facts cannot be presented as product-level truth.
3. **Experience orchestration:** lifecycle, pause/expiry, explanation, user action, error, and empty-state behavior must work without AR-specific assumptions.
4. **Spatial and context integrity:** permissioned location, building/floor or spatial anchors, precision, freshness, accessibility, offline behavior, and failure states must be defined. Proximity must not be treated as presence or purchase.
5. **Content provenance and safety:** visual assets, product claims, prices, offers, and availability need source ownership, validity, withdrawal, and claim limits.
6. **Interaction contracts:** storefront browsing, contact, booking, navigation, purchase, or business communication each need explicit user authorization and completion semantics.
7. **Privacy and consent:** the system must prevent hidden profiling, sensitive inference, unintended business disclosure, and persistent memory without approval.
8. **Evaluation:** user value, business value, accessibility, and error rates need an approved measurement and retention policy before telemetry or learning is introduced.

AR must enhance an already valid Experience. It must never become a paid overlay, an independent discovery feed, or a shortcut around eligibility and evidence.

## 6. Risks

- **State confusion:** Intent, session, offer, candidate, and Experience lifecycles may be merged and cause stale or unauthorized presentation.
- **Assistant overreach:** A persistent interface may quietly become a profiler, chatbot, or autonomous actor.
- **Core/module duplication:** Domain logic duplicated in Core will drift from V1 and create conflicting truth.
- **Evidence inflation:** Rich storefront or AR presentation may make experimental or business-level evidence look verified.
- **Handoff leakage:** Private Intent, context, or consent may cross into a module or business without an explicit boundary.
- **Premature completion:** Opens, clicks, navigation, or visual engagement may be mislabeled as outcome or learning.
- **Scope expansion:** Comparing, messaging, booking, payments, and AR can enter the first slice without their own contracts.
- **Economic pressure:** Monetization may reintroduce sponsored ranking through module priority or assistant timing.

## 7. Open Decisions

The following remain open and block implementation of a broader orchestration layer:

1. Future comparison modes and external completion contracts; the bounded lifecycle above is aligned with approved Intent rules and awaits closure acceptance, not a new ownership design.
2. Trusted role/tenant provenance and authorization propagation before future provider integration; selected role/screen grants no authority in the current slice.
3. Cross-module handoff, return, cancellation, and state-recovery semantics.
4. The capability/evidence contract by which modules expose supported actions to Core and the Assistant.
5. Completion and outcome definitions for each future action, including consent, retention, and evaluation.
6. Versioned V1→V2 projections for live business knowledge, product applicability, availability, provenance, and withdrawal.
7. Spatial accuracy, accessibility, content governance, and failure behavior for AR and Virtual Storefront.
8. Whether any persistent memory, cross-session continuity, telemetry, aggregate learning, or business attribution is approved.
9. Economic rules proving that payment cannot override user relevance, eligibility, timing, or exposure.

Until these decisions are reviewed, the bounded initial Experience remains local Intent-Guided Local Discovery. This document is design-only and does not authorize implementation, schema, API, AR, Virtual Storefront, messaging, payments, or live V1 integration.

من کدکس هستم
