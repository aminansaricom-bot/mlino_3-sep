# MLINO — Knowledge Loop Alignment (OD-30)

Author: Codex, Documentation Alignment Assistant
Status: **Conceptual alignment closed; no implementation authorized**

This document resolves OD-30 by mapping the terms **Reality**, **Knowledge**, and **Learning** to the existing MLINO V1 architecture and the bounded V2 experience layer. It introduces no domain entity, schema, API, storage model, or new capability.

The governing V1 references are the frozen [MLINO system overview](../../../ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/architecture/architecture00_SYSTEM_OVERVIEW.md), [Memory & Knowledge capability](../../../ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/capabilities/01-memory-and-knowledge.md), and [Learning & Feedback capability](../../../ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/capabilities/10-learning-and-feedback.md).

## Decision

Reality, Knowledge, and Learning are **conceptual layers/processes (option B)**. They are not new MLINO domain entities.

The existing Event, Projection, Business Context, Fact, Observation, Signal, Decision, Recommendation, Action, Outcome, and Evaluation concepts remain the architectural vocabulary. Any future implementation must use their approved ownership and contracts rather than creating parallel “Reality,” “Knowledge,” or “Learning” records.

## 1. Definition of Reality

Reality is the operational world that exists independently of MLINO: business operations, people and places, available services, user-relevant circumstances, and consequences of actions. Reality is not a database object owned by MLINO and is never made true merely because a system inferred it.

MLINO receives limited evidence about reality through observations and events. In V1, an occurrence records something reported about organizational reality; an amendment or retraction preserves a correction without rewriting history. The Event Log is therefore a historical record of accepted evidence, not reality itself.

For V2, current user context is a permissioned, task-scoped view of conditions around a confirmed Intent. Location, time, selected area, or a business listing can be a signal or constraint; none is automatically a complete fact about the user or a completed real-world event.

## 2. Definition of Knowledge

Knowledge is governed understanding derived from accepted events, observations, domain interpretation, and projections. It is useful because it is traceable, scoped, time-aware, and explicit about unknowns.

Knowledge is not raw input, an unqualified model guess, or a business-sponsored assertion. It may contain a projection of current organizational state, a Business Context, a capability description, or a supported fact with provenance and validity. A projection is derived state and can be rebuilt from the Event Log; it is not a second source of truth.

In the V1/V2 boundary:

- V1 and the authoritative business source own business facts, Business Context, capabilities, products/services, offers, availability where defined, knowledge, provenance, and validity.
- V2 consumes an approved read-only projection or clearly labelled experimental equivalent and uses it to evaluate relevance and compose a user experience.
- V2 must not convert missing evidence into a fact, infer a user characteristic from a business record, or write a parallel business knowledge store.

## 3. Definition of Learning

Learning is a governed process that compares valid outcomes or evaluations with an intended purpose and uses the resulting feedback to improve future interpretation, projections, or experience quality. Learning is not a fact, a user Intent, a business decision, or an automatic right to change any of those.

The frozen V1 Learning & Feedback capability defines a delayed outcome-comparison event and review flags for derived models after applicable right-to-be-forgotten processing. It does not define a general training engine, a durable user profile, or an unrestricted model-update API. Its documented gaps remain gaps.

For the current V2 scope, learning is deliberately narrow:

- an explicit in-session correction or closure may inform that task's evaluation;
- a click, detail view, share, route launch, proximity, or visibility change is not proof of a visit, purchase, satisfaction, or completed goal;
- persistent outcome learning, conversion attribution, cross-session behavioural inference, and reverse writes to V1 remain separately governed decisions;
- learning cannot silently redefine a user-owned Intent, alter a business fact, bypass consent, or override an authorized goal.

## 4. Relationship Between the Three Concepts

The MLINO development loop is a conceptual flow, not a new entity graph:

```text
Reality
  ↓ reported through
Observations / Events
  ↓ interpreted and projected by existing V1 capabilities
Knowledge / Business Context / Evidence
  ↓ supports
Decisions / Recommendations
  ↓ after human authority where required
Actions
  ↓ may produce
Outcomes
  ↓ evaluated under purpose and consent
Evaluations / Feedback
  ↓ governed Learning & Feedback process
Improved projections, interpretation, or experience quality
```

