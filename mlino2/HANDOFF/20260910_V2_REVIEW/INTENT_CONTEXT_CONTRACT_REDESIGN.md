# MLINO V2 — Intent Context Contract Redesign

Author: Codex, Principal Product Architect role.

Baseline: `fc95857070a74e3557615f820e28fd645857060b`. This document repairs the nine blockers in [the architecture gate review](INTENT_CONTEXT_DATA_CONTRACT_REVIEW.md). It is conceptual product/architecture design only: no code, schema, migration, API, or implementation is created or authorized.

Decision posture: these rules were proposed at `267bb81a753c6b99594519e0c5c4e146bd202a74`, then received the B — Approved with minor changes verdict in [the final gate review](INTENT_CONTEXT_FINAL_GATE_REVIEW.md). The three conditions from that gate are closed in [the finalization record](INTENT_CONTEXT_FINALIZATION.md), including the session-resume clarification now incorporated in §3.3. The redesign is the current conceptual authority for the adopted bounded scope. It is not a claim that existing software behaves this way and does not authorize implementation.

Upon adoption, this document governs the conflicting Intent semantics in [the original decisions](INTENT_CONTEXT_DECISIONS.md) and [the data contract](INTENT_CONTEXT_DATA_CONTRACT.md): Strength, version-specific confirmation, retention consent, intent expiry, archival, and outcome data direction. Those documents remain historical evidence in this delivery. The protected V1/V2 integration contract and V1 ownership rules are not superseded or amended here.

## 1. Current Problems

The original contract expressed the right principles but allowed incompatible implementation choices. These are the repairs, with the review IDs preserved for traceability.

| Blocker | Problem | Redesign resolution |
|---|---|---|
| R1 | Strength described request specificity rather than signal power; explicit words could be confused with correct interpretation. | Separate Signal Strength, Intent Confidence, User Confirmation, and optional Goal Specificity (§4). |
| R2 | A confirmation had no exact interpretation/version authority; saving could imply activation. | Immutable interpretation revisions and purpose-specific confirmation; consent and activation remain separate (§2, §5–6). |
| R3 | User intent, offer validity, experience availability, and archival were mixed. | Independent lifecycles with explicit transitions and invalidation rules (§3). |
| R4 | Context precedence, freshness, session boundaries, and concurrent tasks were undefined. | Declared-context precedence, task-bound snapshots, explicit refresh, one-task scope, fixed session limits (§2–3). |
| R5 | Temporary processing, retention, saving, deletion, and audit exceptions were conflated. | Separate processing permission; bounded in-memory lifetime; no durable intent archive in the initial scope (§6). |
| R6 | Sensitive raw input and existing external-model paths lacked a processing boundary. | Local-only handling in the initial scope; no sensitive profiling, model export, logs, or training from intent content (§6, §8). |
| R7 | A conceptual matching formula did not define eligibility, constraints, unknowns, or supported claims. | Hard-constraint evidence, separate preferences, explicit unknown/no-match outcomes, evidence checks before display/action (§7). |
| R8 | Business intelligence ownership risked swallowing V2 matching; a proposed reverse transfer conflicted with V1→V2. | V1 owns facts; V2 owns user relevance; Directory is the sole V1-aware boundary; no intent/outcome writeback (§8). |
| R9 | No bounded implementation slice, asking policy, or acceptance evidence existed. | A local session-only discovery slice, finite prompt budget, explicit exclusions, and scenario-based gate (§2, §5, §9). |

The goal remains a useful experience for a user-confirmed need. A nearby offer, repeated clicks, or business promotion cannot define that need on the user's behalf.

## 2. New Conceptual Model

### 2.1 Independent concepts and authority

These are semantic responsibilities, not database entities or field definitions.

| Concept | Meaning | Authority |
|---|---|---|
| Context observation | A declared fact or permitted observation with source, purpose, observation time, precision, and validity. | User declarations and authorized context source. |
| Signal | A task-relevant observation, such as a user-selected category; not a statement of the user's goal. | V2 may assess its relevance and quality. |
| Intent task | One user goal being explored in a particular session. Its identity does not identify a person across sessions. | User owns meaning, correction, start, stop, and completion. |
| Interpretation revision | An immutable candidate description of that task's goal and constraints, with provenance and uncertainties. | V2 proposes; the user may correct or confirm it. |
| Confirmation | User acceptance of the exact displayed revision and stated scope. | User only. |
| Processing permission | Authorization for a specified operation, data category, purpose, recipient, and lifetime. | User choice under the approved processing policy. |
| Active-use authority | Permission to perform the requested matching now using the current confirmed revision, valid task context, and applicable processing permission. | Derived by V2 from those independent prerequisites; never from confidence. |
| Business evidence | Source-supported capability or claim, with its own provenance and validity. | V1/authoritative business source; V2 is a read-only consumer. |
| Experience | A result or next action justified by a confirmed revision and current business evidence. | V2 selects and explains; user chooses actions. |
| Outcome observation | What demonstrably happened, distinguished from the user's own report and from an inferred outcome. | User controls self-report; V2 must not invent visit/purchase/completion evidence. |

