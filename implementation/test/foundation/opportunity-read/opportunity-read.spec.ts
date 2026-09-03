import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { rebuildOrganizationProjection } from '../../../foundation/opportunity-projection/rebuild-projection.service';
import { OpportunityReadService } from '../../../foundation/opportunity-read/opportunity-read.service';
import { OpportunityFeedService } from '../../../feed/opportunity-feed.service';
import { FakeAC2DecisionPort } from '../../mocks/fake-ac2-decision-port';
import { ActorContext, EventCandidateDTO } from '../../../shared-contracts/types';

const ORG_A = 'org-read-A';
const ORG_B = 'org-read-B';

const managerA: ActorContext = { organization_id: ORG_A, actor_id: 'manager-A', role: 'owner_manager' };
const receptionistA: ActorContext = { organization_id: ORG_A, actor_id: 'reception-A', role: 'receptionist_coordinator' };
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
    core_entity_refs: ['entity-read-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [{ event_id: 'ev-source-1' }],
      materiality_score: 0.8,
      materiality_basis: 'initial',
      intended_audience: 'both',
      expires_at: '2026-08-20T23:59:59.000Z',
    },
    producer_timestamp: '2026-08-15T10:00:00.000Z',
    confidence_level: 1.0,
    kernel_version: 'v1.3',
    ...overrides,
  } as EventCandidateDTO;
  return eventAdmissionService.submitEventCandidate(candidate);
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

