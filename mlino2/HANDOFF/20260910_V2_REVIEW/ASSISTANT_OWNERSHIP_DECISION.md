# MLINO V2 — Assistant Ownership Decision

Author: Codex, Product Architect role
Status: **Architecture decision for Product Approval; no implementation authorized**

This document resolves the ownership question for the persistent MLINO Assistant before approval of [Experience Orchestration Design](EXPERIENCE_ORCHESTRATION_DESIGN.md). It defines ownership and boundaries only; it does not create an Assistant entity, schema, API, module, or runtime behavior.

## 1. Problem

MLINO needs one persistent interaction layer that can understand an authorized user task, coordinate Intent and Experience state, and connect the user to several modules. The same user may move from Content Studio to CRM, Finance, Operations, or an industry module without changing the meaning of consent, role, privacy, or user control.

Without an ownership decision, three failures are likely:

- multiple assistants give conflicting interpretations of the same user Intent;
- modules duplicate Core policies and produce inconsistent permissions, explanations, and outcomes;
- a thin UI assistant becomes an unowned intelligence layer that can silently rank, infer, or act.

The decision must preserve the existing boundary: Core owns shared Experience and governance policy; modules own domain capabilities and actions; V1 remains authoritative for business knowledge and facts.

## 2. Options

### Option A — Assistant belongs to MLINO Core

Core owns the Assistant as the shared orchestration and interaction authority. Modules expose bounded capabilities, evidence, and actions that the Assistant may use under Core policy.

The Assistant is not merely a chat window. It is the cross-module policy-aware coordinator for Intent, context, Experience lifecycle, explanation, handoff, and user-authorized routing.

### Option B — Each module owns its own Assistant

Content Studio, CRM, Finance, Operations, and industry modules each provide their own assistant with module-specific context and behavior. Cross-module work is handled by handoffs or an additional coordination mechanism.

This maximizes local autonomy, but it creates multiple interaction authorities unless another shared assistant is added. That additional authority would recreate Option A without a clear owner.

### Option C — Assistant is only UI; intelligence belongs to modules

The Assistant is a presentation surface that forwards requests to module intelligence. Modules independently interpret requests, select actions, and provide responses.

This keeps the UI thin, but it leaves cross-module Intent, permission, lifecycle, relevance, and user-control decisions distributed across modules. It does not provide a coherent Experience Layer.

## 3. Trade-offs

| Criterion | Option A — Core-owned | Option B — Module-owned | Option C — UI-only |
|---|---|---|---|
| Consistency | One Intent, consent, lifecycle, explanation, and action posture. | Conflicting interpretations and policies are likely. | Consistency depends on every module independently implementing Core rules. |
| Scalability | New modules plug into stable Core contracts; Core must stay thin and policy-focused. | Local scaling is easy, but cross-module composition grows combinatorially. | UI scales, but orchestration complexity moves into every module. |
| Modularity | Modules remain domain owners while exposing bounded capabilities. | Strong local ownership, weak shared experience boundary. | Strong UI separation, weak ownership of shared intelligence. |
| User experience | One recognizable Assistant can follow a task across modules. | Users may have to learn several assistants and repeat context. | Users experience disconnected module responses. |
| Future AR / Virtual Storefront | One assistant can coordinate visual, storefront, and module modes with shared consent. | Multiple assistants can conflict over visual context and business presentation. | No owner exists for cross-modal experience selection. |
| Permission boundaries | Core checks identity, role, consent, and handoff before module action. | Each module may interpret permission differently. | UI cannot safely own authorization; modules may expose inconsistent gates. |
| Main risk | Core becomes a domain monolith or hidden super-module. | Fragmentation and duplicated governance. | Unowned cross-module intelligence and policy drift. |

Option A has the strongest overall architecture if “Core-owned” means ownership of orchestration and governance, not ownership of every domain answer.

## 4. Recommended Decision

**Choose Option A: the Assistant belongs to MLINO Core.**

The recommended model is a **Core-owned Assistant with module-scoped capability providers**:

- Core owns the Assistant identity, session boundary, Intent and confirmation posture, Experience lifecycle, privacy/consent checks, user-role context, explanation standards, cross-module routing, and user-authorized handoff.
- Modules own domain knowledge, records, domain rules, capability evidence, and module-specific actions. They may provide bounded assistant skills or handlers, but those skills execute under Core policy and do not become independent user-facing assistants.
- The UI is a presentation surface for the Core-owned Assistant. It is not the owner of intelligence or permission.
- V1 remains authoritative for Business Context, Knowledge, facts, capabilities, evidence, and other business intelligence. The Assistant consumes approved projections and cannot edit or replace them.