Context → Signals → Hypothesis → User Confirmation → Active Intent → Capability Matching → Experience → User Action/Outcome.

Processing permission is a prerequisite across this flow, not a consequence of confirmation. Confidence can inform clarification before confirmation; it is not another authority gate capable of overriding the user.

### 2.2 Adopted bounded scope for a future initial implementation

The first slice is **one foreground task in one tab, local interpretation and matching over the existing mock directory**, with a clear test-data label. It supports an explicit need, user-chosen area/radius and optional category/floor, a visible interpretation, confirmation, evidence-backed results, correction, rejection, and ending the task.

The user enters through a dedicated intent entry point. Existing map, detail, AR, and Stage 2 commands do not automatically create an Intent task. An explicit action may enter the intent flow from another surface, but that surface cannot supply hidden consent or confirmation.

Only current-task user submissions and explicit filter choices supply signals. Background sensing, movement capture, automatic GPS updates, cross-session history, cross-tab identity, concurrent intents, durable saving, scheduled goals, notifications, external LLM calls, business messaging, purchase actions, live V1 integration, and telemetry/model training are excluded. These exclusions apply to the new Intent slice; existing application capabilities are not claimed to have been removed or repaired.

This scope intentionally uses existing local parsing and directory concepts, subject to the confirmation and evidence boundaries below. It is not permission to rebuild the project, invent a parallel business model, change existing ranking silently, or expand the frozen directory shape.

### 2.3 Context precedence and material changes

1. The current user-declared destination, radius, time purpose, and mandatory constraints take precedence over passive/device observations. A confirmed manual destination may differ from the user's physical location.
2. A manual map point is a search area, never proof of physical presence. In the initial scope, a device location request is unavailable in the Intent layer; manual selection is the supported alternative. Future GPS use needs its own approved precision and freshness policy.
3. The confirmed context is a task snapshot. New category, destination, radius, floor, deadline, mandatory constraint, exclusion, or next-action purpose changes its meaning and creates a new interpretation revision. The user must confirm before that change drives matching.
4. A cosmetic label change, locale display change, or confidence reassessment that leaves meaning unchanged does not create new confirmation authority. When equivalence is uncertain, treat it as a semantic change.
5. Essential context is defined by the confirmed request. Distance needs a search point; an explicit floor restriction needs a declared floor; a time-limited goal needs an agreed deadline. Missing essential context pauses matching. Missing optional context is omitted and explained; it does not silently become a mandatory question.
6. Live time advances independently. It re-evaluates offer validity and the user's confirmed deadline without rewriting either. Expiry of business evidence invalidates affected experiences, not the user's goal.
7. In the first slice, prior session searches and Stage 1 personal state are not evidence for a new intent. Opening a business, saving it, or selecting a category does not by itself confirm a goal.

### 2.4 Interpretation versioning

An interpretation revision contains, conceptually, the user's requested outcome, mandatory constraints and exclusions, optional preferences, chosen context, task window, permitted next action, source attribution, and unresolved meanings. It is expressed as ordinary user-readable text, not an opaque parser output.

Each task has a current candidate revision. A material change creates a new revision and supersedes the previous current revision. Confirmations refer to the exact accepted revision and scope; they are never copied to a successor. User ownership does not depend on a login, account profile, or business identity.

Examples:

- “Shoes” produces a candidate describing shoes. If the parser adds “running,” that addition is visibly unconfirmed; the original words do not validate it.
- The user confirms “running shoes within this selected area,” then changes the destination. The previous confirmation cannot authorize searching the new area.
- A model/parser upgrade yields a different interpretation. It is a new candidate, not a silent edit to the accepted meaning.

Starting a correction immediately suspends use of the old revision. Submitting the correction creates a new hypothesis. Merely closing the editor does not resume old work: the user must explicitly resume the still-current unchanged interpretation, or confirm the changed one. A new unrelated goal ends the previous task in this slice.

