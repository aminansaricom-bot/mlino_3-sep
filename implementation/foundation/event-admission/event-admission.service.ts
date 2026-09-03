import { prisma } from '../prisma-client';
import { validateEventCandidate } from './admission-validator';
import { persistEvent } from '../event-log/event-log.service';
import { EventCandidateDTO, AdmissionResult, IC13SubmissionInterface } from '../../shared-contracts/types';

/**
 * FP-01 — the concrete implementation of IC13SubmissionInterface.
 * This is the ONE exported entry point every Domain Signal Producer calls.
 * No Feature has any other way to reach the Event Log (Producer ≠ Event Log
 * Owner — the architectural invariant this whole module exists to enforce).
 */
function safeString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return typeof v === 'string' ? v : String(v);
}

function safeJsonObject(v: unknown): object {
  if (v && typeof v === 'object') return v as object;
  // Non-object payloads (e.g. a malformed candidate whose payload is a
  // string/number) still need to be recorded for observability — wrap them
  // rather than letting Prisma's Json column reject a non-object value.
  return { _rawNonObjectPayload: v === undefined ? null : v };
}

export class EventAdmissionService implements IC13SubmissionInterface {
  async submitEventCandidate(candidate: EventCandidateDTO): Promise<AdmissionResult> {
    const validation = await validateEventCandidate(candidate);

    if (!validation.valid) {
      // REMEDIATION R2 note: `candidate` may itself be structurally
      // malformed (that is precisely why validation failed) — fields like
      // organization_id/producer_id/domain_tag can be any runtime value
      // once TypeScript is bypassed. Observability is diagnostic-only and
      // must never itself throw (a caller correctly reporting a rejection
      // must not get an uncaught DB error instead); coerce to safe,
      // storable values rather than passing candidate fields through as-is.
      await prisma.admissionObservability.create({
        data: {
          organizationId: safeString(candidate.organization_id),
          producerId: safeString(candidate.producer_id),
          domainTag: safeString(candidate.domain_tag),
          rawPayload: safeJsonObject(candidate.payload),
          rejectionReason: validation.reason ?? 'PAYLOAD_INCOMPLETE',
        },
      });
      return { admission_result: 'rejected', rejection_reason: validation.reason };
    }

    // CONTRACT RESOLUTION R6 — for opportunity.interaction candidates
    // submitted with empty core_entity_refs (the normal case now — see
    // feed/opportunity-feed.service.ts), fill in the correct SUBJECT
    // CoreEntity references from the target Opportunity's founding
    // Occurrence, satisfying Kernel AC-1 ("every Business Event maps to at
    // least one Core Entity") without ever requiring the ACTOR to be one.
    // Validation already confirmed (in validateEventCandidate's Amendment
    // check) that opportunity_correlation_id resolves to a real founding
    // OCCURRENCE in the same organization, so this lookup cannot fail for a
    // candidate that reached this point.
    let effectiveCandidate = candidate;
    if (candidate.domain_tag === 'opportunity.interaction' && candidate.core_entity_refs.length === 0) {
      const founding = await prisma.eventLog.findUnique({
        where: { id: candidate.opportunity_correlation_id },
        include: { coreEntities: true },
      });
      if (founding) {
        effectiveCandidate = {
          ...candidate,
          core_entity_refs: founding.coreEntities.map((e) => e.id),
        };
      }
    }

    const result = await persistEvent(effectiveCandidate);

    const opportunityCorrelationId =
      candidate.event_type === 'OCCURRENCE'
        ? result.eventId
        : (candidate.opportunity_correlation_id as string);

    return {
      admission_result: 'accepted',
      event_id: result.eventId,
      opportunity_correlation_id: opportunityCorrelationId,
    };
  }
}

export const eventAdmissionService = new EventAdmissionService();
