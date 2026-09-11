# MLINO V2 — Technical Architecture Design

Date: 2026-09-10  
Role: MLINO V2 Principal Technical Architect  
Status: **Technical design prepared for review; no implementation performed**  
Foundation: Architecture Closure and Implementation Plan approved by the product owner in the current request.  
Scope: **Intent-Guided Local Discovery — local, single session, experimental data**

This document translates approved decisions into technical responsibilities and integration seams. It does not issue a new architecture gate verdict, authorize coding, define a database schema or API, or claim that the current application already conforms. Component names below describe proposed responsibilities, not files or services created by this task.

## 1. Authority and scope

The implementation sequence remains [V2_IMPLEMENTATION_PLAN.md](V2_IMPLEMENTATION_PLAN.md). Intent authority follows [the redesign](INTENT_CONTEXT_CONTRACT_REDESIGN.md) and [finalization](INTENT_CONTEXT_FINALIZATION.md); matching follows [finalization](EXPERIENCE_MATCHING_FINALIZATION.md) and [closure](EXPERIENCE_MATCHING_CLOSURE.md). Assistant governance follows [ownership](ASSISTANT_OWNERSHIP_DECISION.md), [memory](ASSISTANT_MEMORY_BOUNDARY_DECISION.md) and [orchestration](EXPERIENCE_ORCHESTRATION_DESIGN.md).

| Owner | Responsibility | Forbidden transfer |
|---|---|---|
| User | Intent meaning, exact interpretation confirmation, correction, rejection and consent | MLINO cannot silently define or activate the user's goal |
| MLINO Core | Intent mechanisms, Permission, Consent, session lifecycle, experience orchestration and routing | Core orchestration cannot manufacture business facts or replace V1 authorization |
| V1 | Business truth, Capability, Offer, Evidence, Availability, Recommendation, Action, Outcome, Evaluation and Learning | V2 cannot infer or write authoritative business intelligence |
| V2 | Matching, experience selection/rendering, interaction and Assistant experience | Relevance is not business truth; displaying details is not a business outcome |
| Modules, in future | Domain data, capabilities, evidence and authorized actions | No competing assistant, independent user profile or permission bypass |

Core ownership is a logical boundary. Placing its experimental session controller in the existing V2 frontend does not move V1 ownership, require a new shared backend, or create a new Core database.

The first flow produces **0–3 business experiences**, one result per business backed by one option satisfying every mandatory requirement. Its only primary action is **Open Business Details**. It must work without chat history, GPS, camera, external models, map tiles or a live backend.

Do not infer health, emotional state, financial status, identity traits or other sensitive personal characteristics from wording, location or category interaction. Neither confirmation nor processing consent authorizes hidden profiling. Keep only supported task requirements necessary for this session; unsupported sensitive personalization must not become a matching signal.

## 2. Existing application and reuse boundary

The inspected working copy is on `astra/visual-system-local-experience`, based on HEAD `295d772a91bcd2197dbe3b9520f83c84b9f075b9f`, with pre-existing documentation changes. These observations concern source behavior, not runtime validation.

