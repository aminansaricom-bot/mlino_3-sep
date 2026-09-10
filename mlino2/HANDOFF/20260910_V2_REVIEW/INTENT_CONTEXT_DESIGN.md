# MLINO V2 Stage 3 — Intent and Context Layer Design

Status: design only. No schema, code, API, model training, notification implementation, or ranking change is included in this document.

Stage 3 exists to close the main gap identified in the Stage 2 review: V2 can find a nearby active offer, but it does not yet understand what the user is trying to accomplish. The purpose of this design is to make the experience more relevant while preserving user agency, evidence, and the intent-first product vision.

## Design principles

1. **User intent has priority over business promotion.** A business is eligible because it can help with an expressed or safely inferred need, not because it paid for attention.
2. **Ask less, learn transparently.** Use context that is already available and useful; ask one small question only when its answer can materially improve the next experience.
3. **No silent escalation.** A weak signal may narrow a question or offer a reversible suggestion, but it must not trigger a high-impact action or sensitive inference.
4. **Evidence before confidence.** MLINO may represent uncertainty and ask for confirmation instead of presenting a guess as fact.
5. **Context expires.** A need, location, or movement state is temporary unless the user explicitly keeps it.
6. **Graceful emptiness.** No qualifying capability is a valid result. The system must not fill a gap with an unrelated business or offer.
7. **V1 remains authoritative for business intelligence.** V2 interprets the user's need and creates the experience; it does not invent business capabilities.

## 1. User Context Model

The context model is a conceptual view used for product decisions and future interfaces. It is not a storage schema. Every context signal needs a source, a confidence level, a purpose, and an expiry appropriate to its volatility.

### Location context

Location context describes where the user has chosen to search or where the device has provided permission-based position. It may include a broad area, a selected place, an approximate point, a radius, and a user-declared floor or venue section.

The default should be the least precise location that can answer the user's request. A selected map area or manually entered place is sufficient when GPS is unavailable. Proximity to a building does not prove that the user entered it, and GPS does not prove a floor. MLINO must ask for a floor when floor-level relevance matters.

### Time context

Time context includes the current local time, day, offer validity window, and whether a user request is immediate, later today, or future-oriented. It is used to prevent a recommendation that cannot be acted on when the user needs it.

Time context should not become a reason for automatic daily promotion. It supports questions such as “now,” “later today,” or “when I arrive,” and it expires when the relevant window passes.

### Movement context

Movement context is a cautious description of whether the user is stationary, walking, or moving through an area, only when the device provides an authorized and sufficiently reliable signal. It can help choose between a quick nearby option and a browse-later experience.

Movement must never be used to claim that the user entered a store, visited a business, completed a goal, or consented to tracking. Background movement monitoring is outside this design.

### Environment context

Environment context describes user-selected or permission-based situational constraints that affect usefulness: venue or district, floor, open/closed availability evidence, weather or accessibility needs when explicitly provided, and whether the user is in an AR-capable visual mode.

Environmental signals are supporting context. They cannot create a business capability that the source data does not provide. The system must label uncertainty when the environment is not reliably known.

### Previous interaction context

Previous interaction context includes the current session's questions, answers, dismissed suggestions, opened details, saved choices, and the stated stage of the user's task. Local `liked`, `saved`, and `viewed` state may improve continuity, but it must not silently become a ranking signal or be sent to V1 without an approved contract and consent.

The system should distinguish “the user opened a detail” from “the user completed a visit.” Opening, sharing, or navigating is not evidence of purchase, arrival, satisfaction, or intent completion.

## 2. Intent Capture

Intent capture should follow a ladder: use safe existing context, ask one useful question when needed, confirm meaningful assumptions, and stop when the user has enough help. Each step should be reversible.

### Passive signals

Passive signals are context already available through an explicit user choice or an active permission: selected area, current screen, chosen category, declared floor, current time, visible filters, and the recent answer in the current interaction.

Device-derived location or movement may be used only during an active user task and only at the precision required for that task. Passive signals must not be collected merely to create a marketing audience.

Passive signals can suggest a prompt, narrow an existing result set, or determine whether an offer is currently actionable. They should not independently create a business contact, notification, purchase claim, or sensitive profile.

