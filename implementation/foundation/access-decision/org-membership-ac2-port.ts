import { ActorContext } from '../../shared-contracts/types';
import { AC2Decision, AC2DecisionPort, OpportunityAccessCandidate } from './ac2-decision-port';

/**
 * The first REAL AC2DecisionPort implementation — V1 policy only.
 *
 * ⚠️ THIS IS NOT KERNEL-AC-2. Kernel §12 defines the AC-2 decision as a
 * function of ownership state AND consent state. This adapter implements only
 * the ownership half, and only its single V1 value (ORGANIZATIONAL). It
 * deliberately contains NO consent logic at all, because no consent data
 * exists anywhere in V1 — see R8-a
 * (implementation/remediation/R8_CONSENT_AND_KNOWLEDGE_LAYER_GAP.md).
 * Calling this "AC-2" without that caveat would overstate what it enforces.
 *
 * Authorized by: the product owner's approved Option 1 (organizational
 * membership) + the approved ownership-type CCR, implemented per
 * V1_MINIMUM_AC2_ACCESS_POLICY.md v1.1 (rules 1-4, 6, 9, 10).
 *
 * WHAT IT DECIDES (allow requires ALL of these):
 *   1. The actor context is structurally valid — present, non-empty
 *      actor_id / organization_id, and a role V1 actually recognises.
 *      (Policy rule 1.)
 *   2. The candidate's organization is the actor's organization.
 *      (Policy rule 2 — note this is belt-and-braces: the read path already
 *      scopes its query by organization_id, so a cross-tenant candidate
 *      should never even reach here. Enforced anyway, deliberately.)
 *   3. The candidate carries a RECORDED ownership of ORGANIZATIONAL.
 *      Missing/unknown ownership is DENIED, never assumed. (Rules 3 + 4.)
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *   - No `intended_audience` logic. That is step 5 of IC-14's fixed order and
 *     belongs to the read service, not to a Governance decision.
 *   - No consent evaluation (R8-a).
 *   - No per-EVIDENCE ownership decision. Policy v1.1 §3 describes a two-level
 *     check (is the Opportunity visible / which evidence_refs are visible),
 *     but the approved CCR added ownership to `event_log` and
 *     `opportunity_current_state` only — NOT to `EvidenceRef`, which remains
 *     an opaque, unresolvable reference while R4 is BLOCKED. So this adapter
 *     authorizes exactly the candidate's own evidence set and no more; it
 *     cannot restrict a subset by evidence ownership, because that data does
 *     not exist. This is a KNOWN, RECORDED limitation, not an oversight —
 *     tracked under R4 and R8-a. Superset injection remains impossible: the
 *     caller (`evaluateAC2FailClosed`) drops any returned ref that is not
 *     already on the candidate.
 *
 * MEMBERSHIP LIMITATION (documented per the authorizing instruction, clause
 * 4.e): V1 has no membership table independent of the token. "Active
 * membership" here therefore means "the caller holds a currently valid token
 * for this organization", resolved earlier by FP-03 (`resolveActorContext`).
 * A separately revocable membership/suspension record does not exist and was
 * NOT invented here — introducing one would be a new data model requiring its
 * own CCR. Consequence to be honest about: revoking someone's access today
 * means invalidating their token, not flipping a membership row. Recorded in
 * V1_MINIMUM_AC2_ACCESS_POLICY.md §1 and R8-a.
 *
 * FAIL-CLOSED: every branch below denies the specific candidate rather than
 * throwing, so one malformed candidate can never take down the whole batch.
 * The outer `evaluateAC2FailClosed` wrapper additionally denies everything if
 * this method throws at all — the two layers are complementary, not redundant.
 */
export class OrgMembershipAC2DecisionPort implements AC2DecisionPort {
  private static readonly RECOGNISED_ROLES: ReadonlySet<string> = new Set([
    'owner_manager',
    'receptionist_coordinator',
  ]);

  async evaluate(
    actor: ActorContext,
    candidates: OpportunityAccessCandidate[],
  ): Promise<AC2Decision[]> {
    const actorIsValid = this.isActorValid(actor);

    return candidates.map((candidate) => {
      const deny: AC2Decision = {
        opportunity_correlation_id: candidate?.opportunity_correlation_id,
        access: 'deny',
        authorized_evidence_refs: [],
      };

      // A malformed candidate object is denied, never allowed to throw.
      if (!candidate || typeof candidate !== 'object') return deny;
      if (!actorIsValid) return deny;

      // Rule 2 — tenant match.
      if (
        typeof candidate.organization_id !== 'string' ||
        candidate.organization_id.length === 0 ||
        candidate.organization_id !== actor.organization_id
      ) {
        return deny;
      }

      // Rules 3 + 4 — ownership must be RECORDED and organizational.
      // Anything else (undefined, null, an unexpected value from a future
      // schema, a non-string) is unknown ownership => deny.
      if (candidate.ownership_type !== 'ORGANIZATIONAL') return deny;

      // Rule 10 — never return anything the candidate did not already carry.
      const evidence = Array.isArray(candidate.evidence_refs) ? candidate.evidence_refs : [];

      return {
        opportunity_correlation_id: candidate.opportunity_correlation_id,
        access: 'allow',
        authorized_evidence_refs: [...evidence],
      };
    });
  }

  private isActorValid(actor: ActorContext): boolean {
    if (!actor || typeof actor !== 'object') return false;
    if (typeof actor.actor_id !== 'string' || actor.actor_id.length === 0) return false;
    if (typeof actor.organization_id !== 'string' || actor.organization_id.length === 0) return false;
    if (typeof actor.role !== 'string') return false;
    return OrgMembershipAC2DecisionPort.RECOGNISED_ROLES.has(actor.role);
  }
}

/**
 * The production default. There is currently NO composition root / API layer
 * in this codebase that constructs `OpportunityReadService` (verified: it is
 * instantiated only in tests), so nothing is wired here yet — this export is
 * the thing a future entry point must inject. No fake API layer was invented
 * just to have somewhere to wire it.
 */
export const orgMembershipAC2DecisionPort = new OrgMembershipAC2DecisionPort();
