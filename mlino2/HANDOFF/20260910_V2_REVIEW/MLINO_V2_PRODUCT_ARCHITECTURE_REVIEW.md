# MLINO V2 — Product and Architecture Self Review

Review basis: Stage 2 delivery commit `3784e4f61c8d273355ce19bb8bcaddef4e23ba97`, with the external review package on branch `astra/visual-system-local-experience`.

This is a critical review of the implementation as it exists. It is not approval for Stage 3 and contains no implementation work.

## 1. Executive Summary

Stage 2 moves MLINO V2 in the right direction, but it does not yet make V2 a differentiated intelligent real-world experience layer. It establishes a useful interaction loop: the user explicitly asks for a nearby offer, MLINO checks offer validity and distance, returns a supported result or an honest empty state, and lets the user share the discovery.

That loop is materially better than a passive list or ad surface because it begins with a user action and avoids claiming value that the data cannot prove. The architecture also preserves a clean boundary from V1 and keeps validity, discovery selection, and sharing testable.

The central limitation is that Stage 2 still knows very little about the user. It knows a location point and existing filters, but not the user's need, urgency, purpose, constraints, or reason for opening MLINO. The result is “nearest active offer,” which is a useful primitive but not yet intelligent intent-to-experience matching. Business value is therefore an opportunity for discovery, not demonstrated acquisition, relationship, or conversion.

Assessment: **directionally aligned, structurally promising, product differentiation not yet proven**.

## 2. Current Product Understanding

The current V2 is a local customer-side experience built around a mock directory and existing map, detail, personal-state, and AR surfaces. Stage 2 adds four concrete capabilities:

- one shared, fail-closed offer status decision using `valid_from` and `valid_until`;
- a user-triggered nearby-offer command that selects the closest qualifying visible record;
- explicit empty states when filters, radius, or offer validity produce no result;
- text sharing with native, clipboard, and manual fallbacks.

The product promise currently supported by the code is narrow: “given this context and visible data, help me find a nearby business with an active offer.” The broader promise—understand what the user wants and create a meaningful real-world experience—is still a target state.

## 3. User Experience Review

### What the user experiences today

The user enters a calm local discovery surface, sees businesses and offers, can adjust existing context such as category, floor, radius, hidden state, and personal choices, and can open details. Stage 2 adds an explicit command rather than an unsolicited recommendation. The result is deterministic and explainable: active offer, within radius, nearest distance, stable ID tie-break.

### Problem solved

Before Stage 2, the user had to browse manually and could not directly ask for a nearby valid offer. Future offers could be presented as active, and sharing a discovery was not a dependable flow. Stage 2 solves those concrete friction points and makes “no result” a supported outcome.

### First wow moment

The strongest current moment is not AR. It is the first successful nearby result: the user asks a short, explicit question and receives a specific business with a currently valid offer. That moment is credible because the result is bounded by location, radius, and time.

It is not yet a strong wow moment because the system does not explain why that business fits the user's actual need. “Closest active offer” can feel like a filter rather than understanding. AR currently improves presentation and consistency, but real camera, GPS, floor, and business-recognition behavior are not field-proven.

### Reason to open MLINO daily

There is currently no durable daily habit. Offers can change, but the product does not yet provide a trustworthy daily context signal, remembered need, fresh business intelligence, or a user-controlled reason to return. Adding random rotation or notifications would create activity without creating value and should not be used as a substitute for intent understanding.

### Missing emotional and value moments

- recognition: “MLINO understood what I meant”;
- confidence: “this information is current and supported”;
- anticipation: “this experience is useful before I arrive”;
- agency: “I can refine, dismiss, or ask again without being targeted”;
- continuity: “my context and unfinished need are still available when I return.”

## 4. Business Value Review

### Value that exists

Stage 2 gives a business a chance to appear when a nearby user explicitly requests a qualifying offer. This is more aligned with the V2 vision than paid placement because the trigger is user intent and the result is constrained by evidence. Text sharing adds a small peer-referral path.