### Active questions

Ask a question when all three conditions hold:

1. there is a meaningful ambiguity;
2. one answer would change the available experience;
3. the user can answer quickly or skip it.

Questions should be short and concrete: “What are you looking for?”, “Are you browsing or ready to choose?”, “Which floor are you on?”, or “Do you need something open now?” Prefer a small set of understandable choices with an optional free-form answer. Always provide “just browsing,” “skip,” or dismiss where the question is optional.

Do not ask for information already available in the current context. Do not ask a sequence of questions before showing any value. If the user gives a clear request, move directly to matching and only ask about a constraint that blocks a safe result.

### Notification moments

Stage 3 should not introduce automatic promotional notifications. A notification may be considered later only when all of the following are true: the user explicitly opted into that class of reminder, the content is tied to a retained user request, the offer is still valid and actionable, the timing is useful, and the user can stop it easily.

The default behavior is quiet when nothing materially changes. A change in offer inventory, proximity, or time is not by itself permission to interrupt. Notification design requires a separate consent and measurement review.

### Conversation entry points

Intent capture can start from:

- the existing experience panel command;
- a map or directory search input;
- an AR view when the user explicitly asks what is nearby;
- a business detail question such as “Is this useful for what I need?”;
- a return to an unfinished, explicitly saved request.

Every entry point should converge on the same conceptual intent and confirmation behavior. It must not create separate, conflicting interpretations of the user's need.

## 3. Intent Model

The intent model describes a temporary understanding, not a permanent user profile. It should be explainable in ordinary language and easy for the user to correct.

### Explicit intent

Explicit intent comes from the user's words, selected option, declared destination, requested category, stated constraint, or direct action. It is the strongest input. The system should preserve the user's wording or a short paraphrase and show it when the interpretation affects results.

Examples include wanting a quiet cafe now, looking for a gift on a particular floor, or browsing fashion without a time constraint.

### Implicit intent

Implicit intent is a cautious hypothesis derived from non-sensitive context and recent interaction: a user who repeatedly narrows to one category may be exploring that category; a user who says “nearby” may prefer a small radius. Implicit intent must never override a contradictory explicit statement.

Implicit intent should be used to choose a clarification or ordering of already-supported results, not to infer health, finances, religion, relationships, identity, or other sensitive traits.

### Confidence

Confidence represents how strongly the available evidence supports an interpretation. It is not a promise of correctness and should not be hidden behind a precise-looking score in the user experience.

- **High:** the user stated the need or confirmed the interpretation.
- **Medium:** multiple non-sensitive signals agree, but an answer could change the result.
- **Low:** the system has only a weak contextual hint.

Low confidence should lead to a small question or a broad, clearly labelled browse state. It should not trigger a specific business claim.

### Confirmation

Confirmation is required when an interpretation would materially change the businesses shown, initiate contact, retain a request, or create a reminder. Confirmation can be lightweight: a paraphrase with “Is this what you mean?” and an edit or dismiss action.

No confirmation is needed for a reversible display adjustment that the user already requested directly, such as changing a radius control.

### Expiration

Intent expires according to its purpose. “Find something open now” expires when the immediate time window passes. “Find a gift today” expires at the end of the stated day unless the user saves it. A browse category may persist only as local UI continuity, not as a hidden long-term preference.

When intent expires, MLINO should clear or visibly reset it rather than quietly reuse it. Retention beyond the active task requires an explicit save action and a clear explanation.

## 4. Business Matching Flow

The intended conceptual flow is:

**Intent → Business Capability → Relevant Experience**

### Intent

MLINO translates the user's explicit request and safe context into a temporary, explainable need. Ambiguity produces a clarification or a broad browse state. The intent layer does not decide that a business can satisfy the need.

### Business capability

The business-side source describes what a business can actually provide: identity, context, products or services, valid offers, availability evidence, and supported actions. V1 owns these business concepts when they become operational. V2 consumes an approved read-only projection and does not fill missing capabilities with assumptions.

### Relevant experience

