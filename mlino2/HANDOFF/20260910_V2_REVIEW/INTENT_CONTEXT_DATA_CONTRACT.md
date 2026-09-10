# MLINO V2 — Intent Context Data Contract

Status: conceptual product and architecture contract for review. This document defines meaning, ownership, lifecycle, evidence, and exchange boundaries. It is not a database schema, storage design, migration, API specification, or implementation plan.

The contract exists to make future Intent Layer implementation consistent with the approved decisions:

1. Intent belongs to the user.
2. MLINO creates hypotheses, not assumptions.
3. Implicit intent requires confirmation before becoming active.
4. Confidence never replaces confirmation.
5. Business capability can qualify an experience but cannot control the user's experience.
6. V2 consumes approved V1 intelligence and does not modify V1.

The intended flow is:

**User Context → Intent Hypothesis → Confidence → User Confirmation → Active Intent → Business Capability Matching → Relevant Experience**

## Contract posture

The Intent Layer is a temporary, purpose-limited understanding of what a user currently wants to achieve. It must answer “What does the user want to do now?” and must not become “What does MLINO believe about this person?”

Every future representation of an Intent must preserve its source, ownership, evidence, uncertainty, confirmation state, purpose, and expiration. Missing or stale information must remain unknown; it must not be filled with a model guess.

## 1. Intent Entity

### Identity

An Intent has an identity that distinguishes one user task from another without making the identity a permanent user profile. The identity is controlled by the user session or an explicit saved request. It must not expose a sensitive identity or be reused to join unrelated activities without permission.

### Lifecycle and ownership

An Intent follows the approved lifecycle: Detected, Hypothesized, Confirmed, Active, Expired, and Archived. Rejection is an explicit outcome that prevents activation. The user owns the meaning, scope, correction, confirmation, retention, and deletion of the Intent. MLINO owns only the representation of its current interpretation.

### Source

The contract must distinguish whether the meaning came from an explicit user statement, a selected option, an accepted suggestion, or an implicit system hypothesis. A source is evidence about how the Intent was formed; it is not a confidence claim. Passive context alone cannot be recorded as an active user Intent.

### Timestamps

The conceptual contract must preserve when the relevant signal was observed, when the interpretation was formed, when the user confirmed or rejected it, and when the purpose is expected to expire. These times support freshness and auditability; they do not imply that the user was present at a business or completed an outcome.

### Expiration

Expiration is tied to purpose and context. An immediate request expires when the task ends or its action window passes. A day-bound request expires at the declared boundary. A future request expires when its stated window ends. An explicitly saved Intent requires a visible review or expiry rule. MLINO cannot silently extend or reactivate an expired Intent.

### Relationship with context

Context is supporting evidence around an Intent, not the Intent itself. Location, time, movement, environment, previous interaction, and business surroundings can create signals or narrow a question. They cannot automatically create a user need. Context must retain its source, precision, purpose, and volatility so that stale context cannot keep an Intent active.

## 2. Intent Types

### Explicit Intent

Example: “I am looking for running shoes.”

Creation rule: a direct user statement, selection, or action that communicates a need or constraint.

Confidence requirement: high evidentiary confidence for the words actually provided; MLINO must not expand the meaning beyond those words.

Confirmation requirement: the direct user request confirms the scope for an immediate, reversible matching task. Separate confirmation is required before retention, notification, business contact, sharing, or adding unstated constraints.

Expiration rule: the user-declared time and context apply. If no window is stated, the Intent is session-scoped and expires when the task ends or the user dismisses it.

### Implicit Intent

Example: the user is in a selected sports area, views shoe businesses, and searches for sneakers in the same session.

Creation rule: MLINO may form a non-sensitive hypothesis from multiple allowed signals. A location or a single view alone is insufficient to claim an Intent.

Confidence requirement: confidence describes support for the hypothesis, never truth. Even high confidence remains an unconfirmed hypothesis.

Confirmation requirement: explicit user confirmation is required before the Intent becomes Active or drives a consequential experience. Without confirmation it may only support a labelled suggestion, a broad browse state, or one short clarification.