describe('FP-02 — OpportunityReadService (real IC14ReadInterface, real Postgres)', () => {
  describe('AC-2 gate — allow/deny/error/missing-decision, always fail-closed', () => {
    it('AC-2 allow: an authorized Opportunity is returned', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence();
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort());
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto).not.toBeNull();
      expect(dto?.opportunity_correlation_id).toBe(occ.opportunity_correlation_id);

      const feed = await service.getOpportunityFeed({ actor: managerA });
      expect(Object.values(feed.opportunities_by_family).flat().length).toBe(1);
    });

    it('AC-2 deny: the Opportunity is dropped from both getById and the Feed', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence();
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort({ decide: () => 'deny' }));
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto).toBeNull();

      const feed = await service.getOpportunityFeed({ actor: managerA });
      expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);
    });

    it('AC-2 Port throws (unavailable): fails closed — treated as deny, never as allow', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence();
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort({ throwError: true }));
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto).toBeNull();

      const feed = await service.getOpportunityFeed({ actor: managerA });
      expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);
    });

    it('AC-2 Port returns no decision for the candidate (missing from result array): fails closed', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence();
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort({ returnEmpty: true }));
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto).toBeNull();

      const feed = await service.getOpportunityFeed({ actor: managerA });
      expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);
    });

    it('empty subject_core_entity_refs denies WITHOUT ever calling the Port', async () => {
      // Interaction-family founding events would normally never occur (no core_entity_refs
      // required for opportunity.interaction), so instead we exercise this via the founding
      // OCCURRENCE having its CoreEntity relation not exist at read time — access-candidate.ts
      // resolves subject_core_entity_refs from the founding event's own CoreEntity relation;
      // if that relation is empty, evaluateAC2FailClosed must deny before calling the Port.
      // We simulate this by seeding an occurrence normally, then deleting the CoreEntity so
      // the founding event's relation resolves to zero refs, and rebuilding the Projection
      // afterward (Projection itself doesn't depend on CoreEntity, only the read-time candidate does).
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence();
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
      await prisma.coreEntity.delete({ where: { id: 'entity-read-1' } });

      const port = new FakeAC2DecisionPort();
      const service = new OpportunityReadService(port);
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto).toBeNull();
      expect(port.calls.length).toBe(0); // Port was never invoked for this zero-subject-ref candidate
    });

    it('AC-2 is evaluated before intended_audience filtering — the Port sees org-scoped candidates regardless of audience', async () => {
      await seedEntity('entity-read-2a');
      await seedEntity('entity-read-2b');
      await seedOccurrence({
        core_entity_refs: ['entity-read-2a'],
        payload: { evidence_refs: [], materiality_score: 0.9, materiality_basis: 'manager-only', intended_audience: 'owner_manager' },
      });
      await seedOccurrence({
        core_entity_refs: ['entity-read-2b'],
        producer_timestamp: '2026-08-15T10:05:00.000Z',
        payload: { evidence_refs: [], materiality_score: 0.7, materiality_basis: 'reception-only', intended_audience: 'receptionist_coordinator' },
      });
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const port = new FakeAC2DecisionPort();
      const service = new OpportunityReadService(port);
      await service.getOpportunityFeed({ actor: managerA });

      expect(port.calls.length).toBe(1);
      // Both opportunities (one manager-only, one reception-only) were presented to AC-2 —
      // proving AC-2 runs on the org-scoped set BEFORE the audience filter narrows it.
      expect(port.calls[0].candidates.length).toBe(2);
    });
  });

  describe('Evidence handling — S2 policy', () => {
    it('evidence_refs in the DTO is exactly the AC-2-authorized subset, never the raw stored value', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence({
        payload: {
          evidence_refs: [{ event_id: 'ev-a' }, { event_id: 'ev-b' }],
          materiality_score: 0.8,
          materiality_basis: 'x',
          intended_audience: 'both',
        },
      });
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const port = new FakeAC2DecisionPort({
        authorizedEvidenceFor: (c) => c.evidence_refs.filter((r) => r.event_id === 'ev-a'),
      });
      const service = new OpportunityReadService(port);
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto?.evidence_refs).toEqual([{ event_id: 'ev-a' }]);
    });

    it('a Port-injected foreign EvidenceRef (not present on the candidate) is silently dropped, never returned', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence({
        payload: {
          evidence_refs: [{ event_id: 'ev-a' }],
          materiality_score: 0.8,
          materiality_basis: 'x',
          intended_audience: 'both',
        },
      });
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const port = new FakeAC2DecisionPort({ injectForeignEvidenceRef: { event_id: 'ev-foreign-not-on-candidate' } });
      const service = new OpportunityReadService(port);
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto?.evidence_refs).toEqual([{ event_id: 'ev-a' }]); // foreign ref rejected
      expect(dto?.evidence_refs.some((r) => r.event_id === 'ev-foreign-not-on-candidate')).toBe(false);
    });

    it('a Port returning a malformed (non-array) authorized_evidence_refs on an "allow" decision never crashes the read — treated as empty', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence({
        payload: {
          evidence_refs: [{ event_id: 'ev-a' }],
          materiality_score: 0.8,
          materiality_basis: 'x',
          intended_audience: 'both',
        },
      });
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const port = new FakeAC2DecisionPort({ malformedAuthorizedEvidenceRefs: true });
      const service = new OpportunityReadService(port);
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto).not.toBeNull(); // access itself is still 'allow' — only the evidence field was malformed
      expect(dto?.evidence_refs).toEqual([]); // malformed field never crashes the function, never leaks garbage
    });

    it('evidence_refs defaults to [] when the stored Opportunity carries no evidence', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence({
        payload: { evidence_refs: [], materiality_score: 0.8, materiality_basis: 'x', intended_audience: 'both' },
      });
      await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort());
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto?.evidence_refs).toEqual([]);
    });
  });

  describe('Feed vs by-id state boundary', () => {
    it('the Feed returns ACTIVE-only — an EXPIRED Opportunity is excluded', async () => {
      await seedEntity('entity-read-1');
      const occ = await seedOccurrence(); // expires_at: 2026-08-20T23:59:59Z
      await rebuildOrganizationProjection(ORG_A, '2026-08-22T00:00:00.000Z'); // after expiry

      const service = new OpportunityReadService(new FakeAC2DecisionPort());
      const feed = await service.getOpportunityFeed({ actor: managerA });
      expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);

      // by-id explicitly MAY return EXPIRED (IC-14 §12).
      const dto = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dto?.state).toBe('EXPIRED');
    });

    it('by-id denies cross-tenant access — an org A actor gets null for an org B Opportunity, indistinguishable from not-found', async () => {
      await seedEntity('entity-read-b1', ORG_B);
      const occ = await seedOccurrence({ organization_id: ORG_B, core_entity_refs: ['entity-read-b1'] });
      await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort());
      const dtoFromA = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      expect(dtoFromA).toBeNull();

      const dtoFromB = await service.getOpportunityById(occ.opportunity_correlation_id!, managerB);
      expect(dtoFromB).not.toBeNull(); // sanity: org B's own manager can see it

      await prisma.opportunityCurrentState.deleteMany({ where: { organizationId: ORG_B } });
      await prisma.eventLog.deleteMany({ where: { organizationId: ORG_B } });
      await prisma.coreEntity.deleteMany({ where: { organizationId: ORG_B } });
    });

    it('by-id returns null identically for a truly nonexistent id and a wrong-org id (no existence oracle)', async () => {
      await seedEntity('entity-read-b2', ORG_B);
      const occ = await seedOccurrence({ organization_id: ORG_B, core_entity_refs: ['entity-read-b2'] });
      await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

      const service = new OpportunityReadService(new FakeAC2DecisionPort());
      const wrongOrg = await service.getOpportunityById(occ.opportunity_correlation_id!, managerA);
      const nonexistent = await service.getOpportunityById('00000000-0000-0000-0000-000000000000', managerA);
      expect(wrongOrg).toBeNull();
      expect(nonexistent).toBeNull();

      await prisma.opportunityCurrentState.deleteMany({ where: { organizationId: ORG_B } });
      await prisma.eventLog.deleteMany({ where: { organizationId: ORG_B } });
      await prisma.coreEntity.deleteMany({ where: { organizationId: ORG_B } });
    });
  });

  describe('architecture invariants', () => {
    it('opportunity-read.service.ts never writes to opportunity_current_state, opportunity_interaction_state, or event_log', () => {
      const source = require('fs').readFileSync(
        require.resolve('../../../foundation/opportunity-read/opportunity-read.service.ts'),
        'utf-8',
      );
      expect(source).not.toMatch(/prisma\.(opportunityCurrentState|opportunityInteractionState|eventLog)\.(create|update|upsert|delete)/);
    });

    it('access-candidate.ts never writes anything — read-only', () => {
      const source = require('fs').readFileSync(
        require.resolve('../../../foundation/opportunity-read/access-candidate.ts'),
        'utf-8',
      );
      expect(source).not.toMatch(/prisma\.\w+\.(create|update|upsert|delete)/);
    });
  });
});

