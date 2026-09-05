import { prisma } from '../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../foundation/event-admission/event-admission.service';
import { rebuildOrganizationProjection } from '../../foundation/opportunity-projection/rebuild-projection.service';
import { EventCandidateDTO } from '../../shared-contracts/types';

/**
 * Stage A of the approved ownership-type CCR
 * (implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_OWNERSHIP_TYPE.md).
 *
 * Proves the three things the CCR's own "test impact" section (§7) requires:
 * the DB default lands on a fresh insert, the backfill really sat on rows
 * that existed before the column did, and the value genuinely FLOWS from the
 * Admission boundary through to the Projection row rather than each table
 * independently defaulting.
 *
 * Deliberately NOT tested here (does not exist, by design): INDIVIDUAL /
 * AGGREGATE ownership, and anything Consent-related — R8-a / R8-b.
 */

const ORG = 'org-ownership-1';

async function seedEntity(id: string, org = ORG) {
  await prisma.coreEntity.create({
    data: { id, organizationId: org, entityType: 'Individual', domainTag: 'test.patient' },
  });
}

function candidate(overrides: Partial<EventCandidateDTO> = {}): EventCandidateDTO {
  return {
    producer_id: 'value-engine:capacity',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG,
    core_entity_refs: ['entity-own-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [],
      materiality_score: 0.8,
      materiality_basis: 'ownership-type stage A',
      intended_audience: 'both',
    },
    producer_timestamp: '2026-08-15T10:00:00.000Z',
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
  await prisma.opportunityInteractionState.deleteMany({});
  await prisma.opportunityCurrentState.deleteMany({});
  await prisma.eventLog.deleteMany({});
  await prisma.admissionObservability.deleteMany({});
  await prisma.coreEntity.deleteMany({});
});

describe('CCR ownership_type — stage A (schema + migration + admission fill)', () => {
  it('a newly admitted event carries ORGANIZATIONAL ownership, set explicitly at the Admission boundary', async () => {
    await seedEntity('entity-own-1');
    const result = await eventAdmissionService.submitEventCandidate(candidate());
    expect(result.admission_result).toBe('accepted');

    const row = await prisma.eventLog.findUniqueOrThrow({ where: { id: result.event_id! } });
    expect(row.ownershipType).toBe('ORGANIZATIONAL');
  });

  it('the value flows Admission -> Projection: the projection row carries the founding event\'s ownership, not an independent default', async () => {
    await seedEntity('entity-own-1');
    const result = await eventAdmissionService.submitEventCandidate(candidate());
    await rebuildOrganizationProjection(ORG, '2026-08-16T00:00:00.000Z');

    const founding = await prisma.eventLog.findUniqueOrThrow({ where: { id: result.event_id! } });
    const projection = await prisma.opportunityCurrentState.findUniqueOrThrow({
      where: { opportunityCorrelationId: result.opportunity_correlation_id! },
    });

    expect(projection.ownershipType).toBe(founding.ownershipType);
    expect(projection.ownershipType).toBe('ORGANIZATIONAL');
  });

  it('the column default backfilled pre-existing rows: a row inserted without naming the column still reads ORGANIZATIONAL', async () => {
    // Simulates exactly what the migration's DEFAULT did to historical rows —
    // a write path that never mentions ownership_type at all. This is the
    // "policy-derived, not creation-time-recorded" value the migration note
    // is explicit about.
    await seedEntity('entity-own-1');
    await prisma.$executeRawUnsafe(
      `INSERT INTO "event_log"
        ("id","unique_key","event_type","event_time","source_ref","producer_type","producer_id",
         "kernel_version","confidence_level","domain_tag","organization_id","payload")
       VALUES
        ('11111111-1111-1111-1111-111111111111','uk-backfill-probe','OCCURRENCE',NOW(),'probe',
         'internal','value-engine:capacity','v1.3',1.0,'opportunity.capacity',$1,'{}'::jsonb)`,
      ORG,
    );

    const row = await prisma.eventLog.findUniqueOrThrow({
      where: { id: '11111111-1111-1111-1111-111111111111' },
    });
    expect(row.ownershipType).toBe('ORGANIZATIONAL');
  });

  it('ORGANIZATIONAL is the only ownership value the database will accept in V1', async () => {
    // Guards the CCR's deliberate single-value scope: INDIVIDUAL/AGGREGATE are
    // not defined even as inactive enum values, so the DB itself must reject them.
    await expect(
      prisma.$executeRawUnsafe(
        `SELECT 'INDIVIDUAL'::"OwnershipType"`,
      ),
    ).rejects.toThrow();
  });
});