The business also gains a consistent presentation surface: identity, category, offer timing, detail, AR presence, and share action use the same validity boundary.

### Value that does not yet exist

| Business objective | Current status | Gap |
|---|---|---|
| Discovery | **Partial** | Businesses can be surfaced, but only from local/mock data and without intent relevance. |
| Customer acquisition | **Unproven** | No deep link, attributable handoff, visit signal, or conversion evidence. |
| Product visibility | **Weak** | The current record is not a real catalog or storefront. |
| Offers | **Basic foundation** | Timing is safer, but freshness, ownership, redemption, and inventory are absent. |
| Interaction | **Absent** | Sharing is user-to-user; there is no supported customer-to-business channel. |
| Customer relationship | **Absent** | No identity, consented continuity, follow-up, or business response responsibility. |

A business should not yet feel that MLINO is a complete operating or relationship channel. It can feel like a promising, intent-triggered discovery surface. The next product work must turn that opportunity into a measurable and trustworthy experience without becoming an advertising slot.

## 5. V1/V2 Alignment Review

### What is correct

The current boundary is disciplined. V1 remains the business operating side; V2 remains the customer experience side. Stage 2 did not duplicate V1 matching, change V1 ranking, write to V1, or alter the frozen integration contract. `liked`, `saved`, and `viewed` remain local experience state rather than hidden business intelligence.

The use of an existing V2 record shape and a pure selector is appropriate for a local stage. Shared offer validity also prevents the experience layer from disagreeing with itself about whether an offer is active.

### What is missing

The future read-only gateway is still a design intention rather than a usable integration point. The repository does not yet establish, in executable form:

- which V1-owned business identity and capabilities V2 may consume;
- ownership and freshness for products, services, offers, and availability;
- how unknown or expired data is represented;
- versioning and compatibility behavior;
- whether V2 receives evidence or only a display-ready projection.

Without these decisions, connecting V1 data later could either duplicate business intelligence in V2 or make V2 display claims it cannot verify. This is the most important architecture dependency before richer storefront work.

## 6. Architecture Review

### Good decisions

- `offers.ts` centralizes and fail-closes temporal validity.
- `pickSuggestion.ts` is pure, deterministic, and easy to test.
- The selector consumes caller-visible records, so it does not bypass hidden, floor, or category rules.
- Sharing keeps the explicit user click as the trigger and handles cancellation without an unexpected clipboard write.
- AR, cards, and detail views share the same validity rule.
- The implementation avoids a new API, backend write, ranking mutation, or V1 dependency while the product behavior is still being evaluated.
- Empty states are modeled as product outcomes instead of being hidden behind invented fallback recommendations.

### Scalability and maintainability concerns

The current pure functions scale well as local domain primitives, but the application is still a client-side mock experience. A production implementation will need a data access boundary, caching and freshness policy, authorization, error taxonomy, and observability. The current selector is intentionally nearest-first and should not silently become the production ranking engine.

The share text is deliberately minimal and test-data-labelled, but it is not a durable business identity or deep-link contract. The AR surface is a presentation layer, not yet a spatial understanding system.

### Future AI integration

The architecture can accept an intent parser before selection because the selector already has a narrow input/output boundary. That integration must preserve evidence: an AI interpretation should produce structured intent with uncertainty and clarification behavior, not directly invent a business or offer. Matching and ranking should remain separately reviewable.

### Data ownership

Ownership is the largest unresolved technical issue. V2 currently reads local records, but a future business intelligence source needs authoritative ownership, update timestamps, expiry semantics, provenance, and deletion behavior. These cannot be solved safely by adding more UI fields.

## 7. Risks

