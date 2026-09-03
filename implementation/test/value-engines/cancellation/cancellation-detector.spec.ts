import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { CancellationDetectorService } from '../../../value-engines/cancellation/cancellation-detector.service';
import { InMemoryCancellationRepository } from '../../../value-engines/cancellation/cancellation-repository';

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
    const detector = new CancellationDetectorService(repo, eventAdmissionService);
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
    const detector = new CancellationDetectorService(repo, eventAdmissionService);
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
    await new CancellationDetectorService(repo, eventAdmissionService).runDetectionCycle(ORG);
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
    await new CancellationDetectorService(repo, eventAdmissionService).runDetectionCycle(ORG);
    const rows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.cancellation', organizationId: ORG } });
    expect(rows.length).toBe(2);
    expect(rows[0].situationKey).not.toBe(rows[1].situationKey);
  });
});
