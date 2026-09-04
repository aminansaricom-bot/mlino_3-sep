import { prisma } from '../../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../../foundation/event-admission/event-admission.service';
import { FollowupDetectorService } from '../../../value-engines/followup/followup-detector.service';
import { InMemoryFollowupRepository } from '../../../value-engines/followup/followup-repository';
import { SituationLookupService } from '../../../foundation/opportunity-projection/situation-lookup.service';
import { rebuildOrganizationProjection } from '../../../foundation/opportunity-projection/rebuild-projection.service';
import * as fs from 'fs';
import * as path from 'path';

const ORG = 'org-followup-test';
const NOW = new Date('2026-08-14T00:00:00.000Z');

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

describe('F-03 — Follow-up Intelligence detector', () => {
  it('happy path: a patient past the threshold produces an accepted Event Candidate', async () => {
    await seedEntity('patient-1');
    const repo = new InMemoryFollowupRepository([
      { eventId: 'ev-1', organizationId: ORG, patientEntityRef: 'patient-1', lastInteractionAt: '2025-12-01T00:00:00.000Z' },
    ]);
    const detector = new FollowupDetectorService(repo, eventAdmissionService, new SituationLookupService(), 180, () => NOW);
    const produced = await detector.runDetectionCycle(ORG);

    expect(produced.length).toBe(1);
    const rows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.followup' } });
    expect(rows.length).toBe(1);
  });

  it('boundary: a patient just under the threshold produces no candidate', async () => {
    await seedEntity('patient-2');
    const recentDate = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(); // 100 days ago
    const repo = new InMemoryFollowupRepository([
      { eventId: 'ev-2', organizationId: ORG, patientEntityRef: 'patient-2', lastInteractionAt: recentDate },
    ]);
    const detector = new FollowupDetectorService(repo, eventAdmissionService, new SituationLookupService(), 180, () => NOW);
    const produced = await detector.runDetectionCycle(ORG);

    expect(produced.length).toBe(0);
  });

  it('CRITICAL architecture invariant: payload never contains an action-executable field', async () => {
    await seedEntity('patient-3');
    const repo = new InMemoryFollowupRepository([
      { eventId: 'ev-3', organizationId: ORG, patientEntityRef: 'patient-3', lastInteractionAt: '2025-01-01T00:00:00.000Z' },
    ]);
    const detector = new FollowupDetectorService(repo, eventAdmissionService, new SituationLookupService(), 180, () => NOW);
    await detector.runDetectionCycle(ORG);

    const row = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.followup' } });
    const payload = row?.payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('suggested_message');
    expect(payload).not.toHaveProperty('phone_number');
    expect(payload).not.toHaveProperty('contact_action');
    expect(Object.keys(payload).sort()).toEqual(
      ['evidence_refs', 'intended_audience', 'materiality_basis', 'materiality_score'].sort(),
    );
  });

  it('CRITICAL architecture invariant: no messaging/calling module is imported anywhere in this Feature directory', () => {
    const dir = path.resolve(__dirname, '../../../value-engines/followup');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const importLines = content
        .split('\n')
        .filter((l) => l.trim().startsWith('import'));
      for (const line of importLines) {
        expect(line).not.toMatch(/notify|telegram|twilio|sms|mail/i);
      }
    }
  });

  it('CONTRACT RESOLUTION R5: situation_key is stable per {patient, lastInteractionAt} — the SAME period detected twice (different materiality due to elapsed time) keeps the same key', async () => {
    await seedEntity('patient-r5');
    const repo = new InMemoryFollowupRepository([
      { eventId: 'ev-r5-1', organizationId: ORG, patientEntityRef: 'patient-r5', lastInteractionAt: '2025-06-01T00:00:00.000Z' },
    ]);
    await new FollowupDetectorService(repo, eventAdmissionService, new SituationLookupService(), 180, () => NOW).runDetectionCycle(ORG);
    const row = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.followup', organizationId: ORG } });
    const { computeSituationKey } = require('../../../foundation/event-admission/situation-key');
    expect(row?.situationKey).toBe(
      computeSituationKey('value-engine:followup', [ORG, 'patient-r5', '2025-06-01T00:00:00.000Z']),
    );
  });

  it('CONTRACT RESOLUTION R5: a later lastInteractionAt (patient had a new interaction, new period) produces a different situation_key', async () => {
    await seedEntity('patient-r5b');
    const repo = new InMemoryFollowupRepository([
      { eventId: 'ev-r5-2', organizationId: ORG, patientEntityRef: 'patient-r5b', lastInteractionAt: '2025-01-01T00:00:00.000Z' },
    ]);
    await new FollowupDetectorService(repo, eventAdmissionService, new SituationLookupService(), 180, () => NOW).runDetectionCycle(ORG);
    const firstRow = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.followup', organizationId: ORG } });

    await prisma.eventLog.deleteMany({ where: { organizationId: ORG } });
    const repo2 = new InMemoryFollowupRepository([
      { eventId: 'ev-r5-3', organizationId: ORG, patientEntityRef: 'patient-r5b', lastInteractionAt: '2025-06-01T00:00:00.000Z' },
    ]);
    await new FollowupDetectorService(repo2, eventAdmissionService, new SituationLookupService(), 180, () => NOW).runDetectionCycle(ORG);
    const secondRow = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.followup', organizationId: ORG } });

    expect(firstRow?.situationKey).not.toBe(secondRow?.situationKey);
  });

  describe('SituationLookupInterface wiring (R5_STABLE_SITUATION_IDENTITY_SPEC.md §F-03)', () => {
    it('a re-detection of the SAME {patient, lastInteractionAt} period, once Projection is materialized, is submitted as an AMENDMENT — never a second OCCURRENCE (no expires_at; the gap only ends when lastInteractionAt itself changes)', async () => {
      await seedEntity('patient-lookup-1');
      const situationLookup = new SituationLookupService();

      const repo1 = new InMemoryFollowupRepository([
        { eventId: 'ev-lk-1a', organizationId: ORG, patientEntityRef: 'patient-lookup-1', lastInteractionAt: '2025-06-01T00:00:00.000Z' },
      ]);
      await new FollowupDetectorService(repo1, eventAdmissionService, situationLookup, 180, () => NOW).runDetectionCycle(ORG);
      await rebuildOrganizationProjection(ORG, new Date(NOW.getTime() + 1000).toISOString());

      const first = await prisma.eventLog.findFirst({ where: { domainTag: 'opportunity.followup', organizationId: ORG, eventType: 'OCCURRENCE' } });
      expect(first).not.toBeNull();

      // A later detection run — same patient, SAME lastInteractionAt (no new interaction yet),
      // just more days elapsed (higher materiality_score) — a real re-assessment.
      const LATER = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
      const repo2 = new InMemoryFollowupRepository([
        { eventId: 'ev-lk-1a', organizationId: ORG, patientEntityRef: 'patient-lookup-1', lastInteractionAt: '2025-06-01T00:00:00.000Z' },
      ]);
      await new FollowupDetectorService(repo2, eventAdmissionService, situationLookup, 180, () => LATER).runDetectionCycle(ORG);

      const allRows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.followup', organizationId: ORG } });
      const occurrences = allRows.filter((r) => r.eventType === 'OCCURRENCE');
      const amendments = allRows.filter((r) => r.eventType === 'AMENDMENT');
      expect(occurrences.length).toBe(1);
      expect(amendments.length).toBe(1);
      expect(amendments[0].amendsEventId).toBe(first!.id);
      expect(amendments[0].situationKey).toBeNull(); // OCCURRENCE-only field
    });

    it('a NEW lastInteractionAt for the same patient (a real new interaction happened) always submits its own independent OCCURRENCE, even after Projection is rebuilt', async () => {
      await seedEntity('patient-lookup-2');
      const situationLookup = new SituationLookupService();

      const repo1 = new InMemoryFollowupRepository([
        { eventId: 'ev-lk-2a', organizationId: ORG, patientEntityRef: 'patient-lookup-2', lastInteractionAt: '2025-01-01T00:00:00.000Z' },
      ]);
      await new FollowupDetectorService(repo1, eventAdmissionService, situationLookup, 180, () => NOW).runDetectionCycle(ORG);
      await rebuildOrganizationProjection(ORG, new Date(NOW.getTime() + 1000).toISOString());

      // Patient had a genuinely new interaction — a different lastInteractionAt, hence a
      // different situation_key (still past the threshold for this new period).
      const repo2 = new InMemoryFollowupRepository([
        { eventId: 'ev-lk-2b', organizationId: ORG, patientEntityRef: 'patient-lookup-2', lastInteractionAt: '2025-02-01T00:00:00.000Z' },
      ]);
      await new FollowupDetectorService(repo2, eventAdmissionService, situationLookup, 180, () => NOW).runDetectionCycle(ORG);

      const rows = await prisma.eventLog.findMany({ where: { domainTag: 'opportunity.followup', organizationId: ORG } });
      expect(rows.filter((r) => r.eventType === 'OCCURRENCE').length).toBe(2);
    });
  });
});