1. **Nearest is mistaken for relevant.** A nearby active offer may not satisfy the user's need and can make MLINO feel like a directory.
2. **Mock data creates false confidence.** Ten local records do not establish coverage, freshness, or business value.
3. **AR expectation exceeds capability.** Visual overlays without reliable spatial anchors, floor detection, or field testing can become a novelty rather than useful discovery.
4. **Offer validity is necessary but insufficient.** An active interval does not prove stock, redemption, quality, or availability at the moment of arrival.
5. **No measurable business outcome exists.** Without consented events and attribution, discovery and sharing remain hypotheses.
6. **Future V1 integration may duplicate intelligence.** If the gateway is not defined before storefront work, V2 may acquire its own conflicting business model.
7. **Daily-use pressure could cause harmful features.** Notifications, random rotation, or ad-like ranking would weaken the intent-first vision if added to create frequency.

## 8. Missing Capabilities

### Product capabilities

- context detection that is explicit, explainable, and permission-aware;
- a small interaction that captures what the user wants and why now;
- structured intent, clarification, and “just browsing” behavior;
- relevant matching beyond distance and active timing;
- trustworthy storefront content for services, products, offers, and availability;
- customer-to-business interaction with clear response responsibility;
- deep links or a durable handoff to a real business destination;
- consented measurement of discovery quality and downstream value.

### Platform capabilities

- a read-only V1↔V2 gateway and versioned projection;
- data provenance, freshness, expiry, and unknown-value semantics;
- production location and floor strategy;
- identity, permissions, tenant isolation, and audit boundaries for business interaction;
- observability and evaluation datasets for intent and matching quality.

## 9. Recommended Stage 3 Direction

### Direction comparison

| Direction | User value | Business value | Complexity | Strategic importance |
|---|---|---|---|---|
| **A — Intent Detection and Context Understanding** | Converts “nearby offer” into help with an expressed need; enables clarification and relevant results. | Improves qualified discovery and reduces the feeling of being shown generic ads. | Medium–High. Requires intent schema, ambiguity handling, evidence rules, and evaluation. | **Highest** because it supplies the missing intelligence layer. |
| **B — Virtual Storefront / Business Experience** | Gives a selected business a useful pre-visit experience. | Improves product/service visibility and data quality incentives. | High. Requires ownership, freshness, availability, content, and AR boundaries. | High, but depends on data contracts and clearer intent. |
| **C — Business-user interaction** | Lets a user ask a business for information. | Could create a direct relationship and future conversion path. | Very High. Requires identity, authorization, tenant isolation, retention, moderation, and response SLAs. | Important later; unsafe to make first without governance. |
| **D — AR discovery improvements** | Makes physical surroundings easier to interpret when the user is already in context. | Can improve in-place visibility and differentiation. | High. Requires field testing, spatial anchors, floor handling, camera/GPS limits, and accessibility. | Valuable differentiator, but weak if relevance and data are unresolved. |

### One recommended priority

Recommend **A — Intent Detection and Context Understanding**, beginning with a design and evaluation milestone rather than a broad AI feature launch.

The milestone should accept a small user statement or choice, produce structured intent with confidence and clarification needs, and pass that intent into a reviewable discovery boundary. It should preserve Stage 2's explicit action, deterministic empty states, evidence-first behavior, and no-change rule for V1 ranking. The first success criterion should be improved relevance and user understanding, not more results or more sessions.

Before implementation, define the read-only data projection needed by the intent-to-business step and document which claims are supported by evidence. Storefront and AR work can then build on that boundary instead of becoming a second, disconnected product.

## 10. Final Product Assessment

MLINO V2 is currently a carefully bounded local discovery prototype with a credible first interaction primitive. It is not yet a full virtual storefront, an intelligent assistant, a business relationship layer, or a proven acquisition channel.

The important success is architectural discipline: the implementation starts with user intent as an explicit action, keeps claims honest, and avoids contaminating V1 while the concept is tested. The important failure to address is product depth: the system does not yet understand the user's purpose or create an experience that is meaningfully better than “nearest active offer.”

The next step should deepen relevance and context before adding more presentation, richer catalog fields, or business messaging. If Stage 3 creates real intent understanding while preserving evidence and user agency, MLINO can move toward its differentiated vision. If it only adds more tiles, offers, or AR decoration, it will remain another discovery application with a visual layer.
