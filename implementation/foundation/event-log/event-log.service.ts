import { Prisma } from '@prisma/client';
import { prisma } from '../prisma-client';
import { EventCandidateDTO } from '../../shared-contracts/types';
import { generateUniqueKey } from '../event-admission/unique-key';

/**
 * FP-01 sub-component: exclusive owner of Event Log persistence
 * (Kernel §8 — Capability 1, "Memory & Knowledge", sole writer).
 *
 * This is the ONLY module in the entire codebase permitted to call
 * prisma.eventLog.create(). No Feature, no other Foundation module, imports
 * this file's write path directly — only event-admission.service.ts (the
 * IC-13 orchestrator) calls it, after validation has already passed.
 *
 * REMEDIATION R1 (Central Review — concurrent idempotency): a prior
 * findUnique-then-create pattern was TOCTOU-unsafe — two concurrent
 * submissions of the identical candidate could both observe absence and
 * both attempt create(), racing on the DB unique constraint on
 * `unique_key`. Idempotency is now atomic at the persistence boundary: the
 * findUnique below remains only as a fast-path (avoids an unnecessary
 * insert attempt in the common non-racing case); correctness under
 * concurrency comes from catching the DB-enforced unique-constraint
 * violation (Prisma P2002) and re-reading the row the winning writer
 * created, never from the pre-check alone.
 */
export interface PersistedEvent {
  eventId: string;
  uniqueKey: string;
}

export interface DuplicateEvent {
  duplicate: true;
  eventId: string;
}

export async function persistEvent(
  candidate: EventCandidateDTO,
): Promise<PersistedEvent | DuplicateEvent> {
  const uniqueKey = generateUniqueKey(
    candidate.producer_id,
    candidate.opportunity_correlation_id ?? candidate.core_entity_refs.join(','),
    candidate.payload,
  );

  // Idempotency: same unique_key already accepted -> return the existing row,
  // not an error (IC-13 §7/§10 — duplicate Candidate is handled transparently).
  // Fast path only — NOT the correctness guarantee under concurrency (see below).
  const existing = await prisma.eventLog.findUnique({ where: { uniqueKey } });
  if (existing) {
    return { duplicate: true, eventId: existing.id };
  }

  try {
    const created = await prisma.eventLog.create({
      data: {
        uniqueKey,
        eventType: candidate.event_type,
        eventTime: new Date(candidate.producer_timestamp),
        sourceRef: candidate.opportunity_correlation_id ?? candidate.producer_id,
        producerType: 'internal',
        producerId: candidate.producer_id,
        kernelVersion: candidate.kernel_version,
        confidenceLevel: candidate.confidence_level,
        domainTag: candidate.domain_tag,
        amendsEventId:
          candidate.event_type === 'OCCURRENCE' ? null : candidate.opportunity_correlation_id,
        organizationId: candidate.organization_id,
        payload: candidate.payload as object,
        situationKey: candidate.situation_key ?? null, // R5
        coreEntities: {
          connect: candidate.core_entity_refs.map((id) => ({ id })),
        },
      },
    });

    return { eventId: created.id, uniqueKey: created.uniqueKey };
  } catch (err) {
    // REMEDIATION R1: the real correctness guarantee. Two concurrent callers
    // can both pass the findUnique fast-path above (neither has committed
    // yet) and both reach this create(). The DB's own unique constraint on
    // `unique_key` (prisma/schema.prisma) lets exactly one of them succeed;
    // the loser gets a Prisma P2002 unique-constraint violation here, which
    // we translate into the same DuplicateEvent outcome the fast-path would
    // have returned had it run a moment later — never an uncaught DB error,
    // never a second row for the same logical Event.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' &&
      (err.meta?.target as string[] | undefined)?.includes('unique_key')
    ) {
      const winner = await prisma.eventLog.findUnique({ where: { uniqueKey } });
      if (winner) {
        return { duplicate: true, eventId: winner.id };
      }
    }
    throw err;
  }
}