Expiration rule: implicit hypotheses expire quickly when supporting context changes or the session ends. A rejected hypothesis cannot be retained as a preference or silently reused.

## 3. Confidence Model

### Meaning

Confidence is MLINO's assessment of how strongly allowed evidence supports an interpretation. It is uncertain, revisable, and subordinate to the user's correction. It is not a probability that the user is a certain kind of person.

### Creator and allowed use

MLINO may calculate confidence from source quality, recency, agreement between non-sensitive signals, and directness of user input. Business data cannot increase confidence about what the user wants. Confidence may guide whether to stay silent, ask a clarification, or present a transparent hypothesis.

Confidence may change when new user input, context, or evidence arrives. A change in confidence cannot bypass confirmation or extend expiration.

### Separation from confirmation and strength

- **Confidence:** support for MLINO's interpretation.
- **Confirmation:** the user's acceptance of that interpretation for a defined purpose.
- **Strength:** how specific and actionable the request is, independent of whether it is correct.

High confidence never equals confirmed Intent. A strong request can still be wrong if MLINO misunderstood it. A confirmed request can be broad and low-strength while remaining valid within its stated scope.

### Expiration behavior

Confidence expires with the evidence that supports it. Old searches, prior visits, or stale movement context cannot maintain current confidence indefinitely. When confidence falls below the threshold for a safe action, MLINO must ask, broaden, or stop rather than silently continue.

## 4. User Confirmation Model

### Confirmation sources

Confirmation may come from:

- a direct user statement;
- choosing an offered option;
- accepting a plain-language interpretation;
- correcting a hypothesis into an explicit need;
- explicitly saving a request for later.

Opening a detail, viewing a map, sharing a business, or failing to dismiss a prompt is not confirmation of an inferred Intent.

### Confirmation states

- **Unconfirmed:** a signal or hypothesis exists, but it cannot become Active.
- **Confirmed for current task:** the user accepted the meaning for a reversible, immediate purpose.
- **Confirmed for retained purpose:** the user explicitly agreed to retain or revisit it under visible controls.
- **Rejected or corrected:** the user declined or changed the interpretation; the rejected meaning must not be activated.

### Override rules

The newest explicit user statement overrides an implicit hypothesis and any older interpretation. The user can edit location, time, category, scope, or other stated constraints. MLINO must show the effect of a correction and must not preserve a conflicting hidden version as the active meaning.

## 5. Context Relationship

Context creates signals; it does not automatically create Intent. The contract recognizes these conceptual context groups:

- **Location:** user-selected area, approximate permissioned position, radius, venue, or declared floor. Proximity does not prove entry; GPS does not prove floor.
- **Time:** current local time, declared time window, and offer validity window. Time supports actionability and expiration.
- **Environment:** venue or district, selected floor, operating conditions supported by evidence, and an explicitly chosen AR mode.
- **Previous interactions:** current-session searches, answers, dismissed hypotheses, opened details, and local saved choices. They are continuity signals, not proof of completion.
- **Current session:** the active task, entry point, unresolved question, and user-selected filters.
- **Business surroundings:** visible capabilities and offers near the user. They qualify possible experiences; they do not define user intent.

Each context source must carry purpose, recency, precision, and an appropriate expiry. If context is unavailable or permission is denied, the Intent remains usable only to the extent the user can provide a manual alternative.

## 6. Privacy and Retention

### Permitted content

The contract may retain a user-confirmed interest in a category or product, a user search, a selected experience, and the minimum context required to complete that confirmed task. These values remain purpose-limited and user-controllable.

### Temporary content

Raw passive signals, rejected hypotheses, weak inferred preferences, movement observations, exact location, and unconfirmed interpretations should remain temporary and should not become a durable user profile. They may be used only for the immediate task under the approved purpose.

### Restricted content

MLINO must not infer or retain sensitive personal assumptions about health, emotional state, financial status, religion, ethnicity, politics, sexuality, gender identity, relationships, identity, home/work routine, or companions. Accessibility needs may be used only when the user explicitly provides them for the current task and the product has an approved safety boundary.

### Retention principles

