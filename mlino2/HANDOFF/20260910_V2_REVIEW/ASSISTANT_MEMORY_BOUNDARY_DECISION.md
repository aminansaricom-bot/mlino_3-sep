# MLINO V2 — Assistant Memory Boundary Decision

Author: Codex, Product Architect role
Status: **Session-only boundary approved; documentation aligned for closure review; no implementation authorized**
Alignment: [V2 Gate Alignment Update](V2_GATE_ALIGNMENT_UPDATE.md), 2026-09-10. Approved architecture is retained; required documentation corrections are applied for closure review. No implementation is authorized.

This document defines what the Core-owned MLINO Assistant may remember. It complements [Assistant Ownership Decision](ASSISTANT_OWNERSHIP_DECISION.md) and [Experience Orchestration Design](EXPERIENCE_ORCHESTRATION_DESIGN.md). It creates no memory entity, schema, API or runtime behavior. Current handling inherits the approved Intent rules; it grants no persistent storage policy.

## 1. Problem

The Assistant must preserve enough context to remain coherent while a user completes a task, but memory can easily become hidden profiling. The boundary must distinguish:

- temporary task context from durable user preference;
- V1 business knowledge from Assistant memory;
- an explainable current-session exchange from full historical conversation;
- a useful AR/storefront continuation from unauthorized cross-session tracking.

The current approved V2 scope is local, single-session, experimental, and explicitly excludes long-term user memory and cross-session behavioural inference. The memory decision must preserve that boundary while leaving a safe path for future product-approved capabilities.

## 2. Options

### Option A — Session-only memory

The Assistant retains only the minimum context needed for the authorized foreground task and current session: the current Intent interpretation, permitted context, current accepted constraints, Experience state and selected business/option. Superseded/rejected raw wording, prior answers and a conversation transcript are not retained.

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
| Consent | Allowed-operation check plus explicit scoped local-processing consent before capture/interpretation; exact Intent confirmation is separately required before Matching. | Separate explicit save/retention consent is required. | Business/source permissions and V1 governance apply, not user-memory consent alone. | Separate explicit, purpose-specific consent and deletion policy required. |
| Usefulness | Coherent completion of the current task. | Better continuity across tasks if users choose it. | Reliable business information when freshness and provenance are available. | Broad continuity but often opaque and over-personalized. |
| Explainability | Easy to state what is being used now and why. | Requires visible memory inspection and reason codes. | Explainable through source/provenance, not Assistant recollection. | Difficult to explain which historical statement influenced a decision. |
| V1/V2 boundary | V2 task context; no business truth ownership. | Future V2 user preference product, separately approved. | V1/business-owned knowledge; Assistant must not duplicate it. | Cross-session V2 profile with major governance and integration impact. |
| Future AR / Virtual Storefront | Supports current visual task, selected option, and safe handoff. | Could support continuity only after approval. | Supports rich storefront through current V1 projection and freshness. | Risks persistent spatial and behavioural tracking. |

## 4. Recommended Boundary

**Choose Option A: session-only Assistant memory for the current V2 scope.**

The Assistant may retain a minimal, purpose-limited working context only while an authorized task/session is active:

- the confirmed Intent interpretation revision and its confirmation status;
- current user-provided constraints, preferences and selected area; answers replace current wording rather than accumulate into history;
- permitted non-sensitive context used for the current Experience;
- the current Experience state, candidate explanation and selected business/option; corrections replace the current interpretation and invalidate old result authority;
- minimum current pause/action/control state, not an interaction/event history; terminal controls cause disposal;
- minimum state for returning from local business details to this task; module handoff context is future and separately gated.

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

Option D is rejected for the current product. Only necessary current working wording may remain within the approved local task. Full transcripts are prohibited even temporarily within one session; no persistent log/audit copy is allowed. Future transcript retention, training, cross-session personalization and module-wide search require separate decisions and are unavailable here.

### 4.4 Current session cleanup and disposal