| Existing source | Reuse | Gap the future implementation must address |
|---|---|---|
| [App.tsx](../../app/src/App.tsx) | Application shell, overlay composition and existing visual surfaces | Current search resolves and matches immediately, retains chat entries and derives results from them; it lacks the new authority/revision/session gates |
| [BusinessDirectoryService.ts](../../app/src/directory/BusinessDirectoryService.ts) and [loader.ts](../../app/src/directory/loader.ts) | Validated snapshot loading, lookup and spatial candidate retrieval | Public record cache is not evidence of stock, fulfilment or permission to process user context |
| [contract.ts](../../app/src/directory/contract.ts) | Existing `draft-1` read-only experimental shape | Does not establish product-offer applicability, live availability or production evidence provenance |
| [IntentParser.ts](../../app/src/matching/IntentParser.ts) and [intentContract.ts](../../app/src/matching/intentContract.ts) | Pure local parsing/normalization and parser-output shape validation | Parsed keywords/modifiers are a hypothesis, not confirmed requirements or a full interpretation contract |
| [MatchingService.ts](../../app/src/matching/MatchingService.ts) | Inspect as legacy behavior; reuse proven pure utilities where compatible | Offer bonuses, keyword scoring, multiple matched products and offer checks based only on end time cannot define the approved matching policy |
| [BusinessCard.tsx](../../app/src/components/BusinessCard.tsx) | Presentation through explicit, constrained props | Default offer decoration and optional route action must not assert unsupported eligibility or expand the new flow |
| [offers.ts](../../app/src/offers.ts) | Pure interval validation using both start and end dates | Time validity alone does not prove applicability to the qualifying option |
| [useLocalExperience.ts](../../app/src/experience/useLocalExperience.ts) | Existing cosmetic theme may remain independent | Saved/liked/hidden/viewed collections are persisted; they must not become task memory or hidden matching inputs |

The current `App.openDetail` calls `experience.viewed`, which persists history. The new task cannot call this handler. It needs a task-scoped details transition and a presentation-only details view; narrowly extracting existing presentation is preferable to duplicating the entire application during later implementation.

The current [LLM factory](../../app/src/matching/llm/factory.ts) can select an external provider from configuration. The new local task must use a directly bound local interpreter adapter, not this environment-dependent resolver. A configured provider must not silently change the privacy boundary.

Existing Stage 1/2 behavior remains outside this new task boundary. Reuse does not mean routing new intent through legacy chat, scoring, stored preferences or details side effects. This is a bounded addition to the existing app, not a reconstruction.

## 3. Frontend architecture

### 3.1 Composition and components

Keep the existing React/TypeScript/Vite application and its composition root. Introduce one cohesive Local Discovery feature area with these logical responsibilities:

| Responsibility | Input and output | Ownership |
|---|---|---|
| Discovery entry and authority controls | Deliberate task entry; permitted purpose and scoped consent | Core-governed V2 presentation |
| Current-intent editor/confirmation | Current wording and manual context; readable interpretation revision; confirm/correct/reject | Core intent authority, V2 interaction |
| Session controller | User commands and environment events; authorized state transitions and effect requests | Core |
| Matching policy | Confirmed current interpretation, allowed context, experimental evidence; eligible ordered candidates | V2 |
| Experience presenter | Authorized candidates and limitations; explanations, empty/unsupported states and details action | V2 |
| Business details presentation | Selected business and qualifying option; local inspection only | V2 presentation of V1-owned information |
| Directory and environment adapters | Read-only source access, clock and lifecycle observations | Explicit infrastructure seams |

Use the existing Assistant placement as a guided interaction surface for this flow. It is not a second independent assistant and need not be a chat window. Ordinary controls must allow task completion without conversational history. When the governed flow is active, its input cannot also dispatch to the legacy search handler.

Components render state and emit commands; they do not call providers, rank businesses, grant permissions or write task storage. Assistant guidance is a projection of the same controller state, not another source of truth.

### 3.2 State management and identity

Use one feature-scoped React state owner, with a reducer for transitions and a narrow context for its children. Existing dependencies suffice; a new global store library is not required by this design.

Keep these concerns separate within that owner:

- Authority: current permitted operation and consent scope.
- Intent: current interpretation revision and its exact confirmation; confidence never substitutes for confirmation.
- Session: active/paused/disposed status and the approved inactivity/absolute deadlines.
- Work: current operation generation, cancellation and source/context identity.
- Experience: current result references, explanations, selection and rendering state.

These are in-memory responsibilities, not new domain entities or storage tables. Store only the current wording and necessary current context. Correction replaces old wording and results; no transcript, revision-content history or replay log is retained. Confirmation references the current immutable interpretation. Revising its meaning requires new confirmation rather than mutating what the user previously accepted.

The public Directory cache may retain the experimental business snapshot independently of a task. User-specific session state must not live in that singleton. Treat returned records as read-only: copying an array does not make its nested records immutable.

