import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { rebuildOrganizationProjection } from '../../../foundation/opportunity-projection/rebuild-projection.service';
import { EventCandidateDTO } from '../../../shared-contracts/types';

const ORG_A = 'org-projection-A';
const ORG_B = 'org-projection-B';

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
    core_entity_refs: ['entity-proj-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [{ event_id: 'ev-source-1' }],
      materiality_score: 0.8,
      materiality_basis: 'initial',
      intended_audience: 'owner_manager',
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

describe('FP-02 Core Projection — rebuildOrganizationProjection (real Postgres)', () => {
  it('OCCURRENCE produces an ACTIVE OpportunityCurrentState row', async () => {
    await seedEntity('entity-proj-1');
    const result = await eventAdmissionService.submitEventCandidate(occurrence());
    expect(result.admission_result).toBe('accepted');

    const rebuild = await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    expect(rebuild.opportunitiesComputed).toBe(1);

    const row = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: result.opportunity_correlation_id! },
    });
    expect(row?.state).toBe('ACTIVE');
    expect(row?.materialityScore).toBe(0.8);
    expect(row?.materialityBasis).toBe('initial');
  });

  it('an explicit Amendment updates only its own target chain, never another Opportunity', async () => {
    await seedEntity('entity-proj-2a');
    await seedEntity('entity-proj-2b');
    const occ1 = await eventAdmissionService.submitEventCandidate(
      occurrence({ core_entity_refs: ['entity-proj-2a'] }),
    );
    const occ2 = await eventAdmissionService.submitEventCandidate(
      occurrence({
        core_entity_refs: ['entity-proj-2b'],
        producer_timestamp: '2026-08-15T10:05:00.000Z',
        payload: {
          evidence_refs: [],
          materiality_score: 0.4,
          materiality_basis: 'other situation',
          intended_audience: 'owner_manager',
        },
      }),
    );

    await eventAdmissionService.submitEventCandidate(
      occurrence({
        core_entity_refs: ['entity-proj-2a'],
        event_type: 'AMENDMENT',
        opportunity_correlation_id: occ1.opportunity_correlation_id,
        producer_timestamp: '2026-08-15T11:00:00.000Z',
        payload: {
          evidence_refs: [{ event_id: 'ev-source-1-updated' }],
          materiality_score: 0.95,
          materiality_basis: 'amended',
          intended_audience: 'owner_manager',
        },
      }),
    );

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const row1 = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: occ1.opportunity_correlation_id! },
    });
    const row2 = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: occ2.opportunity_correlation_id! },
    });
    expect(row1?.materialityScore).toBe(0.95);
    expect(row1?.materialityBasis).toBe('amended');
    expect(row2?.materialityScore).toBe(0.4); // untouched
    expect(row2?.materialityBasis).toBe('other situation');
  });

  it('RETRACTION forces state to EXPIRED', async () => {
    await seedEntity('entity-proj-3');
    const occ = await eventAdmissionService.submitEventCandidate(
      occurrence({ core_entity_refs: ['entity-proj-3'] }),
    );
    await eventAdmissionService.submitEventCandidate(
      occurrence({
        core_entity_refs: ['entity-proj-3'],
        event_type: 'RETRACTION',
        opportunity_correlation_id: occ.opportunity_correlation_id,
        producer_timestamp: '2026-08-15T12:00:00.000Z',
        payload: {
          evidence_refs: [],
          materiality_score: 0.8,
          materiality_basis: 'retracted',
          intended_audience: 'owner_manager',
        },
      }),
    );

    await rebuildOrganizationProjection(ORG_A, '2026-08-15T13:00:00.000Z'); // well before expires_at
    const row = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: occ.opportunity_correlation_id! },
    });
    expect(row?.state).toBe('EXPIRED');
  });

  it('expiry is driven purely by as_of_time, never a hidden clock', async () => {
    await seedEntity('entity-proj-4');
    const occ = await eventAdmissionService.submitEventCandidate(
      occurrence({ core_entity_refs: ['entity-proj-4'] }), // expires_at: 2026-08-20T23:59:59Z
    );

    const before = await rebuildOrganizationProjection(ORG_A, '2026-08-18T00:00:00.000Z');
    const rowBefore = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: occ.opportunity_correlation_id! },
    });
    expect(rowBefore?.state).toBe('ACTIVE');
    expect(before.opportunitiesComputed).toBe(1);

    await rebuildOrganizationProjection(ORG_A, '2026-08-22T00:00:00.000Z');
    const rowAfter = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: occ.opportunity_correlation_id! },
    });
    expect(rowAfter?.state).toBe('EXPIRED');
  });

  it('replay is deterministic: two rebuilds with the same event history and as_of_time produce identical rows', async () => {
    await seedEntity('entity-proj-5');
    await eventAdmissionService.submitEventCandidate(occurrence({ core_entity_refs: ['entity-proj-5'] }));

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const first = await prisma.opportunityCurrentState.findMany({ where: { organizationId: ORG_A } });

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const second = await prisma.opportunityCurrentState.findMany({ where: { organizationId: ORG_A } });

    expect(second).toEqual(
      first.map((r) => ({ ...r, lastComputedAt: expect.any(Date) })),
    );
    expect(second.length).toBe(1);
  });

  it('rebuild is idempotent: repeated rebuilds never duplicate rows', async () => {
    await seedEntity('entity-proj-6');
    await eventAdmissionService.submitEventCandidate(occurrence({ core_entity_refs: ['entity-proj-6'] }));

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const count = await prisma.opportunityCurrentState.count({ where: { organizationId: ORG_A } });
    expect(count).toBe(1);
  });

  it('two OCCURRENCEs sharing the same situation_key remain two fully independent Projections — NO merge', async () => {
    await seedEntity('entity-proj-7');
    const key = 'value-engine:capacity:org-projection-A:resource-x:2026-08-20';
    const first = await eventAdmissionService.submitEventCandidate(
      occurrence({ core_entity_refs: ['entity-proj-7'], situation_key: key }),
    );
    const second = await eventAdmissionService.submitEventCandidate(
      occurrence({
        core_entity_refs: ['entity-proj-7'],
        situation_key: key,
        producer_timestamp: '2026-08-15T10:00:01.000Z', // distinct payload -> distinct unique_key -> distinct row
        payload: {
          evidence_refs: [],
          materiality_score: 0.5,
          materiality_basis: 'race duplicate',
          intended_audience: 'owner_manager',
        },
      }),
    );
    expect(first.event_id).not.toBe(second.event_id);

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const rows = await prisma.opportunityCurrentState.findMany({ where: { organizationId: ORG_A } });
    expect(rows.length).toBe(2);
    expect(new Set(rows.map((r) => r.opportunityCorrelationId)).size).toBe(2);
  });

  it('interaction events never mutate business content, and business events never appear in OpportunityInteractionState', async () => {
    await seedEntity('entity-proj-8');
    const occ = await eventAdmissionService.submitEventCandidate(
      occurrence({ core_entity_refs: ['entity-proj-8'] }),
    );
    await eventAdmissionService.submitEventCandidate({
      producer_id: 'interaction-layer:ui',
      domain_tag: 'opportunity.interaction',
      organization_id: ORG_A,
      core_entity_refs: [],
      event_type: 'AMENDMENT',
      opportunity_correlation_id: occ.opportunity_correlation_id,
      payload: { interaction_type: 'ACKNOWLEDGED', actor_id: 'actor-proj-1' },
      producer_timestamp: '2026-08-15T11:00:00.000Z',
      confidence_level: 1,
      kernel_version: 'v1.3',
    });

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const row = await prisma.opportunityCurrentState.findUnique({
      where: { opportunityCorrelationId: occ.opportunity_correlation_id! },
    });
    expect(row?.materialityBasis).toBe('initial'); // untouched by the interaction event
    expect(row?.latestEventId).toBe(occ.event_id); // business latest_event_id unaffected by interaction

    const interactionRow = await prisma.opportunityInteractionState.findUnique({
      where: { opportunityCorrelationId_actorId: { opportunityCorrelationId: occ.opportunity_correlation_id!, actorId: 'actor-proj-1' } },
    });
    expect(interactionRow?.interactionType).toBe('ACKNOWLEDGED');
  });

  it('actor-state isolation: two actors on the same Opportunity have independent interaction rows', async () => {
    await seedEntity('entity-proj-9');
    const occ = await eventAdmissionService.submitEventCandidate(
      occurrence({ core_entity_refs: ['entity-proj-9'] }),
    );
    for (const [actorId, type] of [
      ['actor-A', 'DISMISSED'],
      ['actor-B', 'SEEN'],
    ] as const) {
      await eventAdmissionService.submitEventCandidate({
        producer_id: 'interaction-layer:ui',
        domain_tag: 'opportunity.interaction',
        organization_id: ORG_A,
        core_entity_refs: [],
        event_type: 'AMENDMENT',
        opportunity_correlation_id: occ.opportunity_correlation_id,
        payload: { interaction_type: type, actor_id: actorId },
        producer_timestamp: '2026-08-15T11:00:00.000Z',
        confidence_level: 1,
        kernel_version: 'v1.3',
      });
    }

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const rows = await prisma.opportunityInteractionState.findMany({
      where: { opportunityCorrelationId: occ.opportunity_correlation_id! },
    });
    expect(rows.length).toBe(2);
    expect(rows.find((r) => r.actorId === 'actor-A')?.interactionType).toBe('DISMISSED');
    expect(rows.find((r) => r.actorId === 'actor-B')?.interactionType).toBe('SEEN');
  });

  it('tenant isolation: rebuilding one organization never touches another organization\'s Projection rows', async () => {
    await seedEntity('entity-proj-10a', ORG_A);
    await seedEntity('entity-proj-10b', ORG_B);
    await eventAdmissionService.submitEventCandidate(occurrence({ core_entity_refs: ['entity-proj-10a'] }));
    await eventAdmissionService.submitEventCandidate(
      occurrence({ organization_id: ORG_B, core_entity_refs: ['entity-proj-10b'] }),
    );

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const orgBRows = await prisma.opportunityCurrentState.count({ where: { organizationId: ORG_B } });
    expect(orgBRows).toBe(0); // ORG_B was never rebuilt, so it has no rows at all yet — and ORG_A's rebuild must not have created any

    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');
    const orgARows = await prisma.opportunityCurrentState.findMany({ where: { organizationId: ORG_A } });
    expect(orgARows.length).toBe(1); // unaffected by rebuilding ORG_B afterwards

    await prisma.opportunityCurrentState.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.eventLog.deleteMany({ where: { organizationId: ORG_B } });
    await prisma.coreEntity.deleteMany({ where: { organizationId: ORG_B } });
  });

  it('architecture invariant: rebuild-projection.service.ts never writes event_log', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../../foundation/opportunity-projection/rebuild-projection.service.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/prisma\.eventLog\.(create|update|upsert|delete)/);
  });

  it('architecture invariant: compute-projection.ts is pure (no Prisma Client usage, no Date.now/new Date() clock reads)', () => {
    const raw = require('fs').readFileSync(
      require.resolve('../../../foundation/opportunity-projection/compute-projection.ts'),
      'utf-8',
    );
    // Strip comments first — doc comments here legitimately describe the
    // invariant in prose (e.g. "zero use of Date.now()"), which must not
    // itself be mistaken for a real clock call.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // A type-only import of generated Prisma types (`import type { EventLog }`) carries no
    // runtime dependency and is fine — what must never appear is an actual Client import/usage.
    expect(code).not.toMatch(/from ['"]\.\.\/prisma-client['"]/);
    expect(code).not.toMatch(/new PrismaClient\(/);
    expect(code).not.toMatch(/\bprisma\./);
    expect(code).not.toMatch(/Date\.now\(\)|new Date\(\)(?!\.)/);
  });
});