Pending results and experiences remain tied to their originating revision and authority. Before display and again before an action, V2 must verify that the revision is current, confirmation is still valid, processing is allowed, and required context/evidence is usable. Late results after correction, rejection, stop, withdrawal, or expiration are discarded. Duplicated or delayed confirmation of an old revision has no effect.

## 3. Intent Lifecycle

### 3.1 Three independent lifecycles

| Lifecycle | Governing evidence | End/invalidation | Effect on the others |
|---|---|---|---|
| User Intent | User-confirmed goal, task window, current revision, and user control. | Goal deadline, session limit, user stop/completion, or processing withdrawal. | Stops matching authority and intent-specific experiences. Does not alter the business offer. |
| Business Offer | Source's start/end interval and trustworthy current offer status. | Offer not started, expired, invalid, withdrawn, or unsupported by fresh evidence. | Removes offer eligibility. The user's need may remain Active and receive another supported result or no match. |
| Experience availability | Current revision/permission plus capability evidence, context, and supported next action. | Any supporting prerequisite becomes false or unknown. | Removes or disables that experience/action. Does not mean the user abandoned or fulfilled the goal. |

An offer's valid interval is only evidence of temporal validity. It is not proof of stock, opening hours, redeemability, or live fulfilment. Likewise, an experience shown yesterday is not authorized today merely because its business still exists.

### 3.2 Revised semantic lifecycle

Detected belongs to the **signal stage**; it is not a user-owned active goal. Hypothesized is the task's candidate interpretation. Confirmation and current active use are distinct. Paused and Ended make the previously ambiguous stop/completion cases explicit. Archived is a separate retention condition, not an automatic next step after expiration.

| State | Entry/transition evidence | Who controls it | Permitted next transitions |
|---|---|---|---|
| Detected signal | Allowed task interaction observed after processing permission. | V2 within that permission. | Form a hypothesis or discard; never activate directly. |
| Hypothesized | Candidate revision and visible meaning; source may be explicit or implicit. | V2 proposes; user edits/rejects/confirms. | Confirmed by exact user acceptance; Rejected; Ended/Expired. Correction supersedes it with another hypothesis. |
| Confirmed | User accepted this revision for its displayed scope. | User only. | Active after the requested start action and valid prerequisites; Paused if an essential prerequisite is missing; Ended/Expired. |
| Active | Current revision confirmed; matching requested; processing allowed; task/context valid. A successful business match is not required. | User authorizes; V2 enforces the conditions. | Paused, Ended, Expired, or a new Hypothesized revision after correction. No-match keeps Active valid. |
| Paused | Editing, explicit pause, or missing essential task context. No further matching or actionable stale experience. | User or V2 for a documented prerequisite failure. | Resume unchanged current revision only by explicit user action with valid prerequisites; changed meaning requires new hypothesis/confirmation; Ended/Expired. |
| Rejected interpretation | User explicitly declines a candidate revision. | User. | Terminal for that revision. Only a new explicit user request can start another attempt. |
| Ended task | User stops, reports completion, starts a different goal, or withdraws processing permission. Record the reason conceptually; do not call all endings success. | User. | No reactivation. A later task starts fresh. |
| Expired task | Confirmed deadline or session/time boundary is reached. | V2 enforces a previously disclosed rule. | No passive renewal. A new request needs fresh permission as applicable and confirmation. |
| Archived record | Future retention feature only, with separate policy and consent. | User under a future approved policy. | Not supported in the initial slice. Restoration must create a new candidate and fresh authority, never restore Active state. |

No-match or expired offer does not move an Active goal to Ended/Expired. Paused is not a loophole to retain a task indefinitely; its time bounds still run. Completed is a user-reported reason for Ended, not a purchase assertion derived from clicks or GPS.

### 3.3 Concrete session and expiration rule

For the adopted bounded slice, a processing session starts when the user accepts local task processing. It ends at the earliest of: explicit end/delete/permission withdrawal; reload/navigation away/tab close; 30 minutes without direct task interaction; or 2 hours after session start. These are adopted prototype product caps, not measured optimal values or legal retention periods. They must be visible in the processing notice; production retention remains a separate future decision.

Only deliberate user interactions with the task reset the inactivity timer. Re-rendering, background events, data refresh, or business changes do not reset it. No activity extends the two-hour maximum.

Hiding the tab or moving the app to the background moves the task to Paused and stops matching and actionable Intent experiences. Making the app or tab visible again is an environmental event only: **app resume is not a user action and is not an Intent signal**. Visibility, focus, `pageshow`, automatic refresh, re-rendering, clock changes, and business-data changes cannot restart matching or reactivate an experience.

