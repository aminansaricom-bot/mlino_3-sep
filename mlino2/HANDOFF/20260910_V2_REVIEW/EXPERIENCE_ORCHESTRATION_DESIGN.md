# MLINO V2 — Experience Orchestration Design

Author: Codex, Product Architect role
Status: **Design submitted for product approval; implementation is not authorized**
Scope: bounded V2 local, single-session, experimental experience layer.

This document defines how MLINO chooses and guides an experience after confirmed Intent, permitted Context, eligible Business Capability, and evidence are available. It does not define UI, schema, API, code, persistence, or a new V1 capability.

## 1. Purpose

Experience Orchestration is the policy and coordination layer between matching and user action. It decides which supported experience mode is appropriate, whether a minimal question is needed, when the system should remain silent, and which user-authorized next action can be offered.

The orchestrator must preserve the existing order:

```text
Confirmed User Intent
  ↓
Allowed Context constraints
  ↓
V1 Business Capability and evidence
  ↓
Eligibility before ranking
  ↓
Experience selection and explanation
  ↓
User-controlled action
```

Orchestration changes how a valid opportunity helps the user. It does not manufacture Intent, repair missing evidence, override eligibility, or turn a business request into a user need. The first mode remains **Intent-Guided Local Discovery** with zero to three business results and **Open Business Details** as the supported matching-owned action.

## 2. Experience Lifecycle

The Experience lifecycle is separate from the Intent, offer, and session lifecycles. An Experience is a transient, explainable opportunity tied to one confirmed Intent interpretation and one evidence evaluation.

### 2.1 States

| State | Meaning | Entry condition | Allowed next transitions |
|---|---|---|---|
| **Discovering** | The active task is being understood within its confirmed scope and permitted context. | A confirmed Intent revision exists and the user has not yet received a final experience. | `Asking`, `Matching`, `Abandoned`, `Expired`. |
| **Asking** | One minimal clarification is being requested because a material ambiguity blocks safe matching or mode selection. | The approved asking boundary allows a question and the answer can change the result. | `Discovering`/`Matching` after an answer, `Abandoned` after rejection/close, `Expired`. |
| **Matching** | V2 is applying eligibility, evidence limits, and approved ordering to the confirmed request. | Required inputs are available or clarification has completed. | `Presenting`, `Abandoned`, `Expired`. |
| **Presenting** | A supported result, empty state, or honest unsupported/no-match outcome is shown with its explanation and limits. | Matching completed without violating hard requirements. | `Comparing`, `Acting`, `Abandoned`, `Expired`. |
| **Comparing** | The user explicitly asks to compare or narrow independently eligible options. | A future comparison mode is approved and the user initiates it. | `Presenting`, `Acting`, `Abandoned`, `Expired`. |
| **Acting** | The user has deliberately started a supported next action, such as opening business details. | The action is visible, permitted, and user initiated. | `Completed`, `Presenting`, `Abandoned`, `Expired`. |
| **Completed** | The user explicitly closes the task as done or a separately approved action contract verifies completion. | Completion is directly reported or contractually evidenced. | Terminal for this Experience. |
| **Abandoned** | The user rejects, dismisses, stops, or leaves the task without completing it. | Explicit stop/rejection, or a supported abandonment action. | Terminal for this Experience. |
| **Expired** | The Intent, session authority, evidence validity, or experience availability ended before completion. | A governing lifecycle reaches expiry or becomes invalid. | Terminal for this Experience. |

The initial scope uses `Discovering`, `Asking` when necessary, `Matching`, `Presenting`, `Acting`, `Abandoned`, and `Expired`. `Comparing` requires a later product decision. `Completed` is never inferred from a detail view, share, navigation launch, proximity, or time passage. Opening business details is an action, not proof of a visit, purchase, fulfilment, or satisfaction.

### 2.2 Authority rules

- App/tab resume does not transition an Experience out of `Paused` session conditions or restart matching. A new explicit user action and valid authority are required.
- A rejected, expired, or ended Intent cannot be resumed by an Experience. A new confirmed revision is required.
- An expired offer or unavailable candidate invalidates the dependent Experience claim; it does not rewrite the user's Intent.
- An empty state is a valid `Presenting` outcome when no eligible result exists. The orchestrator must not pad it with an ineligible business.
- Every displayed Experience identifies the confirmed purpose, supporting option/capability, evidence scope, material unknowns, validity, and supported next action.

## 3. Assistant Layer Concept

The MLINO Assistant is a persistent interface layer across MLINO experiences and modules. The focused [Assistant Ownership Decision](ASSISTANT_OWNERSHIP_DECISION.md) recommends **Option A: a Core-owned Assistant with module-scoped capability providers**. “Persistent” describes its coordination role across an authorized session; it does not grant indefinite memory, background sensing, or authority to infer the user.

