import { prisma } from '../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../foundation/event-admission/event-admission.service';
import { EventCandidateDTO } from '../../shared-contracts/types';

/**
 * REMEDIATION R2 (malformed IC-13 input matrix) + R3 (invalid Amendment
 * target integrity). All negative tests here must fail closed with a
 * `RejectionReasonCode`, never an uncaught exception.
 */
const ORG = 'org-validation-test';
const ORG_OTHER = 'org-validation-other';

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
    core_entity_refs: ['entity-valid'],
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
  } as EventCandidateDTO;
}

beforeAll(async () => {
  await seedV1CoreProducerRegistry();
  await seedCoreEntity('entity-valid', ORG);
  await seedCoreEntity('entity-valid-other', ORG_OTHER);
});

afterAll(async () => {
  await prisma.eventLog.deleteMany({ where: { organizationId: { in: [ORG, ORG_OTHER] } } });
  await prisma.admissionObservability.deleteMany({ where: { organizationId: { in: [ORG, ORG_OTHER] } } });
  await prisma.coreEntity.deleteMany({ where: { organizationId: { in: [ORG, ORG_OTHER] } } });
  await prisma.$disconnect();
});

describe('R2 — malformed IC-13 input matrix (fail-closed, never an uncaught exception)', () => {
  it('rejects a missing required payload field (materiality_basis)', async () => {
    const c = baseCandidate({
      payload: {
        evidence_refs: [],
        materiality_score: 0.8,
        intended_audience: 'owner_manager',
      } as any,
    });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects an invalid producer_timestamp (not a parseable date)', async () => {
    const c = baseCandidate({ producer_timestamp: 'not-a-date' as any });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects an invalid intended_audience enum value', async () => {
    const c = baseCandidate({
      payload: {
        evidence_refs: [],
        materiality_score: 0.8,
        materiality_basis: 'x',
        intended_audience: 'everyone' as any,
      },
    });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects an invalid event_type value that bypasses the TypeScript union', async () => {
    const c = baseCandidate({ event_type: 'NOT_A_REAL_TYPE' as any });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects a malformed identifier (non-string producer_id)', async () => {
    const c = baseCandidate({ producer_id: 12345 as any });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects a malformed candidate entirely (payload is a string, not an object)', async () => {
    const c = baseCandidate({ payload: 'not an object' as any });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects a malformed evidence_refs entry (missing event_id)', async () => {
    const c = baseCandidate({
      payload: {
        evidence_refs: [{ description: 'no event_id here' } as any],
        materiality_score: 0.8,
        materiality_basis: 'x',
        intended_audience: 'owner_manager',
      },
    });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects a malformed CoreEntity reference (non-string entry in core_entity_refs)', async () => {
    const c = baseCandidate({ core_entity_refs: [42 as any] });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects confidence_level out of the contract-specified [0,1] bound', async () => {
    const c = baseCandidate({ confidence_level: 1.5 });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects a negative confidence_level', async () => {
    const c = baseCandidate({ confidence_level: -0.1 });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('does NOT reject an out-of-[0,1] materiality_score — no authoritative bound exists (CONTRACT UNDERSPECIFICATION, documented, not invented)', async () => {
    const c = baseCandidate({
      payload: {
        evidence_refs: [],
        materiality_score: 42, // deliberately out of any [0,1]-style range
        materiality_basis: 'no authoritative bound is defined for this field',
        intended_audience: 'owner_manager',
      },
    });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('accepted');
  });

  it('rejects an interaction payload that also carries forbidden detection-only fields', async () => {
    const c = baseCandidate({
      domain_tag: 'opportunity.interaction',
      producer_id: 'interaction-layer:ui',
      payload: {
        interaction_type: 'SEEN',
        actor_id: 'entity-valid',
        materiality_score: 0.5, // forbidden on an interaction payload
      } as any,
    });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('rejects an invalid interaction_type enum value', async () => {
    const c = baseCandidate({
      domain_tag: 'opportunity.interaction',
      producer_id: 'interaction-layer:ui',
      payload: {
        interaction_type: 'MAYBE' as any,
        actor_id: 'entity-valid',
      },
    });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('PAYLOAD_INCOMPLETE');
  });

  it('a fully valid candidate is still accepted (no over-rejection / false positive from the strengthened checks)', async () => {
    const c = baseCandidate({ core_entity_refs: ['entity-valid'] });
    const result = await eventAdmissionService.submitEventCandidate(c);
    expect(result.admission_result).toBe('accepted');
  });
});

describe('R3 — Amendment/Retraction target integrity (fail-closed)', () => {
  it('rejects an Amendment targeting a nonexistent Event', async () => {
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ event_type: 'AMENDMENT', opportunity_correlation_id: 'totally-nonexistent-id' }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('OPPORTUNITY_CORRELATION_ID_INVALID');
  });

  it('rejects an Amendment whose target belongs to a different organization (cross-tenant)', async () => {
    const foreignOccurrence = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ organization_id: ORG_OTHER, core_entity_refs: ['entity-valid-other'] }),
    );
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        organization_id: ORG, // attacker's own org
        event_type: 'AMENDMENT',
        opportunity_correlation_id: foreignOccurrence.opportunity_correlation_id,
      }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('OPPORTUNITY_CORRELATION_ID_INVALID');
  });

  it('rejects an Amendment whose target is itself an Amendment, not a founding Occurrence (unrelated/wrong-type target)', async () => {
    const occurrence = await eventAdmissionService.submitEventCandidate(baseCandidate());
    const firstAmendment = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        event_type: 'AMENDMENT',
        opportunity_correlation_id: occurrence.opportunity_correlation_id,
        payload: {
          evidence_refs: [],
          materiality_score: 0.9,
          materiality_basis: 'first amendment',
          intended_audience: 'owner_manager',
        },
      }),
    );
    // Attempt to target the AMENDMENT's own event_id as if it were a founding Occurrence.
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        event_type: 'AMENDMENT',
        opportunity_correlation_id: firstAmendment.event_id,
        payload: {
          evidence_refs: [],
          materiality_score: 0.95,
          materiality_basis: 'targeting an amendment row directly, not the founding occurrence',
          intended_audience: 'owner_manager',
        },
      }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('OPPORTUNITY_CORRELATION_ID_INVALID');
  });

  it('rejects an Amendment whose domain_tag family does not match its target founding Occurrence (within a detection family)', async () => {
    const capacityOccurrence = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ domain_tag: 'opportunity.capacity', producer_id: 'value-engine:capacity' }),
    );
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        domain_tag: 'opportunity.followup',
        producer_id: 'value-engine:followup',
        event_type: 'AMENDMENT',
        opportunity_correlation_id: capacityOccurrence.opportunity_correlation_id,
        payload: {
          evidence_refs: [],
          materiality_score: 0.5,
          materiality_basis: 'cross-family amendment attempt',
          intended_audience: 'receptionist_coordinator',
        },
      }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('OPPORTUNITY_CORRELATION_ID_INVALID');
  });

  it('rejects a malformed Amendment structure (AMENDMENT with no opportunity_correlation_id at all)', async () => {
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ event_type: 'AMENDMENT', opportunity_correlation_id: undefined }),
    );
    expect(result.admission_result).toBe('rejected');
    expect(result.rejection_reason).toBe('OPPORTUNITY_CORRELATION_ID_INVALID');
  });

  it('preserves valid Amendment behavior: same-family target is accepted', async () => {
    const occurrence = await eventAdmissionService.submitEventCandidate(baseCandidate());
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        event_type: 'AMENDMENT',
        opportunity_correlation_id: occurrence.opportunity_correlation_id,
        payload: {
          evidence_refs: [],
          materiality_score: 0.85,
          materiality_basis: 'valid same-family amendment',
          intended_audience: 'owner_manager',
        },
      }),
    );
    expect(result.admission_result).toBe('accepted');
    expect(result.opportunity_correlation_id).toBe(occurrence.opportunity_correlation_id);
  });

  it('preserves valid Amendment behavior: cross-cutting opportunity.interaction is allowed to target any detection-family founding Occurrence', async () => {
    const occurrence = await eventAdmissionService.submitEventCandidate(
      baseCandidate({ domain_tag: 'opportunity.followup', producer_id: 'value-engine:followup' }),
    );
    const result = await eventAdmissionService.submitEventCandidate(
      baseCandidate({
        domain_tag: 'opportunity.interaction',
        producer_id: 'interaction-layer:ui',
        event_type: 'AMENDMENT',
        opportunity_correlation_id: occurrence.opportunity_correlation_id,
        payload: { interaction_type: 'SEEN', actor_id: 'entity-valid' },
      }),
    );
    expect(result.admission_result).toBe('accepted');
  });
});
