import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { CancellationDetectorService } from '../../../value-engines/cancellation/cancellation-detector.service';
import { InMemoryCancellationRepository } from '../../../value-engines/cancellation/cancellation-repository';
import { SituationLookupService } from '../../../foundation/opportunity-projection/situation-lookup.service';
import { rebuildOrganizationProjection } from '../../../foundation/opportunity-projection/rebuild-projection.service';

const ORG = 'org-cancellation-test';

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

async function seedEntity(id: string) {
  await prisma.coreEntity.create({
    data: { id, organizationId: ORG, entityType: 'Individual', domainTag: 'test.patient' },
  });
}

describe('F-02 — Cancellation/No-show Intelligence detector', () => {
  it('happy path: an unrebooked no-show produces an accepted Event Candidate', async () => {
    await seedEntity('patient-1');
    const repo = new InMemoryCancellationRepository([
      {
        eventId: 'ev-1',
        organizationId: ORG,
        entityRef: 'patient-1',
        appointmentId: 'appt-1',
        kind: 'noshow',
        occurredAt: '2026-08-20T10:00:00.000Z',
        wasRebooked: false,
      },
    ]);
    const detector = new CancellationDetectorService(repo, eventAdmissionService, new SituationLookupService());
    const produced = await detector.runDetectionCycle(ORG);

    expect(produced.length).toBe(1);
    const rows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.cancellation' } });
    expect(rows.length).toBe(1);
  });

  it('boundary: a cancellation that was immediately rebooked produces NO candidate', async () => {
    await seedEntity('patient-2');
    const repo = new InMemoryCancellationRepository([
      {
        eventId: 'ev-2',
        organizationId: ORG,
        entityRef: 'patient-2',
        appointmentId: 'appt-2',
        kind: 'cancelled',
        occurredAt: '2026-08-20T11:00:00.000Z',
        wasRebooked: true,
      },
    ]);
    const detector = new CancellationDetectorService(repo, eventAdmissionService, new SituationLookupService());
    const produced = await detector.runDetectionCycle(ORG);

    expect(produced.length).toBe(0);
    const rows = await prisma.eventLog.count({ where: { domainTag: 'opportunity.cancellation' } });
    expect(rows).toBe(0);
  });

  it('architecture invariant: no predictive/ML dependency is imported or invoked (comments documenting the prohibition are fine)', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../../value-engines/cancellation/cancellation-detector.service.ts'),
      'utf-8',
    );
    const codeOnly = source
      .split('\n')
      .filter((line: string) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    // No ML/AI library import, no model inference call — only deterministic branching.
    expect(codeOnly).not.toMatch(/import .*(tensorflow|onnx|openai|@ml|scikit)/i);
    expect(codeOnly).not.toMatch(/\.predict\(|\.classify\(|model\.run/i);
  });

  it('CONTRACT RESOLUTION R5: situation_key is stable per appointmentId and independent of kind/wasRebooked/occurredAt', async () => {
    await seedEntity('patient-r5');
    const repo = new InMemoryCancellationRepository([
      {
        eventId: 'ev-r5-1',
        organizationId: ORG,
        entityRef: 'patient-r5',
        appointmentId: 'appt-r5-1',
        kind: 'noshow',
        occurredAt: '2026-08-20T10:00:00.000Z',
        wasRebooked: false,
      },
    ]);
    await new CancellationDetectorService(repo, eventAdmissionService, new SituationLookupService()).runDetectionCycle(ORG);
    const row = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.cancellation', organizationId: ORG } });
    const { computeSituationKey } = require('../../../foundation/event-admission/situation-key');
    expect(row?.situationKey).toBe(computeSituationKey('value-engine:cancellation', [ORG, 'appt-r5-1']));
  });

  it('CONTRACT RESOLUTION R5: a different appointmentId for the same patient produces a different situation_key', async () => {
    await seedEntity('patient-r5b');
    const repo = new InMemoryCancellationRepository([
      { eventId: 'ev-r5-2', organizationId: ORG, entityRef: 'patient-r5b', appointmentId: 'appt-r5-2', kind: 'cancelled', occurredAt: '2026-08-20T10:00:00.000Z', wasRebooked: false },
      { eventId: 'ev-r5-3', organizationId: ORG, entityRef: 'patient-r5b', appointmentId: 'appt-r5-3', kind: 'cancelled', occurredAt: '2026-08-21T10:00:00.000Z', wasRebooked: false },
    ]);
    await new CancellationDetectorService(repo, eventAdmissionService, new SituationLookupService()).runDetectionCycle(ORG);
    const rows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.cancellation', organizationId: ORG } });
    expect(rows.length).toBe(2);
    expect(rows[0].situationKey).not.toBe(rows[1].situationKey);
  });

  describe('SituationLookupInterface wiring (R5_STABLE_SITUATION_IDENTITY_SPEC.md §F-02)', () => {
    it('a re-detection of the SAME unrebooked appointment, once Projection is materialized, is submitted as an AMENDMENT — never a second OCCURRENCE (no expires_at, so ACTIVE persists until explicitly retracted)', async () => {
      await seedEntity('patient-lookup-1');
      const situationLookup = new SituationLookupService();

      const repo1 = new InMemoryCancellationRepository([
        { eventId: 'ev-lk-1a', organizationId: ORG, entityRef: 'patient-lookup-1', appointmentId: 'appt-lookup-1', kind: 'noshow', occurredAt: '2026-09-01T10:00:00.000Z', wasRebooked: false },
      ]);
      await new CancellationDetectorService(repo1, eventAdmissionService, situationLookup).runDetectionCycle(ORG);
      await rebuildOrganizationProjection(ORG, '2026-09-02T00:00:00.000Z');

      const first = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.cancellation', organizationId: ORG, eventType: 'OCCURRENCE' } });
      expect(first).not.toBeNull();

      // Second cycle sees the SAME appointment still unprocessed/unrebooked (a real re-run).
      const repo2 = new InMemoryCancellationRepository([
        { eventId: 'ev-lk-1a', organizationId: ORG, entityRef: 'patient-lookup-1', appointmentId: 'appt-lookup-1', kind: 'noshow', occurredAt: '2026-09-01T10:00:00.000Z', wasRebooked: false },
      ]);
      await new CancellationDetectorService(repo2, eventAdmissionService, situationLookup).runDetectionCycle(ORG);

      const allRows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.cancellation', organizationId: ORG } });
      const occurrences = allRows.filter((r) => r.eventType === 'OCCURRENCE');
      const amendments = allRows.filter((r) => r.eventType === 'AMENDMENT');
      expect(occurrences.length).toBe(1);
      expect(amendments.length).toBe(1);
      expect(amendments[0].amendsEventId).toBe(first!.id);
      expect(amendments[0].situationKey).toBeNull(); // OCCURRENCE-only field
    });

    it('a different appointmentId for the same patient, even after Projection is rebuilt, always submits its own independent OCCURRENCE', async () => {
      await seedEntity('patient-lookup-2');
      const situationLookup = new SituationLookupService();

      const repo1 = new InMemoryCancellationRepository([
        { eventId: 'ev-lk-2a', organizationId: ORG, entityRef: 'patient-lookup-2', appointmentId: 'appt-lookup-2a', kind: 'cancelled', occurredAt: '2026-09-03T10:00:00.000Z', wasRebooked: false },
      ]);
      await new CancellationDetectorService(repo1, eventAdmissionService, situationLookup).runDetectionCycle(ORG);
      await rebuildOrganizationProjection(ORG, '2026-09-04T00:00:00.000Z');

      const repo2 = new InMemoryCancellationRepository([
        { eventId: 'ev-lk-2b', organizationId: ORG, entityRef: 'patient-lookup-2', appointmentId: 'appt-lookup-2b', kind: 'cancelled', occurredAt: '2026-09-05T10:00:00.000Z', wasRebooked: false },
      ]);
      await new CancellationDetectorService(repo2, eventAdmissionService, situationLookup).runDetectionCycle(ORG);

      const rows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.cancellation', organizationId: ORG } });
      expect(rows.filter((r) => r.eventType === 'OCCURRENCE').length).toBe(2); // different situation_key, never an AMENDMENT of each other
    });
  });
});