[Intent Redesign §6.2](INTENT_CONTEXT_CONTRACT_REDESIGN.md#62-data-handling-and-retention-decisions) and [Intent Finalization §2.4](INTENT_CONTEXT_FINALIZATION.md#24-when-confirmation-is-required-again) govern this initial slice. General references to conversation, answers, caching, audit or future handoff elsewhere in this document cannot override these rules.

| Trigger | Memory and active-use consequence |
|---|---|
| Before permission check and explicit local-processing consent | No task-text/signal capture or interpretation. Allowed-operation checks and consent do not confirm meaning. |
| Current task interpretation | Keep only necessary current wording/constraints, permitted context, current revision/confirmation and current Experience state; matching requires confirmation of this exact revision. |
| Correction or rejected wording | Discard superseded/rejected raw content and obsolete dependent state; a visible new interpretation needs confirmation. No answer/correction transcript or replayable revision history. |
| Hidden/background or explicit pause | Suspend matching and display authority. Minimum current task context may remain only until existing deadlines; hidden time counts. |
| Explicit Resume while unexpired | Recheck consent, unchanged confirmed revision, context and evidence; material change requires fresh confirmation. Visibility alone cannot resume. |
| Stop/delete, task rejection/dismissal, explicit done, consent/permission withdrawal | Stop use, invalidate pending results and dispose task content. Explicit done is user-reported closure only. |
| Reload/navigation/tab close, 30 minutes without direct task interaction, or two hours from session start | Dispose all task content; no restoration. Earliest ending event controls. Only deliberate task interaction resets inactivity; nothing extends the absolute cap. |

There is no transcript retention, even for the current session, no persistent personal audit exception and no storage in localStorage/sessionStorage/IndexedDB, URLs, service-worker caches, console/crash logs or telemetry. Task content cannot enter external model, business or map requests. Existing saved-business/theme data is not Intent memory and must not receive or restore task content.

V1 business data remains source-owned. Existing public/mock Directory storage is not permission to cache user Intent or to claim live freshness. After disposal, a new task requires applicable scoped consent and new exact-revision confirmation; it does not reconstruct prior behavior.

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

Core owns Intent mechanisms, Permission/Consent enforcement, Session lifecycle, Experience orchestration and Routing; it enforces §4.4 and user control. The user owns Intent meaning and grants consent. Existing V1 Governance owns protected access decisions. V2 owns Matching, Experience and Interaction; V1 owns business truth, Capability, Evidence, Availability, Recommendations, Actions and Learning. Assistant cannot own business logic, create facts/capabilities or bypass permissions.

### Modules

Modules own their domain data, capability, evidence, and actions. A module may receive a minimal task-scoped request and may return domain evidence or an action result under its own authorization rules. It may not silently retain the Assistant's cross-module context, create a competing user profile, or treat a handoff as consent for unrelated memory.

### V1 and Business Context

V1 remains the authority for Business Context and Knowledge. The Assistant consumes an approved projection with provenance, freshness, validity, unknowns, and withdrawal semantics. No Assistant memory decision changes the frozen V1/Backend boundary or authorizes reverse writes.

### Future AR and Virtual Storefront

Session-only memory is sufficient for a current visual task: selected business, selected option, active spatial context, current explanation, and user-controlled navigation. Persistent location history, cross-visit personalization, or remembered product interest requires separate consent and governance. Storefront content remains business/V1-owned; the Assistant remembers the user's temporary task position, not the business catalogue.

## 7. Remaining Decisions

Choosing Option A closes the bounded memory direction, but future work still needs separate approval for:

1. retention/audit rules only for separately approved future capabilities; current session cleanup is defined in §4.4 and permits no transcript/audit exception;
2. explicit saved-preference product semantics and consent;
3. cross-tab, cross-device, cross-session, and concurrent-task behavior;
4. module handoff minimization and deletion acknowledgements;
5. transcript retention, search, export, and external-model processing;
6. outcome learning, telemetry, and aggregate evaluation;
7. AR spatial-memory policy and business/user interaction history.

No item above authorizes implementation. The current Assistant memory boundary remains session-only until a future product decision explicitly changes it.

## Decision Record

**Approved boundary: Option A — session-only memory.** Option B is future, explicit user-controlled preference memory; Option C remains V1/business-owned context rather than Assistant memory; Option D is out of scope. This decision preserves the local single-session V2 contract and the existing V1/V2 separation.

من کدکس هستم
