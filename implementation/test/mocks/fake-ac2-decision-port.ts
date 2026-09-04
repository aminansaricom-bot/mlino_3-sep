import { ActorContext, EvidenceRef } from '../../shared-contracts/types';
import {
  AC2Decision,
  AC2DecisionPort,
  OpportunityAccessCandidate,
} from '../../foundation/access-decision/ac2-decision-port';

/**
 * Test-only Fake for AC2DecisionPort — NOT a Governance Adapter (none is
 * implemented in this phase; see FP02_IMPLEMENTATION_SCOPE_GATE.md). This
 * fake exists purely to drive `evaluateAC2FailClosed` and
 * OpportunityReadService through every required scenario in the
 * PHASE_5B family's ACCEPTANCE_DELTA.md documents, without inventing
 * production AC-2 logic.
 */
export interface FakeAC2DecisionPortOptions {
  /** Default: allow everything, authorize all evidence. */
  decide?: (actor: ActorContext, candidate: OpportunityAccessCandidate) => 'allow' | 'deny';
  authorizedEvidenceFor?: (candidate: OpportunityAccessCandidate) => EvidenceRef[];
  /** Simulates the Port itself being unavailable — must trigger fail-closed. */
  throwError?: boolean;
  /** Simulates a Port that returns no decision for anything (fail-closed per-candidate). */
  returnEmpty?: boolean;
  /** Simulates a Port that (incorrectly) injects an EvidenceRef not present in the candidate — must be rejected by the consumer. */
  injectForeignEvidenceRef?: EvidenceRef;
  /** Simulates a buggy Port returning a malformed (non-array) authorized_evidence_refs on an otherwise well-formed 'allow' decision — must not crash the consumer, must be treated as empty. */
  malformedAuthorizedEvidenceRefs?: boolean;
  /**
   * Simulates a buggy Port returning TWO AC2Decision entries for the same
   * opportunity_correlation_id (one per requested access value, in the given
   * order) instead of exactly one — the consumer must deny the affected
   * candidate outright, regardless of order or content, never "last one wins".
   * Only meaningful with a single candidate in the call.
   */
  duplicateDecisionPair?: ['allow' | 'deny', 'allow' | 'deny'];
}

export class FakeAC2DecisionPort implements AC2DecisionPort {
  public readonly calls: { actor: ActorContext; candidates: OpportunityAccessCandidate[] }[] = [];

  constructor(private readonly options: FakeAC2DecisionPortOptions = {}) {}

  async evaluate(actor: ActorContext, candidates: OpportunityAccessCandidate[]): Promise<AC2Decision[]> {
    this.calls.push({ actor, candidates });

    if (this.options.throwError) {
      throw new Error('FakeAC2DecisionPort: simulated Port unavailability');
    }
    if (this.options.returnEmpty) {
      return [];
    }
    if (this.options.duplicateDecisionPair) {
      const [first, second] = this.options.duplicateDecisionPair;
      const c = candidates[0];
      const mk = (access: 'allow' | 'deny'): AC2Decision => ({
        opportunity_correlation_id: c.opportunity_correlation_id,
        access,
        authorized_evidence_refs: access === 'allow' ? [...c.evidence_refs] : [],
      });
      return [mk(first), mk(second)];
    }

    return candidates.map((c) => {
      const access = this.options.decide ? this.options.decide(actor, c) : 'allow';
      let authorized_evidence_refs: EvidenceRef[] = [];
      if (access === 'allow') {
        authorized_evidence_refs = this.options.authorizedEvidenceFor
          ? this.options.authorizedEvidenceFor(c)
          : [...c.evidence_refs];
        if (this.options.injectForeignEvidenceRef) {
          authorized_evidence_refs = [...authorized_evidence_refs, this.options.injectForeignEvidenceRef];
        }
      }
      const decision = { opportunity_correlation_id: c.opportunity_correlation_id, access, authorized_evidence_refs };
      if (access === 'allow' && this.options.malformedAuthorizedEvidenceRefs) {
        // Deliberately wrong shape — a real Port must never do this, but the consumer
        // must survive it rather than throw. Cast bypasses the type system on purpose.
        return { ...decision, authorized_evidence_refs: 'not-an-array' as unknown as EvidenceRef[] };
      }
      return decision;
    });
  }
}