### 3.3 Navigation and rendering

Use in-memory view selection compatible with the current overlay structure: entry, interpretation/confirmation, results and details. These are view states, not new URL routes. Do not serialize wording, intent, location, consent or business selection into URL query strings, history state or deep links.

A deliberate results-to-details transition stays within the task. Back returns to its still-valid results after authority and freshness checks. Closing or leaving the task disposes its context; browser reload/navigation ends the session. Switching internal task views does not create a fresh session or reset deadlines.

Render a selected qualifying option and a concise reason beside the experimental-data limitation. Additional public business information may be shown in details, but must not be presented as additional qualifying evidence. Omit route/share/save/contact/purchase controls from this initial task flow. In particular, opening details must not append to persistent `viewed` history.

Reuse cards and sheet styling with explicit props: no automatic offer claim, no route callback and no legacy detail callback. Cosmetic theme remains separate. Stored likes, saves, hidden items and view history do not feed intent hypotheses, eligibility or ordering.

Manual area/radius/context belongs to the current task and must be deliberately supplied or confirmed. An existing default map centre is not proof of user location. Results must work as a list without tiles; the task must not trigger GPS requests, map recentering or external map requests carrying task-derived context.

## 4. Backend and application-domain architecture

### 4.1 Execution location

**No new backend service, database, endpoint or production integration is required for this slice.** The application-domain logic runs locally in the browser. “Service” below means a testable logical responsibility, not a deployed microservice.

| Logical service/boundary | Responsibility | Must not do |
|---|---|---|
| Authority/session controller | Check Permission then Consent; maintain session and authorize effects | Treat a selected role, screen or provider response as permission |
| Interpretation adapter | Direct local parsing and explicit interpretation proposal | Invoke an external LLM or silently drop an unsupported hard condition |
| Orchestration layer | Decide ask/show/guide/silence; manage transitions and effect cancellation | Implement business-domain truth or silently activate intent |
| Matching layer | Eligibility, representative option selection and deterministic ordering | Read private history, invent capabilities or use payment/promotion |
| Directory adapter | Load validated experimental snapshot; expose read-only records and available evidence | Access V1 databases directly or fill missing evidence with assumptions |
| Environment adapter | Supply clock and foreground/navigation lifecycle observations | Treat tab visibility, movement or location as confirmed intent |

Inject Directory access and time into matching. Bind the local interpreter explicitly at composition. Keep policy functions free of React, browser storage and network effects so they can be tested independently. No module or conceptual lifecycle term requires its own service process.

### 4.2 Matching pipeline

1. Validate current task authority, confirmed interpretation and allowed context.
2. Obtain a complete candidate pool from Directory using only supported hard filters. Do not seed it from the legacy matcher's ranked/top results, which could exclude valid candidates.
3. Evaluate each option against every mandatory requirement, exclusion and applicable business-level constraint. Unknown mandatory evidence fails eligibility; distinguish unsupported evidence from a proven mismatch.
4. Associate reasons with the same qualifying option and source. Business-level evidence is usable only for conditions that actually apply at business scope. Product A and product B cannot jointly satisfy a single option's requirements.
5. Choose the business's representative qualifying option using confirmed optional preferences and stable option identity for otherwise equal choices. Compare businesses on this same basis; do not compare one business's cheapest item while explaining another item's capabilities.
6. Order eligible businesses using confirmed optional preferences, supported distance fallback and stable business identity. Do not introduce an independent context-fit score or unapproved weighted business-quality score.
7. Return at most three businesses. Zero is valid. Never fill empty slots with ineligible or sponsored alternatives.
8. Add only evidenced, time-valid offer enhancements. An explicit discount/offer requirement instead participates in step 3 and must be satisfied by evidence applicable to the qualifying option.

Use one evaluation time per matching pass. The existing offer utility treats both time boundaries as inclusive and rejects malformed/reversed intervals. This is useful temporal validation, not proof of discount applicability, inventory or redeemability.

