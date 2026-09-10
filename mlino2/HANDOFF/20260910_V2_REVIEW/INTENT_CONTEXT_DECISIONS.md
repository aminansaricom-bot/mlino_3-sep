# MLINO V2 — Intent Context Decisions

Status: decision proposal for product and architecture approval. No code, schema, API, storage model, or implementation is authorized by this document.

These decisions establish the fundamental rules of the MLINO Intent Layer. MLINO observes context, forms hypotheses, asks minimal questions, and helps the user refine a need. Intent remains owned by the user.

## 1. Intent Ownership

### Decision

An Intent belongs to the user. MLINO may represent a temporary understanding of what the user appears to want, but it must never claim ownership of the user's intention or silently turn a signal into a user commitment.

### Ownership model

- **User:** owns the meaning, scope, correction, confirmation, retention, rejection, and completion of an intent.
- **MLINO:** owns context interpretation, hypothesis formation, clarification, matching orchestration, and presentation of uncertainty.
- **Business:** owns the truth of its capabilities, products, services, offers, availability evidence, and supported actions.
- **V1:** remains authoritative for business operating knowledge when that data is connected through an approved read-only boundary.

### Permission boundaries

MLINO may use purpose-limited context during an active user task when the user provided it or granted the relevant permission. It may ask for clarification when doing so can materially improve the next experience. It may not retain, export, notify, contact a business, or create a durable profile from an inferred intent without the corresponding user permission.

No business, ranking rule, or monetization setting can create an active intent on the user's behalf. A business can provide capability and experience evidence; it cannot define what the user wants.

### User control rules

The user must be able to see a plain-language interpretation, correct it, dismiss it, and stop using it. Rejection of an inferred intent prevents that hypothesis from becoming active and prevents the same weak signal from being immediately reused to ask the same question. A user can explicitly save an intent; saving is separate from merely viewing, liking, sharing, or opening a detail.

## 2. Intent Lifecycle

The lifecycle is:

**Detected → Hypothesized → Confirmed → Active → Expired → Archived**

Rejection is an explicit outcome from the hypothesis or confirmation step. It is not a hidden transition to Active.

| State | What creates it | Evidence required | Who can transition it | Meaning |
|---|---|---|---|---|
| **Detected** | A permissioned context or user action is observed. | A source signal with a stated purpose; no intent claim yet. | MLINO can record the event ephemerally. | “Something relevant may be happening.” |
| **Hypothesized** | MLINO combines safe signals into a non-sensitive interpretation. | More than a bare signal when possible, with uncertainty retained. | MLINO may propose; it cannot activate. | “This could be what the user wants.” |
| **Confirmed** | The user states the need or accepts/corrects the proposed interpretation. | User wording, selection, or explicit confirmation for the intended scope. | User confirms, edits, or rejects; MLINO records the result. | “The user has accepted this meaning for the task.” |
| **Active** | A Confirmed intent is actionable in the current context and time window. | Confirmation plus valid context, supported capability search, and an unexpired purpose. | User starts or continues the task; MLINO may activate only within the confirmed scope. | “MLINO may use this intent to create an experience now.” |
| **Expired** | The purpose window, location context, offer window, or validity evidence ends; or the user revokes it. | A time/context boundary or explicit revocation. | MLINO may expire automatically; user may stop it earlier. | “This intent must not drive current results.” |
| **Archived** | The user explicitly saves or archives the record, or expiry cleanup retains a minimal audit reference under policy. | Explicit save/archive or approved retention reason. | User archives/deletes; policy may remove it. | “Not active; retained only under visible user control or minimal governance need.” |

### Transition rules

- Detected never jumps directly to Active.
- Hypothesized never becomes Active without user confirmation.
- Confirmed can become Active only for the confirmed purpose and time/context scope.
- A user can reject or correct a hypothesis at any point before activation.
- MLINO may expire an intent when its context or evidence is no longer valid; it may not silently renew it.
- A business cannot transition any user intent state.
- An expired or archived intent cannot silently reactivate from a new passive signal; a new task or explicit user action is required.

