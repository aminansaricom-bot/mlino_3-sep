# MLINO V2 — Technical Architecture Review

Date: 2026-09-10  
Reviewer: Codex — MLINO V2 Technical Architecture Reviewer  
Review type: Document-based technical architecture review, with targeted source inspection  
Final verdict: **A) Ready for implementation**  
Approved implementation scope: Intent-Guided Local Discovery; local, single session, experimental data.

## 1. Executive assessment

The technical design provides a coherent implementation foundation for the approved local slice. Core authority, V1 business intelligence and V2 experience responsibilities remain separate. One session controller governs interpretation, confirmation and effects; matching evaluates read-only evidence; presentation does not acquire business authority.

No concrete architectural blocker was found in the available design and plan. This is approval of the technical design for the bounded implementation, not verification that the existing application implements it. Production connectivity, AR, Virtual Storefront, modules and persistent memory are not approved by this verdict.

The requested final Closure report was not available locally. This review does not claim to have read or independently verified that missing document. The product owner's explicit prior acceptance of Architecture Closure is the authority for that prerequisite; the technical design has been evaluated directly rather than inferred to be correct from the earlier approval.

## 2. Evidence and review limits

Branch: `astra/visual-system-local-experience`  
HEAD during review: `295d772a91bcd2197dbe3b9520f83c84b9f075b9f`  
Local main reference: `95d7c26d8a8271a5ad55f1964a251d101f7184ef`

The reviewed files include uncommitted documentation. HEAD alone does not identify their contents; the SHA-256 values below identify the inspected file bytes.

| Requested document | Review evidence |
|---|---|
| [V2_TECHNICAL_ARCHITECTURE_DESIGN.md](V2_TECHNICAL_ARCHITECTURE_DESIGN.md) | Read in full; SHA-256 `92420C65CE6D92FB18DF7BDC415003041F29B9CAF939134ACB7D0E3204057950` |
| [V2_IMPLEMENTATION_PLAN.md](V2_IMPLEMENTATION_PLAN.md) | Read in full; SHA-256 `CE18096DB13D49E1D30178189412A298AE5E2E276684F0856368C9C8AF053EF6` |
| `V2_CLOSURE_FINAL_GATE_REVIEW.md` | Not found at the requested review location, elsewhere in the local repository file inventory, or in the available local Git history searched across refs. No remote fetch/search was performed. Its contents remain unreviewed. |
| [MLINO_BOOK.md](../../MLINO_BOOK.md) | Read in full; SHA-256 `8C3B486C277D3A7EAB928F2F58C99C608AE3F4CBDC78287B62FB345EB9E7431E` |

The Book's current technical-design section records owner acceptance and explicitly treats earlier blocked/pending entries as history. Those entries do not reopen approved product decisions. The absent Closure artifact remains a traceability limitation for a four-document audit; it is not evidence of a technical contradiction and does not reverse the owner's approval.

