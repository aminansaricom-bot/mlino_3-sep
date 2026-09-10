# MLINO V2 — Assistant Memory Boundary Decision

Author: Codex, Product Architect role
Status: **Architecture decision for Product Approval; no implementation authorized**

This document defines what the Core-owned MLINO Assistant may remember. It complements [Assistant Ownership Decision](ASSISTANT_OWNERSHIP_DECISION.md) and [Experience Orchestration Design](EXPERIENCE_ORCHESTRATION_DESIGN.md). It creates no memory entity, schema, API, storage policy, or runtime behavior.

## 1. Problem

The Assistant must preserve enough context to remain coherent while a user completes a task, but memory can easily become hidden profiling. The boundary must distinguish:

- temporary task context from durable user preference;
- V1 business knowledge from Assistant memory;
- an explainable current-session exchange from full historical conversation;
- a useful AR/storefront continuation from unauthorized cross-session tracking.

The current approved V2 scope is local, single-session, experimental, and explicitly excludes long-term user memory and cross-session behavioural inference. The memory decision must preserve that boundary while leaving a safe path for future product-approved capabilities.

## 2. Options

### Option A — Session-only memory

The Assistant retains only the minimum context needed for the authorized foreground task and current session: the confirmed Intent interpretation, permitted context, answers, corrections, current Experience state, selected business/option, and user-authorized actions.

This context expires with the task/session rules and is not converted into a durable user profile.

### Option B — User preference memory

The Assistant remembers preferences such as categories, distance, accessibility needs, language, or presentation choices across sessions.

This could improve continuity, but it requires explicit save semantics, purpose-specific consent, review/edit/delete controls, expiry, provenance, and a rule preventing preferences from becoming hidden ranking or sensitive inference.

### Option C — Business context memory

The Assistant retains business profiles, capabilities, products, offers, availability, and interaction history so it can answer faster or provide richer storefront experiences.

This is not Assistant memory. Business context is authoritative domain knowledge owned by V1/the business source and consumed through an approved projection. Copying it into an Assistant-owned store would create a second source of truth and stale or unauthorized business records.

### Option D — Full historical conversational memory

The Assistant retains the user's conversation history across sessions and uses it to personalize future interpretation and action.

This provides maximum apparent continuity, but creates the highest privacy, explainability, retention, deletion, sensitive-inference, and cross-module leakage risk. It is incompatible with the current V2 scope without a separate product, privacy, and data-governance decision.

## 3. Trade-offs

| Criterion | A — Session-only | B — User preference | C — Business context | D — Full conversation |
|---|---|---|---|---|
| Privacy | Lowest necessary retention; scope is visible and bounded. | Medium/high; requires durable consent and controls. | Safe only when V1-owned and read-only; unsafe if copied by Assistant. | Highest exposure and inference risk. |
| Consent | Task/session processing permission is sufficient for the bounded slice. | Separate explicit save/retention consent is required. | Business/source permissions and V1 governance apply, not user-memory consent alone. | Separate explicit, purpose-specific consent and deletion policy required. |
| Usefulness | Coherent completion of the current task. | Better continuity across tasks if users choose it. | Reliable business information when freshness and provenance are available. | Broad continuity but often opaque and over-personalized. |
| Explainability | Easy to state what is being used now and why. | Requires visible memory inspection and reason codes. | Explainable through source/provenance, not Assistant recollection. | Difficult to explain which historical statement influenced a decision. |
| V1/V2 boundary | V2 task context; no business truth ownership. | Future V2 user preference product, separately approved. | V1/business-owned knowledge; Assistant must not duplicate it. | Cross-session V2 profile with major governance and integration impact. |
| Future AR / Virtual Storefront | Supports current visual task, selected option, and safe handoff. | Could support continuity only after approval. | Supports rich storefront through current V1 projection and freshness. | Risks persistent spatial and behavioural tracking. |

## 4. Recommended Boundary

**Choose Option A: session-only Assistant memory for the current V2 scope.**

The Assistant may retain a minimal, purpose-limited working context only while an authorized task/session is active:

- the confirmed Intent interpretation revision and its confirmation status;
- user-provided constraints, preferences, selected area, and answers in that task;
- permitted non-sensitive context used for the current Experience;
- the current Experience state, candidate explanation, selected business/option, and user corrections;
- explicit pause, stop, rejection, action, and completion signals within the task;
- the minimum handoff context required to return the user safely to the same task.