The existing snapshot's business-level offers do not establish a product-discount relation. Consequently, a request requiring a discounted qualifying product is unsupported unless the available evidence actually establishes that relationship. An incidental business-level offer, if displayed, must be labeled at that scope and cannot imply a discount on the selected product.

### 4.3 Asynchronous safety and lifecycle

Every interpretation or matching operation is associated with the current task, interpretation revision, context and operation generation. Cancellation is best effort; completion must also verify that those identities, consent, deadlines and foreground authority still match before publishing results.

Editing, rejecting, pausing, withdrawing consent or ending a task invalidates outstanding work. A late callback cannot restore a disposed task or display results from an earlier revision. Read source state consistently per pass; a snapshot replacement invalidates previous candidate evidence. An internal load generation may identify this event without changing the exported data contract.

Check deadlines when receiving events and before publishing or acting; timers alone are insufficient when background tabs throttle them. Setup/cleanup must be idempotent under React development lifecycle behavior.

| Event | Required effect |
|---|---|
| App becomes hidden or user pauses | Stop matching/presentation authority and invalidate in-flight results; retain only permitted current context within existing deadlines |
| App becomes visible | Remain paused; no interpretation, matching or renewed consent is inferred |
| Explicit Resume | Recheck permission, consent, exact revision, context, evidence and deadlines; unchanged valid intent may resume |
| Material intent/context change | Invalidate results; create a visible interpretation revision and require confirmation again |
| Offer/evidence becomes invalid | Remove affected eligibility/enhancement; do not expire or rewrite user intent |
| Intent expires or is rejected | No matching from it; deliberate new intent and confirmation are required |
| Consent withdrawal, stop/delete/dismiss/done, session-ending navigation/reload, tab close or deadline | Dispose current task content, effects and results; do not archive it |

The approved limits are **30 minutes inactivity and two hours absolute**, with hidden time included. Resume is not a way to reset the absolute cap. Only deliberate user interaction counts as activity; clock ticks, source refresh and tab visibility do not.

When evidence changes, authority checks may invalidate a stale result immediately. Creating replacement results is allowed only while the session has current foreground matching authority; invalidation must never become an automatic resume path.

## 5. End-to-end data flow

**Deliberate user interaction → Permission → Consent → local interpretation → exact revision confirmation → allowed context + Directory evidence → eligibility → ordering → experience → Business Details.**

1. User opens the task. Before intent capture/interpretation, check the requested local operation and obtain scoped processing consent. Declining leaves ordinary browsing available.
2. User provides a goal and manual context. Local parsing creates a proposal, not active intent. Unsupported or ambiguous mandatory details remain explicit rather than being discarded.
3. Ask at most one useful clarification per submitted request, as in the approved plan. Dismissal produces silence. If uncertainty cannot be resolved within the supported interaction, show the limitation and allow a deliberate correction/new request.
4. User confirms the exact current interpretation, including hard conditions and preferences. Only then can the controller authorize matching.
5. Matching consumes experimental evidence and produces eligible, explained candidates. The presenter shows zero to three results with data limitations.
6. User selects Open Business Details. Recheck current authority, selected candidate, option evidence and time validity. If stale or ineligible, explain and return to a permitted correction/resume path; do not open it as a current match.
7. Details remain local inspection. Back preserves only the current valid task; Done disposes it. No lead, visit, purchase, satisfaction, outcome or learning event is inferred.

The interpreter cannot express all human requests using the legacy ParsedIntent shape. Future implementation must limit supported local vocabulary/controls and expose unsupported requirements. Parser validation proves shape only, not user confirmation or semantic completeness.

## 6. Mock versus real and replacement contracts