### Validity duration

Validity is purpose-based rather than a universal fixed duration. “Find something open now” lasts for the immediate task. “Find something today” lasts through the user-declared day. A future request lasts until its stated window. A retained intent has no indefinite validity by default and requires an explicit save, visible purpose, and user controls.

## 3. Confidence and Confirmation Rules

Confidence, confirmation, and strength are separate concepts.

- **Confidence:** how strongly the available evidence supports MLINO's hypothesis. It is a system assessment and can be wrong.
- **Confirmation:** whether the user accepted the interpretation for a defined purpose. It is a user decision.
- **Strength:** how specific and actionable the intent is, independent of whether MLINO is correct. “I need a gift today on floor two” is stronger than “I am browsing,” but strength does not make it true.

### Explicit intent

Explicit intent is a direct user statement, choice, or action that communicates a need or constraint. It has high evidentiary confidence for the words actually provided. The user's direct request can serve as confirmation for an immediate, reversible matching task within that exact scope.

Separate confirmation is still required before MLINO retains the intent, sends a notification, contacts a business, shares it, or expands it with assumptions the user did not state.

Explicit intent expires according to the user's stated time and context. If no window is stated, it is session-scoped until the task ends or the user dismisses it.

### Implicit intent

Implicit intent is a system hypothesis derived from context and signals. It remains a hypothesis regardless of confidence. High confidence can justify a concise clarification; it cannot replace user confirmation.

Implicit intent requires confirmation before becoming Active. Without confirmation it may only support a reversible, clearly labelled suggestion or a broad browse state. It expires quickly when the supporting context changes and is not retained as a long-term preference.

### Confidence policy

- **Low confidence:** stay silent or offer broad, non-committal browsing; do not ask unless the value is clear.
- **Medium confidence:** ask one small clarification when the answer would change the result.
- **High confidence:** show a concise interpretation and proceed only within user-confirmed scope; do not present confidence as truth.

The user does not need to see a numeric score. The experience should communicate uncertainty in plain language and provide correction.

## 4. Asking Boundaries

### MLINO should ASK when

- the user has opened an active discovery surface or explicitly requested help;
- the user is in a selected shopping environment or has declared a venue/floor, without treating GPS proximity as proof of entry;
- repeated in-session search behavior leaves one material ambiguity;
- a strong, non-sensitive contextual match would lead to a clearly better experience;
- one short answer can change which capabilities are relevant;
- the question is optional, easy to answer, and dismissible.

Examples: “What are you looking for?”, “Are you browsing or ready to choose?”, “Which floor are you on?”, and “Do you need something open now?”

### MLINO should STAY SILENT when

- the signal is weak or the answer would not change the experience;
- the proposed question depends on a sensitive assumption;
- the user dismissed the same question or is already engaged in another task;
- no supported business capability exists to act on the answer;
- MLINO would be asking only to create engagement, advertising exposure, or a profile;
- the user is browsing and has not requested assistance.

### Notification rules

Stage 3 introduces no automatic promotional notification. A future reminder requires explicit opt-in for that reminder purpose, a retained user request, a still-actionable and evidence-backed result, useful timing, and a simple stop control. A changed offer or a nearby business is not permission to interrupt.

### Question frequency and fatigue protection

The product must not repeat a question already answered in the current task, must respect dismissals, and must avoid stacking prompts from map, AR, detail, and assistant surfaces. Only one unresolved question should be presented at a time. Exact cooldowns and cross-device limits remain an Open Decision, but implementation cannot begin without a product-approved policy.

## 5. Business Influence Rules

### Allowed business input

A business may provide authoritative or reviewable evidence about:

- capabilities and services;
- products and their supported descriptions;
- valid offers and their conditions;
- availability or operating context when the source can support it;
- experiences the business can actually deliver;
- requested business actions that a user may explicitly choose.

This input must have ownership, freshness, expiry, and an unknown state. A business may improve the quality of its information; it cannot purchase a user intent.

### Not allowed

