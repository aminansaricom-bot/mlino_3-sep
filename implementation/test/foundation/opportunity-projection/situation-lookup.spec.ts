import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { rebuildOrganizationProjection } from '../../../foundation/opportunity-projection/rebuild-projection.service';
import { SituationLookupService } from '../../../foundation/opportunity-projection/situation-lookup.service';
import { EventCandidateDTO } from '../../../shared-contracts/types';

const ORG_A = 'org-lookup-A';
const ORG_B = 'org-lookup-B';

async function seedEntity(id: string, org = ORG_A) {
  await prisma.coreEntity.create({
    data: { id, organizationId: org, entityType: 'Individual', domainTag: 'test.resource' },
  });
}

function occurrence(overrides: Partial<EventCandidateDTO> = {}): EventCandidateDTO {
  return {
    producer_id: 'value-engine:capacity',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG_A,
    core_entity_refs: ['entity-lookup-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [],
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

describe('FP-02 — SituationLookupService (real Postgres)', () => {
  it('found: false when no event carries this situation_key at all', async () => {
    const service = new SituationLookupService();
    const result = await service.getSituationState(ORG_A, 'opportunity.capacity', 'situation-does-not-exist');
    expect(result).toEqual({ found: false });
  });

  it('found: false when the founding OCCURRENCE exists but Projection has not been rebuilt yet', async () => {
    await seedEntity('entity-lookup-1');
    await eventAdmissionService.submitEventCandidate(occurrence({ situation_key: 'sk-not-yet-projected' }));
    // Deliberately do NOT call rebuildOrganizationProjection.
    const service = new SituationLookupService();
    const result = await service.getSituationState(ORG_A, 'opportunity.capacity', 'sk-not-yet-projected');
    expect(result).toEqual({ found: false }); // reflects Projection state, not raw event_log
  });

  it('found: true, state ACTIVE, for a projected OCCURRENCE within its expiry window', async () => {
    await seedEntity('entity-lookup-1');
    const occ = await eventAdmissionService.submitEventCandidate(occurrence({ situation_key: 'sk-active' }));
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const service = new SituationLookupService();
    const result = await service.getSituationState(ORG_A, 'opportunity.capacity', 'sk-active');
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.opportunity_correlation_id).toBe(occ.opportunity_correlation_id);
      expect(result.latest_event_id).toBe(occ.event_id);
      expect(result.state).toBe('ACTIVE');
      expect(result.as_of).toEqual(expect.any(String));
    }
  });

  it('found: true, state EXPIRED, once as_of_time is past the Opportunity\'s expiry', async () => {
    await seedEntity('entity-lookup-1');
    await eventAdmissionService.submitEventCandidate(occurrence({ situation_key: 'sk-expired' })); // expires_at 2026-08-20
    await rebuildOrganizationProjection(ORG_A, '2026-08-22T00:00:00.000Z'); // rebuilt after expiry

    const service = new SituationLookupService();
    const result = await service.getSituationState(ORG_A, 'opportunity.capacity', 'sk-expired');
    expect(result.found).toBe(true);
    if (result.found) expect(result.state).toBe('EXPIRED');
  });

  it('as_of reflects the Projection\'s lastComputedAt (staleness marker), not wall-clock read time', async () => {
    await seedEntity('entity-lookup-1');
    await eventAdmissionService.submitEventCandidate(occurrence({ situation_key: 'sk-staleness' }));
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const row = await prisma.opportunityCurrentState.findFirst({ where: { organizationId: ORG_A } });
    const service = new SituationLookupService();
    const result = await service.getSituationState(ORG_A, 'opportunity.capacity', 'sk-staleness');
    expect(result.found).toBe(true);
    if (result.found) expect(result.as_of).toBe(row!.lastComputedAt.toISOString());
  });

  it('multi-match (legitimate Race under CR-03 no-merge): two independent OCCURRENCEs sharing situation_key deterministically report the one with the more recent latest event, without merging either row', async () => {
    await seedEntity('entity-lookup-2a');
    await seedEntity('entity-lookup-2b');
    const sharedKey = 'sk-race-shared';

    const earlier = await eventAdmissionService.submitEventCandidate(
      occurrence({
        core_entity_refs: ['entity-lookup-2a'],
        situation_key: sharedKey,
        producer_timestamp: '2026-08-15T10:00:00.000Z',
      }),
    );
    const later = await eventAdmissionService.submitEventCandidate(
      occurrence({
        core_entity_refs: ['entity-lookup-2b'],
        situation_key: sharedKey,
        producer_timestamp: '2026-08-15T10:00:05.000Z',
        payload: {
          evidence_refs: [],
          materiality_score: 0.5,
          materiality_basis: 'race duplicate',
          intended_audience: 'both',
        },
      }),
    );
    expect(earlier.event_id).not.toBe(later.event_id);

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    // Both rows exist independently — no merge (CR-03 still holds).
    const rows = await prisma.opportunityCurrentState.findMany({ where: { organizationId: ORG_A } });
    expect(rows.length).toBe(2);

    const service = new SituationLookupService();
    const result = await service.getSituationState(ORG_A, 'opportunity.capacity', sharedKey);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.opportunity_correlation_id).toBe(later.opportunity_correlation_id); // the more recent one
    }

    // Confirm the disambiguation is purely advisory — the earlier row is still fully intact and independently readable.
    const earlierRow = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: earlier.opportunity_correlation_id! },
    });
    expect(earlierRow).not.toBeNull();
  });

  it('tenant isolation: the same situation_key in a different organization never matches', async () => {
    await seedEntity('entity-lookup-1', ORG_A);
    await seedEntity('entity-lookup-b1', ORG_B);
    await eventAdmissionService.submitEventCandidate(occurrence({ situation_key: 'sk-shared-across-orgs' }));
    await eventAdmissionService.submitEventCandidate(
      occurrence({ organization_id: ORG_B, core_entity_refs: ['entity-lookup-b1'], situation_key: 'sk-shared-across-orgs' }),
    );
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

    const service = new SituationLookupService();
    const resultA = await service.getSituationState(ORG_A, 'opportunity.capacity', 'sk-shared-across-orgs');
    const resultB = await service.getSituationState(ORG_B, 'opportunity.capacity', 'sk-shared-across-orgs');
    expect(resultA.found).toBe(true);
    expect(resultB.found).toBe(true);
    if (resultA.found && resultB.found) {
      expect(resultA.opportunity_correlation_id).not.toBe(resultB.opportunity_correlation_id);
    }

    await prisma.opportunityCurrentState.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.eventLog.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.coreEntity.deleteMany({ where: { organizationId: ORG_B } });
  });

  it('architecture invariant: situation-lookup.service.ts never writes to event_log or opportunity_current_state', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../../foundation/opportunity-projection/situation-lookup.service.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/prisma\.(eventLog|opportunityCurrentState|opportunityInteractionState)\.(create|update|upsert|delete)/);
  });

  it('architecture invariant: situation-lookup.service.ts never calls submitEventCandidate (Lookup ≠ decision, CR-04)', () => {
    const raw = require('fs').readFileSync(
      require.resolve('../../../foundation/opportunity-projection/situation-lookup.service.ts'),
      'utf-8',
    );
    // Strip comments first — the file's own doc-comments legitimately describe this
    // invariant in prose ("NEVER calls submitEventCandidate"), which must not itself
    // be mistaken for a real call.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/submitEventCandidate/);
  });
});