describe('F-04 SECURITY 1-4 — re-verified against the REAL OpportunityReadService (not the Mock)', () => {
  it('SECURITY 1 (real impl): a user in org A never receives an Opportunity belonging to org B, even by guessing the correct id', async () => {
    await seedEntity('entity-read-s1', ORG_B);
    const occ = await seedOccurrence({ organization_id: ORG_B, core_entity_refs: ['entity-read-s1'] });
    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

    const real = new OpportunityReadService(new FakeAC2DecisionPort());
    const service = new OpportunityFeedService(real, eventAdmissionService);

    const byId = await service.getById(occ.opportunity_correlation_id!, managerA);
    expect(byId).toBeNull();

    const feed = await service.getFeed({ actor: managerA });
    expect(Object.values(feed.opportunities_by_family).flat().length).toBe(0);

    await prisma.opportunityCurrentState.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.eventLog.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.coreEntity.deleteMany({ where: { organizationId: ORG_B } });
  });

  it('SECURITY 2 (real impl): a receptionist never receives an Opportunity whose intended_audience is owner_manager', async () => {
    await seedEntity('entity-read-1');
    await seedOccurrence({ payload: { evidence_refs: [], materiality_score: 0.8, materiality_basis: 'x', intended_audience: 'owner_manager' } });
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const real = new OpportunityReadService(new FakeAC2DecisionPort());
    const service = new OpportunityFeedService(real, eventAdmissionService);

    const receptionFeed = await service.getFeed({ actor: receptionistA });
    expect(Object.values(receptionFeed.opportunities_by_family).flat().length).toBe(0);

    const managerFeed = await service.getFeed({ actor: managerA });
    expect(Object.values(managerFeed.opportunities_by_family).flat().length).toBe(1);
  });

  it('SECURITY 3 (real impl): tenant isolation holds even for a "both"-audience Opportunity in another org', async () => {
    await seedEntity('entity-read-s3', ORG_B);
    await seedOccurrence({
      organization_id: ORG_B,
      core_entity_refs: ['entity-read-s3'],
      payload: { evidence_refs: [], materiality_score: 0.8, materiality_basis: 'x', intended_audience: 'both' },
    });
    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

    const real = new OpportunityReadService(new FakeAC2DecisionPort());
    const service = new OpportunityFeedService(real, eventAdmissionService);

    const feedA = await service.getFeed({ actor: managerA });
    expect(Object.values(feedA.opportunities_by_family).flat().length).toBe(0);

    const feedB = await service.getFeed({ actor: managerB });
    expect(Object.values(feedB.opportunities_by_family).flat().length).toBe(1);

    await prisma.opportunityCurrentState.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.eventLog.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.coreEntity.deleteMany({ where: { organizationId: ORG_B } });
  });

  it('SECURITY 4 (real impl): one actor\'s interaction state is fully isolated from another actor\'s state on the same Opportunity', async () => {
    await seedEntity('entity-read-1');
    const occ = await seedOccurrence({
      payload: { evidence_refs: [], materiality_score: 0.8, materiality_basis: 'x', intended_audience: 'both' },
    });
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const real = new OpportunityReadService(new FakeAC2DecisionPort());
    const service = new OpportunityFeedService(real, eventAdmissionService);

    const first = await service.recordInteraction(occ.opportunity_correlation_id!, 'DISMISSED', managerA);
    expect(first.admission_result).toBe('accepted');
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z'); // interaction state also flows through Projection

    const managerFeed = await service.getFeed({ actor: managerA });
    const receptionistFeed = await service.getFeed({ actor: receptionistA });

    const managerOpp = managerFeed.opportunities_by_family['opportunity.capacity']![0];
    const receptionistOpp = receptionistFeed.opportunities_by_family['opportunity.capacity']![0];

    expect(managerOpp.my_interaction_state.interaction_type).toBe('DISMISSED');
    expect(receptionistOpp.my_interaction_state.interaction_type).toBe('NONE'); // untouched by manager's dismissal
  });
});