This is a single ownership decision, not permission for a broad autonomous agent. Core ownership centralizes authority while preserving domain autonomy at the module boundary.

### 4.1 What the Core-owned Assistant may do

- interpret a user request within the approved Intent contract;
- ask minimal questions and wait for confirmation where required;
- choose whether to show, ask, guide, or stay silent;
- select and explain an eligible Experience;
- route to a module after checking role, consent, and action authority;
- return to the same task with state and privacy boundaries intact;
- coordinate future AR or Virtual Storefront modes without changing their source ownership.

### 4.2 What it may not do

- invent module facts or business knowledge;
- silently activate Intent from passive context;
- bypass eligibility, user constraints, consent, or module authorization;
- let payment, popularity, or module priority control exposure;
- write a parallel cross-module memory or alter V1 truth;
- infer completion, purchase, satisfaction, or sensitive personal characteristics;
- become an unrestricted general chatbot detached from a confirmed user purpose.

## 5. Impact on Core and Modules

### Core impact

Core becomes the owner of the shared Assistant contract and must provide the common policy surface for:

1. authenticated or explicitly selected user role;
2. Intent interpretation and confirmation revision;
3. session and Experience lifecycle;
4. privacy, consent, data minimization, and handoff;
5. evidence, provenance, freshness, unknowns, and explanation;
6. cross-module routing and action authorization;
7. future modality selection for text, visual, AR, and Virtual Storefront.

Core must not absorb CRM, Finance, Operations, Content Studio, or industry-specific business logic. Its design remains a coordination layer, not a new business operating system inside V2.

### Module impact

Each module remains responsible for:

- its domain data and source authority;
- capability and evidence it can substantiate;
- domain-specific rules and workflows;
- actions it can perform and the authorization those actions require;
- its own domain lifecycle and completion evidence;
- a bounded interface for Core/Assistant discovery and handoff.

Modules cannot create a competing assistant, silently retain shared user Intent, or directly choose user exposure. A module may decline an action when its evidence or authority is insufficient; the Assistant must explain that limit rather than inventing a fallback.

### Shared boundary

```text
User / UI surface
        ↓
Core-owned Assistant
  Intent · consent · lifecycle · routing · explanation
        ↓ governed capability request
Module provider
  domain facts · capability · evidence · authorized action
        ↓
Core-owned Experience and user-controlled handoff
```

The arrow is a governed request/response boundary. It is not permission for the Assistant to copy module databases or for a module to override Core policy.

## 6. Future AR and Virtual Storefront Impact

AR and Virtual Storefront should use the same Core-owned Assistant rather than introduce a second assistant per modality. The Assistant decides whether the visual/storefront mode is appropriate after eligibility and user intent are established; the relevant module supplies the content, capability, product/service evidence, and supported action.

This requires, before activation:

- one permission and consent boundary across text, visual, AR, and storefront surfaces;
- traceable option-level evidence and applicability;
- a shared lifecycle for pause, expiry, cancellation, and action completion;
- module handoff and return semantics that do not leak private Intent/context;
- accessibility, spatial accuracy, content provenance, and failure behavior;
- separate approval for any telemetry, outcome learning, purchase, booking, or business communication.

AR is therefore a future mode of the Core-owned Experience Layer, not a new ownership model.

## 7. Remaining Decisions

This decision closes ownership, but these implementation-level decisions remain open:

1. the capability/skill declaration contract modules use to expose supported operations;
2. the exact user-role source and permission token passed during a handoff;
3. cross-module context minimization and state return rules;
4. audit and explanation requirements for an Assistant-routed action;
5. completion/outcome semantics for each module action;
6. persistence, cross-session memory, telemetry, and aggregate learning policy;
7. monetization rules proving module or business payment cannot influence user relevance or Assistant timing.

No remaining item changes the ownership decision. They require separate product, privacy, and architecture review before implementation.

## Decision Record

**Recommended architecture: Option A — Core-owned Assistant with module-scoped providers.** This preserves one user-facing authority and one permission boundary while keeping domain intelligence and actions inside modules. It is compatible with the existing Experience Orchestration design and the V1/V2 separation.

من کدکس هستم