This is **working context, not a user profile**. It must expire with the approved session/task lifecycle, must not silently survive into a new session, and must not be used for cross-session behavioural inference or unrelated ranking.

### 4.1 Future preference memory

Option B is a possible future product capability, not part of the current boundary. It may be considered only when MLINO defines:

1. an explicit user “save this preference” action;
2. separate consent from current-task Intent confirmation;
3. visible purpose, source, expiry/review, edit, and deletion controls;
4. a non-sensitive preference vocabulary and prohibition on inferred preferences;
5. rules preventing saved preferences from overriding a new explicit Intent or hard constraint;
6. retention, export, jurisdiction, audit, and cross-device behavior.

Until those decisions are approved, a preference is task-scoped and temporary.

### 4.2 Business context is not Assistant memory

Option C is rejected as Assistant ownership. Business Context, Knowledge, capabilities, products/services, offers, availability, and provenance remain V1/business-owned. The Assistant may read an approved, versioned projection for the current task; it may cache only under that source's approved freshness and retention rules, and it cannot create a parallel canonical copy or claim freshness that the source does not provide.

### 4.3 Full conversation is out of scope

Option D is rejected for the current product. Conversation content needed to answer the active task may remain in the session working context, subject to the approved permission and retention boundary. Indefinite transcript retention, training use, cross-session personalization, and module-wide conversational search require new decisions and are not implicit in Assistant ownership.

## 5. Privacy Implications

- **Data minimization:** retain only what is necessary to continue or explain the active task.
- **Purpose limitation:** current-task memory may not silently become advertising, ranking, analytics, or training input.
- **Consent separation:** processing permission and Intent confirmation do not grant durable memory consent.
- **User control:** correction, rejection, pause, stop, expiry, and deletion of task context must be respected; no rejected hypothesis becomes a preference.
- **Sensitive boundaries:** do not retain or infer health, emotion, financial status, identity traits, or other sensitive characteristics as Assistant memory.
- **Transparency:** the Assistant must be able to state what current context it is using and why a result or question depends on it.
- **Module isolation:** a module receives only the minimum authorized task context; it does not receive the Assistant's unrelated session history.
- **Business isolation:** businesses do not receive private user memory or hidden Intent/context merely because a detail or storefront surface is opened.
- **Learning boundary:** clicks, shares, views, proximity, and resume events are not durable preference or outcome signals without a separate approved consented evaluation path.

## 6. Impact on Core and Modules

### Core-owned Assistant

Core owns the policy for session working context, including what may be retained, when it expires, how consent is checked, how context is minimized for a handoff, and how a user can correct or stop it. Core must not become a durable business or conversation warehouse.

### Modules

Modules own their domain data, capability, evidence, and actions. A module may receive a minimal task-scoped request and may return domain evidence or an action result under its own authorization rules. It may not silently retain the Assistant's cross-module context, create a competing user profile, or treat a handoff as consent for unrelated memory.

### V1 and Business Context

V1 remains the authority for Business Context and Knowledge. The Assistant consumes an approved projection with provenance, freshness, validity, unknowns, and withdrawal semantics. No Assistant memory decision changes the frozen V1/Backend boundary or authorizes reverse writes.

### Future AR and Virtual Storefront

Session-only memory is sufficient for a current visual task: selected business, selected option, active spatial context, current explanation, and user-controlled navigation. Persistent location history, cross-visit personalization, or remembered product interest requires separate consent and governance. Storefront content remains business/V1-owned; the Assistant remembers the user's temporary task position, not the business catalogue.

## 7. Remaining Decisions

Choosing Option A closes the bounded memory direction, but future work still needs separate approval for:

1. exact session/task cleanup and audit-retention rules;
2. explicit saved-preference product semantics and consent;
3. cross-tab, cross-device, cross-session, and concurrent-task behavior;
4. module handoff minimization and deletion acknowledgements;
5. transcript retention, search, export, and external-model processing;
6. outcome learning, telemetry, and aggregate evaluation;
7. AR spatial-memory policy and business/user interaction history.

No item above authorizes implementation. The current Assistant memory boundary remains session-only until a future product decision explicitly changes it.

## Decision Record

**Recommended boundary: Option A — session-only memory.** Option B is future, explicit user-controlled preference memory; Option C remains V1/business-owned context rather than Assistant memory; Option D is out of scope. This decision preserves the local single-session V2 contract and the existing V1/V2 separation.

من کدکس هستم
