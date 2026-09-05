import {
  ActorContext,
  CoreEntityId,
  EvidenceRef,
  OpportunityCorrelationId,
  OrganizationId,
  OwnershipType,
} from '../../shared-contracts/types';

/**
 * AC-2 Decision Port — implementation-level, NOT part of Shared Contract
 * v1.1. Defined across PHASE_5B2_FINAL_SECURITY_CLOSURE (S1) and
 * PHASE_5B3_AC2_PORT_SHAPE_CORRECTION (final shape).
 *
 * OWNERSHIP: the AC-2 decision itself belongs to the Kernel Capability
 * "اعتماد، توضیح‌پذیری و حاکمیت" (Trust, Explainability & Governance) —
 * ADR-00AE, IC-14 §5 ("AC-2 ... انحصاراً"). FP-02 (this module's consumer)
 * NEVER computes this decision — it only calls this Port and fails closed
 * on any missing/invalid/erroring result. `resolveActorContext` (FP-03) is
 * a separate, prior step (Authentication/Context Adapter) — NOT this
 * decision; see foundation/auth-adapter/auth-adapter.ts.
 *
 * No real Governance/Malino Adapter is implemented here — only the
 * interface and the fail-closed evaluation helper. A real Adapter is a
 * separate, future, explicitly-authorized piece of work.
 */

/** Minimal, tenant-scoped context a Governance decision needs — never exposed to the caller before `access: 'allow'`. */
export interface OpportunityAccessCandidate {
  organization_id: OrganizationId;
  opportunity_correlation_id: OpportunityCorrelationId;
  /** From the founding Event's CoreEntity relation, read-only. Empty/missing => fail-closed (deny), never sent to a Port that would have to guess. */
  subject_core_entity_refs: CoreEntityId[];
  /** Exactly as stored in the Opportunity's payload — opaque, unresolved (see EvidenceRef's contract-level limitation). */
  evidence_refs: EvidenceRef[];
  /**
   * Recorded ownership of THIS Opportunity, carried from its Projection row
   * (which in turn carries it from the founding event, filled at the Admission
   * boundary). Added by the approved ownership-type CCR §5 — this file is not
   * frozen, so no contract change was needed for it.
   *
   * Optional on purpose: a candidate built from a row that predates the
   * column, or by a future caller that fails to populate it, must be DENIED
   * (policy v1.1 rule 3 — unknown ownership never means "assume allowed"),
   * not silently treated as ORGANIZATIONAL. Making it non-optional would have
   * moved that failure to compile time and hidden the runtime fail-closed path
   * the policy actually requires.
   */
  ownership_type?: OwnershipType;
}

export interface AC2Decision {
  opportunity_correlation_id: OpportunityCorrelationId;
  access: 'allow' | 'deny';
  /** Subset of the SAME candidate's evidence_refs that Governance explicitly authorizes exposing. Never a superset — see evaluateAC2FailClosed. */
  authorized_evidence_refs: EvidenceRef[];
}

export interface AC2DecisionPort {
  evaluate(actor: ActorContext, candidates: OpportunityAccessCandidate[]): Promise<AC2Decision[]>;
}

/**
 * The ONE place fail-closed AC-2 semantics are enforced. Every consumer
 * (getOpportunityFeed, getOpportunityById) must go through this — never
 * call `port.evaluate` directly — so the fail-closed/injection-rejection
 * rules can never be silently skipped by a future call site.
 *
 * Guarantees:
 *  - Port throws / rejects            -> every candidate denied.
 *  - Port returns non-array            -> every candidate denied.
 *  - A candidate missing from result   -> that candidate denied.
 *  - decision.access !== 'allow'       -> denied, authorized_evidence_refs always [].
 *  - subject_core_entity_refs empty    -> denied WITHOUT calling the Port
 *    (invalid candidate context — see Phase 5B.3 rule).
 *  - authorized_evidence_refs contains
 *    an event_id not present in the
 *    candidate's own evidence_refs     -> that entry is silently dropped
 *    (Port can never inject evidence the candidate didn't already carry).
 *  - Input `candidates` contains >1
 *    entry with the same
 *    opportunity_correlation_id        -> every one of those duplicated entries
 *    denied outright, never sent to the Port (which candidate's context would
 *    even be the "real" one is itself ambiguous — fail-closed, not first/last-wins).
 *  - Port returns >1 `AC2Decision` for
 *    the same opportunity_correlation_id -> that candidate denied. Never
 *    "last one wins" — a non-deterministic/ambiguous Port result is treated
 *    as no decision at all, which the existing "missing from result" rule
 *    already denies.
 */