The arrows describe responsibility and evidence flow. They do not permit a downstream layer to rewrite an upstream layer. A recommendation does not become an action, an action does not prove an outcome, and learning does not become a new version of reality.

## 5. Mapping to Existing MLINO Concepts

| Existing concept | Role in the loop | Authority and boundary |
|---|---|---|
| **Business Context** | A governed projection of what a business is, does, and can support. | V1/business-owned; V2 consumes a read-only, versioned view. |
| **Facts** | Provenance-backed claims about an entity, capability, product, service, offer, or condition. | The source/owning V1 capability owns the claim; validity and unknowns remain visible. |
| **Observations** | Time-bound reports or occurrences about what was observed. | Evidence input; an observation is not automatically a durable fact or an outcome. |
| **Signals** | Derived or contextual indicators used to guide interpretation. | V2 context signals are task-scoped and non-sensitive; a signal cannot silently activate Intent. |
| **Decisions** | A selected or evaluated decision artifact produced by Decision Support. | It is traceable and may require governance or human authorization; it is not execution. |
| **Recommendations** | A decision-support presentation of a possible next step or relevant experience. | It cannot override constraints, authorization, or the user-owned Intent. |
| **Actions** | An authorized operation or user/business interaction. | Action & Execution owns execution boundaries; acknowledgement is not completion. |
| **Outcomes** | Evidence about what followed an action or whether a stated purpose was met. | Must be explicitly observed or reported; never inferred from a weak proxy. |
| **Evaluations** | Comparison of an outcome or evidence set against an intended result and its limits. | Evaluation produces feedback; it does not rewrite historical events. |
| **Learning loops** | The governed use of evaluations and feedback to improve future derived behaviour. | Learning & Feedback owns the V1 capability boundary; scope, consent, retention, and model effects remain governed. |

## 6. Relationship to V2 Intent and Experience Matching

V2 adds a user-facing experience layer on top of approved knowledge; it does not add a second business-intelligence layer.

```text
Allowed user context signals
  → Intent hypothesis
  → user confirmation
  → capability/evidence projection from V1
  → eligibility and relevance
  → Experience
  → user-controlled action
```

Here, **Intent belongs to the user**. Context and signals help MLINO ask or interpret; they do not turn Reality or Knowledge into a user need. Business Knowledge can substantiate a capability, but it cannot command V2 to rank a business. An Experience is a V2 orchestration result, not a new Reality or Knowledge entity.

## 7. Ownership and Non-Responsibilities

- **Reality:** exists outside MLINO; external systems, people, and organizations generate the underlying conditions and events.
- **Memory & Knowledge:** preserves the immutable Event Log and produces derived Projections; it does not define entity meaning, decide access, or make business/user decisions.
- **Domain Adaptation and Semantic Translation:** interprets and resolves incoming event candidates under the frozen V1 rules.
- **Decision Support & Recommendation:** produces traceable decision/recommendation artifacts; it does not execute actions.
- **Action & Execution:** performs an action only under its authorization boundary; it does not declare success merely because execution was attempted.
- **Learning & Feedback:** compares outcomes in its governed delayed loop and flags derived-model review where the frozen architecture specifies it; it does not own reality or silently retrain the system.
- **V2:** owns user Intent interpretation, confirmation boundaries, relevance, experience selection, and user interaction. It consumes V1 knowledge; it does not duplicate or mutate it.

## 8. Implementation and Governance Consequences

No new Reality, Knowledge, or Learning entity is required. No new schema, API, migration, event type, or storage layer is implied by this alignment.

Future implementation work still requires separate approval for:

1. the versioned read-only V1→V2 projection of Business Context, capability, knowledge, offers, availability, provenance, freshness, withdrawal, unknowns, and tenant boundaries;
2. the exact outcome/evaluation vocabulary and consented retention policy;
3. the trigger, ownership, and effect of any Learning & Feedback process beyond the frozen V1 description;
4. any aggregate learning, external model use, telemetry, conversion attribution, or reverse data direction.

These are future contracts and governance decisions, not new entities introduced by OD-30.

## 9. Decision Record

**OD-30 is resolved as conceptual alignment.** Reality, Knowledge, and Learning remain layers/processes over the existing MLINO architecture. The existing V1 Event Log/Projection and capability boundaries remain authoritative; V2 continues to operate as the user Intent and Experience layer. History and unresolved future learning decisions remain in the Open Decisions register.

من کدکس هستم