On return, V2 may perform only the checks needed to decide whether a resume control can be offered: session deadline, processing permission, current interpretation revision, confirmation validity, and essential context/evidence freshness. Matching resumes only after a deliberate task action: the user selects an explicit Resume/Continue control, submits an edited need or context, or starts a fresh Intent task. An explicit Resume may reuse the current confirmation only when the exact confirmed revision and its material context remain unchanged and all prerequisites are valid. A material change creates a new revision and requires confirmation again. If permission was withdrawn or the session/task expired while hidden, the old task cannot resume; a fresh task requires applicable processing permission and confirmation. Time spent hidden continues to count toward both the 30-minute inactivity limit and the two-hour absolute cap. There is no background work or notification.

Each goal also ends at its explicitly confirmed deadline if earlier than the session cap. The initial slice supports current-session goals only. A request for tomorrow or durable “today” tracking receives an unsupported-scope explanation and may become a current-session search only if the user edits and confirms it. It is never silently converted or scheduled.

Expired/ended task content is removed from product memory and cannot be restored by history, cache, undo, or an old asynchronous result. No database deletion process is specified because durable storage is excluded. This is an application-level disposal requirement, not a claim of forensic erasure from device memory.

## 4. Confidence Model

| Concept | What it represents | Who creates it | Can it change? | What it cannot replace |
|---|---|---|---|---|
| Signal Strength | Reliability, directness, freshness, and independence of an allowed observation for a particular question. | V2 assesses the source. | Yes: aging, correction, or loss of provenance weakens/discards evidence. | Interpretation confidence, confirmation, or processing permission. |
| Intent Confidence | Evidence supporting a particular interpretation revision; an epistemic judgment, not a fact about the person. | Local interpretation process in this slice. | Yes, as evidence changes. A changed meaning needs a new revision. | User acceptance, user intent, or consent. |
| User Confirmation | A recorded affirmative user act accepting the exact meaning and scope displayed. | User only. | May be withdrawn or superseded, not incremented by a score. | Retention, export, reminders, contact, or permission to process data. |
| Goal Specificity | Descriptive completeness/actionability of the expressed request. Optional diagnostic vocabulary. | V2 can describe what remains unspecified; user supplies meaning. | Yes, after clarification. | Signal Strength, certainty, urgency, willingness to pay, or confirmation. |

The old bare term Strength is retired. Its former specificity meaning is now Goal Specificity. Signal Strength always means signal quality/power, never how strongly the system believes the user wants something.

For the initial slice, use qualitative confidence: supported interpretation, ambiguous interpretation, or insufficient evidence. No numeric probability or threshold is required for activation because every parsed interpretation must be user-confirmed. Repeated correlated clicks are not independent evidence and do not accumulate into confirmation.

An explicit utterance is strong evidence of the words typed, not of an inferred category or product subtype. A user correction outranks any score. After confirmation, weaker incidental signals cannot revoke the user's accepted meaning: stale essential context may pause use, while semantic reinterpretation requires a new revision. The system must not broaden a confirmed constraint solely because confidence fell.

Expired/rejected signal content is not retained as a preference. Confidence is scoped to the revision and available evidence; it cannot prolong the task or survive its disposal as a user profile.

## 5. Confirmation Model

### 5.1 What exactly the user confirms

The user sees a compact statement of the desired outcome, mandatory constraints/exclusions, optional preferences, search context, task window, and proposed next action. Every parser-added interpretation affecting results is visible. Unknown or unsupported requirements are explicitly identified; they cannot be silently omitted from the statement or accepted as facts.

For this initial scope, both explicit free text and implicit hypotheses pass through that visible statement. A dedicated “Confirm and find” action accepts its current revision and requests immediate matching. This removes the earlier ambiguity about which entry points can implicitly confirm parsed output. It does not assert that two screens are always needed; it requires that the exact meaning be visible when the user confirms.

An acceptance refers only to that revision, the current task, and its next-action scope. A later action such as sending a message or exporting intent would require separately authorized functionality and permission. Those actions are excluded here.

### 5.2 Rejection, correction, save, and stop

- Reject discards that hypothesis and prevents activation. It is distinct from correcting it into a new candidate.
- Correct invalidates use of the old interpretation before work on the successor. The successor needs confirmation even if confidence is high.
- Stop terminates active use without claiming the goal was fulfilled. “I am done” can record a transient self-reported completion, not a verified visit or purchase.
- Save is not a confirmation event. Durable intent saving is unavailable in this slice. Existing Stage 1 business saves remain separate and provide no intent authority.
- Silence, dwell time, scrolling, opening details, sharing a business, or dismissing a prompt never means yes.