export async function evaluateAC2FailClosed(
  port: AC2DecisionPort,
  actor: ActorContext,
  candidates: OpportunityAccessCandidate[],
): Promise<Map<OpportunityCorrelationId, AC2Decision>> {
  const denyOf = (c: OpportunityAccessCandidate): AC2Decision => ({
    opportunity_correlation_id: c.opportunity_correlation_id,
    access: 'deny',
    authorized_evidence_refs: [],
  });

  if (candidates.length === 0) return new Map();

  const result = new Map<OpportunityCorrelationId, AC2Decision>();

  // Duplicate opportunity_correlation_id in the INPUT array is a structural
  // anomaly, not a normal case — the current production call site
  // (buildAccessCandidates) always produces a Map-deduplicated list and never
  // triggers this branch; this is defense-in-depth for future callers. Every
  // candidate sharing a duplicated id is denied outright and excluded from
  // being sent to the Port at all.
  const inputIdCounts = new Map<OpportunityCorrelationId, number>();
  for (const c of candidates) {
    inputIdCounts.set(c.opportunity_correlation_id, (inputIdCounts.get(c.opportunity_correlation_id) ?? 0) + 1);
  }
  const dedupedCandidates: OpportunityAccessCandidate[] = [];
  for (const c of candidates) {
    if ((inputIdCounts.get(c.opportunity_correlation_id) ?? 0) > 1) {
      result.set(c.opportunity_correlation_id, denyOf(c));
    } else {
      dedupedCandidates.push(c);
    }
  }

  if (dedupedCandidates.length === 0) return result;

  const validCandidates = dedupedCandidates.filter((c) => c.subject_core_entity_refs.length > 0);
  const invalidCandidates = dedupedCandidates.filter((c) => c.subject_core_entity_refs.length === 0);

  for (const c of invalidCandidates) {
    result.set(c.opportunity_correlation_id, denyOf(c));
  }

  if (validCandidates.length === 0) return result;

  let raw: AC2Decision[];
  try {
    raw = await port.evaluate(actor, validCandidates);
  } catch {
    for (const c of validCandidates) result.set(c.opportunity_correlation_id, denyOf(c));
    return result;
  }

  if (!Array.isArray(raw)) {
    for (const c of validCandidates) result.set(c.opportunity_correlation_id, denyOf(c));
    return result;
  }

  // A Port returning more than one decision for the same opportunity_correlation_id
  // is itself a non-deterministic/ambiguous result — fail-closed here means "deny",
  // never "take the last one" (building the Map directly from `raw`, as before,
  // silently did that). Any id appearing more than once in `raw` is excluded from
  // `byId` entirely, so the lookup below treats it as "no decision" — already
  // denied by the existing missing-candidate rule.
  const outputIdCounts = new Map<OpportunityCorrelationId, number>();
  for (const d of raw) {
    outputIdCounts.set(d.opportunity_correlation_id, (outputIdCounts.get(d.opportunity_correlation_id) ?? 0) + 1);
  }
  const byId = new Map<OpportunityCorrelationId, AC2Decision>();
  for (const d of raw) {
    if (outputIdCounts.get(d.opportunity_correlation_id) === 1) {
      byId.set(d.opportunity_correlation_id, d);
    }
  }
  for (const c of validCandidates) {
    const d = byId.get(c.opportunity_correlation_id);
    if (!d || d.access !== 'allow') {
      result.set(c.opportunity_correlation_id, denyOf(c));
      continue;
    }
    const candidateEventIds = new Set(c.evidence_refs.map((e) => e.event_id));
    // A malformed (non-array, non-nullish) authorized_evidence_refs from a buggy/malicious
    // Port must never crash this function for the whole batch — treat it as empty, not throw.
    const rawAuthorized = Array.isArray(d.authorized_evidence_refs) ? d.authorized_evidence_refs : [];
    const authorized_evidence_refs = rawAuthorized.filter((e) => candidateEventIds.has(e.event_id));
    result.set(c.opportunity_correlation_id, {
      opportunity_correlation_id: c.opportunity_correlation_id,
      access: 'allow',
      authorized_evidence_refs,
    });
  }
  return result;
}
