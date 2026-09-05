import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { rebuildOrganizationProjection } from '../../../foundation/opportunity-projection/rebuild-projection.service';
import { OpportunityReadService } from '../../../foundation/opportunity-read/opportunity-read.service';
import { OrgMembershipAC2DecisionPort } from '../../../foundation/access-decision/org-membership-ac2-port';
import {
  evaluateAC2FailClosed,
  OpportunityAccessCandidate,
} from '../../../foundation/access-decision/ac2-decision-port';
import { ActorContext, EventCandidateDTO } from '../../../shared-contracts/types';

/**
 * Stage B — the real AC-2 adapter (V1 organizational-membership policy).
 *
 * Runs the executable subset of the 17-scenario plan in
 * V1_MINIMUM_AC2_ACCESS_POLICY.md §6. Scenarios 8-12 of that plan (individual
 * data without consent, revoked consent, expired consent, wrong data-type,
 * wrong consumer) are NOT executable today and are deliberately absent: no
 * consent data, and no INDIVIDUAL/AGGREGATE ownership values, exist in V1.
 * They are tracked under R8-a / R8-b, not silently skipped.
 */

const ORG_A = 'org-ac2-A';
const ORG_B = 'org-ac2-B';

const managerA: ActorContext = { organization_id: ORG_A, actor_id: 'manager-A', role: 'owner_manager' };
const receptionA: ActorContext = {
  organization_id: ORG_A,
  actor_id: 'reception-A',
  role: 'receptionist_coordinator',
};
const managerB: ActorContext = { organization_id: ORG_B, actor_id: 'manager-B', role: 'owner_manager' };

async function seedEntity(id: string, org = ORG_A) {
  await prisma.coreEntity.create({
    data: { id, organizationId: org, entityType: 'Individual', domainTag: 'test.resource' },
  });
}

async function seedOccurrence(overrides: Partial<EventCandidateDTO> = {}) {
  const candidate: EventCandidateDTO = {
    producer_id: 'value-engine:capacity',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG_A,
    core_entity_refs: ['entity-ac2-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [{ event_id: 'ev-src-1' }],
      materiality_score: 0.8,
      materiality_basis: 'ac2 adapter stage B',
      intended_audience: 'both',
    },
    producer_timestamp: '2026-08-15T10:00:00.000Z',
    confidence_level: 1.0,
    kernel_version: 'v1.3',
    ...overrides,
  } as EventCandidateDTO;
  return eventAdmissionService.submitEventCandidate(candidate);
}

function candidateOf(
  overrides: Partial<OpportunityAccessCandidate> = {},
): OpportunityAccessCandidate {
  return {
    organization_id: ORG_A,
    opportunity_correlation_id: 'corr-1',
    subject_core_entity_refs: ['entity-ac2-1'],
    evidence_refs: [{ event_id: 'ev-src-1' }],
    ownership_type: 'ORGANIZATIONAL',
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
  await prisma.opportunityInteractionState.deleteMany({});
  await prisma.opportunityCurrentState.deleteMany({});
  await prisma.eventLog.deleteMany({});
  await prisma.admissionObservability.deleteMany({});
  await prisma.coreEntity.deleteMany({});
});

describe('OrgMembershipAC2DecisionPort — end to end through the real read path (real Postgres)', () => {
  it('member of the same organization, ownership recorded ORGANIZATIONAL: allowed', async () => {
    await seedEntity('entity-ac2-1');
    const occ = await seedOccurrence();
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const service = new OpportunityReadService(new OrgMembershipAC2DecisionPort());
    const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
    expect(dto).not.toBeNull();
    expect(dto?.opportunity_correlation_id).toBe(occ.opportunity_correlation_id);

    const feed = await service.getOpportunityFeed({ actor: managerA });
    expect(Object.values(feed.opportunities_by_family).flat().length).toBe(1);
  });

  it('actor from another organization is denied, even guessing the exact id', async () => {
    await seedEntity('entity-ac2-1');
    const occ = await seedOccurrence();
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const service = new OpportunityReadService(new OrgMembershipAC2DecisionPort());
    expect(await service.getOpportunityById(occ.opportunity_correlation_id!, managerB)).toBeNull();
    const feed = await service.getOpportunityFeed({ actor: managerB });
    expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);
  });

  it('AC-2 still runs BEFORE intended_audience: a manager-only Opportunity clears AC-2 but is filtered out of a receptionist feed', async () => {
    await seedEntity('entity-ac2-1');
    await seedOccurrence({
      payload: {
        evidence_refs: [],
        materiality_score: 0.9,
        materiality_basis: 'manager only',
        intended_audience: 'owner_manager',
      },
    });
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const service = new OpportunityReadService(new OrgMembershipAC2DecisionPort());
    const receptionFeed = await service.getOpportunityFeed({ actor: receptionA });
    expect(Object.values(receptionFeed.opportunities_by_family).flat().length).toBe(0);

    const managerFeed = await service.getOpportunityFeed({ actor: managerA });
    expect(Object.values(managerFeed.opportunities_by_family).flat().length).toBe(1);
  });
});