A business cannot directly request “show my offer to everyone nearby,” override an active user filter, suppress a more relevant result, change an intent interpretation, target sensitive traits, or trigger a notification without user permission. Paid placement, if ever introduced, must be separately labelled and must not masquerade as intent relevance.

### Matching rule

MLINO matches:

**User Intent + User Context + Business Capability + Evidence**

into a relevant experience. Business data is an eligibility and capability input, not an instruction to interrupt the user. When no capability matches, the correct outcome is a clear empty state or a user-controlled refinement.

## 6. Privacy Boundaries

### Permitted, purpose-limited understanding

MLINO may use an approximate permissioned location, a user-selected area or floor, a product/category search, an interaction with a category, a declared time window, and broad movement context during an authorized task when those signals improve the immediate experience.

These signals are not proof of entry, visit, purchase, satisfaction, identity, or completion.

### Prohibited inference categories

MLINO must not infer or target health status, diagnosis, treatment need, financial status, income, debt, creditworthiness, emotional state, religion, ethnicity, political views, sexual orientation, gender identity, relationship status, home/work identity, or sensitive traits of companions. Accessibility requirements may be used only when the user explicitly provides them for the current task and an approved safety boundary exists.

### Consent requirements

- Location and movement require permission and purpose limitation.
- Notification requires separate opt-in for the notification purpose.
- Retention beyond the current task requires an explicit save or equivalent user action.
- Business contact requires an explicit user action and a clear recipient/permission boundary.
- Sharing intent or personal context with V1 or a business requires a separately approved contract and consent.

### Retention rules

Session intent expires when its purpose ends. Rejected hypotheses are not retained as user preferences. Saved intents must have a visible purpose, expiry or review rule, deletion control, and minimum necessary content. Passive signals must not become an indefinite profile. Exact retention durations are an Open Decision before implementation.

## 7. Intent → Experience Flow

**User Context → Intent Hypothesis → Confirmation → Business Capability Matching → Relevant Experience → User Action → Outcome Learning**

| Step | Primary owner | Rule |
|---|---|---|
| **User Context** | User and device permission boundary | Use only purpose-limited, allowed context; user-selected context is stronger than passive proximity. |
| **Intent Hypothesis** | MLINO | Form a temporary, explainable hypothesis; never call it user truth. |
| **Confirmation** | User | Confirm, correct, reject, or skip; confirmation defines scope and retention. |
| **Business Capability Matching** | V1-owned business data plus V2 orchestration | Match only supported capabilities and evidence; do not duplicate or invent business intelligence. |
| **Relevant Experience** | V2 experience layer | Present the least intrusive useful result with reason, evidence, uncertainty, and next action. |
| **User Action** | User | Open, refine, save, share, contact, navigate, dismiss, or stop; business contact needs explicit action. |
| **Outcome Learning** | MLINO under consent and measurement policy | Learn whether the experience was useful only from valid, consented signals; do not infer purchase or completion from a click or proximity. |

Outcome learning must improve the product's understanding of experience quality without turning the user into a hidden advertising profile. Any transfer to V1 remains read-only by default and requires an approved data and consent boundary.

## 8. Open Decisions

The following decisions remain open and block implementation approval:

1. Exact retention windows for session, day-bound, future, and explicitly saved intents.
2. Cross-surface and cross-device question cooldowns and notification fatigue limits.
3. The user-facing language and interaction for confidence, confirmation, correction, and rejection.
4. The minimum evidence required before a business capability can satisfy an intent.
5. The versioned read-only V1↔V2 projection, including ownership, freshness, provenance, unknown values, deletion, and compatibility.
6. Consent and retention policy for outcome learning and any transfer of aggregate signals.
7. Policy and labelling for any future sponsored business experience.
8. Jurisdiction-specific treatment of location, movement, accessibility, and other sensitive data.
9. Recovery behavior when location, network, business data, or user permission is unavailable.

Until these decisions are reviewed and approved, Stage 3 remains design-only. No schema, API, code, ranking change, notification, or V1 connection should be implemented.