| Part | Real behavior in this local slice | Experimental/missing boundary |
|---|---|---|
| Permission/Consent/confirmation | Actual enforced ordering and user controls | No simulated approval or hard-coded confirmed intent |
| Session lifecycle | Actual cancellation, pause, disposal and privacy behavior | No durable memory or background processor |
| Interpreter | Actual deterministic local proposal | No remote AI or claim of comprehensive understanding |
| Business data | Actual Directory validation/read operations | Bundled experimental snapshot, not live V1 intelligence |
| Matching | Actual hard-condition evaluation and deterministic ordering | Relevance quality and evidence coverage are experimental |
| Time/location | Actual time checks and deliberately selected area | No proof of presence, route duration or live opening |
| Interaction | Actual local details opening | No external business action or outcome |

Retain the existing Directory wire shape and validation. Define narrow in-process seams for authority/current revision, read-only evidence access, matching input/output, lifecycle observations and details selection. These are conceptual contracts for later implementation, not TypeScript definitions, API payloads or schema changes in this task.

Future source replacement requires explicit review of stable business/option identity, capability vocabulary, provenance, validity, offer applicability, availability, freshness/revocation, tenant filtering and compatibility. A successful loader swap alone is not production readiness.

Current `is_active` means a listing flag, not stock or bookability. Snapshot timestamps are timestamps, not a freshness guarantee. Known price/currency supports only the evidenced comparison; absent or incompatible currency cannot prove a hard budget condition. Missing mandatory stock, timing or applicability data produces unsupported/empty results rather than invented facts.

## 7. V1 integration and data ownership

V2 consumes a read-only projection of V1 concepts through Directory. No direct database/Event Log access, mutation, duplicate business knowledge store or new recommendation/action engine belongs in this slice.

Evaluating whether supplied capability evidence satisfies a confirmed user requirement belongs to V2 relevance. Establishing that the capability exists, calculating authoritative offers, asserting availability and recording business actions/outcomes belong to V1. V2 must not reverse-engineer those facts from category labels, free-text marketing, proximity or a details click.

Permission checks in the local controller do not replace V1's future access/tenant enforcement. Any live adapter must receive only authorized projections and independently preserve V1 governance. User intent and task context are not written back to business records or exposed to businesses.

Outcome learning remains outside scope. Future outcome integration needs a separately approved action/outcome contract with evidence of what happened and permission for processing; interest, views and contact attempts are not interchangeable with completed actions.

## 8. Testing architecture and acceptance evidence

This section specifies future tests. **No application tests or runtime validation were performed for this documentation task.** Use the existing Vitest setup for pure/domain tests and the existing build/type checks. Browser acceptance must inspect actual effects, not only mocked function returns.

### Unit tests

- Reducer transitions: Permission/Consent before capture, confirmation tied to exact revision, rejection/correction and late-result invalidation.
- Separate confidence, confirmation and signal strength; high confidence cannot grant authority.
- Fake-clock lifecycle tests at inactivity/absolute boundaries, including hidden time, explicit Resume and disposal.
- Per-option eligibility with all mandatory conditions, exclusions, unknown evidence and explicit discount applicability.
- Offer start/end boundaries, malformed dates, future offers and expired enhancements without intent expiration.
- Deterministic representative-option and business ordering, ties, 0/1/3 results and cap behavior.
- Interpreter limitations: unsupported mandatory wording cannot vanish into a broad apparently valid match.

### Integration tests

Compose the actual local controller, interpreter adapter, matching policy and Directory with test fixtures conforming to the existing contract. Replace environmental time and delayed work with controlled test doubles, not authority enforcement.

- Confirm a revision, change it while work is pending, then complete the old work: no stale result.
- Hide while matching, become visible and complete work: remain paused until explicit authorized Resume.
- Withdraw consent and navigate/reload: no restored task content or matching.
- Configure an external LLM path and verify this task never invokes it.
- Open task details and verify the legacy `experience.viewed` handler is not used.
- Observe storage/network boundaries: no task text, context, result history or transcript in localStorage, sessionStorage, IndexedDB, URLs, logs, telemetry, map requests or remote providers.
- Replace Directory data or expire evidence between selection and action: no stale qualifying claim.
- Keep legacy Stage 1/2 tests as regression evidence while demonstrating that their persistent/scoring paths cannot govern the new task.

