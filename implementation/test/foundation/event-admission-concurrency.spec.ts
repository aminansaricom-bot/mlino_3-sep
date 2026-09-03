import { prisma } from '../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../foundation/event-admission/event-admission.service';
import { EventCandidateDTO } from '../../shared-contracts/types';

/**
 * REMEDIATION R1 — Concurrent Idempotency (Central Review finding).
 *
 * Prior to remediation, FP-01's persistence path was findUnique -> if
 * missing -> create. Two identical concurrent submissions could both
 * observe absence and race to create the same logical Event. This test
 * exercises that race directly against a REAL local Postgres instance (no
 * mocking) — see foundation/event-log/event-log.service.ts for the fix
 * (atomic create + catch on the DB unique-constraint violation).
 */
const ORG = 'org-concurrency-test';
const CONCURRENT_SUBMISSIONS = 20;

function candidate(): EventCandidateDTO {
  return {
    producer_id: 'value-engine:capacity',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG,
    core_entity_refs: ['entity-concurrency-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [],
      materiality_score: 0.75,
      materiality_basis: 'concurrency test — identical candidate submitted in parallel',
      intended_audience: 'owner_manager',
    },
    // Fixed (not regenerated per call) so every concurrent submission hashes
    // to the exact same unique_key — this IS the race condition setup.
    producer_timestamp: '2026-08-15T00:00:00.000Z',
    confidence_level: 1.0,
    kernel_version: 'v1.3',
  };
}

beforeAll(async () => {
  await seedV1CoreProducerRegistry();
  await prisma.coreEntity.create({
    data: {
      id: 'entity-concurrency-1',
      organizationId: ORG,
      entityType: 'Individual',
      domainTag: 'test.patient',
    },
  });
});

afterEach(async () => {
  await prisma.eventLog.deleteMany({ where: { organizationId: ORG } });
  await prisma.admissionObservability.deleteMany({ where: { organizationId: ORG } });
});

afterAll(async () => {
  await prisma.coreEntity.deleteMany({ where: { organizationId: ORG } });
  await prisma.$disconnect();
});

describe('FP-01 — Concurrent Idempotency (real Postgres, no mocks)', () => {
  it(`${CONCURRENT_SUBMISSIONS} truly concurrent identical submissions produce exactly one Event, no uncaught DB errors, tenant boundary intact`, async () => {
    const shared = candidate();

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_SUBMISSIONS }, () =>
        eventAdmissionService.submitEventCandidate(shared),
      ),
    );

    // No unhandled rejection reached this point (Promise.all would have
    // thrown) — i.e. no uncaught DB uniqueness error leaked to the caller.
    expect(results).toHaveLength(CONCURRENT_SUBMISSIONS);

    // All callers received a semantically successful, equivalent admission.
    for (const r of results) {
      expect(r.admission_result).toBe('accepted');
    }

    // All callers reference the identical Event identity.
    const eventIds = new Set(results.map((r) => r.event_id));
    expect(eventIds.size).toBe(1);
    const correlationIds = new Set(results.map((r) => r.opportunity_correlation_id));
    expect(correlationIds.size).toBe(1);

    // Exactly one row actually persisted — the DB, not just the app layer, agrees.
    const rows = await prisma.eventLog.findMany({ where: { organizationId: ORG } });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe([...eventIds][0]);

    // Tenant boundary: nothing leaked into another organization.
    const crossOrgRows = await prisma.eventLog.findMany({
      where: { organizationId: { not: ORG }, domainTag: 'opportunity.capacity' },
    });
    expect(crossOrgRows.filter((r) => r.payload && JSON.stringify(r.payload).includes('concurrency test'))).toHaveLength(0);
  });

  it('mixed concurrent batch: some candidates identical, some distinct — exactly one row per distinct unique_key', async () => {
    const base = candidate();
    const variantA = { ...base }; // identical to base -> same unique_key
    const variantB: EventCandidateDTO = {
      ...base,
      core_entity_refs: ['entity-concurrency-1'],
      payload: {
        ...(base.payload as any),
        materiality_basis: 'a distinct payload -> distinct content hash -> distinct unique_key',
      },
    };

    const submissions = [
      ...Array.from({ length: 10 }, () => variantA),
      ...Array.from({ length: 10 }, () => variantB),
    ];

    const results = await Promise.all(
      submissions.map((c) => eventAdmissionService.submitEventCandidate(c)),
    );

    expect(results.every((r) => r.admission_result === 'accepted')).toBe(true);

    const distinctEventIds = new Set(results.map((r) => r.event_id));
    // Two distinct logical candidates (A and B) -> exactly two distinct Events,
    // regardless of how many identical/duplicate submissions raced for each.
    expect(distinctEventIds.size).toBe(2);

    const rows = await prisma.eventLog.count({ where: { organizationId: ORG } });
    expect(rows).toBe(2);
  });
});