An old revision cannot be reaccepted through a delayed response. Ending the task or withdrawing processing authority invalidates all outstanding interpretation, matching, and experience work for it. Results do not become exceptions simply because they were already computed.

### 5.3 Asking and fatigue rules for the initial slice

No unsolicited prompt is triggered by browsing, proximity, an offer, or repeated behavior. Questions appear only after the user explicitly enters this task. Only one unanswered question is shown at a time.

There is a maximum of one system-initiated clarification per submitted request. A request needing several missing essentials receives a clear unresolved summary and user-edit controls instead of an interview. Confirmation of the resulting statement is one separate explicit authorization step; it is not recycled as repeated persuasion. User-initiated edits may request a new attempt but old questions are not repeated automatically.

Dismissal/rejection stops automatic asking for the task. A transient, content-free “do not prompt again in this session” control may remain until the session ends, without retaining the rejected need. Restart requires explicit user action. There are no timed pop-ups, cross-surface prompt queues, cross-device follow-ups, or notifications. This event-based limit replaces an unresolved numeric cooldown for the initial scope.

## 6. Consent Boundary

### 6.1 Independent permission, before processing

Intent Confirmation answers “Did I understand your goal correctly?” Processing permission answers “May this operation use these data for this purpose and lifetime?” Neither implies the other. OS/device access permission, business promotion, acceptance of a result, and general app use are not substitutes.

Before any task text/signals are interpreted, the entry point explains local-only processing, the data involved, session limits, absence of saving/export/training, and the stop/delete control. The user explicitly accepts or declines. Declining leaves the user in ordinary browsing without intent capture or processing. There is no preselected or inferred permission.

This local task permission allows necessary in-memory interpretation and matching during the stated session only. It does not authorize persistent history, cross-session reuse, location sensing, external providers, analytics, or business contact. The subsequent confirmation concerns meaning and start of matching, not an expansion of those permissions.

### 6.2 Data handling and retention decisions

| Information | Allowed use in the initial scope | Disposal / restriction |
|---|---|---|
| Current user-entered text | In-memory interpretation and correction after permission. | Retain only current working/confirmed wording during the task; discard superseded/rejected content and all task content on end/expiry. |
| Interpretation and confirmation reference | Explain current meaning and enforce revision authority. | In-memory only, task-limited. No durable transcript or general audit exception. |
| Manually selected point, radius, floor and category | Only the declared task context, with no inference of physical presence. | Task-limited; no movement trace or export. |
| Revision invalidation / prompt suppression control | Prevent stale answers and repeated prompts. | Minimal content-free control information until pending work/session ends. It cannot reconstruct the rejected need. |
| Business evidence | Read-only existing directory access. | Existing business-data governance remains distinct; no Intent text is added to the directory. |
| Local result selection / explicit outcome report | Immediate interaction or closure of this task. | No analytics event, training example, conversion claim, or cross-session learning. |

Intent content must not enter browser persistent storage, URLs, service-worker caches, crash/console logs, telemetry, model prompts, or outbound business/map requests. New intent UI must not pass raw goals or precise task context into an existing network path merely because it already exists. The normal application may retain its own existing state; the new task must not silently copy intent data into that state.

Withdrawal stops new processing immediately, invalidates late results and intent-specific actions, and discards task data under the session disposal rule. Returning requires a new permission decision and a new confirmed task. No “minimal governance need” exception permits storing a personal transcript in this scope.

### 6.3 Sensitive information and third parties

Prohibited inferences include health/diagnosis, emotional state, financial standing, religion, ethnicity, politics, sexuality, gender identity, relationship status, home/work identity/routines, and sensitive companion traits. Neither multiple signals nor high confidence legitimizes them.

Explicit non-personal service/product requests can be processed locally within permission: “find a dentist” describes a requested service; it does not establish a diagnosis. “Lower priced” expresses a constraint/preference, not poverty or purchasing power. Explicit incidental personal detail does not become a matching dimension, profile, or business-visible fact.

For example, a sentence containing a health disclosure may produce only a visible generic service-request candidate; the disclosure must not be used to diagnose or tailor treatment. The user confirms that reduced task. If a request depends on medical, emotional, financial, or other sensitive personalization, the layer explains the unsupported scope and lets the user restate a generic service need. It does not promise flawless sensitive-text detection or treat generic consent as permission for sensitive profiling.

External LLM inference, training, remote text processing, behavior analytics, and V2→V1 intent/outcome transmission are unavailable in this slice, even if the user would be willing to consent. They need separate architecture approval and purpose/recipient/retention terms first. Existing LLM resolver availability is not permission to use it from this Intent flow; failure of local interpretation yields an editable unsupported/ambiguous result, never an automatic remote fallback.