describe('OrgMembershipAC2DecisionPort — policy rules at the Port boundary', () => {
  const port = new OrgMembershipAC2DecisionPort();

  it('recorded ORGANIZATIONAL ownership in the same org is allowed', async () => {
    const result = await evaluateAC2FailClosed(port, managerA, [candidateOf()]);
    expect(result.get('corr-1')?.access).toBe('allow');
  });

  it('UNRECORDED ownership is denied — rule 3, never assumed organizational', async () => {
    const result = await evaluateAC2FailClosed(port, managerA, [
      candidateOf({ ownership_type: undefined }),
    ]);
    expect(result.get('corr-1')?.access).toBe('deny');
    expect(result.get('corr-1')?.authorized_evidence_refs).toEqual([]);
  });

  it('an unexpected ownership value from a future schema is denied, not loosely accepted', async () => {
    const result = await evaluateAC2FailClosed(port, managerA, [
      candidateOf({ ownership_type: 'INDIVIDUAL' as never }),
    ]);
    expect(result.get('corr-1')?.access).toBe('deny');
  });

  it('an unrecognised role is denied — rule 1', async () => {
    const result = await evaluateAC2FailClosed(
      port,
      { organization_id: ORG_A, actor_id: 'x', role: 'janitor' as never },
      [candidateOf()],
    );
    expect(result.get('corr-1')?.access).toBe('deny');
  });

  it('an empty actor_id is denied — rule 1', async () => {
    const result = await evaluateAC2FailClosed(
      port,
      { organization_id: ORG_A, actor_id: '', role: 'owner_manager' },
      [candidateOf()],
    );
    expect(result.get('corr-1')?.access).toBe('deny');
  });

  it('a cross-organization candidate is denied at the Port too, not only by the query scope', async () => {
    const result = await evaluateAC2FailClosed(port, managerA, [
      candidateOf({ organization_id: ORG_B }),
    ]);
    expect(result.get('corr-1')?.access).toBe('deny');
  });

  it('one bad candidate denies only itself — the batch survives and the healthy candidate still resolves', async () => {
    const result = await evaluateAC2FailClosed(port, managerA, [
      candidateOf({ opportunity_correlation_id: 'corr-good' }),
      candidateOf({ opportunity_correlation_id: 'corr-bad', ownership_type: undefined }),
    ]);
    expect(result.get('corr-good')?.access).toBe('allow');
    expect(result.get('corr-bad')?.access).toBe('deny');
  });

  it('never returns evidence the candidate did not carry — injection stays blocked on the real adapter', async () => {
    const result = await evaluateAC2FailClosed(port, managerA, [
      candidateOf({ evidence_refs: [{ event_id: 'ev-a' }] }),
    ]);
    expect(result.get('corr-1')?.authorized_evidence_refs).toEqual([{ event_id: 'ev-a' }]);
  });

  it('a Port that throws still fails closed at the wrapper — the two layers are complementary', async () => {
    const throwing = {
      evaluate: async () => {
        throw new Error('governance source unavailable');
      },
    };
    const result = await evaluateAC2FailClosed(throwing, managerA, [candidateOf()]);
    expect(result.get('corr-1')?.access).toBe('deny');
  });
});
