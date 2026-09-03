# ADR-00Z: Producer ≠ Validator Boundary

**Status:** Proposed Governance Extension
**Scope:** Additive Governance Layer
**Kernel Impact:** No Kernel Revision Required
**Relation:** Applies to Kernel Architecture Specification v1.2

**Governance Status:** Approved / Frozen
**Owners:** AI Governance
**Decision Category:** AI Governance / Verification Independence
**Supersedes:** None
**Superseded by:** None

---

## Context

ADR-00Y (Explainability Boundary), now frozen, requires that verification of an output's Chain of Origin sufficiency depend on "the Producer ≠ Validator principle established elsewhere in MLINO's architecture" — a principle referenced but never defined.

Separately, ADR-00X (Human Authorization Boundary) implicitly relies on the same underlying assumption: authorization by a human actor is only meaningful if that actor's judgment is independent of the component that produced the action being authorized. Neither ADR states this independence requirement as a general architectural principle; each assumes it locally.

This ADR exists to define, once, the general principle both frozen ADRs depend on: that a component responsible for producing content or an action must never be the same component responsible for certifying that content or action's compliance with an architectural boundary.

## Decision

Any component that generates content, an action, or a candidate output must be architecturally distinct from any component that determines whether that content, action, or output satisfies an architectural boundary or requirement.

A producing component may never certify its own compliance with any architectural boundary, regardless of the producing component's design, sophistication, or underlying technology.

This separation is defined by architectural role, not by implementation technique or timing. The Producer role and the Validator role for the same output must always belong to architecturally distinct components. Architectural distinctness requires that the Validator's judgment not share the Producer's underlying reasoning substrate in any way that would cause correlated errors between production and validation; distinctness is a property of independence of judgment-formation, not merely of code organization or deployment boundary.

A validating component may read and examine the producing component's output as its input — this is necessary for validation to occur at all. What must remain independent is judgment: the validating component's determination of compliance must not be influenced, determined, or dictated by the producing component itself, even though the producing component's output is the very subject being evaluated. This independence must hold not only against direct influence from the Producer, but against indirect influence through shared infrastructure the Producer has itself populated or shaped — such as shared memory or retrieval indices — for the specific output under validation.

Role assignment — which component acts as Producer and which as Validator — must itself be fixed by governance and policy independent of either component's design or deployment lineage, and must not create a reciprocal arrangement in which two components alternately validate each other's output over time.

This principle underlies, and is relied upon by, both ADR-00X (where the human actor's authorization must be independent of the AI that produced the action) and ADR-00Y (where Chain of Origin sufficiency must be assessed independently of the component that produced the output).

## Consequences

### Positive
- Closes a dependency left undefined by ADR-00Y and implicitly assumed by ADR-00X.
- Establishes a single, reusable architectural principle rather than re-deriving verification independence separately in every future boundary-enforcing ADR.
- Technology-independent: remains valid regardless of how producing or validating components are built.
- Becomes more important, not less, as underlying AI capability increases.
- Closes independence gaps at the computational-substrate, shared-infrastructure, and governance-assignment levels, not only at the level of direct component interaction.

### Negative
- Requires every future boundary-enforcing capability to design and maintain a genuinely independent validation path, adding architectural and implementation overhead.
- May be difficult to verify in practice that two components are "architecturally distinct" without further, more concrete criteria — a question this ADR does not resolve.
- Requires governance to actively manage role assignment and shared infrastructure exposure, rather than treating component separation alone as sufficient.

## Deferred Decisions

- The concrete criteria for what constitutes sufficient architectural distinctness between a producing and validating component (e.g., separate training, separate deployment, separate ownership).
- Where and how validating components are implemented or governed.
- Whether validating components may themselves be AI-based, and if so, what independence from the producer that requires.
- How this principle composes with Multi-Agent architectures, where a validating agent's own output may itself require independent validation.
- The applicability of this principle to non-decomposable or emergent architectures in which content generation and compliance judgment are not separable into distinct components; this ADR presumes an architecture composed of separable components.

---

## Freeze Record

**Review stages completed:** Architecture Review → Hostile Review (5 issues: shared computational substrate, indirect influence via shared infrastructure, reciprocal role assignment, non-decomposable architectures, shared prompt/policy) → Stage 3 Revision (all 5 incorporated additively) → Targeted Technology-Independence Review (technology-specific examples removed from the distinctness clause) → Final Regression Gate ("No architectural regression detected").

**Compatibility confirmed with:** ADR-00X, ADR-00Y.

---

## Governance Layer Note

This document formalizes ADR-00Z as an **additive Governance Extension** relative to Kernel Architecture Specification v1.2. The Kernel Governance Compliance Audit found Kernel Invariant AC-2 ("only Capability 11 may decide access authorization") and Capability 2.7's explicit non-responsibility clause already self-consistently support Producer ≠ Validator separation, without contradiction. No Kernel revision is required.