This is a product privacy boundary, not a legal compliance certification. Jurisdictional assessment remains required before a public/live deployment.

## 7. Matching Boundary

### 7.1 Semantic input and eligibility

Matching may start only with the current confirmed revision, its permitted current-task operation, unexpired context, and read-only business evidence. Inputs are the user-approved goal, mandatory requirements/exclusions, optional preferences, chosen area/time, and evidence needed to support an experience. No numeric score or business instruction creates those inputs.

Hard constraints are obligations, not ranking weights. A positive hard requirement needs evidence of satisfaction. An exclusion needs evidence that it is respected; unknown does not silently pass. Optional preferences can order eligible candidates only using supported facts. Unmet/unknown optional preferences are disclosed; they cannot be promoted to verified claims.

No requirement may be demoted or removed by a parser or matcher. In the first slice, mandatory requirements are shown as such on the confirmation statement; extra preferences count as soft only when the user explicitly marks them optional. Any unclear hard/soft meaning requires clarification or an edit. Changing a hard constraint is a new revision, not an automatic fallback.

### 7.2 Supported initial evidence and claims

The approved current directory shape remains the only business-data vocabulary. The layer can use existing category, business/product descriptions, location/floor, and offer timing as explicitly labelled mock evidence. Names and descriptions support a directory match, not guaranteed stock, quality, opening hours, or fulfilment.

| Requested property | Evidence rule |
|---|---|
| Business/category or named listed product | Trace to the actual directory category/text/product entry; explain whether it is a listing rather than availability. A parser-generated term is not a product fact. |
| Chosen radius / venue floor | Use the selected point and recorded location/floor. Missing floor/building evidence cannot satisfy a mandatory same-floor requirement. |
| Current offer | Require the existing valid start/end decision at use time. Missing, reversed, or malformed validity is not an active offer. |
| Live stock, size availability, opening now, medical suitability, quality, reviews, guaranteed service fulfilment | Not established by the current record. Mandatory requests for these produce unsupported/no-supported-match outcomes; do not fabricate new fields or weaken the requirement. |
| Lower price | Only a preference/requirement supported by comparable listed amounts and units/currency can be evaluated. Missing or incomparable prices remain unknown; no affordability inference. |

Offers are optional unless the user requires an offer. The Stage 2 nearest-active-offer selector is therefore not a general-purpose Intent matcher. Similarly, lexical matching or a validated category alone cannot authorize a claim that the complete goal was satisfied.

In the initial mock-only slice, evidence references the current loaded dataset and is described as simulated. Reload or dataset change ends that task's evidence authority. The layer rechecks time-sensitive evidence before display and action. A timestamp showing synchronization alone is not business-truth freshness. No live freshness guarantee is made until V1 supplies and agrees to it.

### 7.3 Semantic output and experience availability

The experience boundary distinguishes: supported match; no supported match; unsupported mandatory requirement; or temporarily unusable context/data. Each outcome explains which goal and evidence it used and what remains unknown. A partial candidate failing a hard constraint cannot appear as a match. Only an explicit user revision can relax that constraint; generic browsing remains a separate user choice.

A supported result identifies the current interpretation it serves, why it is relevant, the supporting business claim/source, unmet optional preferences, validity limits, and supported next action. This is a conceptual obligation, not an API response design.

Eligible results are presented for the confirmed goal. Business payments, proximity alone, or unconfirmed hypotheses cannot change eligibility or trigger a feed. The initial preference order is: satisfy all hard constraints, then satisfy the user's explicitly ordered optional preferences where evidence is comparable, then nearest distance within the selected area, then stable business identity for ties. Missing optional evidence receives no invented positive credit. If user preference priority is not supplied, do not invent weights: explain the tradeoff and use the stable distance/tie fallback among eligible candidates.

These are future semantics for the new intent experience, not permission to modify the existing matcher during this design task. Any later implementation must show how the existing path complies or receive explicit approval for a change. Unconfirmed hypotheses may form a clarification, but may not filter, order, or personalize business results. Browsing selected directly by the user remains usable independently.

When evidence or permission becomes invalid, mark the affected experience unavailable before a next action and offer an explicit refresh/edit path. Expiry of one offer can yield another qualifying match or an honest empty state while the user's intent remains Active. Never imply that rendering a storefront or launching navigation proves fulfilment.

## 8. V1/V2 Responsibility Split