The experience is selected from the intersection of the user's need, the business capability, the current context, and the user's requested level of interaction. It may be a detail view, a virtual storefront, an offer, an AR overlay, a route handoff, or an explicit no-result explanation.

Every result should be able to answer: “Why is this shown?”, “Which data supports it?”, “What is uncertain?”, and “What can I do next?”

The matching flow must preserve the Stage 2 rule that no active and supported result is better than an invented recommendation. Intent understanding should improve relevance, not reduce honesty.

## 5. Privacy Boundaries

### MLINO may infer or use

- approximate, permission-based location needed for the current request;
- user-declared place, floor, category, time window, or constraint;
- broad movement state during an active, authorized task when it improves the immediate experience;
- temporary, non-sensitive intent from the user's explicit words and recent in-session actions;
- whether the available business data supports an experience now.

### MLINO may not infer or use for targeting

- health status, diagnosis, disability, or treatment need unless the user explicitly provides an accessibility requirement for the current task and the product has an approved safety boundary;
- financial status, income, debt, creditworthiness, or ability to pay;
- religion, ethnicity, political views, sexual orientation, gender identity, or relationship status;
- a user's identity, home, workplace, or routine from movement patterns;
- that a user entered a venue, visited a business, bought something, or completed a goal from proximity or screen activity;
- sensitive traits of companions or people observed in the environment;
- a long-term preference from a single click, view, share, or dismissed result.

Location and movement must be purpose-limited, permission-aware, and minimized in precision. Exact location, intent, `liked`, `saved`, and `viewed` data must not be exported to V1 or business users without a separately approved contract, consent, and retention policy.

## 6. V1 Dependency

The dependency should be read-only and capability-oriented. V2 supplies the user's temporary need and context; V1 remains authoritative for what a business is and can do.

| V1 concept | Why V2 needs it | Boundary for Stage 3 |
|---|---|---|
| **Capability** | Determines whether a business can satisfy an interpreted need. | V2 may match against declared capability; it must not invent or rewrite it. |
| **Business Context** | Provides identity, location context, floor/venue relationship, and operating conditions. | V2 may consume a versioned projection with freshness and uncertainty. |
| **Offers** | Supplies time-bounded value that can be presented as actionable. | V2 may display only valid, evidence-backed offers with expiry semantics. |
| **Knowledge** | Supports trustworthy answers about services, constraints, and business facts. | Answers need provenance and an explicit unknown state; no fabricated response. |
| **Recommendations** | May eventually rank valid capabilities for a confirmed intent. | V1 recommendation logic must not be silently duplicated or overridden in V2. |

The missing integration design is a versioned read-only gateway that identifies ownership, freshness, provenance, unknown values, deletion, and compatibility. Stage 3 design should define the boundary conceptually before any implementation connects live V1 data.

## 7. Operating Rules for a Non-Annoying Experience

- Do not interrupt a user who is only browsing unless they explicitly request help.
- Ask at most one high-value question at a time.
- Do not repeat a question the user already answered in the current task.
- Show useful results before asking optional follow-up questions.
- Make every inference editable, dismissible, and temporary.
- Explain why a result is shown in plain language.
- Stay quiet when no meaningful, user-authorized change occurred.
- Treat “no result” as a product outcome, not a failure to be hidden.

## 8. Design Acceptance Criteria

The intent layer is ready for implementation review only when the product team can answer yes to all of these questions:

1. Can a user state, correct, or dismiss the interpreted need?
2. Can the product distinguish explicit intent from a weak contextual guess?
3. Does every retained intent have a visible purpose and expiration?
4. Can the matching flow show the capability and evidence supporting a result?
5. Does the empty state remain honest when no capability matches?
6. Are sensitive inferences explicitly excluded and technically bounded?
7. Is the V1 dependency read-only, versioned, and owned by the correct system?
8. Can the experience remain useful when location, movement, network, or business data is unavailable?

## Final design position

Stage 3 should make MLINO better at understanding a user's immediate purpose before adding more visual surfaces or more business messaging. The intended outcome is not more prompts or more recommendations. It is a shorter path from a user's real need to a supported business capability and a relevant experience, with enough transparency that the user remains in control.