### Acceptance scenarios

| Scenario | Expected observable result |
|---|---|
| A confirmed requirement matches one listed option at a selected area with sufficient experimental evidence | One business result, qualifying option and reason; local details open |
| Option A meets requirement 1 and option B meets requirement 2, neither meets both | Business is excluded; no combined match |
| User requests a discount on the qualifying product, but only an unlinked business offer exists | Unsupported eligibility; no claimed discounted product |
| Optional offer expires on an otherwise eligible option | Enhancement disappears; user intent remains valid |
| No candidate satisfies all requirements | Honest zero-result state; no silent relaxation or paid replacement |
| User returns to a hidden tab | Paused state; no automatic matching |
| User completes and reloads | No task wording, transcript or previous task restored |

Validate mobile and desktop presentation, keyboard/focus behavior, readable explanations, theme contrast, recovery states and completion through ordinary controls. Verify task data remains absent from browser persistence and outgoing requests. Existing cosmetic storage is not itself a failure; task-derived content in it is.

Future delivery gates include `npm test`, `npm run build` (including TypeScript checks), targeted privacy/lifecycle acceptance and protected-scope inspection. Passing legacy tests alone does not prove the new architecture.

## 9. Future extension points — not initial dependencies

| Extension | Reusable seam | Prerequisites before authorization |
|---|---|---|
| Content Studio / CRM / Finance / Operations / industry modules | Core routing and permissioned capability/action adapters | Authoritative module contracts, role/tenant access, action confirmation, cancellation and outcome semantics; no competing assistants |
| AR discovery/storefront | Confirmed eligible experience and shared orchestration | Separate camera/spatial consent, coordinate/anchor accuracy, asset provenance, rendering support and safe pause/availability rules |
| Product visualization | Option identity and evidence scope | Product-specific verified assets, dimensions/variant linkage, accessibility and display limitations |
| Virtual Storefront | Read-only business details and capability projection | Catalog/service/offer applicability, freshness, availability, authorized actions and experience rules |
| Persistent preference/memory | Core consent boundary | Explicit save and scoped consent, retention/deletion and explainability approval; never automatic transcript storage |
| Live V1 integration | Directory/evidence adapter | Approved versioned projection and governance; no direct table coupling |

The initial flow must not load these providers or request their permissions. AR, Virtual Storefront, Marketplace, production integrations, notifications, passive sensing, external LLMs, durable memory, telemetry and outcome writeback remain excluded.

## 10. Technical risks and review points

| Risk | Required implementation response |
|---|---|
| Reusing legacy search quietly reintroduces scoring/transcript/provider behavior | Bind the new controller and local matching/interpreter path explicitly; test forbidden calls |
| Details opening leaks task behavior into saved history | Use task-only navigation and presentation with no legacy persistence side effects |
| Sparse mock data makes unsupported claims look convincing | Preserve unknowns, show experimental scope and test evidence ownership at option level |
| Session and intent states are conflated | Keep pause, rejection and expiration separate; generation guards and deadlines enforce authority |
| App composition accumulates domain logic | Keep the bounded feature controller, pure policies and read-only adapters separate from rendering |
| “Core” becomes a universal business logic owner | Restrict it to authority and orchestration; retain domain facts/actions in V1/modules |
| Local design is mistaken for production readiness | Keep live contracts, durable memory and production scaling behind separate gates |

No approved architectural decision is reopened here. Review is requested for these concrete implementation choices: feature-scoped reducer/controller, directly bound local interpreter, separate matching policy over Directory, task-only details path and adapter-based tests. These are design choices for review, not claims of completed implementation.

After review and a separate implementation instruction, follow the approved plan in bounded phases, preserve V1/Backend/frozen contracts and `main`, and record delivery evidence under the existing HANDOFF process. This document itself is the technical-design review artifact; it does not update Stage 2 runtime validation or claim a remote delivery.

من کدکس هستم