The authoritative boundary is V1 → V2 through the approved business-directory projection. V2 does not write business data, intent text, user context, confirmations, or outcome signals to V1. Consent does not amend this one-way architecture rule.

| Responsibility | V1 / business-data side | V2 / experience side |
|---|---|---|
| Capability | Own and substantiate what the business can provide. | Evaluate whether an allowed capability satisfies the confirmed need. |
| Evidence and freshness | Own provenance, validity, revocation, unknowns, and source truth. | Consume through Directory, check applicability, explain limits; never invent evidence. |
| Knowledge | Own business facts and supported claims. | Present relevant supported information without deriving new business facts. |
| Offers | Own conditions, validity and withdrawal. | Assess current offer eligibility independently of intent expiry. |
| Availability | Supply authoritative availability when that capability exists. | Treat absent/unknown availability as unknown; listing/activity flags do not replace it. |
| Business recommendations | V1 may own operational recommendations for the business. | Customer relevance, user-goal matching and experience selection remain V2 responsibilities. |
| User interpretation / confirmation / permission | No authority to create, confirm, or alter user intent. | Maintain user-controlled revisions and enforce user permission. |
| Presentation and interaction | May supply supported actions, never commands to target every nearby user. | Choose useful experience and display; user authorizes each meaningful action. |
| Outcomes | No new inbound outcome path in this design. | Only explicit in-session user feedback/closure in the initial scope; no persistent learning or conversion inference. |

Business Directory Service remains the only V1-aware component in V2. Intent, matching, map, and AR consumers use that boundary rather than calling V1 internals or accessing its database/Event Log. The future capability vocabulary must fit a separately approved projection; this redesign does not add it to the protected directory contract.

Current V1 production of the broader capability/knowledge/availability bundle is not assumed. The existing mock directory is adequate only for the limited simulated claims in §7. Live use requires V1 owner agreement on the actual source, projection, versioning, freshness/withdrawal, unknowns, tenant boundaries and compatibility. It cannot be made production-ready by renaming mock data evidence.

Existing `ParsedIntent`, validation, and rule-based/LLM resolver outputs are candidate search interpretations. They do not carry user confirmation or processing authority. Future composition must put the revision/confirmation/permission boundary before the new experience consumes them. Parsing success is never confirmation; the new local-only flow must not inherit the existing external-model fallback. No existing code is changed or reimplemented by this document.

Outcome learning in the broader vision means learning from valid, purpose-authorized evidence. For the first slice it is limited to the current user explicitly correcting the need or reporting whether the task is done; it creates no durable profile or business conversion record. Future aggregate learning, experiments, messaging, or reverse data flow require separate approval and cannot be smuggled through a supposedly read-only V1 connection.

## 9. Remaining Decisions

### 9.1 Readiness answer after finalization

**Approved as the conceptual foundation for the bounded local/session-only slice: yes. Authorized for implementation now: no. Ready for the full live MLINO Intent Layer: no.**

This redesign supplies concrete semantic resolutions for R1–R9 in that scope, rather than leaving implementers to guess authority, retention, or fallback. The original C review remains historical evidence about the earlier contract. The repeat gate returned B and required M1–M3; [the finalization record](INTENT_CONTEXT_FINALIZATION.md) closes those conditions. Architecture acceptance still does not start coding: the product owner must issue a separate implementation instruction, followed later by runtime and delivery validation.

The previously proposed first-slice decisions were resolved as follows:

| Decision | Adopted answer | Closure record | Remaining effect |
|---|---|---|---|
| Revised semantics | Version-specific confirmation; independent consent and lifecycles; retired ambiguous Strength; no automatic archive/writeback. | Final gate §§2–3 and Finalization M2. | Future implementation must prove conformance. |
| Bounded product scope | One task/tab/session, local processing, mock directory, manual context, no durable intent or remote inference. | Finalization M3 and §4. | Any expansion reopens its dependency gate. |
| Session/asking policy | 30-minute inactivity, 2-hour maximum, task/session disposal, one clarification per request, dismissal silence, and explicit resume after hidden state. | Finalization M1/M3 and this document §3.3. | Production limits and usability still need later validation. |
| Capability support and relevance policy | Hard constraints need evidence; unknown fails mandatory eligibility; preferences are user-ordered; no invented weights or claims. | Finalization M3. | Experience Matching still needs its own design; existing ranking remains untouched. |
| Conformance scenarios | The scenarios below are accepted requirements for later verification. | Finalization M3. | Runtime evidence remains mandatory after any separately authorized implementation. |

No additional field names, schema, transport, numeric confidence score, or database choice is necessary to evaluate this semantic proposal.

