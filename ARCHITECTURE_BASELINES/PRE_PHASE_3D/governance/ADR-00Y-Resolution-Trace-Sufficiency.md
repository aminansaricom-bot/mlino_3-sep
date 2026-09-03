# ADR-00Y: Explainability Boundary — Chain of Origin

**Status:** Proposed Governance Extension
**Scope:** Additive Governance Layer
**Kernel Impact:** No Kernel Revision Required
**Relation:** Applies to Kernel Architecture Specification v1.2

**Governance Status:** Approved / Frozen
**Owners:** AI Governance
**Decision Category:** AI Governance / Explainability
**Supersedes:** None
**Superseded by:** None

---

## Context

ADR-00X (Human Authorization Boundary), now frozen, establishes that authorization is meaningful only when it is accompanied by provenance sufficient for a human actor to understand what real-world inputs led to an AI-generated action. ADR-00X explicitly defers the definition of that sufficiency standard to "the system's Explainability Architecture" without defining it.

This creates an unresolved dependency: ADR-00X's central guarantee cannot be verified as satisfied until the minimum content and traceability requirements of an explanation are themselves fixed as architecture, independent of which generation technology produces that explanation.

This ADR exists to close that dependency, and to establish Explainability as a standalone architectural boundary applicable wherever MLINO presents AI-generated output to a human — not only within the authorization flow.

## Decision

Every AI-generated output presented to a human actor for review, understanding, or authorization must carry a traceable Chain of Origin, at minimum: **Origin** (who or what produced the underlying information), **Source** (which specific input the information came from), and **Transformation** (what operation was applied to reach the presented output). These three elements are the minimum required provenance model; they do not preclude a richer provenance model being defined by future architecture as needs are identified.

Chain of Origin must be captured at the moment of generation, not reconstructed or attached retroactively at the moment of presentation. Any output lacking Chain of Origin at generation time may never later acquire it merely for the purpose of passing this boundary.

An explanation is architecturally sufficient only if a human actor with no prior context can determine, from the explanation alone, what real-world inputs led to the output — not merely that some transformation occurred. Verification of sufficiency must evaluate the semantic content of each Chain of Origin element against this standard, not merely the presence of the three elements.

This boundary is defined by the structure and traceability of the explanation, not by the sophistication, architecture, or vendor of the underlying generation technology. It applies equally regardless of whether the producing component is a language model, a vision model, a rule engine, or any future technology.

Explainability is a prerequisite for, but distinct from, Human Authorization (ADR-00X): an output may be fully explainable and still require authorization; an output that is not explainable may never reach the authorization stage at all.

Verification that an output satisfies this boundary depends on the Producer ≠ Validator principle established elsewhere in MLINO's architecture (ADR-00Z); this ADR relies on that principle but does not redefine it here.

## Consequences

### Positive
- Closes the circular dependency left open by ADR-00X.
- Technology-independent: survives changes in underlying AI models or architectures.
- Reusable across every feature domain that presents AI-generated output to a human.
- Minimum-only provenance model leaves room for future elements without requiring this ADR to be reopened.
- Provenance-at-generation requirement prevents post-hoc fabrication of explanations.

### Negative
- Requires every content-producing component to expose structured provenance metadata, adding implementation overhead.
- May slow early feature development, since no AI-generated output can bypass this boundary even for low-risk use cases.
- Depends on a separately-governed enforcement mechanism (Producer ≠ Validator) that this ADR does not itself guarantee exists or is correctly implemented.
- Requires generation-time infrastructure to capture provenance for every candidate output, including those not ultimately presented to a human.

## Deferred Decisions

- The specific data schema used to represent Chain of Origin, and any additional provenance elements beyond the required minimum — to be introduced through explicit future architectural decisions, not silent implementation expansion.
- Where and how the independent classification/validation component is implemented.
- Whether Explainability requirements differ by risk tier of the underlying action.
- How Explainability composes with Multi-Agent architectures, where an output's Origin may itself be another AI-generated artifact rather than a human input.

---

## Governance Layer Note

This document formalizes ADR-00Y as an **additive Governance Extension** relative to Kernel Architecture Specification v1.2. The Kernel Governance Compliance Audit found the Kernel's existing Resolution Trace (Section 17) already carries the structural pattern this ADR requires (source events, confidence level, vocabulary version) but does not state a semantic-sufficiency test — a narrower, Enhancement-level observation distinct from, and not a replacement for, this ADR's full Explainability Boundary. No Kernel revision is required; Section 17 is extended, not rewritten.
