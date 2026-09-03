import {
  IC14ReadInterface,
  IC13SubmissionInterface,
  OpportunityFeedQuery,
  OpportunityFeedResponse,
  OpportunityProjectionDTO,
  ActorContext,
  EventCandidateDTO,
} from '../shared-contracts/types';

/**
 * F-04 — Opportunity Feed. PRESENTATION LAYER ONLY.
 *
 * This service never decides what "is" an Opportunity and never computes or
 * adjusts materiality — it exclusively reads from IC14ReadInterface (owned
 * by FP-02) and, for API-03, submits an interaction record via
 * IC13SubmissionInterface (owned by FP-01). See FEATURE_CONTRACTS/F-04 §6.
 */
const INTERACTION_PRODUCER_ID = 'interaction-layer:ui';

export class OpportunityFeedService {
  constructor(
    private readonly readInterface: IC14ReadInterface,
    private readonly submission: IC13SubmissionInterface,
  ) {}

  /** API-01 */
  async getFeed(query: OpportunityFeedQuery): Promise<OpportunityFeedResponse> {
    return this.readInterface.getOpportunityFeed(query);
  }

  /** API-02 */
  async getById(id: string, actor: ActorContext): Promise<OpportunityProjectionDTO | null> {
    return this.readInterface.getOpportunityById(id, actor);
  }

  /**
   * API-03 — the ONLY write path this Feature has, and only via IC-13.
   *
   * R6 (v1.1): `core_entity_refs` is submitted EMPTY — actor identity is not
   * a subject CoreEntity reference (ACTOR IDENTITY ≠ SUBJECT COREENTITY
   * IDENTITY). The admission boundary (FP-01) fills in the correct subject
   * refs from the target Opportunity's founding Occurrence. This Feature no
   * longer needs to know, or care, whether the acting user has any
   * CoreEntity representation at all — see
   * CONTRACT_RESOLUTION/R6_ACTOR_SUBJECT_CONTRACT_CHANGE.md.
   */
  async recordInteraction(
    opportunityCorrelationId: string,
    interactionType: 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED',
    actor: ActorContext,
  ) {
    const candidate: EventCandidateDTO = {
      producer_id: INTERACTION_PRODUCER_ID,
      domain_tag: 'opportunity.interaction',
      organization_id: actor.organization_id,
      core_entity_refs: [],
      opportunity_correlation_id: opportunityCorrelationId,
      event_type: 'AMENDMENT',
      payload: {
        interaction_type: interactionType,
        actor_id: actor.actor_id,
      },
      producer_timestamp: new Date().toISOString(),
      confidence_level: 1.0,
      kernel_version: 'v1.3',
    };
    return this.submission.submitEventCandidate(candidate);
  }
}
