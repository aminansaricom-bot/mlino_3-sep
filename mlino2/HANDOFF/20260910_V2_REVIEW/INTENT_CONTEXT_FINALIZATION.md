# MLINO V2 — Intent Context Finalization

Author: Codex, Principal Product Architect role.

Status: the three closure conditions from [the final architecture gate](INTENT_CONTEXT_FINAL_GATE_REVIEW.md) are closed for the bounded conceptual scope described below. This is documentation and product/architecture alignment only. It creates no code, schema, migration, API, live integration, or implementation authorization.

## 1. Closed Gate Items

| Gate item | Closure | Evidence |
|---|---|---|
| M1 — Session resume rule | **Closed.** Hidden/background state pauses the task. Returning is neither a user action nor an Intent signal and cannot restart matching. Resume and re-confirmation rules are now explicit. | [Redesign §3.3](INTENT_CONTEXT_CONTRACT_REDESIGN.md#33-concrete-session-and-expiration-rule) and its acceptance scenario in §9.3. |
| M2 — Documentation alignment | **Closed.** MLINO Book, Roadmap, and Open Decisions now identify the Redesign as the current governing contract. Earlier documents remain as history and conflicting assumptions are marked superseded. | [MLINO Book](../../MLINO_BOOK.md), [Roadmap](../../03_ROADMAP_PHASES.md), and [Open Decisions](../../OPEN_DECISIONS.md). |
| M3 — Product scope adoption | **Closed.** The product owner approved local environment, single session, and experimental data, and explicitly excluded production scale, long-term user memory, and cross-session behavioral inference. The bounded rules accepted with that scope are recorded below. | Product-owner scope decision and this finalization record. |

The conceptual Intent foundation is therefore closed for the approved slice. Experience Matching may proceed as a separate design milestone. Coding still requires an explicit implementation decision and a later delivery gate.

## 2. Session Rules

### 2.1 App resume is not intent

Moving the tab or app to hidden/background state puts the active Intent task in **Paused**. Matching stops, pending results lose display authority, and no actionable Intent experience may resume in the background.

Making the app or tab visible again is an environmental event. It is not evidence that the user wants to continue, does not count as a new Intent signal, and does not reset session clocks. Focus, visibility, `pageshow`, automatic refresh, re-rendering, time passage, location/data refresh, or business changes are not user actions.

### 2.2 What counts as a new user action

A new user action is a deliberate interaction with the current Intent task:

- selecting an explicit Resume or Continue control;
- submitting an edited need, constraint, preference, destination, radius, floor, deadline, or requested next action; or
- explicitly starting a fresh Intent task.

Opening the app, returning to the tab, seeing a result, or passively receiving new context does not qualify.

### 2.3 When matching may resume

On return, V2 may only check whether resume is available: the session has not expired, local-processing permission remains valid, the confirmed interpretation revision is still current, essential context is usable, and supporting business evidence has not become invalid.

Matching may resume only after the user explicitly selects Resume/Continue. The existing confirmation may be reused only for the exact unchanged revision and materially unchanged context. A result created before pause must pass the same current-revision, permission, context, and evidence checks before it can be shown or acted on.

### 2.4 When confirmation is required again

Fresh confirmation is required when the goal meaning or any material element changes, including mandatory constraints, exclusions, destination, radius, floor, deadline, task window, or permitted next action. A parser/model reinterpretation also creates a new revision and needs confirmation.

If processing permission was withdrawn, it must be granted separately; confirmation cannot substitute for consent. If the task or session expired while hidden, it is disposed and cannot resume. A fresh task then needs applicable processing permission and a new confirmed interpretation.

The initial session ends at the earliest of explicit stop/delete/permission withdrawal, reload/navigation/tab close, 30 minutes without direct task interaction, or 2 hours after session start. Time spent hidden counts toward both time limits. Only deliberate task interaction resets the inactivity timer; nothing extends the absolute cap.

## 3. Documentation Alignment

The current authority order is:

1. [INTENT_CONTEXT_CONTRACT_REDESIGN.md](INTENT_CONTEXT_CONTRACT_REDESIGN.md) — governing conceptual contract for the approved bounded scope.
2. [INTENT_CONTEXT_FINAL_GATE_REVIEW.md](INTENT_CONTEXT_FINAL_GATE_REVIEW.md) — architecture Gate verdict B and the three closure conditions.
3. `INTENT_CONTEXT_FINALIZATION.md` — records completion and adoption of those conditions.

[INTENT_CONTEXT_DECISIONS.md](INTENT_CONTEXT_DECISIONS.md), [INTENT_CONTEXT_DATA_CONTRACT.md](INTENT_CONTEXT_DATA_CONTRACT.md), and the first C gate review remain in the repository as historical evidence. Where they conflict with the Redesign on Strength, interpretation versioning, confirmation, consent, lifecycle separation, retention, archival, matching authority, or outcome direction, the Redesign governs this slice.

[MLINO Book](../../MLINO_BOOK.md), [Roadmap](../../03_ROADMAP_PHASES.md), and [Open Decisions](../../OPEN_DECISIONS.md) now point to the current authority and identify old assumptions as historical or superseded without deleting them. The protected V1/V2 integration contract, V1, Backend, and frozen architecture have not been changed.

## 4. Current Scope Boundaries

### Approved for the bounded design

- local environment and local processing chosen explicitly by the user;
- one foreground Intent task in one tab and one session;
- experimental/mock directory data with a clear test-data label;
- manual context and user-entered need, constraints, preferences, and search area;
- visible, version-specific interpretation and explicit user confirmation;
- 30-minute inactivity limit and two-hour absolute session cap;
- one clarification per submitted request and silence after dismissal in that task;
- evidence-backed mandatory constraints, with unknown treated as unsupported rather than silently weakened;
- optional preferences ordered by the user, without invented business-paid weights;
- correction, rejection, explicit resume, task ending, expiration, honest no-match, and disposal within the current session.

### Not approved

- production scale, public deployment, or operational reliability claims;
- long-term user memory, durable/saved Intent, profiles, archive, reminders, or future goals;
- cross-session, cross-tab, cross-device, concurrent-task, or behavioral inference;
- passive GPS, movement, background context capture, notifications, or automatic app-resume matching;
- external LLM/model processing of Intent content;
- live V1 integration, V1 contract changes, or a new V2→V1 write path;
- telemetry, conversion inference, persistent outcome learning, business messaging, purchase actions, or sponsored ranking.

Approval of this scope means the conceptual contract is coherent enough for the next design exercise. It does not mean these behaviors exist in software and does not authorize implementation.

## 5. Remaining Future Decisions

Before expanding beyond this slice, MLINO needs separate decisions and reviews for:

1. Experience Matching semantics: eligibility, hard constraints, preferences, evidence, freshness, explanation, unknown/no-match behavior, and business-influence safeguards.
2. The versioned read-only V1→V2 capability/knowledge/offer/availability projection and its provenance, revocation, tenant, and compatibility rules.
3. Production privacy and legal requirements, including retention, deletion, backups, audit exceptions, and jurisdiction-specific location treatment.
4. Durable, future, archived, concurrent, cross-session, or cross-device Intent and user-memory ownership.
5. Passive context, GPS/movement precision and consent, offline and permission-denied behavior, and device validation.
6. Any external AI provider, sensitive-domain processing, telemetry, aggregate learning, business messaging, outcome writeback, or sponsored experience.
7. Implementation authorization, schema/API review, conformance evidence, runtime privacy validation, and production readiness as distinct later gates.

The next recommended milestone is **Experience Matching Design** within the approved local, single-session, experimental-data boundary. It must remain a design step until the product owner issues a separate implementation instruction.

من کدکس هستم