### 3.1 Responsibilities

The Assistant may:

- hold the current task and Experience state within the approved session boundary;
- use an authenticated or explicitly selected user role and current screen/module context when permissioned;
- translate a user request into a candidate interpretation and request confirmation when required;
- ask the smallest useful clarification when ambiguity materially affects eligibility or action;
- remain silent when signals are weak, the value is unclear, the question would be sensitive, or no safe action follows;
- present a relevant Experience with an honest explanation, evidence limits, and next action;
- connect a user to an approved module or business detail surface without leaking private Intent/context;
- accept explicit correction, pause, stop, rejection, or completion feedback;
- preserve consent, privacy, accessibility, and user control across handoffs.

### 3.2 Boundaries

The Assistant does not:

- own the user's Intent, V1 business facts, module domain state, or authorization decisions;
- silently promote a hypothesis to Active Intent;
- rank or expose a business because of payment, popularity, pressure, or a business request;
- infer health, emotion, wealth, identity, or other sensitive attributes;
- treat a screen visit, click, share, route launch, or proximity as a completed outcome;
- continue matching after hidden-tab resume, expiry, rejection, or withdrawn permission;
- write business facts back into V1 or create a parallel knowledge store;
- perform irreversible, financial, external, or business-facing actions without the relevant explicit authorization;
- become a general chatbot whose conversation is detached from a confirmed user purpose.

### 3.3 Assistant decision posture

The Assistant chooses among four postures:

1. **Show:** a valid, explained Experience is ready.
2. **Ask:** one material uncertainty can be resolved with a minimal question.
3. **Guide:** the user has chosen to compare, inspect, or enter an approved module flow.
4. **Stay silent:** no safe, relevant, or valuable next step is available.

“Stay silent” is a product outcome, not a failure. It protects the user from notification fatigue and prevents weak context from becoming an experience.

## 4. Core Versus Module Boundaries

### 4.1 MLINO Core

Core provides cross-module foundations:

- identity, role and permission context;
- session, consent, privacy, and user-control rules;
- Intent interpretation and confirmation boundaries;
- Context signal handling within the approved scope;
- Experience lifecycle and orchestration authority;
- eligibility-before-ranking policy and explanation requirements;
- common evidence, provenance, freshness, unknown, and validity semantics;
- safe handoff and return between experiences and modules;
- shared audit/governance hooks where separately approved.

Core does not own the detailed business logic, catalogue, CRM records, financial ledger, operational state, or industry workflow of a module.

### 4.2 Modules

Modules own domain capabilities and workflows. Examples include Content Studio, CRM, Finance, Operations, Analytics, and industry-specific modules. A module:

- owns its domain data, rules, capabilities, and authorized actions;
- exposes a bounded capability/evidence surface that Core or the Assistant may consume;
- declares what it can do, what evidence it can support, and what authority its actions require;
- preserves its own domain lifecycle and does not assume that an Experience is completed merely because a handoff occurred.

Modules cannot directly choose user exposure, bypass Core privacy/consent, override a confirmed Intent, or pay for ranking. A module's internal recommendation is a domain input, not a command to the V2 Experience layer.

### 4.3 Assistant ownership

The Assistant owns cross-module coordination, conversation posture, explanation, and user-controlled routing. It does not own module state or duplicate module intelligence. Core supplies policy and authority; modules supply domain capability and evidence; the Assistant composes the next understandable step.

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

1. Product approval of the lifecycle names, terminal semantics, and whether `Comparing` belongs in the next bounded slice.
2. The exact source of authenticated/selected user role and the permissions available to the Assistant.
3. Cross-module handoff, return, cancellation, and state-recovery semantics.
4. The capability/evidence contract by which modules expose supported actions to Core and the Assistant.
5. Completion and outcome definitions for each future action, including consent, retention, and evaluation.
6. Versioned V1→V2 projections for live business knowledge, product applicability, availability, provenance, and withdrawal.
7. Spatial accuracy, accessibility, content governance, and failure behavior for AR and Virtual Storefront.
8. Whether any persistent memory, cross-session continuity, telemetry, aggregate learning, or business attribution is approved.
9. Economic rules proving that payment cannot override user relevance, eligibility, timing, or exposure.

Until these decisions are reviewed, the bounded initial Experience remains local Intent-Guided Local Discovery. This document is design-only and does not authorize implementation, schema, API, AR, Virtual Storefront, messaging, payments, or live V1 integration.

من کدکس هستم