[Matching Closure](EXPERIENCE_MATCHING_CLOSURE.md) and [Assistant Memory §4.4](ASSISTANT_MEMORY_BOUNDARY_DECISION.md#44-current-session-cleanup-and-disposal) were checked as supporting references. Targeted source inspection corroborated the legacy details-history side effect, offer scoring, chat accumulation, configurable LLM factory and limited Directory shape. The Graphify query failed to initialize; findings rely on primary documents and source, not a successful graph query.

No application tests, browser acceptance, performance measurements or production integration tests were run. This is a self-review of the technical design, not an independent external review or a runtime certification.

## 3. Architecture boundary

**Finding: sufficiently defined; no responsibility leakage in the proposed design.**

| Boundary | Verified ownership | Evidence |
|---|---|---|
| Core | Intent mechanisms, Permission, Consent, session lifecycle, experience orchestration and routing | Technical Design §§1, 3.1–3.2, 4.1; Plan §§1–2 |
| V1 | Business truth, Capability, Offer, Evidence, Availability, Recommendation, Action, Outcome, Evaluation and Learning | Technical Design §§1, 7; Plan §§5, 7 |
| V2 | Matching, experience selection/rendering, interaction and Assistant UI/experience | Technical Design §§1, 3.1, 4.1 |
| User | Meaning of intent, exact revision confirmation, correction, rejection and consent | Technical Design §§1, 3.2, 5 |

“Assistant experience” means the V2 presentation and interaction surface. It does not give that surface ownership of Core authority, business facts or module actions. A Core-governed controller may run inside the local V2 frontend without transferring ownership of V1 concepts.

The design correctly distinguishes evaluating a supplied fact against user requirements from creating that fact. No V2 capability-generation, offer-generation, business-truth mutation or outcome-learning path is introduced.

## 4. Frontend review

**Finding: ready for the initial slice.**

- **Component boundaries:** entry/authority controls, interpretation confirmation, session control, pure matching, experience rendering and details presentation have distinct responsibilities. Components emit commands and render state; they do not grant authority or invoke domain/provider actions.
- **Assistant placement:** the existing Assistant surface hosts the governed flow, with ordinary controls available for completion. One input cannot also invoke legacy search. There is no requirement for another assistant or a transcript.
- **State ownership:** one feature-scoped reducer/context owns current task state. Revision confirmation, session status, operation generation and presentation remain distinguishable. Directory's public cache is not a user-memory store.
- **Rendering and navigation:** views are in memory, without private data in URLs or history. Results show the same qualifying option used for eligibility. Details opening is local inspection; the existing persistent `viewed` handler is explicitly excluded.
- **Extensibility:** presentation and orchestration are separate from future capability providers. No current component must own Finance, CRM, Operations or other module business logic.

The controller must remain feature-scoped rather than becoming another large collection of business policies inside App. That is an implementation obligation already specified in the design, not an unresolved architectural decision.

## 5. Backend, matching and adapters

**Finding: appropriate local execution model and adequately separated responsibilities.**

Technical Design §4 explicitly places application/domain logic in the browser. No deployed backend, schema or endpoint is needed for the experimental slice. The logical service boundaries are useful testing and ownership boundaries, not a proposed microservice architecture.

Orchestration determines whether a question, match, presentation or action is authorized. Matching determines eligibility and ordering from the authorized inputs. Directory supplies read-only records; the environment adapter supplies time and lifecycle observations. The local interpreter is bound directly, avoiding provider selection through environment configuration.

Eligibility precedes ordering. Each returned business has one option satisfying all mandatory requirements. The design prohibits assembling a false match from different products, seeding the candidate pool from legacy scored top results, or rescuing a failed requirement through promotion.

Optional preferences require evidenced, comparable values and the approved comparison basis. Distance and stable identity are deterministic fallbacks. Context has no independent ranking score. A requested discount is a hard condition; an incidental offer is only a supported enhancement. Unknown applicability cannot become a claimed product discount.

Mock versus real is explicit: business evidence is experimental, while consent, confirmation, session enforcement and matching behavior must actually work. Simulating authority with always-true mock responses would violate the design.

## 6. Data flow, authority and lifecycle

**Finding: aligned with the approved order.**

The complete flow is:

**Permission → Consent → Intent interpretation → exact current revision confirmation → eligibility → ordering → Experience → Business Details.**

Technical Design §5 includes the confirmation and eligibility steps omitted from the shorter task diagram without changing its meaning. No context, confidence score, tab-resume event or parsed text directly becomes active intent.

The design also handles the failure paths that could undermine the nominal flow:

| Transition | Required behavior already supported by the design |
|---|---|
| Material correction | Replace current wording, invalidate prior results and obtain confirmation for the new interpretation |
| Late async completion | Verify task/revision/context/generation, current authority and deadlines before publication |
| Hidden tab | Pause authority; returning to visibility does not resume matching |
| Explicit Resume | Recheck permission, consent, unchanged confirmation, context, evidence and deadlines |
| Expired or rejected intent | Do not resume it as valid intent |
| Changed offer/evidence | Invalidate the relevant eligibility or enhancement without rewriting the user's intent |
| End, withdrawal or session expiry | Stop effects and dispose current task content; do not restore transcript/history |
| Open details | Recheck authority and evidence; avoid persistent history and any claim of a business outcome |

The governing memory rules include permission withdrawal as well as consent withdrawal. “Current authority” checks must enforce both; a revoked permission is not made valid by an unchanged consent flag. This follows the existing Memory §4.4 reference and Core boundary, not a new product rule.

Session-only current context, the 30-minute inactivity limit, two-hour absolute cap and background time accounting remain aligned. React state is not itself proof of cleanup: stale closures, event handlers and asynchronous work must satisfy the specified disposal tests during implementation.

## 7. V1 integration and future compatibility

**Finding: suitable extension boundaries; future integrations are not yet operationally specified or approved.**

| Future capability | Existing architectural extension boundary | What remains required before that capability is built |
|---|---|---|
| Modules | Core routing/authority plus domain capability and action adapters | Module contracts, tenant/role access, action confirmation, cancellation and outcome semantics |
| AR | Existing confirmed experience, evidence and orchestration | Spatial/camera permission, coordinate/anchor accuracy, assets, rendering and lifecycle rules |
| Virtual Storefront | Read-only business/option projection and details surface | Catalog/offer applicability, availability, freshness and authorized interaction contracts |
| Real V1 connectors | Directory/evidence adapter | Versioned source projection, identifiers, provenance, availability semantics, freshness/revocation, tenant filtering and compatibility |

These extensions do not presently require changing who owns intent, business truth, permissions or experience orchestration. They will require additional contracts and implementations. This review does **not** guarantee that they can be enabled merely by replacing a loader or that no implementation refactoring will ever be necessary.

V2 must not compensate for missing V1 evidence by inventing stock, bookability, product applicability or conversion outcomes. The design preserves that rule and leaves authoritative business actions and learning in V1.

## 8. Residual implementation risks and validation obligations

The following are covered by the design and therefore are not open architecture blockers:

| Concrete risk | Required implementation evidence |
|---|---|
| Legacy offer scoring or transcript processing enters the new flow | Tests show the local matching/controller path is used and legacy ranking/chat handlers are not invoked |
| A configured external model receives task content | Adapter/integration tests and request inspection show no external provider dispatch |
| Opening a result writes task-derived history | Tests show no call to legacy viewed persistence and no task content in storage, URLs, logs or outgoing requests |
| A stale callback revives results after correction, pause or withdrawal | Controlled delayed-work tests exercise publication guards and disposal |
| Sparse mock evidence produces a persuasive but false claim | Same-option eligibility, unknown-evidence, explicit-discount and experimental-label acceptance scenarios |
| Local client checks are mistaken for production access control | Live V1 remains excluded until its independently enforced authorization/projection contracts are approved |

Unit, integration and acceptance layers in Technical Design §8 are sufficient as a testing architecture. Implementation must provide actual results for them, alongside existing regression/build checks and mobile/desktop accessibility validation. Legacy Stage 2 validation cannot be reused as proof that the new task meets these requirements.

## 9. Final verdict and next step

**A) Ready for implementation**

No concrete technical architecture blocker remains for the approved local, single-session, experimental Local Discovery slice. No change to the approved product decisions, domain entities, schema or API is required by this review.

Proceed only on a separate implementation instruction, following the approved plan and its delivery gates. Preserve V1, Backend, frozen contracts and main. This review request does not start that implementation.

The missing Closure report should remain identified as unavailable when sharing this review package; this report cannot be presented as an inspection of all four requested source documents. No missing report was reconstructed, no existing source document was edited, and no remote delivery is claimed.

من کدکس هستم