- Retain the minimum information needed for the confirmed purpose.
- Make purpose, expiry, and deletion visible when an Intent is retained.
- Do not retain rejected hypotheses as preferences.
- Do not use `liked`, `saved`, `viewed`, proximity, or navigation as proof of purchase, visit, satisfaction, or completion.
- Do not send exact location, Intent text, or local personal state to V1 or a business without an approved contract and consent.
- Expiration or withdrawal must stop active use immediately; cleanup and audit retention are separate policy decisions.

## 7. Business Matching Input

### Input to the Experience Layer

The Intent-to-Experience boundary may provide the minimum user-confirmed need, relevant non-sensitive constraints, allowed context, confidence/confirmation status, purpose, and expiration. It must not provide a hidden sensitive profile or an unsupported claim about the user.

The boundary must make clear whether a value is user-stated, user-confirmed, or a remaining hypothesis. A downstream experience cannot treat an unconfirmed hypothesis as an instruction.

### Business capability relationship

The matching relationship is:

**Intent + Context + Business Capability + Evidence = Relevant Experience**

V1 or the authoritative business source owns capability, business context, products, services, offers, knowledge, and supported actions. V2 uses a read-only, versioned projection and may select a presentation or interaction that is appropriate to the confirmed Intent. V2 may not invent missing capability, freshness, availability, reviews, or quality.

The output is not an advertising rank. A business cannot override the user's confirmed scope, filters, privacy choices, or empty state. When evidence does not support a match, the experience remains empty or asks a user-controlled refinement question.

## 8. Intent Lifecycle

| State | Meaning | Transition rules | Owner |
|---|---|---|---|
| **Detected** | A permitted context or user action has been observed; no user need is claimed. | MLINO may record it temporarily; it cannot become Active directly. | MLINO within permission boundary. |
| **Hypothesized** | MLINO has formed a non-sensitive interpretation with uncertainty. | MLINO may present a clarification; user must confirm, correct, or reject before activation. | MLINO proposes; user controls outcome. |
| **Confirmed** | The user accepted the meaning for a defined purpose. | User can edit, revoke, or scope it; only a valid confirmed purpose can become Active. | User. |
| **Active** | The confirmed Intent is currently actionable and may drive matching. | It expires with time/context/evidence or stops on user withdrawal; no silent renewal. | User authorizes use; MLINO executes within scope. |
| **Expired** | The purpose or supporting context is no longer valid. | It can be archived or deleted; it cannot silently reactivate from passive signals. | MLINO may expire; user controls retention. |
| **Archived** | Inactive record retained only after explicit save/archive or minimal approved governance need. | User may review, restore through explicit action if policy allows, or delete. | User and approved retention policy. |

Rejection is a terminal outcome for the rejected interpretation. A business has no lifecycle transition authority. Confidence can change inside Hypothesized or Confirmed representations, but it cannot activate an Intent or extend its life.

## 9. Open Questions

### Product decisions

1. What exact language and interaction will distinguish “confirmed for this task” from “saved for later”?
2. Which user entry points are allowed to create an immediate Confirmed Intent without a second confirmation step?
3. What is the product definition of task completion for each major journey, without treating navigation or detail view as proof?
4. Which experience types can be generated for a confirmed Intent when the best result is a useful browse state rather than a business match?

### Privacy decisions

5. What exact retention windows apply to session, day-bound, future, saved, and archived Intent?
6. What jurisdiction-specific consent and deletion requirements apply to location, movement, accessibility, and outcome learning?
7. What aggregate measurement, if any, can be collected without exposing Intent text or exact location?

### Architecture decisions

8. What is the versioned read-only V1↔V2 projection for capability, business context, offers, knowledge, and recommendations?
9. What provenance, freshness, unknown-value, deletion, and compatibility evidence must accompany each capability input?
10. Where is the boundary between Intent interpretation, matching, and experience selection so that business intelligence is not duplicated in V2?
11. How does the contract behave offline, with denied permissions, stale offers, or unavailable V1 data?
12. What evaluation evidence is required before an Intent interpretation is allowed to influence discovery?

These questions remain unresolved. No schema, API, database, migration, notification, V1 connection, or code change should be created until the contract and its open questions are reviewed and approved.
