import { prisma } from '../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../foundation/event-admission/event-admission.service';
import { OpportunityFeedService } from '../../feed/opportunity-feed.service';
import { MockIC14ReadInterface } from '../mocks/mock-ic14-read-interface';
import { ActorContext, OpportunityProjectionDTO } from '../../shared-contracts/types';

const ORG_A = 'org-feed-A';
const ORG_B = 'org-feed-B';

const managerA: ActorContext = { organization_id: ORG_A, actor_id: 'manager-A', role: 'owner_manager' };
const receptionistA: ActorContext = { organization_id: ORG_A, actor_id: 'reception-A', role: 'receptionist_coordinator' };
const managerB: ActorContext = { organization_id: ORG_B, actor_id: 'manager-B', role: 'owner_manager' };

function makeOpp(overrides: Partial<Omit<OpportunityProjectionDTO, 'my_interaction_state'>>): Omit<OpportunityProjectionDTO, 'my_interaction_state'> {
  return {
    opportunity_correlation_id: 'opp-1',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG_A,
    state: 'ACTIVE',
    materiality_score: 0.8,
    materiality_basis: 'test',
    intended_audience: 'both',
    evidence_refs: [],
    event_time: new Date().toISOString(),
    expires_at: null,
    last_computed_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeAll(async () => {
  await seedV1CoreProducerRegistry();
});
afterAll(async () => {
  await prisma.$disconnect();
});
afterEach(async () => {
  await prisma.eventLog.deleteMany({});
  await prisma.admissionObservability.deleteMany({});
  await prisma.coreEntity.deleteMany({});
});

describe('F-04 — Opportunity Feed (4 mandatory security tests + idempotency + architecture invariant)', () => {
  it('SECURITY 1: a user in org A never receives an Opportunity belonging to org B, even by guessing the correct id', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp({ opportunity_correlation_id: 'opp-in-org-B', organization_id: ORG_B, intended_audience: 'both' }));
    const service = new OpportunityFeedService(mock, eventAdmissionService);

    const byId = await service.getById('opp-in-org-B', managerA);
    expect(byId).toBeNull();

    const feed = await service.getFeed({ actor: managerA });
    expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);
  });

  it('SECURITY 2: a receptionist never receives an Opportunity whose intended_audience is owner_manager', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp({ opportunity_correlation_id: 'opp-manager-only', intended_audience: 'owner_manager' }));
    const service = new OpportunityFeedService(mock, eventAdmissionService);

    const feed = await service.getFeed({ actor: receptionistA });
    expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);

    const managerFeed = await service.getFeed({ actor: managerA });
    expect(Object.values(managerFeed.opportunities_by_family).flat().length).toBe(1);
  });

  it('SECURITY 3: authorization (org match) is evaluated before intended_audience — a cross-org "both" opportunity is still denied', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp({ opportunity_correlation_id: 'opp-both-org-B', organization_id: ORG_B, intended_audience: 'both' }));
    const service = new OpportunityFeedService(mock, eventAdmissionService);

    const feed = await service.getFeed({ actor: managerA });
    expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);
    // sanity: org B's own manager CAN see it
    const feedB = await service.getFeed({ actor: managerB });
    expect(Object.values(feedB.opportunities_by_family).flat().length).toBe(1);
  });

  it('SECURITY 4: one actor\'s interaction state is fully isolated from another actor\'s state on the same Opportunity', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp({ opportunity_correlation_id: 'opp-shared', intended_audience: 'both' }));
    mock.setActorInteractionState('opp-shared', 'manager-A', { interaction_type: 'DISMISSED', updated_at: new Date().toISOString() });
    const service = new OpportunityFeedService(mock, eventAdmissionService);

    const managerFeed = await service.getFeed({ actor: managerA });
    const receptionistFeed = await service.getFeed({ actor: receptionistA });

    const managerOpp = managerFeed.opportunities_by_family['opportunity.capacity']![0];
    const receptionistOpp = receptionistFeed.opportunities_by_family['opportunity.capacity']![0];

    expect(managerOpp.my_interaction_state.interaction_type).toBe('DISMISSED');
    expect(receptionistOpp.my_interaction_state.interaction_type).toBe('NONE'); // untouched by manager's dismissal
  });

  it('idempotency: recording the same interaction twice does not create a duplicate accepted Event', async () => {
    // Seed a real Occurrence via the real FP-01, so the Amendment has a valid target.
    // CONTRACT RESOLUTION R6: deliberately NO CoreEntity is created for
    // managerA — the acting actor must never need to be a registered
    // CoreEntity (ACTOR IDENTITY ≠ SUBJECT COREENTITY IDENTITY). This test
    // would fail with CORE_ENTITY_REF_UNRESOLVED under the pre-R6 behavior;
    // it now passes precisely because that requirement was removed.
    await prisma.coreEntity.create({
      data: { id: 'entity-feed-1', organizationId: ORG_A, entityType: 'Individual', domainTag: 'test' },
    });
    const occurrence = await eventAdmissionService.submitEventCandidate({
      producer_id: 'value-engine:capacity',
      domain_tag: 'opportunity.capacity',
      organization_id: ORG_A,
      core_entity_refs: ['entity-feed-1'],
      event_type: 'OCCURRENCE',
      payload: { evidence_refs: [], materiality_score: 0.5, materiality_basis: 'x', intended_audience: 'both' },
      producer_timestamp: new Date().toISOString(),
      confidence_level: 1,
      kernel_version: 'v1.3',
    });

    const mock = new MockIC14ReadInterface();
    const service = new OpportunityFeedService(mock, eventAdmissionService);
    const oppId = occurrence.opportunity_correlation_id!;

    const first = await service.recordInteraction(oppId, 'ACKNOWLEDGED', managerA);
    const second = await service.recordInteraction(oppId, 'ACKNOWLEDGED', managerA);

    expect(first.admission_result).toBe('accepted');
    expect(second.admission_result).toBe('accepted');
    expect(second.event_id).toBe(first.event_id); // same unique_key -> same row, no duplicate
  });

  describe('CONTRACT RESOLUTION R6 — actor identity ≠ subject CoreEntity identity', () => {
    it('actor can interact without any CoreEntity ever being registered for that actor', async () => {
      await prisma.coreEntity.create({
        data: { id: 'entity-feed-r6-1', organizationId: ORG_A, entityType: 'Individual', domainTag: 'test' },
      });
      const actorWithNoCoreEntity: ActorContext = { organization_id: ORG_A, actor_id: 'never-registered-actor', role: 'receptionist_coordinator' };
      const occurrence = await eventAdmissionService.submitEventCandidate({
        producer_id: 'value-engine:cancellation',
        domain_tag: 'opportunity.cancellation',
        organization_id: ORG_A,
        core_entity_refs: ['entity-feed-r6-1'],
        event_type: 'OCCURRENCE',
        payload: { evidence_refs: [], materiality_score: 0.7, materiality_basis: 'x', intended_audience: 'receptionist_coordinator' },
        producer_timestamp: new Date().toISOString(),
        confidence_level: 1,
        kernel_version: 'v1.3',
      });

      const mock = new MockIC14ReadInterface();
      const service = new OpportunityFeedService(mock, eventAdmissionService);
      const result = await service.recordInteraction(occurrence.opportunity_correlation_id!, 'SEEN', actorWithNoCoreEntity);

      expect(result.admission_result).toBe('accepted');
      const registeredCoreEntity = await prisma.coreEntity.findUnique({ where: { id: 'never-registered-actor' } });
      expect(registeredCoreEntity).toBeNull(); // confirms no CoreEntity was ever created for the actor
    });

    it('subject CoreEntity references on the interaction Event are the ORIGINAL subject (from the founding Occurrence), never the actor', async () => {
      await prisma.coreEntity.create({
        data: { id: 'entity-feed-r6-2', organizationId: ORG_A, entityType: 'Individual', domainTag: 'test' },
      });
      const occurrence = await eventAdmissionService.submitEventCandidate({
        producer_id: 'value-engine:followup',
        domain_tag: 'opportunity.followup',
        organization_id: ORG_A,
        core_entity_refs: ['entity-feed-r6-2'],
        event_type: 'OCCURRENCE',
        payload: { evidence_refs: [], materiality_score: 0.6, materiality_basis: 'x', intended_audience: 'receptionist_coordinator' },
        producer_timestamp: new Date().toISOString(),
        confidence_level: 1,
        kernel_version: 'v1.3',
      });

      const mock = new MockIC14ReadInterface();
      const service = new OpportunityFeedService(mock, eventAdmissionService);
      const interaction = await service.recordInteraction(occurrence.opportunity_correlation_id!, 'ACKNOWLEDGED', receptionistA);

      const row = await prisma.eventLog.findUnique({
        where: { id: interaction.event_id },
        include: { coreEntities: true },
      });
      expect(row?.coreEntities.map((e) => e.id)).toEqual(['entity-feed-r6-2']); // the SUBJECT, not receptionistA's actor id
    });
  });

  it('architecture invariant: the Feed service source contains no domain-detection or materiality-computation logic', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../feed/opportunity-feed.service.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/materiality_score\s*=/); // never assigns/computes a score
    expect(source).not.toMatch(/computeEmptyRatio|detectOpportunity/i);
  });
});
