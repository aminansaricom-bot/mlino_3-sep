import { prisma } from '../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../foundation/event-admission/event-admission.service';
import { EventCandidateDTO } from '../../shared-contracts/types';

const ORG = 'org-test-1';

async function seedCoreEntity(id: string, org = ORG) {
  await prisma.coreEntity.create({
    data: { id, organizationId: org, entityType: 'Individual', domainTag: 'test.patient' },
  });
}

function baseCandidate(overrides: Partial<EventCandidateDTO> = {}): EventCandidateDTO {
  return {
    producer_id: 'value-engine:capacity',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG,
    core_entity_refs: [],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [],
      materiality_score: 0.8,
      materiality_basis: 'unused capacity ratio 80% above historical average',
      intended_audience: 'owner_manager',
    },
    producer_timestamp: new Date().toISOString(),
    confidence_level: 1.0,
    kernel_version: 'v1.3',
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

describe('FP-01 — Event Admission (IC-13)', () => {
  it('accepts a valid Occurrence candidate and persists it', async () => {
    await seedCoreEntity('entity-1');
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ core_entity_refs: ['entity-1'] }),
    );
    expect(result.admission_result).toBe('accepted');
    expect(result.event_id).toBeDefined();
    expect(result.opportunity_correlation_id).toBe(result.event_id);

    const row = await prisma.eventLog.findUnique({ where: { id: result.event_id } });
    expect(row).not.toBeNull();
    expect(row?.domainTag).toBe('opportunity.capacity');
    expect(row?.producerType).toBe('internal');
  });

  it('rejects a candidate from an unregistered producer', async () => {
    await seedCoreEntity('entity-2');
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ producer_id: 'value-engine:not-registered', core_entity_refs: ['entity-2'] }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PRODUCER_NOT_REGISTERED');

    const obs = await prisma.admissionObservability.findMany({});
    expect(obs.length).toBe(1);
    expect(obs[0].rejectionReason).toBe('PRODUCER_NOT_REGISTERED');
  });

  it('rejects a candidate whose domain_tag is not allowed for that producer', async () => {
    await seedCoreEntity('entity-3');
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        producer_id: 'value-engine:capacity',
        domain_tag: 'opportunity.followup',
        core_entity_refs: ['entity-3'],
      }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('DOMAIN_TAG_NOT_ALLOWED_FOR_PRODUCER');
  });

  it('rejects a candidate whose core_entity_refs do not resolve', async () => {
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ core_entity_refs: ['does-not-exist'] }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('CORE_ENTITY_REF_UNRESOLVED');
  });

  it('is idempotent — resubmitting the identical candidate does not create a duplicate Occurrence', async () => {
    await seedCoreEntity('entity-4');
    const candidate = baseCandidate({ core_entity_refs: ['entity-4'] });
    const first = await eventAdmissionService.submitEventCandidate(candidate);
    const second = await eventAdmissionService.submitEventCandidate(candidate);

    expect(first.admission_result).toBe('accepted');
    expect(second.admission_result).toBe('accepted');
    expect(second.event_id).toBe(first.event_id);

    const count = await prisma.eventLog.count({ where: { domainTag: 'opportunity.capacity' } });
    expect(count).toBe(1);
  });

  it('accepts a valid Amendment referencing an existing Opportunity', async () => {
    await seedCoreEntity('entity-5');
    const occurrence = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ core_entity_refs: ['entity-5'] }),
    );
    const amendment = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        core_entity_refs: ['entity-5'],
        event_type: 'AMENDMENT',
        opportunity_correlation_id: occurrence.opportunity_correlation_id,
        payload: {
          evidence_refs: [],
          materiality_score: 0.9,
          materiality_basis: 'updated: capacity gap widened',
          intended_audience: 'owner_manager',
        },
      }),
    );
    expect(amendment.admission_result).toBe('accepted');
    expect(amendment.opportunity_correlation_id).toBe(occurrence.opportunity_correlation_id);

    const row = await prisma.eventLog.findUnique({ where: { id: amendment.event_id } });
    expect(row?.amendsEventId).toBe(occurrence.opportunity_correlation_id);
  });

  it('rejects an Amendment referencing a non-existent Opportunity', async () => {
    await seedCoreEntity('entity-6');
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        core_entity_refs: ['entity-6'],
        event_type: 'AMENDMENT',
        opportunity_correlation_id: 'nonexistent-id',
      }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('OPPORTUNITY_CORRELATION_ID_INVALID');
  });

  it('never writes a partial row on rejection (no event_log row created)', async () => {
    const before = await prisma.eventLog.count({});
    await eventAdmissionService.submitEventCandidate(
      baseCandidate({ core_entity_refs: ['unresolved-entity'] }),
    );
    const after = await prisma.eventLog.count({});
    expect(after).toBe(before);
  });
});