### 9.2 Dependencies for future expansion, not hidden first-slice scope

| Expansion | Required decision/evidence before enabling it |
|---|---|
| Live V1 data | V1-owned capability/knowledge/availability projection, version compatibility, provenance, freshness, revocation, and permitted distribution; protected contract changes require separate approval. |
| GPS / movement / passive context | Precision, purpose-specific consent, freshness and movement thresholds, platform behavior and field testing. Permission does not prove entry, floor, or purchase. |
| Persistent, future, archived, concurrent or cross-device intents | Storage purpose, lifetime, deletion/backups, re-confirmation, isolation, conflict resolution and reminder policy; saving never grants activation. |
| Third-party AI or sensitive-domain personalization | Approved provider/recipient, data minimization, retention/deletion, processing permission and domain boundary; general confirmation is insufficient. |
| Outcome analytics, business messaging or new data direction | Separate product purpose, consent, actual outcome evidence, authorization/tenant boundaries, retention, and explicit architecture approval; no implied V2→V1 writes. |
| Public/live deployment | Applicable privacy/legal assessment and real data/device validation. This document does not certify compliance or production readiness. |

If the product owner requires any expansion in the initial milestone, these become real blockers for that milestone. They cannot be bypassed by calling the work a prototype.

### 9.3 Conformance scenarios for a future implementation gate

These are product/architecture scenarios, not executable tests or implementation artifacts. They state required behavior for a future implementation.

| Scenario | Required outcome |
|---|---|
| Many strong signals suggest running shoes; user has not confirmed. | Hypothesis only; no personalized matching or Active Intent. |
| User types shoes; parser adds running. | The added meaning is visible and unconfirmed. Only acceptance of that revision can authorize it. |
| User confirms revision A, then edits area into revision B. | A loses active-use authority at correction; B needs confirmation; late A results cannot display or act. |
| A delayed accept for A arrives after rejection or correction. | No effect; it cannot revive A or authorize B. |
| User confirms goal but declines local processing. | No processing/activation. Confirmation and consent remain independent. |
| User withdraws processing during matching. | Work and late results lose authority; task data is discarded under §6; no automatic retry. |
| Last active offer expires, while the goal/session remains valid. | Affected offer/experience becomes unavailable; the goal remains Active with alternatives or no match. |
| A mandatory availability or floor requirement lacks evidence. | No qualifying match; explain unknown/unsupported evidence; never silently weaken the requirement. |
| Manual destination differs from physical location. | Confirmed manual search context governs; no claim about the user's physical presence. |
| User requests a dentist or lower price. | Match only the explicit generic service/price intent; no diagnosis, emotional or financial profile. |
| User saves a business using the pre-existing feature. | No new intent confirmation, archival permission, or cross-session inference. |
| User dismisses clarification or reaches session cap. | No repeat prompt in the task; no passive renewal or background notification. |
| A valid task's tab becomes hidden and later visible. | It remains Paused; visibility alone starts no matching and shows no actionable stale experience. Explicit Resume may continue only the unchanged confirmed revision after permission, deadline, context, and evidence checks. A material change needs a new revision and confirmation; expiry while hidden requires a fresh task. |
| Local interpretation fails while an LLM resolver exists elsewhere. | Editable ambiguous/unsupported state; no remote fallback from this slice. |
| An unknown stock claim or “show everyone my offer” arrives in business data. | No fabricated availability, confirmation bypass, feed, or new write path. |
| User opens a detail or navigation, then reports “done.” | Interactions are not verified outcomes; explicit closure is labelled user-reported, not a proven purchase/visit. |
| Reload/tab close/task end occurs. | No saved Intent is restored; new task requires permission and confirmation again. |

Before later runtime delivery, the reviewer must verify every supported scenario against the declared contract and prove no unconfirmed/withdrawn revision reaches matching, no mandatory unknown becomes a supported claim, and no intent content reaches a disallowed recipient/store. Relevance evaluation must distinguish supported, unsupported, and no-match examples; conversion or daily-use claims are not acceptance substitutes.

### 9.4 Delivery and scope

The original redesign delivery created only `INTENT_CONTEXT_CONTRACT_REDESIGN.md`; that history remains true for commit `267bb81a753c6b99594519e0c5c4e146bd202a74`. The later Gate and Finalization revisions record review, adoption, the hidden-tab clarification, and documentation alignment. V1, Backend, main, directory contracts, schema, API, and implementation remain unchanged. No runtime validation or independent external approval is claimed. A separate product-owner instruction is required before implementation begins.

من کدکس هستم
