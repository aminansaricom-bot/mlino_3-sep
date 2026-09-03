import {
  IC14ReadInterface,
  OpportunityFeedQuery,
  OpportunityFeedResponse,
  OpportunityProjectionDTO,
  OpportunityCorrelationId,
  ActorContext,
  DomainTag,
  OpportunityActorStateDTO,
} from '../../shared-contracts/types';

/**
 * Wave 1 stand-in for FP-02 (Opportunity Projection & Read Infrastructure),
 * per F-04/F-05's ACCEPTANCE_AND_MOCKS.md ("MockIC14ReadInterface"). This is
 * a TEST fixture, not production Foundation code — the real FP-02
 * (Postgres-backed) will implement this exact same interface later,
 * replacing this in-memory version without any change to F-04/F-05 code.
 *
 * Correctly implements the mandatory ordering from IC-14 §5:
 * AC-2 (authorization) -> intended_audience (relevance) -> actor-state ->
 * grouping/sort. This is deliberate: F-04's security tests must exercise the
 * real ordering contract, not a stub that always says yes.
 */
interface SeedOpportunity extends Omit<OpportunityProjectionDTO, 'my_interaction_state'> {}

export class MockIC14ReadInterface implements IC14ReadInterface {
  private opportunities: SeedOpportunity[] = [];
  // actor-scoped interaction state: key = `${opportunityId}:${actorId}`
  private actorState = new Map<string, OpportunityActorStateDTO>();
  // authorized organization ids (AC-2 stand-in: an actor may only read their own org)
  private authorizedOrgs = new Set<string>();

  seedOpportunity(op: SeedOpportunity) {
    this.opportunities.push(op);
    this.authorizedOrgs.add(op.organization_id);
  }

  setActorInteractionState(
    opportunityId: OpportunityCorrelationId,
    actorId: string,
    state: OpportunityActorStateDTO,
  ) {
    this.actorState.set(`${opportunityId}:${actorId}`, state);
  }

  private myState(opportunityId: string, actorId: string): OpportunityActorStateDTO {
    return this.actorState.get(`${opportunityId}:${actorId}`) ?? { interaction_type: 'NONE', updated_at: null };
  }

  async getOpportunityFeed(query: OpportunityFeedQuery): Promise<OpportunityFeedResponse> {
    // Step 1 — AC-2: reject entirely if the actor's org has no authorized data path.
    // (In the real FP-02 this is a call into Governance; here, any org with
    // seeded data is "authorized" — the important behavior under test is
    // that cross-org data NEVER appears, regardless of intended_audience.)
    const orgOpportunities = this.opportunities.filter(
      (o) => o.organization_id === query.actor.organization_id,
    );

    // Step 2 — intended_audience relevance filter (never a substitute for step 1).
    const relevant = orgOpportunities.filter(
      (o) => o.intended_audience === 'both' || o.intended_audience === query.actor.role,
    );

    // Optional family filter
    const filtered = query.domain_tag_filter
      ? relevant.filter((o) => o.domain_tag === query.domain_tag_filter)
      : relevant;

    // Step 3 — attach actor-scoped interaction state
    const withState: OpportunityProjectionDTO[] = filtered.map((o) => ({
      ...o,
      my_interaction_state: this.myState(o.opportunity_correlation_id, query.actor.actor_id),
    }));

    // Step 4 — group by domain_tag, sort descending by materiality_score within group
    const grouped: Partial<Record<DomainTag, OpportunityProjectionDTO[]>> = {};
    for (const dto of withState) {
      if (!grouped[dto.domain_tag]) grouped[dto.domain_tag] = [];
      grouped[dto.domain_tag]!.push(dto);
    }
    for (const tag of Object.keys(grouped) as DomainTag[]) {
      grouped[tag]!.sort((a, b) => b.materiality_score - a.materiality_score);
    }

    return { opportunities_by_family: grouped };
  }

  async getOpportunityById(
    id: OpportunityCorrelationId,
    actor: ActorContext,
  ): Promise<OpportunityProjectionDTO | null> {
    const found = this.opportunities.find((o) => o.opportunity_correlation_id === id);
    if (!found) return null;
    // AC-2 first: an opportunity outside the actor's org does not exist, from
    // this actor's point of view (same 404 for "not found" and "not authorized").
    if (found.organization_id !== actor.organization_id) return null;
    // intended_audience relevance — applied AFTER authorization.
    if (found.intended_audience !== 'both' && found.intended_audience !== actor.role) return null;
    return {
      ...found,
      my_interaction_state: this.myState(id, actor.actor_id),
    };
  }
}
